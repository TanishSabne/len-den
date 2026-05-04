<div align="center">
  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Money%20with%20wings/Color/money_with_wings_color.svg" width="100" alt="Len-Den Logo"/>
  <h1>Len-Den | Micro-Lending Platform</h1>
  <p><i>A next-generation peer-to-peer micro-lending platform with atomic database transactions.</i></p>
</div>

---

## 📖 Overview

**Len-Den** transforms the traditional lending model by allowing borrowers to raise funds from multiple lenders simultaneously. Unlike typical platforms where the backend handles all the heavy lifting, Len-Den pushes critical business logic directly down to the database layer for maximum security and performance.

### 🌟 Key Highlights
- **Atomic Transactions:** Loan fractionalization is handled inside single atomic transaction blocks. Partial funding from multiple lenders either fully commits or fully rolls back.
- **Immutable Ledger:** Every financial state change (wallet deposits, pledges, EMIs, penalties) is captured automatically by PostgreSQL triggers into an append-only shadow table.
- **Automated Amortization:** The system automatically generates reducing-balance repayment schedules upon loan disbursal.

---

## 🛠 Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, React Router v7, Tailwind CSS, Framer Motion |
| **Backend** | Node.js, Express.js, Prisma ORM, JWT, Nodemailer |
| **Database** | PostgreSQL 16 (Triggers, Stored Procedures, Views) |
| **Authentication** | JWT, bcryptjs, Google OAuth |

---

## ✨ Features

### 👤 For Borrowers
- **Flexible Funding:** Apply for personal, business, medical, or emergency loans and receive partial or full funding from multiple lenders.
- **Automated EMI Tracking:** View generated reducing-balance repayment schedules and upcoming dues.
- **Unified Dashboard:** Track active loans, wallet balance, and real-time credit score.

### 💸 For Lenders
- **Marketplace:** Browse open loan requests and filter by category or funding progress.
- **Fractional Investing:** Pledge custom amounts to co-fund loans (up to a 50% single-lender exposure cap).
- **Automated Returns:** Receive pro-rata principal and interest distributions automatically when borrowers pay EMIs.

### 🛡️ System & Security
- **Dynamic Role-State Machine:** Users transition automatically between `NEUTRAL`, `BORROWER`, and `LENDER` states based on active financial positions.
- **Strict Constraints:**
  - 48-hour cooling-off period after a loan completes.
  - 24-hour pledge retraction window.
  - Maximum 3 concurrent active lending positions per lender.
- **KYC Verification:** Built-in gatekeeping requiring users to be 'VERIFIED' before executing financial transactions.

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v16 or higher)
- npm

### 1️⃣ Database Setup (Supabase)
This project uses a hosted Supabase PostgreSQL database. You do not need to install PostgreSQL locally.

All you need is your Supabase connection string. Ensure that your Supabase database already has the required tables and procedures set up.

### 2️⃣ Backend Configuration
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install
```
Configure your environment variables by creating a `.env` file in the `backend/` folder:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/lenden
JWT_SECRET=your_jwt_secret_here
PORT=5000
FRONTEND_URL=http://localhost:3001
```
Start the server:
```bash
npm run dev
```

### 3️⃣ Frontend Configuration
```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install
```
Configure your environment variables by creating a `.env` file in the `frontend/` folder:
```env
PORT=3001
REACT_APP_API_URL=http://localhost:5000/api
```
Start the application:
```bash
npm start
```
*The app will automatically open at `http://localhost:3001`.*

---
