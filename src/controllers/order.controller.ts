import { Request, Response, NextFunction } from "express";
import { OrderService, createOrderSchema } from "../services/order.service";
import { SYSTEM_USER_ID } from "../constants/system-user";
import { prisma } from "../lib/prisma";

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId; // Set by your tenant middleware
    
    // For now, we hardcode the user ID since Auth isn't built yet.
    // In production: const userId = req.user.id;
     const userId = SYSTEM_USER_ID; 

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

export const shipOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const orderId = String(req.params.id);
    const userId = SYSTEM_USER_ID; 

    const updatedOrder = await OrderService.shipOrder(tenantId, orderId, userId);
    
    res.json({ message: "Order shipped", data: updatedOrder });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("not found")) return res.status(404).json({ message: error.message });
    if (error instanceof Error && error.message.includes("Cannot ship")) return res.status(400).json({ message: error.message });
    next(error);
  }
};

// GET /api/v1/orders
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    
    // Optional: Allow basic filtering via query params (e.g., ?status=PENDING)
    const statusFilter = req.query.status as string;

    const orders = await prisma.order.findMany({
      where: { 
        tenantId, 
        deletedAt: null,
        ...(statusFilter ? { status: statusFilter as any } : {})
      },
      include: {
        customer: {
          select: { name: true, email: true } // Keep payload lightweight
        },
        _count: {
          select: { items: true } // Just return the item count for list views
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/orders/:id
export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const id = String(req.params.id);

    // Fetch the full order details, including nested items and payment status
    const order = await prisma.order.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        customer: true,
        items: true,
        payments: {
          orderBy: { createdAt: "desc" }
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/orders/:id/history
export const getOrderHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const orderId = String(req.params.id);

    // 1. Verify the order belongs to this tenant
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 2. Fetch the chronological audit trail
    const history = await prisma.orderHistory.findMany({
      where: { orderId, tenantId },
      orderBy: { createdAt: "asc" }, // Oldest to newest
    });

    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};