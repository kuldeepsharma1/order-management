import { Request, Response, NextFunction } from "express";
import { PaymentService, processPaymentSchema } from "../services/payment.service";
import { SYSTEM_USER_ID } from "../constants/system-user";

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