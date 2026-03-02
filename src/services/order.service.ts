import { z } from "zod";
import { prisma } from "../lib/prisma";

// -------------------------------------------------------------
// 1. Zod Schemas for Input Validation
// -------------------------------------------------------------
export const createOrderSchema = z.object({
  customerId: z.string().uuid("Invalid Customer ID"),
  items: z
    .array(
      z.object({
        productId: z.string().uuid("Invalid Product ID"),
        quantity: z.number().int().positive("Quantity must be greater than 0"),
      })
    )
    .min(1, "Order must contain at least one item"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// -------------------------------------------------------------
// 2. The Service Layer
// -------------------------------------------------------------
export class OrderService {
  /**
   * Creates a new order, deducts inventory, and records history.
   * Wrapped in a Prisma Interactive Transaction for ACID compliance.
   */
  static async createOrder(tenantId: string, data: CreateOrderInput, changedByUserId: string) {

    // START TRANSACTION
    return await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];
      const inventoryLogs = [];

      // STEP 1: Process each item, verify stock, and calculate prices server-side
      for (const item of data.items) {
        // Fetch product and its currently active price
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId, deletedAt: null },
          include: {
            prices: {
              where: { active: true },
              take: 1,
            },
          },
        });

        if (!product) {
          throw new Error(`Product not found or deleted: ${item.productId}`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stock}`);
        }

        const activePrice = product.prices[0];
        if (!activePrice) {
          throw new Error(`No active price found for product: ${product.name}`);
        }

        // Calculate total securely on the server
        const itemTotal = activePrice.price * item.quantity;
        totalAmount += itemTotal;

        // Prepare data for OrderItems
        orderItemsData.push({
          tenantId,
          productId: product.id,
          productName: product.name,
          price: activePrice.price,
          quantity: item.quantity,
        });

        // Prepare data for Inventory Ledger
        inventoryLogs.push({
          tenantId,
          productId: product.id,
          quantity: item.quantity,
          type: "SALE", // Using Enum from your schema
        });

        // STEP 2: Atomically deduct inventory to prevent race conditions
        // Using `decrement` tells the database to subtract safely, even if concurrent requests happen
        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: { decrement: item.quantity },
          },
        });
      }

      // STEP 3: Create the Order, Items, and History snapshot in one query
      const order = await tx.order.create({
        data: {
          tenantId,
          customerId: data.customerId,
          totalAmount,
          currency: "USD", // You could make this dynamic based on Tenant settings
          status: "PENDING",
          items: {
            create: orderItemsData,
          },
          history: {
            create: {
              tenantId,
              status: "PENDING",
              reason: "Order Placed",
              changedBy: changedByUserId, // Crucial for audit trails
            },
          },
        },
        include: {
          items: true,
          history: true,
        },
      });

      // STEP 4: Insert the Inventory Ledger records, now that we have an Order ID for reference
      const finalizedInventoryLogs = inventoryLogs.map((log) => ({
        ...log,
        type: "SALE" as const,
        reference: `ORDER_${order.id}`,
      }));

      await tx.inventoryTransaction.createMany({
        data: finalizedInventoryLogs,
      });

      // END TRANSACTION (If it reaches here, everything is committed to the database)
      return order;
    });
  }
  /**
     * Fulfills an order by marking it as SHIPPED.
     */
  static async shipOrder(tenantId: string, orderId: string, changedByUserId: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId, deletedAt: null },
      });

      if (!order) throw new Error("Order not found");

      // Business Rule: Can only ship CONFIRMED (paid) orders.
      if (order.status !== "CONFIRMED") {
        throw new Error(`Cannot ship order with status: ${order.status}. Order must be CONFIRMED.`);
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: "SHIPPED" },
      });

      // Audit Trail
      await tx.orderHistory.create({
        data: {
          tenantId,
          orderId,
          status: "SHIPPED",
          reason: "Items dispatched to customer",
          changedBy: changedByUserId,
        },
      });

      return updatedOrder;
    });
  }

}