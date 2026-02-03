import { neon, neonConfig } from '@neondatabase/serverless';

// Configure for serverless environment
neonConfig.fetchConnectionCache = true;

// Get the database URL from environment
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return url;
};

// Create a SQL query function
export const sql = neon(getDatabaseUrl());

// Type-safe query helper
export async function query<T>(
  queryText: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const result = await sql(queryText, params);
    return result as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Transaction helper (for multiple queries)
export async function transaction<T>(
  queries: Array<{ text: string; params?: unknown[] }>
): Promise<T[][]> {
  const results: T[][] = [];

  try {
    await sql('BEGIN');

    for (const q of queries) {
      const result = await sql(q.text, q.params);
      results.push(result as T[]);
    }

    await sql('COMMIT');
    return results;
  } catch (error) {
    await sql('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  }
}

// Health check
export async function checkConnection(): Promise<boolean> {
  try {
    await sql('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}
