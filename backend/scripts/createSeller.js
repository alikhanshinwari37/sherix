require("dotenv").config();

const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

async function createSeller() {
  const name = process.env.SELLER_NAME;
  const email = process.env.SELLER_EMAIL?.trim().toLowerCase();
  const password = process.env.SELLER_PASSWORD;

  if (!name || !email || !password) {
    throw new Error("Seller name, email and password are required in .env");
  }

  if (password.length < 12) {
    throw new Error("Seller password must be at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO admin_users (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, full_name, email`,
    [name, email, passwordHash]
  );

  if (result.rowCount === 0) {
    console.log("An account with this email already exists.");
  } else {
    console.log("Seller account created successfully:");
    console.log(result.rows[0]);
  }
}

createSeller()
  .catch(error => {
    console.error("Account creation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (pool) await pool.end();
  });