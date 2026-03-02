import { Request, Response, NextFunction } from "express";
import { PaymentService, processPaymentSchema } from "../services/payment.service";
import { SYSTEM_USER_ID } from "../constants/system-user";
import { prisma } from "../lib/prisma";

export const processPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const userId = SYSTEM_USER_ID;

    // 1. Validate incoming data
    const validatedData = processPaymentSchema.parse(req.body);

    // 2. Process the payment via the Service Layer
    const result = await PaymentService.processPayment(tenantId, validatedData, userId);

    // 3. Respond with the updated order state
    res.status(201).json({
      message: "Payment processed successfully",
      data: result,
    });
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("exceeds the remaining balance") || error.message.includes("Cannot process")) {
        return res.status(400).json({ message: error.message });
      }
    }
    next(error);
  }
};


// GET /api/v1/payments
export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const orderId = req.query.orderId as string | undefined;

    const payments = await prisma.payment.findMany({
      where: { 
        tenantId,
        ...(orderId ? { orderId } : {}) // Optional filter by order
      },
      include: {
        order: { select: { id: true, status: true, customerId: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(payments);
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/payments/:id
export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const id = String(req.params.id);

    const payment = await prisma.payment.findFirst({
      where: { id, tenantId },
      include: {
        order: true,
        refunds: true, // Show all refunds issued against this specific payment
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json(payment);
  } catch (error) {
    next(error);
  }
};