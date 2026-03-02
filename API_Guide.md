#  Order Management System - Comprehensive API Documentation

Welcome to the Order Management System API. This system is designed with a **Multi-Tenant Architecture**, meaning a single instance of the application can serve multiple isolated organizations (Tenants).

##  Core Concepts for Developers

Before making API calls, please understand the following system rules:

1. **Multi-Tenancy Header (`x-tenant-id`)**: Every request (except managing the tenants themselves) MUST include the `x-tenant-id` header. This ensures data is strictly isolated between organizations.
2. **Money is Stored in Cents**: To prevent floating-point calculation errors, all currency amounts (`price`, `totalAmount`, `paidAmount`) are passed and stored as integers representing the smallest currency unit (e.g., `$10.50` is passed as `1050`).
3. **Soft Deletes**: Deleting a resource (User, Product, Customer) does not permanently erase it from the database. It sets a `deletedAt` timestamp to maintain historical integrity.

##  Base URL

```text
http://localhost:5000/api/v1

```

---

##  1. Tenant Management

Tenants represent the overarching organizations using the platform. **Do not** use the `x-tenant-id` header for these routes.

### `POST /tenants` - Create a Tenant

* **Description:** Onboards a new organization.
* **Request Body:**
```json
{
  "name": "Stark Industries",
  "currency": "USD",
  "metadata": { "region": "North America" } 
}

```


*(Note: `currency` must be a 3-letter code. `metadata` is an optional JSON object).*
* **Success Response (201 Created):**
```json
{
  "message": "Tenant created successfully",
  "data": {
    "id": "abc-123-uuid",
    "name": "Stark Industries",
    "currency": "USD",
    "createdAt": "2024-05-10T10:00:00.000Z"
  }
}

```



### `GET /tenants` - List All Tenants

* **Description:** Returns an array of all active tenants.
* **Response (200 OK):** `[ { ...tenantObject }, ... ]`

### `GET /tenants/:id` - Get Tenant Details

* **Description:** Fetch a specific organization's configuration.
* **Response (200 OK):** `{ ...tenantObject }`

### `PATCH /tenants/:id` - Update Tenant

* **Description:** Update an existing tenant's name or metadata.
* **Request Body:** (All fields optional)
```json
{
  "name": "Stark Global"
}

```


* **Response (200 OK):** Returns the updated tenant object.

### `DELETE /tenants/:id` - Soft-Delete Tenant

* **Description:** Deactivates the tenant.
* **Response (204 No Content):** Empty body.

---

##  2. Role-Based Access Control (RBAC)

Manage custom roles for staff members within a specific tenant.
**Header Required:** `x-tenant-id: <tenant_uuid>`

### `POST /roles` - Create a Role

* **Request Body:**
```json
{
  "name": "Warehouse Manager"
}

```


* **Response (201 Created):**
```json
{
  "message": "Role created successfully",
  "data": {
    "id": "role-123-uuid",
    "tenantId": "abc-123-uuid",
    "name": "Warehouse Manager"
  }
}

```



### `GET /roles` - List Roles

* **Description:** Returns all roles for the tenant, including a count of how many users have that role.
* **Response (200 OK):**
```json
[
  {
    "id": "role-123-uuid",
    "name": "Warehouse Manager",
    "_count": { "users": 5 }
  }
]

```



---

##  3. User Management

Manage admin/staff accounts.
**Header Required:** `x-tenant-id: <tenant_uuid>`

### `POST /users` - Create a User

* **Request Body:**
```json
{
  "email": "employee@starkindustries.com",
  "roleId": "<uuid_of_warehouse_manager_role>"
}

```


* **Response (201 Created):** Returns the created user object including nested role data.

### `GET /users` - List Users

* **Response (200 OK):** Array of user objects.

### `PATCH /users/:id` - Update User

* **Description:** Change a user's role or metadata.
* **Request Body:**
```json
{
  "roleId": "<uuid_of_new_role>"
}

```


* **Response (200 OK):** Returns updated user object.

### `DELETE /users/:id` - Soft-Delete User

* **Response (204 No Content)**

---

##  4. Customer Management

Manage the end-consumers who buy products.
**Header Required:** `x-tenant-id: <tenant_uuid>`

### `POST /customers` - Create Customer

* **Request Body:**
```json
{
  "name": "Peter Parker",
  "email": "peter@webs.com",
  "phone": "+19876543210"
}

```


* **Response (201 Created):** Returns customer object.

### `GET /customers` - List Customers

* **Response (200 OK):** Array of customers.

### `GET /customers/:id` - Get Customer Details

* **Response (200 OK):** Single customer object.

### `PATCH /customers/:id` - Update Customer

* **Request Body:** (All fields optional)
```json
{
  "phone": "+10000000000"
}

```


* **Response (200 OK)**

### `DELETE /customers/:id` - Soft-Delete Customer

* **Response (204 No Content)**

---

##  5. Product Management

Manage catalog items.
**Header Required:** `x-tenant-id: <tenant_uuid>`

### `POST /products` - Create Product

* **Description:** Creates a product, sets its initial stock, and logs an active price in the `ProductPrice` history.
* **Request Body:**
```json
{
  "name": "Web Shooter Fluid",
  "sku": "WEB-FLUID-01",
  "price": 2500, 
  "stock": 100
}

```


*(Note: `price` is 2500 cents = $25.00)*
* **Response (201 Created):** Returns product object.

### `GET /products` - List Products

* **Response (200 OK):** Array of products with their current active price.

### `GET /products/:id` - Get Product Details

* **Response (200 OK):** Returns product object, including an array of its historical prices (`prices` relation).

### `PATCH /products/:id` - Update Product

* **Description:** Updates name, stock, or price. If `price` is updated, the system automatically deactivates the old price and creates a new `ProductPrice` entry. If `stock` is updated, it creates an `ADJUSTMENT` entry in the Inventory Ledger.
* **Request Body:**
```json
{
  "price": 3000,
  "stock": 150
}

```



### `DELETE /products/:id` - Soft-Delete Product

* **Response (204 No Content)**

---

##  6. Inventory Ledger

View the immutable audit trail of stock changes.
**Header Required:** `x-tenant-id: <tenant_uuid>`

### `GET /inventory` - View Ledger

* **Query Parameters (Optional):**
* `productId`: Filter by a specific product UUID.
* `type`: Filter by transaction type (`PURCHASE`, `SALE`, `ADJUSTMENT`, `RETURN`).


* **Example Request:** `GET /inventory?type=SALE`
* **Response (200 OK):**
```json
[
  {
    "id": "inv-123-uuid",
    "productId": "prod-123-uuid",
    "quantity": -2,
    "type": "SALE",
    "reference": "Order ID xyz",
    "createdAt": "2024-05-10T11:00:00.000Z"
  }
]

```



---

##  7. Order Management

Manage the order lifecycle. Orders track line items and total amounts.
**Header Required:** `x-tenant-id: <tenant_uuid>`

### `POST /orders` - Create Order

* **Description:** Creates an order in `PENDING` status. Deducts stock from inventory (logs a `SALE` in the ledger).
* **Request Body:**
```json
{
  "customerId": "<uuid_of_customer>",
  "items": [
    {
      "productId": "<uuid_of_product_1>",
      "quantity": 2
    },
    {
      "productId": "<uuid_of_product_2>",
      "quantity": 1
    }
  ]
}

```


* **Response (201 Created):** Returns the Order object, containing `totalAmount` calculated by the server.

### `GET /orders` - List Orders

* **Query Parameters (Optional):** `status` (e.g., `?status=PENDING`)
* **Response (200 OK):** Array of order objects.

### `GET /orders/:id` - Get Order Details

* **Response (200 OK):** Returns the full order, deeply nested with `items`, `customer`, and `payments`.

### `GET /orders/:id/history` - View Order Audit Trail

* **Response (200 OK):** Returns an array of `OrderHistory` records showing exactly when the status changed and who changed it.

### `POST /orders/:id/ship` - Ship Order

* **Description:** Changes status to `SHIPPED`. Order MUST be `CONFIRMED` (fully paid) first.
* **Response (200 OK):** Returns updated order.

### `POST /orders/:id/cancel` - Cancel Order

* **Description:** Changes status to `CANCELLED`. Restores stock to inventory (logs a `RETURN`). Automatically issues refunds for any completed payments.
* **Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}

```



---

##  8. Payment Management

Process financial transactions against orders.
**Header Required:** `x-tenant-id: <tenant_uuid>`

### `POST /payments` - Process Payment

* **Description:** Processes a payment. If the `amount` matches the order's `totalAmount`, the Order status automatically changes to `CONFIRMED`.
* **Request Body:**
```json
{
  "orderId": "<uuid_of_pending_order>",
  "amount": 5000,
  "gateway": "STRIPE",
  "reference": "ch_12345ABCD"
}

```


*(Note: `amount` is in cents)*
* **Response (201 Created)**

### `GET /payments` - List Payments

* **Query Parameters (Optional):** `orderId`
* **Response (200 OK):** Array of payment records.

### `GET /payments/:id` - Get Payment Details

* **Response (200 OK):** Includes nested data showing if any `refunds` were issued against this specific payment.

---

##  9. Refund Management

Manually track and issue refunds independent of full order cancellations.
**Header Required:** `x-tenant-id: <tenant_uuid>`

### `POST /refunds` - Issue Manual Refund

* **Description:** Refunds a completed payment. Prevents refunding more than the original payment amount.
* **Request Body:**
```json
{
  "paymentId": "<uuid_of_completed_payment>",
  "amount": 2500,
  "reason": "Returned one item out of two"
}

```


* **Response (201 Created):** Returns the created Refund object.

### `GET /refunds` - List All Refunds

* **Response (200 OK):** Array of refund objects.

---

##  Common Error Status Codes

| Code | Meaning | Cause |
| --- | --- | --- |
| `400` | Bad Request | Missing required fields, validation failure, insufficient stock, or logic error (e.g., trying to refund more than the total amount). |
| `401` | Unauthorized | Missing the `x-tenant-id` header. |
| `404` | Not Found | The requested ID does not exist, or belongs to a different tenant, or has been soft-deleted. |
| `500` | Internal Server Error | Database connection failed or unhandled exception. |

