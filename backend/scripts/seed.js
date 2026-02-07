const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log('🌱 Starting seeding...');

        // We can add custom seeding logic here if needed, 
        // although most initial data should be in migration files (like 007 and 016).

        console.log('✅ Seeding completed.');
    } catch (err) {
        console.error('💥 Seeding failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
