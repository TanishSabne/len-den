# LEN-DEN: Multi-Tiered Micro-Lending Platform

A full-stack peer-to-peer micro-lending web application that enables multiple lenders to fractionally co-fund a single borrower's loan. Built with a database-first approach—critical financial logic lives at the PostgreSQL layer, not the application layer.

**Group ID:** 13

---

## 📖 Project Overview

LEN-DEN transforms the traditional lending model by allowing borrowers to raise funds from multiple lenders simultaneously. Unlike typical platforms where the database simply stores data, LEN-DEN pushes business logic down to the database level:

- **Atomic Transactions:** Loan fractionalization is handled inside single atomic transaction blocks. Partial funding from multiple lenders either fully commits or fully rolls back.
- **Immutable Ledger:** Every financial state change (wallet deposits, pledges, EMIs, penalties) is captured automatically by PostgreSQL triggers into an append-only shadow table, creating an immutable audit trail.
- **Automated Amortization:** The system automatically generates reducing-balance repayment schedules upon loan disbursal.

---

## 🛠 Tech Stack Used

| Layer        | Technology                                             |
| ------------ | ------------------------------------------------------ |
| **Frontend** | React 19, React Router v7, Tailwind CSS, Framer Motion |
| **Backend**  | Node.js, Express.js, JSON Web Tokens (JWT)             |
| **Database** | PostgreSQL 16                                          |
| **Auth**     | JWT, bcryptjs, Google OAuth                            |

---

## ✨ Features and Functionality

### For Borrowers

- **Loan Applications:** Apply for personal, business, medical, or emergency loans.
- **Flexible Funding:** Receive partial or full funding from multiple lenders.
- **Automated EMI Tracking:** View generated reducing-balance repayment schedules and upcoming dues.
- **Dashboard:** Unified dashboard to track active loans, wallet balance, and credit score.

### For Lenders

- **Marketplace:** Browse open loan requests and filter by category or funding progress.
- **Fractional Investing:** Pledge custom amounts to co-fund loans (up to a 50% single-lender exposure cap).
- **Automated Returns:** Receive pro-rata principal and interest distributions automatically when borrowers pay EMIs.
- **Portfolio Analytics:** Track net returns, total interest earned, and active lending positions.

### System & Security

- **Role-State Machine:** Users transition dynamically between `NEUTRAL`, `BORROWER`, and `LENDER` states based on active financial positions.
- **Strict Constraints:**
  - 48-hour cooling-off period after a loan completes.
  - 24-hour pledge retraction window.
  - Maximum 3 concurrent active lending positions per lender.
  - Automatic credit score adjustments (+5 for on-time EMI, -20 for overdue).
- **KYC Verification:** Built-in gatekeeping requiring users to be 'VERIFIED' before participating in financial transactions.

---

## 🚀 Steps to Run the Project

### Prerequisites

- Node.js v18 or higher
- PostgreSQL 16
- npm

### 1. Database Setup

1. Create a new PostgreSQL database named `lenden`.
2. Execute the SQL files in the root folder strictly in this order to set up the schema, triggers, and procedures:
   ```bash
   psql -U postgres -d lenden -f schema.sql
   psql -U postgres -d lenden -f triggers.sql
   psql -U postgres -d lenden -f procedures.sql
   psql -U postgres -d lenden -f views.sql
   psql -U postgres -d lenden -f seed_data.sql
   ```
   _(Alternatively, you can run these scripts using pgAdmin or your preferred SQL client)._

### 2. Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure the `.env` file in the backend folder matches your PostgreSQL credentials:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/lenden
   JWT_SECRET=your_jwt_secret
   PORT=5000
   FRONTEND_URL=http://localhost:3001
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```
   _(Server will start on `http://localhost:5000`)_

### 3. Frontend Configuration

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure the `.env` file in the frontend folder is set:
   ```env
   PORT=3001
   REACT_APP_API_URL=http://localhost:5000/api
   ```
4. Start the React development server:
   ```bash
   npm start
   ```
   _(App will open at `http://localhost:3001`)_

---

## 👥 Group Members

**Group 13**

- _Please add the names of all group members here before submission._
- _If anyone’s name is not mentioned in the official list, please add it under this section and mention it in the submission comment section as instructed._

---

_Built for DBMS Project Submission. Evaluation scheduled for May 5, 2026, at 8:50 AM._
