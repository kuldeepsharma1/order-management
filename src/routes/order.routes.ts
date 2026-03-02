import { Router } from "express";
import { createOrder } from "../controllers/order.controller";
import { requireTenant } from "../middleware/tenant.middleware";
import { cancelOrder } from "../controllers/cancellation.controller"; 

const router = Router();

// Enforce tenant context on all order routes
router.use(requireTenant);

// POST /api/v1/orders
router.post("/", createOrder);

// (Future endpoints we will build)
// router.get("/", getOrders);
// router.get("/:id", getOrderById);
// router.patch("/:id/status", updateOrderStatus);


router.post("/:id/cancel", cancelOrder);

export default router;


