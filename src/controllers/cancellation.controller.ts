import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { CancellationService } from "../services/cancellation.service";
import { SYSTEM_USER_ID } from "../constants/system-user";
// Validate the cancellation payload
const cancelOrderSchema = z.object({
  reason: z.string().min(5, "Please provide a valid reason for cancellation (min 5 characters)"),
});

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const orderId = String(req.params.id);
    const userId = SYSTEM_USER_ID;

    const { reason } = cancelOrderSchema.parse(req.body);

    // Call the enterprise cancellation service
    const updatedOrder = await CancellationService.cancelOrder(tenantId, orderId, reason, userId);

    res.status(200).json({
      message: `Order successfully ${updatedOrder.status.toLowerCase()}`,
      data: updatedOrder,
    });
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Cannot cancel") || error.message.includes("already")) {
        return res.status(400).json({ message: error.message });
      }
    }
    next(error);
  }
};