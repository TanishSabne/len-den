// Run: node fix-balance.js
// Recalculates wallet balances from transactions
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixBalances() {
  const client = await pool.connect();
  try {
    // Show current balances
    const users = await client.query(`SELECT id, name, email, wallet_balance FROM users WHERE role != 'admin'`);
    console.log('\nCurrent balances:');
    users.rows.forEach(u => console.log(`  ${u.name} (${u.email}): ₹${u.wallet_balance}`));

    // Reset all non-admin users to starting balance of 10000
    // Then replay their actual transactions
    for (const user of users.rows) {
      let balance = 10000; // starting balance
      const txns = await client.query(
        `SELECT type, amount FROM transactions WHERE user_id = $1 ORDER BY created_at ASC`,
        [user.id]
      );
      
      for (const tx of txns.rows) {
        const amt = parseFloat(tx.amount);
        if (['deposit', 'repayment_in', 'loan_disbursement'].includes(tx.type)) {
          balance += amt;
        } else {
          balance -= amt;
        }
      }
      
      await client.query('UPDATE users SET wallet_balance = $1 WHERE id = $2', [balance, user.id]);
      console.log(`  ✅ Fixed ${user.name}: ₹${user.wallet_balance} → ₹${balance}`);
    }

    console.log('\n🎉 All balances recalculated!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

fixBalances();
