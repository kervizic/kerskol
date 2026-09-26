// Acces PostgreSQL (pool pg). Aucune logique metier ici.

import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 4,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function closePool() {
  await pool.end();
}
