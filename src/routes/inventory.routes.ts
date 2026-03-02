import { Router } from "express";
import { getInventoryLedger } from "../controllers/inventory.controller";
import { requireTenant } from "../middleware/tenant.middleware";

const router = Router();

router.use(requireTenant);

// GET /api/v1/inventory?productId=123&type=SALE
router.get("/", getInventoryLedger);

export default router;