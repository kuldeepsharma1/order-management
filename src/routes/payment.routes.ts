import { Router } from "express";
import { getPaymentById, getPayments, processPayment } from "../controllers/payment.controller";
import { requireTenant } from "../middleware/tenant.middleware";

const router = Router();

router.use(requireTenant);

// POST /api/v1/payments
router.get("/", getPayments);          
router.get("/:id", getPaymentById);     
router.post("/", processPayment);

export default router;