const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateDB() {
  try {
    console.log('Adding OTP columns to users table...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS otp VARCHAR(10),
      ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE;
    `);
    console.log('Database updated successfully!');
  } catch (err) {
    console.error('Failed to update database:', err.message);
  } finally {
    pool.end();
  }
}

updateDB();
