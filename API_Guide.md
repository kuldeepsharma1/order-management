# Order Management API Guide (Full Reference)

This document lists every currently exposed API in this project and how to call it.

## 1) Base URL, versioning, and headers

- **Local base URL:** `http://localhost:<PORT>` (default port: `5000`).
- **Versioned API prefix:** `/api/v1`.
- **Required tenant header for all `/api/v1/*` routes:**
  - `x-tenant-id: <tenant-uuid-or-tenant-id-string>`
- **Content type for request bodies:**
  - `Content-Type: application/json`

> If `x-tenant-id` is missing, the API returns:
>
> ```json
> {
>   "message": "Missing x-tenant-id header. Tenant context is required."
> }
> ```

## 2) Health endpoint

### GET `/health`
Simple liveness check.

#### Example
```bash
curl -X GET "http://localhost:5000/health"
```

#### Success response (200)
```json
{
  "status": "OK"
}
```

---

## 3) Customer APIs

Base path: `/api/v1/customers`

### 3.1 GET `/api/v1/customers`
Fetch all non-deleted customers for a tenant.

#### Example
```bash
curl -X GET "http://localhost:5000/api/v1/customers" \
  -H "x-tenant-id: TENANT_ID"
```

#### Success response (200)
Array of customer objects.

---

### 3.2 POST `/api/v1/customers`
Create a customer.

#### Request body
```json
{
  "name": "Acme Buyer",
  "email": "buyer@acme.com",
  "phone": "+1-555-0001"
}
```

#### Example
```bash
curl -X POST "http://localhost:5000/api/v1/customers" \
  -H "x-tenant-id: TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Buyer",
    "email": "buyer@acme.com",
    "phone": "+1-555-0001"
  }'
```

#### Success response (201)
Created customer object.

---

### 3.3 PATCH `/api/v1/customers/:id`
Update customer fields (`name`, `email`, `phone`).

#### Request body (any subset)
```json
{
  "name": "Acme Buyer Updated",
  "email": "buyer.updated@acme.com"
}
```

#### Example
```bash
curl -X PATCH "http://localhost:5000/api/v1/customers/<customerId>" \
  -H "x-tenant-id: TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Acme Buyer Updated" }'
```

#### Success response (200)
```json
{
  "message": "Customer updated successfully",
  "data": { "...": "updated customer" }
}
```

#### Not found (404)
```json
{ "message": "Customer not found" }
```

---

### 3.4 DELETE `/api/v1/customers/:id`
Soft delete a customer.

#### Example
```bash
curl -X DELETE "http://localhost:5000/api/v1/customers/<customerId>" \
  -H "x-tenant-id: TENANT_ID"
```

#### Success response
- `204 No Content`

---

## 4) Product APIs

Base path: `/api/v1/products`

### 4.1 GET `/api/v1/products`
List non-deleted products with active price.

#### Example
```bash
curl -X GET "http://localhost:5000/api/v1/products" \
  -H "x-tenant-id: TENANT_ID"
```

#### Success response (200)
Array of product objects (including active price relation).

---

### 4.2 POST `/api/v1/products`
Create product + active price + initial inventory ledger entry.

#### Request body
```json
{
  "name": "Widget A",
  "sku": "WIDGET-A",
  "stock": 100,
  "price": 1999
}
```

> `price` is in **cents**.

#### Example
```bash
curl -X POST "http://localhost:5000/api/v1/products" \
  -H "x-tenant-id: TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Widget A",
    "sku": "WIDGET-A",
    "stock": 100,
    "price": 1999
  }'
```

#### Success response (201)
Created product with related `prices` and `inventory`.

---

### 4.3 PATCH `/api/v1/products/:id`
Update product name, active price version, and/or stock adjustment.

#### Request body (any subset)
```json
{
  "name": "Widget A+",
  "price": 2499,
  "stockAdjustment": -3,
  "reason": "Damaged units"
}
```

- `price`: new active price in cents.
- `stockAdjustment`: integer; positive adds stock, negative removes stock.

#### Example
```bash
curl -X PATCH "http://localhost:5000/api/v1/products/<productId>" \
  -H "x-tenant-id: TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 2499,
    "stockAdjustment": 10,
    "reason": "Cycle count correction"
  }'
```

#### Success response (200)
```json
{
  "message": "Product updated",
  "data": { "...": "updated product with active prices" }
}
```

#### Common errors
- `404` if product not found.
- `400` if stock would go below zero.

---

## 5) Order APIs

Base path: `/api/v1/orders`

### 5.1 POST `/api/v1/orders`
Create an order, deduct stock, create order history, and inventory sale logs transactionally.

#### Request body
```json
{
  "customerId": "<customer-uuid>",
  "items": [
    {
      "productId": "<product-uuid>",
      "quantity": 2
    },
    {
      "productId": "<product-uuid>",
      "quantity": 1
    }
  ]
}
```

#### Example
```bash
curl -X POST "http://localhost:5000/api/v1/orders" \
  -H "x-tenant-id: TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "00000000-0000-0000-0000-000000000000",
    "items": [
      { "productId": "11111111-1111-1111-1111-111111111111", "quantity": 2 }
    ]
  }'
```

#### Success response (201)
```json
{
  "message": "Order placed successfully",
  "data": { "...": "order with items and history" }
}
```

#### Common errors
- `409` insufficient stock.
- `404` product not found.

---

### 5.2 POST `/api/v1/orders/:id/ship`
Ship an order.

> Business rule: only `CONFIRMED` orders can be shipped.

#### Example
```bash
curl -X POST "http://localhost:5000/api/v1/orders/<orderId>/ship" \
  -H "x-tenant-id: TENANT_ID"
```

#### Success response (200)
```json
{
  "message": "Order shipped",
  "data": { "...": "updated order" }
}
```

#### Common errors
- `404` order not found.
- `400` if order status is not shippable.

---

### 5.3 POST `/api/v1/orders/:id/cancel`
Cancel an order.

#### Request body
```json
{
  "reason": "Customer requested cancellation"
}
```

#### Example
```bash
curl -X POST "http://localhost:5000/api/v1/orders/<orderId>/cancel" \
  -H "x-tenant-id: TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Customer requested cancellation" }'
```

#### Success response (200)
```json
{
  "message": "Order successfully cancelled",
  "data": { "...": "updated order" }
}
```

#### Common errors
- `404` order not found.
- `400` if order cannot be cancelled (for example already shipped/cancelled).

---

## 6) Payment APIs

Base path: `/api/v1/payments`

### 6.1 POST `/api/v1/payments`
Process payment for an order.

If fully paid, order is auto-transitioned to `CONFIRMED` and history is recorded.

#### Request body
```json
{
  "orderId": "<order-uuid>",
  "amount": 1500,
  "gateway": "stripe",
  "reference": "ch_123"
}
```

- `amount` is in **cents**.

#### Example
```bash
curl -X POST "http://localhost:5000/api/v1/payments" \
  -H "x-tenant-id: TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "22222222-2222-2222-2222-222222222222",
    "amount": 1500,
    "gateway": "stripe",
    "reference": "ch_123"
  }'
```

#### Success response (201)
```json
{
  "message": "Payment processed successfully",
  "data": {
    "payment": { "...": "payment row" },
    "order": { "...": "updated order" }
  }
}
```

#### Common errors
- `404` order not found.
- `400` cannot pay cancelled/refunded orders.
- `400` payment amount exceeds remaining balance.

---

## 7) Validation and error format

### 7.1 Validation errors (Zod) – 400
When request validation fails:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "items.0.quantity",
      "message": "Quantity must be greater than 0"
    }
  ]
}
```

### 7.2 Prisma known request conflicts – 409
On Prisma known request errors with `P2*` codes:

```json
{
  "message": "Database conflict error",
  "code": "P2002",
  "meta": { "...": "depends on Prisma error" }
}
```

### 7.3 Unknown route – 404
```json
{
  "message": "Route /your/path not found"
}
```

### 7.4 Unhandled errors – 500
```json
{
  "message": "Internal Server Error"
}
```

---

## 8) End-to-end call sequence example

A common happy path:

1. Create customer (`POST /api/v1/customers`)
2. Create product (`POST /api/v1/products`)
3. Create order (`POST /api/v1/orders`)
4. Pay order (`POST /api/v1/payments`) until fully paid => status becomes `CONFIRMED`
5. Ship order (`POST /api/v1/orders/:id/ship`)

If customer changes mind before shipment, use cancel endpoint:
- `POST /api/v1/orders/:id/cancel`

---

## 9) Notes

- All monetary fields are in smallest currency units (for example cents).
- Tenant isolation is enforced by requiring `x-tenant-id` header and scoping queries by tenant.
- User authentication is not implemented yet; operations currently use a temporary system actor internally for audit trail fields.
