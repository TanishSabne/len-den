require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sql = `
-- ============================================================
-- 1. Concurrency & Funding Validation
-- ============================================================
CREATE OR REPLACE FUNCTION trg_validate_loan_funding()
RETURNS TRIGGER AS $$
DECLARE
    v_loan_amount DECIMAL;
    v_current_funded DECIMAL;
    v_borrower_id UUID;
    v_lender_balance DECIMAL;
BEGIN
    -- Get loan details and lock the row to prevent race conditions
    SELECT amount, funded_amount, borrower_id INTO v_loan_amount, v_current_funded, v_borrower_id
    FROM loans WHERE id = NEW.loan_id FOR UPDATE;

    -- Prevent funding own loan
    IF v_borrower_id = NEW.lender_id THEN
        RAISE EXCEPTION 'Borrowers cannot fund their own loans.';
    END IF;

    -- Prevent over-funding
    IF v_current_funded + NEW.amount > v_loan_amount THEN
        RAISE EXCEPTION 'Contribution exceeds remaining loan amount.';
    END IF;

    -- Check lender wallet balance
    SELECT wallet_balance INTO v_lender_balance FROM users WHERE id = NEW.lender_id FOR UPDATE;
    IF v_lender_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance to fund this loan.';
    END IF;

    -- Calculate expected return for the lender
    SELECT total_amount INTO NEW.expected_return 
    FROM calculate_compound_interest(NEW.amount, (SELECT interest_rate FROM loans WHERE id = NEW.loan_id), (SELECT tenure_months FROM loans WHERE id = NEW.loan_id));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_loan_funding_trigger ON loan_contributions;
CREATE TRIGGER trg_validate_loan_funding_trigger
BEFORE INSERT ON loan_contributions
FOR EACH ROW
EXECUTE FUNCTION trg_validate_loan_funding();

-- ============================================================
-- 2. Automated Ledger & Wallet Deduction
-- ============================================================
CREATE OR REPLACE FUNCTION trg_execute_loan_funding()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct from lender's wallet
    UPDATE users SET wallet_balance = wallet_balance - NEW.amount WHERE id = NEW.lender_id;

    -- Log transaction for lender
    INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
    VALUES (NEW.lender_id, 'loan_funding', NEW.amount, (SELECT wallet_balance FROM users WHERE id = NEW.lender_id), NEW.loan_id, 'Funded loan ' || NEW.loan_id);

    -- Update loan funded_amount
    UPDATE loans SET funded_amount = funded_amount + NEW.amount WHERE id = NEW.loan_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_execute_loan_funding_trigger ON loan_contributions;
CREATE TRIGGER trg_execute_loan_funding_trigger
AFTER INSERT ON loan_contributions
FOR EACH ROW
EXECUTE FUNCTION trg_execute_loan_funding();

-- ============================================================
-- 3. Automated Loan Disbursement
-- ============================================================
CREATE OR REPLACE FUNCTION trg_disburse_loan()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed to fully_funded or active
    IF NEW.status IN ('fully_funded', 'active') AND OLD.status NOT IN ('fully_funded', 'active') THEN
        -- Add funds to borrower's wallet
        UPDATE users SET wallet_balance = wallet_balance + NEW.amount WHERE id = NEW.borrower_id;

        -- Log transaction for borrower
        INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
        VALUES (NEW.borrower_id, 'loan_disbursement', NEW.amount, (SELECT wallet_balance FROM users WHERE id = NEW.borrower_id), NEW.id, 'Loan disbursement');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_disburse_loan_trigger ON loans;
CREATE TRIGGER trg_disburse_loan_trigger
AFTER UPDATE ON loans
FOR EACH ROW
EXECUTE FUNCTION trg_disburse_loan();

-- ============================================================
-- 4. Automated Repayment Distribution (Fractional Payouts)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_process_repayment()
RETURNS TRIGGER AS $$
DECLARE
    v_borrower_id UUID;
    v_borrower_balance DECIMAL;
    v_contribution RECORD;
    v_lender_share DECIMAL;
    v_loan_amount DECIMAL;
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        -- Get borrower and check balance
        SELECT borrower_id, amount INTO v_borrower_id, v_loan_amount FROM loans WHERE id = NEW.loan_id;
        SELECT wallet_balance INTO v_borrower_balance FROM users WHERE id = v_borrower_id FOR UPDATE;

        IF v_borrower_balance < NEW.amount_due THEN
            RAISE EXCEPTION 'Insufficient wallet balance for repayment. Required: %', NEW.amount_due;
        END IF;

        -- Deduct from borrower
        UPDATE users SET wallet_balance = wallet_balance - NEW.amount_due WHERE id = v_borrower_id;

        -- Log transaction for borrower
        INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
        VALUES (v_borrower_id, 'repayment_out', NEW.amount_due, (SELECT wallet_balance FROM users WHERE id = v_borrower_id), NEW.id, 'Paid installment ' || NEW.installment_no);

        -- Distribute to lenders based on their contribution percentage
        FOR v_contribution IN (SELECT id, lender_id, amount FROM loan_contributions WHERE loan_id = NEW.loan_id) LOOP
            -- Calculate proportion: (Lender's contribution / Total Loan Amount)
            v_lender_share := ROUND(NEW.amount_due * (v_contribution.amount / v_loan_amount), 2);

            -- Add to lender's wallet
            UPDATE users SET wallet_balance = wallet_balance + v_lender_share WHERE id = v_contribution.lender_id;

            -- Update actual_return on contribution
            UPDATE loan_contributions SET actual_return = COALESCE(actual_return, 0) + v_lender_share WHERE id = v_contribution.id;

            -- Log transaction for lender
            INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
            VALUES (v_contribution.lender_id, 'repayment_in', v_lender_share, (SELECT wallet_balance FROM users WHERE id = v_contribution.lender_id), NEW.id, 'Received repayment for loan');
        END LOOP;

        NEW.paid_date := NOW();
        NEW.amount_paid := NEW.amount_due;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_process_repayment_trigger ON repayments;
CREATE TRIGGER trg_process_repayment_trigger
BEFORE UPDATE ON repayments
FOR EACH ROW
EXECUTE FUNCTION trg_process_repayment();

-- ============================================================
-- 5. Automated Loan Completion
-- ============================================================
CREATE OR REPLACE FUNCTION trg_check_loan_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_unpaid_count INTEGER;
BEGIN
    IF NEW.status = 'paid' THEN
        SELECT COUNT(*) INTO v_unpaid_count FROM repayments WHERE loan_id = NEW.loan_id AND status != 'paid';
        IF v_unpaid_count = 0 THEN
            UPDATE loans SET status = 'completed' WHERE id = NEW.loan_id;
            UPDATE loan_contributions SET status = 'completed' WHERE loan_id = NEW.loan_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_loan_completion_trigger ON repayments;
CREATE TRIGGER trg_check_loan_completion_trigger
AFTER UPDATE ON repayments
FOR EACH ROW
EXECUTE FUNCTION trg_check_loan_completion();
`;

async function hardenDB() {
  try {
    console.log('Deploying advanced triggers and procedures to database...');
    await pool.query(sql);
    console.log('✅ Database successfully hardened and is now production-ready!');
  } catch (err) {
    console.error('❌ Failed to harden database:', err.message);
  } finally {
    pool.end();
  }
}

hardenDB();
