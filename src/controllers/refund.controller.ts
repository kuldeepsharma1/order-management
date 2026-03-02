import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const refundSchema = z.object({
  paymentId: z.string().uuid("Invalid Payment ID"),
  amount: z.number().int().positive("Refund amount must be greater than 0 (in cents)"),
  reason: z.string().optional(),
});

// POST /api/v1/refunds (Manual Refund)
export const createRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const { paymentId, amount, reason } = refundSchema.parse(req.body);

    // Run this inside a transaction to ensure financial integrity
    const refund = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, tenantId },
        include: { refunds: true, order: true },
      });

      if (!payment) throw new Error("Payment not found");
      if (payment.status !== "COMPLETED") throw new Error("Cannot refund an incomplete payment");

      // Calculate already refunded amount to prevent over-refunding
      const totalRefundedSoFar = payment.refunds.reduce((sum, r) => sum + r.amount, 0);
      const remainingRefundable = payment.amount - totalRefundedSoFar;

      if (amount > remainingRefundable) {
        throw new Error(`Refund amount (${amount}) exceeds remaining refundable balance (${remainingRefundable})`);
      }

      // Create the refund
      const newRefund = await tx.refund.create({
        data: {
          tenantId,
          paymentId,
          amount,
          reason,
        },
      });

      // Optionally: If the order is now fully refunded, update order status
      if (totalRefundedSoFar + amount >= payment.order.totalAmount) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: "REFUNDED" }
        });
      }

      return newRefund;
    });

    res.status(201).json({
      message: "Refund processed successfully",
      data: refund,
    });
  } catch (error: any) {
    if (error instanceof Error && (error.message.includes("not found") || error.message.includes("exceeds") || error.message.includes("Cannot refund"))) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// GET /api/v1/refunds
export const getRefunds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const refunds = await prisma.refund.findMany({
      where: { tenantId },
      include: { payment: true },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(refunds);
  } catch (error) {
    next(error);
  }
};