import { Router } from "express";
import { createRefund, getRefunds } from "../controllers/refund.controller";
import { requireTenant } from "../middleware/tenant.middleware";

const router = Router();

router.use(requireTenant);

router.get("/", getRefunds);
router.post("/", createRefund);

export default router;