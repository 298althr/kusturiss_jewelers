const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const database = require('../config/database');

class AdminSecurityService {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxFailedAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.allowedIPs = process.env.ADMIN_ALLOWED_IPS ? process.env.ADMIN_ALLOWED_IPS.split(',') : [];
  }

  // Generate 2FA secret for admin
  generate2FASecret(adminEmail) {
    const secret = speakeasy.generateSecret({
      name: `E-commerce Admin (${adminEmail})`,
      issuer: 'E-commerce Template',
      length: 32
    });

    return {
      secret: secret.base32,
      qrCode: null // Will be generated separately
    };
  }

  // Generate QR code for 2FA
  async generate2FAQRCode(secret) {
    try {
      const otpauthUrl = speakeasy.otpauthURL({
        secret: secret,
        label: 'E-commerce Admin',
        issuer: 'E-commerce Template'
      });

      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('QR Code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  // Verify 2FA token
  verify2FAToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 steps before/after
    });
  }

  // Enable 2FA for admin
  async enable2FA(adminId, secret) {
    await database.query(`
      UPDATE admins 
      SET two_factor_secret = $1, two_factor_enabled = true, updated_at = NOW()
      WHERE id = $2
    `, [secret, adminId]);
  }

  // Disable 2FA for admin
  async disable2FA(adminId) {
    await database.query(`
      UPDATE admins 
      SET two_factor_secret = NULL, two_factor_enabled = false, updated_at = NOW()
      WHERE id = $1
    `, [adminId]);
  }

  // Check IP whitelist
  isIPAllowed(ipAddress) {
    if (this.allowedIPs.length === 0) return true; // No restriction if no IPs configured
    return this.allowedIPs.includes(ipAddress);
  }

  // Check for suspicious login patterns
  async checkSuspiciousLogin(adminId, ipAddress, userAgent) {
    const suspiciousPatterns = [];

    // Check for new location
    const recentLogins = await database.query(`
      SELECT DISTINCT ip_address 
      FROM admin_sessions 
      WHERE admin_id = $1 
        AND created_at >= NOW() - INTERVAL '7 days'
        AND ip_address != $2
    `, [adminId, ipAddress]);

    if (recentLogins.rows.length > 0) {
      suspiciousPatterns.push('NEW_LOCATION');
    }

    // Check for new device
    const deviceCount = await database.query(`
      SELECT COUNT(*) as count
      FROM admin_sessions 
      WHERE admin_id = $1 
        AND created_at >= NOW() - INTERVAL '30 days'
        AND user_agent != $2
    `, [adminId, userAgent]);

    if (parseInt(deviceCount.rows[0].count) === 0) {
      suspiciousPatterns.push('NEW_DEVICE');
    }

    // Check for rapid login attempts
    const recentAttempts = await database.query(`
      SELECT COUNT(*) as count
      FROM admin_login_attempts 
      WHERE admin_id = $1 
        AND created_at >= NOW() - INTERVAL '1 hour'
    `, [adminId]);

    if (parseInt(recentAttempts.rows[0].count) > 5) {
      suspiciousPatterns.push('RAPID_ATTEMPTS');
    }

    return suspiciousPatterns;
  }

  // Log admin login attempt
  async logLoginAttempt(adminId, ipAddress, userAgent, success, failureReason = null) {
    await database.query(`
      INSERT INTO admin_login_attempts (
        admin_id, ip_address, user_agent, success, failure_reason, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [adminId, ipAddress, userAgent, success, failureReason]);
  }

  // Check if admin is locked out
  async isLockedOut(adminId) {
    const result = await database.query(`
      SELECT COUNT(*) as failed_attempts,
             MAX(created_at) as last_attempt
      FROM admin_login_attempts 
      WHERE admin_id = $1 
        AND success = false 
        AND created_at >= NOW() - INTERVAL '15 minutes'
    `, [adminId]);

    const failedAttempts = parseInt(result.rows[0].failed_attempts);
    const lastAttempt = result.rows[0].last_attempt;

    if (failedAttempts >= this.maxFailedAttempts && lastAttempt) {
      const timeSinceLastAttempt = new Date() - new Date(lastAttempt);
      return timeSinceLastAttempt < this.lockoutDuration;
    }

    return false;
  }

  // Create secure admin session
  async createAdminSession(adminId, ipAddress, userAgent) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.sessionTimeout);

    await database.query(`
      INSERT INTO admin_sessions (
        id, admin_id, ip_address, user_agent, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [sessionId, adminId, ipAddress, userAgent, expiresAt]);

    return sessionId;
  }

  // Validate admin session
  async validateAdminSession(sessionId, ipAddress, userAgent) {
    const result = await database.query(`
      SELECT s.*, a.email, a.role, a.two_factor_enabled
      FROM admin_sessions s
      JOIN admins a ON s.admin_id = a.id
      WHERE s.id = $1 
        AND s.expires_at > NOW()
        AND a.is_active = true
    `, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];

    // Check for session hijacking
    if (session.ip_address !== ipAddress || session.user_agent !== userAgent) {
      await this.logSuspiciousActivity(session.admin_id, 'SESSION_HIJACKING_ATTEMPT', {
        sessionId: sessionId,
        expectedIP: session.ip_address,
        actualIP: ipAddress,
        expectedUA: session.user_agent,
        actualUA: userAgent
      }, ipAddress, userAgent);

      await this.invalidateSession(sessionId);
      return null;
    }

    return session;
  }

  // Invalidate admin session
  async invalidateSession(sessionId) {
    await database.query(`
      DELETE FROM admin_sessions WHERE id = $1
    `, [sessionId]);
  }

  // Invalidate all admin sessions (except current)
  async invalidateAllOtherSessions(adminId, currentSessionId) {
    await database.query(`
      DELETE FROM admin_sessions 
      WHERE admin_id = $1 AND id != $2
    `, [adminId, currentSessionId]);
  }

  // Log suspicious activity
  async logSuspiciousActivity(adminId, activityType, details, ipAddress, userAgent) {
    await database.query(`
      INSERT INTO suspicious_activities (
        admin_id, activity_type, severity, details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, 'HIGH', $3, $4, $5, NOW())
    `, [adminId, activityType, JSON.stringify(details), ipAddress, userAgent]);
  }

  // Get admin security settings
  async getAdminSecuritySettings(adminId) {
    const result = await database.query(`
      SELECT 
        two_factor_enabled,
        last_login_at,
        (SELECT COUNT(*) FROM admin_sessions WHERE admin_id = $1 AND expires_at > NOW()) as active_sessions,
        (SELECT COUNT(*) FROM admin_login_attempts WHERE admin_id = $1 AND success = false AND created_at >= NOW() - INTERVAL '24 hours') as failed_attempts_24h
      FROM admins 
      WHERE id = $1
    `, [adminId]);

    return result.rows[0] || {};
  }

  // Update admin last login
  async updateLastLogin(adminId) {
    await database.query(`
      UPDATE admins 
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [adminId]);
  }

  // Generate device fingerprint
  generateDeviceFingerprint(userAgent, ipAddress, additionalData = {}) {
    const fingerprintData = {
      userAgent: userAgent,
      ipAddress: ipAddress,
      ...additionalData
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
  }

  // Check for concurrent sessions
  async checkConcurrentSessions(adminId, maxSessions = 3) {
    const result = await database.query(`
      SELECT COUNT(*) as active_sessions
      FROM admin_sessions 
      WHERE admin_id = $1 AND expires_at > NOW()
    `, [adminId]);

    return parseInt(result.rows[0].active_sessions) >= maxSessions;
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    await database.query(`
      DELETE FROM admin_sessions WHERE expires_at <= NOW()
    `);
  }

  // Get security audit log
  async getSecurityAuditLog(adminId, limit = 50, offset = 0) {
    const result = await database.query(`
      SELECT 
        'LOGIN_ATTEMPT' as activity_type,
        CASE WHEN success THEN 'SUCCESS' ELSE 'FAILURE' END as status,
        failure_reason as details,
        ip_address,
        user_agent,
        created_at
      FROM admin_login_attempts 
      WHERE admin_id = $1
      
      UNION ALL
      
      SELECT 
        activity_type,
        'SUSPICIOUS' as status,
        details,
        ip_address,
        user_agent,
        created_at
      FROM suspicious_activities 
      WHERE admin_id = $1
      
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [adminId, limit, offset]);

    return result.rows;
  }
}

module.exports = new AdminSecurityService();
