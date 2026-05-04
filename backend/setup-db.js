/**
 * setup-db.js — Run once to initialize the local PostgreSQL database
 * Usage: node setup-db.js
 *
 * This creates all tables, functions, and triggers that were
 * previously hosted on Supabase.
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupDatabase() {
  try {
    console.log('🔧 Setting up local PostgreSQL database...\n');

    // Read the full schema from database/schema.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      console.log('📄 Found database/schema.sql — executing full schema...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(schemaSql);
      console.log('✅ Full schema applied successfully!\n');
    } else {
      console.log('⚠️  database/schema.sql not found. Running inline schema...');
      await runInlineSchema();
    }

    console.log('\n🎉 Database setup complete! Your local PostgreSQL is ready.');
    console.log('   Admin login: admin@lenden.com / admin123');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure PostgreSQL is installed and running');
    console.error('  2. Create the database first:');
    console.error('       Open pgAdmin or psql and run: CREATE DATABASE lenden;');
    console.error('  3. Check your .env DATABASE_URL is correct');
    console.error('     Current: ' + (process.env.DATABASE_URL || '(not set)'));
  } finally {
    await pool.end();
  }
}

async function runInlineSchema() {
  const sql = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name            VARCHAR(255) NOT NULL,
      email           VARCHAR(255) UNIQUE NOT NULL,
      password_hash   VARCHAR(255),
      role            VARCHAR(50) DEFAULT 'user',
      phone           VARCHAR(20),
      avatar_url      TEXT,
      wallet_balance  DECIMAL(15,2) DEFAULT 0.00,
      credit_score    INTEGER DEFAULT 650,
      kyc_verified    BOOLEAN DEFAULT false,
      is_active       BOOLEAN DEFAULT true,
      google_id       VARCHAR(255),
      otp             VARCHAR(10),
      otp_expires_at  TIMESTAMP WITH TIME ZONE,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS loans (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      borrower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title           VARCHAR(255) NOT NULL,
      description     TEXT,
      amount          DECIMAL(15,2) NOT NULL,
      interest_rate   DECIMAL(5,2) NOT NULL,
      tenure_months   INTEGER NOT NULL,
      purpose         VARCHAR(255),
      risk_score      VARCHAR(20),
      funded_amount   DECIMAL(15,2) DEFAULT 0.00,
      status          VARCHAR(50) DEFAULT 'pending',
      approved_by     UUID REFERENCES users(id),
      approved_at     TIMESTAMP WITH TIME ZONE,
      funded_at       TIMESTAMP WITH TIME ZONE,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS loan_contributions (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      loan_id         UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      lender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount          DECIMAL(15,2) NOT NULL,
      expected_return DECIMAL(15,2) DEFAULT 0.00,
      actual_return   DECIMAL(15,2) DEFAULT 0.00,
      status          VARCHAR(50) DEFAULT 'active',
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type            VARCHAR(50) NOT NULL,
      amount          DECIMAL(15,2) NOT NULL,
      balance_after   DECIMAL(15,2),
      reference_id    UUID,
      description     TEXT,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS repayments (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      loan_id         UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      installment_no  INTEGER NOT NULL,
      amount_due      DECIMAL(15,2) NOT NULL,
      amount_paid     DECIMAL(15,2) DEFAULT 0.00,
      principal       DECIMAL(15,2) DEFAULT 0.00,
      interest        DECIMAL(15,2) DEFAULT 0.00,
      penalty         DECIMAL(15,2) DEFAULT 0.00,
      due_date        DATE,
      paid_date       TIMESTAMP WITH TIME ZONE,
      status          VARCHAR(50) DEFAULT 'pending',
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title           VARCHAR(200) NOT NULL,
      message         TEXT NOT NULL,
      type            VARCHAR(30) DEFAULT 'info',
      is_read         BOOLEAN DEFAULT FALSE,
      reference_id    UUID,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      table_name      VARCHAR(50) NOT NULL,
      record_id       UUID NOT NULL,
      action          VARCHAR(10) NOT NULL,
      old_data        JSONB,
      new_data        JSONB,
      changed_by      UUID,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
    CREATE INDEX IF NOT EXISTS idx_loans_borrower       ON loans(borrower_id);
    CREATE INDEX IF NOT EXISTS idx_loans_status          ON loans(status);
    CREATE INDEX IF NOT EXISTS idx_contributions_loan    ON loan_contributions(loan_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_lender  ON loan_contributions(lender_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_repayments_loan       ON repayments(loan_id);

    -- Compound Interest Function
    CREATE OR REPLACE FUNCTION calculate_compound_interest(
      p_principal DECIMAL, p_rate DECIMAL, p_months INTEGER
    ) RETURNS TABLE(total_amount DECIMAL, total_interest DECIMAL, monthly_emi DECIMAL) AS $$
    DECLARE v_monthly_rate DECIMAL; v_total DECIMAL; v_emi DECIMAL;
    BEGIN
      v_monthly_rate := p_rate / 100.0 / 12.0;
      IF v_monthly_rate = 0 THEN
        v_total := p_principal; v_emi := p_principal / p_months;
      ELSE
        v_emi := p_principal * v_monthly_rate * POWER(1 + v_monthly_rate, p_months)
                 / (POWER(1 + v_monthly_rate, p_months) - 1);
        v_total := v_emi * p_months;
      END IF;
      RETURN QUERY SELECT ROUND(v_total, 2), ROUND(v_total - p_principal, 2), ROUND(v_emi, 2);
    END; $$ LANGUAGE plpgsql;
  `;
  await pool.query(sql);
  console.log('✅ Tables and functions created.');

  // Insert admin
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash('admin123', salt);
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role, wallet_balance, kyc_verified, is_active)
    VALUES ('Platform Admin', 'admin@lenden.com', $1, 'admin', 0.00, true, true)
    ON CONFLICT (email) DO NOTHING
  `, [hash]);
  console.log('✅ Admin user ensured.');
}

setupDatabase();
