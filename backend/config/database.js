const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })
  : null;

async function testDatabaseConnection() {
  if (!pool) {
    throw new Error("DATABASE_URL is missing from .env");
  }

  const result = await pool.query("SELECT NOW() AS database_time");

  return result.rows[0];
}

module.exports = {
  pool,
  testDatabaseConnection
};