import { Router } from "express";
import { getProducts, createProduct, updateProduct } from "../controllers/product.controller";
import { requireTenant } from "../middleware/tenant.middleware";

const router = Router();

router.use(requireTenant);

router.get("/", getProducts);
router.post("/", createProduct);
router.patch("/:id", updateProduct);

export default router;