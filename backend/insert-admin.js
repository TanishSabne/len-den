require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureAdmin() {
  try {
    console.log("Checking for admin user...");
    const res = await pool.query("SELECT * FROM users WHERE email = 'admin@lenden.com'");
    
    if (res.rows.length === 0) {
      console.log("Admin user not found. Creating...");
      await pool.query(`
        INSERT INTO users (name, email, role, wallet_balance, kyc_verified, is_active)
        VALUES ('Platform Admin', 'admin@lenden.com', 'admin', 0.00, true, true)
      `);
      console.log("✅ Admin user successfully created!");
    } else {
      console.log("Admin user already exists. Ensuring correct role and active status...");
      await pool.query(`
        UPDATE users 
        SET role = 'admin', is_active = true 
        WHERE email = 'admin@lenden.com'
      `);
      console.log("✅ Admin user verified and updated!");
    }
  } catch (err) {
    console.error("❌ Error checking/creating admin user:", err);
  } finally {
    await pool.end();
  }
}

ensureAdmin();
