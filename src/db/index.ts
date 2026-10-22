import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

export function getPostgresConnectionString(): string | null {
  const raw =
    process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (raw && /^(postgresql|postgres):\/\//i.test(raw.trim())) {
    return raw.trim();
  }
  return null;
}

export function isPostgresConfigured(): boolean {
  return Boolean(
    getPostgresConnectionString() ||
    (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME)
  );
}

// Function to create or retrieve the connection pool using the Object Method
export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString = getPostgresConnectionString();

    if (connectionString) {
      // Connect using valid Supabase or standard PostgreSQL connection string
      global._postgresPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }, // Essential for Supabase SSL connections
        max: 10,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 10000,
      });
      console.log('PostgreSQL connection pool initialized with valid URI (Supabase / Postgres)');
    } else if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
      // Fallback to individual SQL environment variables if provided
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 10000,
      });
      console.log('PostgreSQL connection pool initialized with host params');
    } else {
      // Dummy pool with instant timeout to prevent hanging when no valid Postgres URI exists
      global._postgresPool = new Pool({
        host: '127.0.0.1',
        port: 5432,
        connectionTimeoutMillis: 500,
        max: 1,
      });
    }

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.warn('Postgres connection pool notice:', err?.message || err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance
const pool = createPool();

// Initialize Drizzle with the pool and schema
export const db = drizzle(pool, { schema });
