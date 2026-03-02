#  Order Management API (Educational Project)

A robust, multi-tenant backend API demonstrating enterprise software architecture patterns. Built with Node.js, Express, TypeScript, and Prisma.

While this project currently uses SQLite for ease of setup and educational purposes, the architecture is designed so that the database can easily be swapped to PostgreSQL or MySQL.

## 🚀 Key  Patterns Demonstrated

1. **Multi-Tenancy:** Data isolation using an `x-tenant-id` header, ensuring users/organizations only access their own data.
2. **ACID Transactions:** Complex operations (like order creation + inventory deduction) are wrapped in `prisma.$transaction` to guarantee data integrity.
3. **Audit Trails & Ledgers:** - **Order History:** Tracks every status change.
   - **Inventory Ledger:** Immutable tracking of stock adjustments (`PURCHASE`, `SALE`, `RETURN`, `ADJUSTMENT`).
   - **Price Versioning:** Keeps historical records of product pricing.
4. **Soft Deletes:** Records are marked with a `deletedAt` timestamp rather than being hard-deleted from the database.
5. **Strict Validation:** Input payloads are strictly validated at the service boundary using `Zod`.
6. **Financial Precision:** All financial values (prices, amounts) are stored as integers (cents) to avoid floating-point errors.

## 🛠 Tech Stack

* **Framework:** Node.js + Express
* **Language:** TypeScript
* **ORM:** Prisma
* **Database:** SQLite (Better-SQLite3) - *Easily swappable to Postgres/MySQL*
* **Validation:** Zod
* **Security & Middleware:** Helmet, CORS, Express-Rate-Limit, Morgan

## 📦 Getting Started

### Prerequisites
* Node.js (v18+ recommended)

### Installation

1. **Clone the repository:**
   \`\`\`bash
   git clone <repository-url>
   cd order-management
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Setup Environment Variables:**
   Create a `.env` file in the root directory:
   \`\`\`env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL="file:./dev.db"
   \`\`\`

4. **Initialize Database:**
   Generate the Prisma Client and run migrations:
   \`\`\`bash
   npm run prisma:generate
   npm run prisma:migrate
   \`\`\`

5. **Seed Database (Optional but recommended):**
   Creates a test tenant, admin user, customer, and sample products.
   \`\`\`bash
   npx tsx src/seed.ts
   \`\`\`

6. **Start the Development Server:**
   \`\`\`bash
   npm run dev
   \`\`\`

The server will start at `http://localhost:5000`.

---