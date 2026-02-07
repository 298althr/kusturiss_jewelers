const crypto = require('crypto');
const database = require('../config/database');

class SessionService {
  constructor() {
    this.cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    };
  }

  // Generate secure session token
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create user session with cookie support
  async createSession(userId, ipAddress, userAgent, rememberMe = false) {
    try {
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7)); // 30 days if remember me, 7 days default

      // Store session in database
      await database.query(`
        INSERT INTO user_sessions (
          session_token, user_id, ip_address, user_agent, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [sessionToken, userId, ipAddress, userAgent, expiresAt]);

      // Update last login
      await database.query(`
        UPDATE customers 
        SET last_login_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [userId]);

      return {
        sessionToken,
        expiresAt,
        cookieOptions: {
          ...this.cookieOptions,
          maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
        }
      };

    } catch (error) {
      console.error('Session creation error:', error);
      throw new Error('Failed to create session');
    }
  }

  // Validate session from cookie
  async validateSession(sessionToken) {
    try {
      const result = await database.query(`
        SELECT s.*, c.email, c.first_name, c.last_name, c.accepts_marketing,
               c.email_verified, c.created_at as customer_created_at
        FROM user_sessions s
        JOIN customers c ON s.user_id = c.id
        WHERE s.session_token = $1 
          AND s.expires_at > NOW()
          AND c.is_active = true
      `, [sessionToken]);

      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0];

      // Update last activity
      await database.query(`
        UPDATE user_sessions 
        SET last_activity_at = NOW()
        WHERE session_token = $1
      `, [sessionToken]);

      return {
        userId: session.user_id,
        email: session.email,
        firstName: session.first_name,
        lastName: session.last_name,
        acceptsMarketing: session.accepts_marketing,
        emailVerified: session.email_verified,
        createdAt: session.customer_created_at,
        sessionToken: sessionToken
      };

    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Destroy session
  async destroySession(sessionToken) {
    try {
      await database.query(`
        DELETE FROM user_sessions WHERE session_token = $1
      `, [sessionToken]);
    } catch (error) {
      console.error('Session destruction error:', error);
    }
  }

  // Get user's active sessions
  async getUserSessions(userId) {
    try {
      const result = await database.query(`
        SELECT session_token, ip_address, user_agent, created_at, expires_at, last_activity_at
        FROM user_sessions
        WHERE user_id = $1 AND expires_at > NOW()
        ORDER BY last_activity_at DESC
      `, [userId]);

      return result.rows.map(session => ({
        ...session,
        isActive: new Date(session.expires_at) > new Date(),
        isCurrentSession: session.last_activity_at && 
          (new Date() - new Date(session.last_activity_at)) < 5 * 60 * 1000 // Active in last 5 minutes
      }));

    } catch (error) {
      console.error('Get user sessions error:', error);
      return [];
    }
  }

  // Destroy all user sessions (logout from all devices)
  async destroyAllUserSessions(userId) {
    try {
      await database.query(`
        DELETE FROM user_sessions WHERE user_id = $1
      `, [userId]);
    } catch (error) {
      console.error('Destroy all sessions error:', error);
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    try {
      await database.query(`
        DELETE FROM user_sessions WHERE expires_at <= NOW()
      `);
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }

  // Generate consent cookie for GDPR compliance
  generateConsentCookie(consents) {
    const consentData = {
      essential: true,
      analytics: consents.analytics || false,
      marketing: consents.marketing || false,
      preferences: consents.preferences || false,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    return {
      name: 'user_consents',
      value: Buffer.from(JSON.stringify(consentData)).toString('base64'),
      options: {
        ...this.cookieOptions,
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
      }
    };
  }

  // Parse consent cookie
  parseConsentCookie(consentValue) {
    try {
      if (!consentValue) return null;
      
      const decoded = Buffer.from(consentValue, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Consent parsing error:', error);
      return null;
    }
  }

  // Generate visitor tracking cookie
  generateVisitorCookie() {
    const visitorId = crypto.randomBytes(16).toString('hex');
    const visitData = {
      id: visitorId,
      firstVisit: new Date().toISOString(),
      lastVisit: new Date().toISOString(),
      visitCount: 1
    };

    return {
      name: 'visitor_id',
      value: visitorId,
      options: {
        ...this.cookieOptions,
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
      }
    };
  }

  // Update visitor tracking
  async updateVisitorTracking(visitorId, ipAddress, userAgent) {
    try {
      // Check if visitor exists
      const existingVisitor = await database.query(`
        SELECT visit_count, first_visit FROM visitor_tracking 
        WHERE visitor_id = $1
      `, [visitorId]);

      if (existingVisitor.rows.length > 0) {
        // Update existing visitor
        await database.query(`
          UPDATE visitor_tracking 
          SET visit_count = visit_count + 1,
              last_visit = NOW(),
              last_ip_address = $2,
              last_user_agent = $3
          WHERE visitor_id = $1
        `, [visitorId, ipAddress, userAgent]);

        return {
          ...existingVisitor.rows[0],
          visitCount: existingVisitor.rows[0].visit_count + 1
        };
      } else {
        // Create new visitor record
        await database.query(`
          INSERT INTO visitor_tracking (
            visitor_id, first_visit, last_visit, visit_count,
            ip_address, user_agent, created_at
          ) VALUES ($1, NOW(), NOW(), 1, $2, $3, NOW())
        `, [visitorId, ipAddress, userAgent]);

        return {
          visitorId,
          firstVisit: new Date(),
          lastVisit: new Date(),
          visitCount: 1
        };
      }

    } catch (error) {
      console.error('Visitor tracking error:', error);
      return null;
    }
  }
}

module.exports = new SessionService();
