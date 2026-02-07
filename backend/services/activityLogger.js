const database = require('../config/database');

class ActivityLogger {
    async log(req, action, details = {}) {
        try {
            const userId = req.user ? (req.user.userId || req.user.id) : null;
            const sessionToken = req.cookies.session_token;

            let sessionId = null;
            if (sessionToken) {
                const sessionResult = await database.query(
                    'SELECT id FROM user_sessions WHERE session_token = $1',
                    [sessionToken]
                );
                if (sessionResult.rows.length > 0) {
                    sessionId = sessionResult.rows[0].id;
                }
            }

            await database.query(`
        INSERT INTO user_activity_log (
          session_id, user_id, action, details, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
                sessionId,
                userId,
                action,
                JSON.stringify(details),
                req.ip,
                req.get('User-Agent')
            ]);

            console.log(`📡 Activity logged: ${action} for ${userId || 'guest'}`);
        } catch (error) {
            console.error('❌ Failed to log activity:', error);
        }
    }
}

module.exports = new ActivityLogger();
