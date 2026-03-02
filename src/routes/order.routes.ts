import { Router } from "express";
import { createOrder, getOrderById, getOrderHistory, getOrders, shipOrder } from "../controllers/order.controller";
import { requireTenant } from "../middleware/tenant.middleware";
import { cancelOrder } from "../controllers/cancellation.controller"; 

const router = Router();

// Enforce tenant context on all order routes
router.use(requireTenant);

// POST /api/v1/orders
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.get("/:id/history", getOrderHistory);
router.post("/", createOrder);
router.post("/:id/ship", shipOrder);
// (Future endpoints we will build)
// router.get("/", getOrders);
// router.get("/:id", getOrderById);
// router.patch("/:id/status", updateOrderStatus);


router.post("/:id/cancel", cancelOrder);

export default router;


