import { Router } from "express";
import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} from "../controllers/tenant.controller";

const router = Router();

router.get("/", getTenants);
router.get("/:id", getTenantById);
router.post("/", createTenant);
router.patch("/:id", updateTenant);
router.delete("/:id", deleteTenant);

export default router;