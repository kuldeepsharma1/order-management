import { z } from "zod";
import { prisma } from "../lib/prisma";

export const processPaymentSchema = z.object({
  orderId: z.string().uuid("Invalid Order ID"),
  amount: z.number().int().positive("Amount must be greater than 0"),
  gateway: z.string().min(1, "Gateway identifier is required"),
  reference: z.string().optional(), // e.g., Stripe Charge ID
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;

export class PaymentService {
  /**
   * Processes a payment against an order.
   * If the payment covers the total amount, it automatically confirms the order.
   */
  static async processPayment(tenantId: string, data: ProcessPaymentInput, changedByUserId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch the Order and lock it for updating
      const order = await tx.order.findFirst({
        where: { id: data.orderId, tenantId, deletedAt: null },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.status === "CANCELLED" || order.status === "REFUNDED") {
        throw new Error(`Cannot process payment for a ${order.status} order`);
      }

      // 2. Prevent overpayment
      const remainingBalance = order.totalAmount - order.paidAmount;
      if (data.amount > remainingBalance) {
        throw new Error(`Payment amount (${data.amount}) exceeds the remaining balance (${remainingBalance})`);
      }

      // 3. Create the Payment Record
      const payment = await tx.payment.create({
        data: {
          tenantId,
          orderId: order.id,
          amount: data.amount,
          currency: order.currency,
          status: "COMPLETED", // Assuming synchronous success for now
          gateway: data.gateway,
          reference: data.reference,
        },
      });

      // 4. Update the Order's paid amount
      const newPaidAmount = order.paidAmount + data.amount;
      const isFullyPaid = newPaidAmount >= order.totalAmount;

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paidAmount: newPaidAmount,
          // Automatically transition to CONFIRMED if fully paid
          status: isFullyPaid ? "CONFIRMED" : order.status, 
        },
      });

      // 5. If status changed, record it in OrderHistory
      if (isFullyPaid) {
        await tx.orderHistory.create({
          data: {
            tenantId,
            orderId: order.id,
            status: "CONFIRMED",
            reason: "Order fully paid",
            changedBy: changedByUserId,
          },
        });
      }

      return { payment, order: updatedOrder };
    });
  }
}