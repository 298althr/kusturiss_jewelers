const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
      }

      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // Maximum number of connections in the pool
        idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
        connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
      });

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      console.log('✅ Database connected successfully');
      
      return this.pool;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ Database disconnected');
    }
  }

  async query(text, params) {
    if (!this.isConnected) {
      await this.connect();
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Query executed in ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      throw error;
    }
  }

  async transaction(callback) {
    if (!this.isConnected) {
      await this.connect();
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate() {
    try {
      console.log('🔄 Starting database migration...');
      
      const migrationsDir = path.join(__dirname, '../migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      // Create migrations table if it doesn't exist
      await this.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Get executed migrations
      const executedResult = await this.query('SELECT filename FROM migrations');
      const executedMigrations = new Set(executedResult.rows.map(row => row.filename));

      // Run pending migrations
      for (const file of migrationFiles) {
        if (!executedMigrations.has(file)) {
          console.log(`📝 Running migration: ${file}`);
          
          const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          await this.transaction(async (client) => {
            await client.query(migrationSQL);
            await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
          });
          
          console.log(`✅ Migration completed: ${file}`);
        }
      }

      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async rollback(migrationName) {
    try {
      console.log(`🔄 Rolling back migration: ${migrationName}`);
      
      const rollbackFile = path.join(__dirname, '../migrations/rollbacks', `${migrationName}.sql`);
      
      if (!fs.existsSync(rollbackFile)) {
        throw new Error(`Rollback file not found: ${rollbackFile}`);
      }

      const rollbackSQL = fs.readFileSync(rollbackFile, 'utf8');
      await this.transaction(async (client) => {
        await client.query(rollbackSQL);
        await client.query('DELETE FROM migrations WHERE filename = $1', [`${migrationName}.sql`]);
      });

      console.log(`✅ Rollback completed: ${migrationName}`);
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  async seed() {
    try {
      console.log('🌱 Starting database seeding...');
      
      const seedsDir = path.join(__dirname, '../seeds');
      const seedFiles = fs.readdirSync(seedsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of seedFiles) {
        console.log(`📝 Running seed: ${file}`);
        
        const seedSQL = fs.readFileSync(path.join(seedsDir, file), 'utf8');
        await this.query(seedSQL);
        
        console.log(`✅ Seed completed: ${file}`);
      }

      console.log('✅ All seeds completed successfully');
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message
      };
    }
  }

  // Get connection pool stats
  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

// Create singleton instance
const database = new Database();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down database connection...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down database connection...');
  await database.disconnect();
  process.exit(0);
});

module.exports = database;
