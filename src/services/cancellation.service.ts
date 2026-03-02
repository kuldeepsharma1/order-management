import { prisma } from "../lib/prisma";

export class CancellationService {
  /**
   * Cancels an order, releases reserved inventory back to stock, 
   * and creates refund records if money was paid.
   */
  static async cancelOrder(tenantId: string, orderId: string, reason: string, changedByUserId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Order with its Items and Payments
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId, deletedAt: null },
        include: { items: true, payments: true },
      });

      if (!order) throw new Error("Order not found");

      if (order.status === "SHIPPED") {
        throw new Error("Cannot cancel an order that has already been shipped.");
      }
      if (order.status === "CANCELLED" || order.status === "REFUNDED") {
        throw new Error("Order is already cancelled or refunded.");
      }

      // 2. Return Inventory to Stock
      for (const item of order.items) {
        // Increment the stock back
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        // Record the return in the Ledger
        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            productId: item.productId,
            quantity: item.quantity,
            type: "RETURN",
            reference: `CANCEL_${order.id}`,
          },
        });
      }

      // 3. Handle Refunds (If the customer already paid)
      let newStatus = "CANCELLED";
      if (order.paidAmount > 0) {
        newStatus = "REFUNDED";

        // Find all completed payments to refund
        const completedPayments = order.payments.filter(p => p.status === "COMPLETED");
        
        for (const payment of completedPayments) {
          // Create a Refund record for each payment
          await tx.refund.create({
            data: {
              tenantId,
              paymentId: payment.id,
              amount: payment.amount,
              reason: reason,
            },
          });
        }
      }

      // 4. Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: newStatus as any }, // 'CANCELLED' or 'REFUNDED'
      });

      // 5. Write to Order History
      await tx.orderHistory.create({
        data: {
          tenantId,
          orderId: order.id,
          status: newStatus as any,
          reason: reason,
          changedBy: changedByUserId,
        },
      });

      return updatedOrder;
    });
  }
}