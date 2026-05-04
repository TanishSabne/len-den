require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateAdminPassword() {
  try {
    console.log("Setting password for admin@lenden.com to 'admin123'...");
    
    // Hash password 'admin123'
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash('admin123', salt);

    const res = await pool.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email = 'admin@lenden.com'
      RETURNING id
    `, [passwordHash]);

    if (res.rows.length > 0) {
      console.log("✅ Admin password successfully updated!");
    } else {
      console.log("❌ Admin user not found! Please run 'node insert-admin.js' first.");
    }
  } catch (err) {
    console.error("❌ Error updating admin password:", err);
  } finally {
    await pool.end();
  }
}

updateAdminPassword();
