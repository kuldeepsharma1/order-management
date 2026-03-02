import { Router } from "express";
import { processPayment } from "../controllers/payment.controller";
import { requireTenant } from "../middleware/tenant.middleware";

const router = Router();

router.use(requireTenant);

// POST /api/v1/payments
router.post("/", processPayment);

export default router;