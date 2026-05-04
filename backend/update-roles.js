// Run: node update-roles.js
// Updates the DB to support the unified 'user' role
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateRoles() {
  const client = await pool.connect();
  try {
    console.log('🔄 Updating role constraint to include "user"...');
    
    // Drop old constraint and add new one
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    `);
    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('user', 'borrower', 'lender', 'admin'));
    `);
    console.log('✅ Role constraint updated.');

    // Update all existing borrower/lender roles to 'user'
    const result = await client.query(`
      UPDATE users SET role = 'user' WHERE role IN ('borrower', 'lender')
    `);
    console.log(`✅ Updated ${result.rowCount} users from borrower/lender → user.`);

    // Set default for new users
    await client.query(`
      ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
    `);
    console.log('✅ Default role set to "user".');

    console.log('\n🎉 All done! Your platform is now unified.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

updateRoles();
