import { Request, Response, NextFunction } from "express";
import { OrderService, createOrderSchema } from "../services/order.service";

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId; // Set by your tenant middleware
    
    // For now, we hardcode the user ID since Auth isn't built yet.
    // In production: const userId = req.user.id;
    const userId = "SYSTEM_USER_TEMP"; 

    // 1. Validate payload
    const validatedData = createOrderSchema.parse(req.body);

    // 2. Call the Enterprise Service
    const order = await OrderService.createOrder(tenantId, validatedData, userId);

    // 3. Return created order
    res.status(201).json({
      message: "Order placed successfully",
      data: order,
    });
  } catch (error: any) {
    // If our service threw a custom Error (like Insufficient Stock), handle it nicely
    if (error instanceof Error && error.message.includes("Insufficient stock")) {
      return res.status(409).json({ message: error.message });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ message: error.message });
    }
    
    // Pass to global error handler for 500s or Zod validation errors
    next(error);
  }
};