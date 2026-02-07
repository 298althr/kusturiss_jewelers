const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting migrations...');

        // Create migrations table if not exists
        await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

        const migrationsDir = path.join(__dirname, '../migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

        for (const file of files) {
            const { rows } = await client.query('SELECT * FROM migrations WHERE name = $1', [file]);

            if (rows.length === 0) {
                console.log(`📝 Executing migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

                await client.query('BEGIN');
                try {
                    await client.query(sql);
                    await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                    await client.query('COMMIT');
                    console.log(`✅ Finished ${file}`);
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error(`❌ Error in ${file}:`, err.message);
                    throw err;
                }
            } else {
                console.log(`⏭️ Skipping ${file} (already executed)`);
            }
        }

        console.log('✨ All migrations completed successfully.');
    } catch (err) {
        console.error('💥 Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
