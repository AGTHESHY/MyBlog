import mysql, { Pool, RowDataPacket } from 'mysql2/promise';

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const url = process.env.DATABASE_URL;
  if (url) {
    pool = mysql.createPool(url);
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'xhblogs',
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    charset: 'utf8mb4',
  });

  return pool;
}

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: Record<string, unknown> | unknown[]
): Promise<T> {
  const [rows] = await getPool().query<T>(sql, params as never);
  return rows;
}
