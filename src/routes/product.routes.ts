import { Router } from "express";
import { getProducts, createProduct } from "../controllers/product.controller";
import { requireTenant } from "../middleware/tenant.middleware";

const router = Router();

router.use(requireTenant);

router.get("/", getProducts);
router.post("/", createProduct);

export default router;