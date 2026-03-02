# API Documentation & Architecture Guide

## 🏗 Architecture Overview

This project follows a layered architecture to keep business logic isolated and testable:
1. **Routes (`src/routes`):** Maps HTTP methods and URLs to specific controllers.
2. **Controllers (`src/controllers`):** Extracts request data, invokes the service layer, and formats the HTTP response.
3. **Services (`src/services`):** Contains the core business logic, database transactions, and data validation using Zod.
4. **Data Access (`src/lib/prisma.ts`):** Handles database connections via Prisma ORM.

## 🔐 Global Requirements

**Multi-Tenancy:**
All API requests **must** include the following header to identify the tenant context:
* `x-tenant-id`: `<UUID-of-the-tenant>`

*Note: If you ran the seed script, check your console output for the generated Tenant ID.*

---

## 👥 Customers API

### `GET /api/v1/customers`
Retrieves a list of all active customers for the tenant.
* **Response (200 OK):** Array of customer objects.

### `POST /api/v1/customers`
Creates a new customer.
* **Body:**
  \`\`\`json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1987654321"
  }
  \`\`\`
* **Response (201 Created):** The created customer object.

### `PATCH /api/v1/customers/:id`
Updates customer details.
* **Body (All fields optional):** `name`, `email`, `phone`

### `DELETE /api/v1/customers/:id`
Soft-deletes a customer by setting the `deletedAt` timestamp.
* **Response (204 No Content)**

---

## 📦 Products API

### `GET /api/v1/products`
Retrieves a list of all products, including their currently active price.

### `POST /api/v1/products`
Creates a product, sets the initial active price, and creates an opening balance in the inventory ledger.
* **Note:** `price` must be provided in **cents** (e.g., $19.99 = 1999).
* **Body:**
  \`\`\`json
  {
    "name": "Wireless Mouse",
    "sku": "WM-001",
    "stock": 100,
    "price": 1999 
  }
  \`\`\`

### `PATCH /api/v1/products/:id`
Updates product details, triggers price versioning, or logs inventory adjustments.
* **Body:**
  \`\`\`json
  {
    "price": 1899,
    "stockAdjustment": -5,
    "reason": "Damaged stock removal"
  }
  \`\`\`

---

## 🛒 Orders API

### `POST /api/v1/orders`
Creates a new order, verifies active prices, calculates totals server-side, deducts inventory, and logs an `OrderHistory` snapshot.
* **Body:**
  \`\`\`json
  {
    "customerId": "<customer-uuid>",
    "items": [
      {
        "productId": "<product-uuid>",
        "quantity": 2
      }
    ]
  }
  \`\`\`
* **Errors:** Returns `409 Conflict` if there is insufficient stock.

### `POST /api/v1/orders/:id/ship`
Transitions a `CONFIRMED` (paid) order to `SHIPPED`.
* **Response:** Updated order object.

### `POST /api/v1/orders/:id/cancel`
Cancels an order, releases reserved inventory back to stock, and automatically generates `Refund` records if the order was already paid.
* **Body:**
  \`\`\`json
  {
    "reason": "Customer requested cancellation"
  }
  \`\`\`

---

## 💳 Payments API

### `POST /api/v1/payments`
Processes a payment against a specific order. If the payment fulfills the total order amount, the order automatically transitions to `CONFIRMED`.
* **Body:**
  \`\`\`json
  {
    "orderId": "<order-uuid>",
    "amount": 1999,
    "gateway": "STRIPE",
    "reference": "ch_1J2k3l4m5n6o7p8q9r"
  }
  \`\`\`
* **Errors:** Returns `400 Bad Request` if payment amount exceeds the remaining balance of the order.