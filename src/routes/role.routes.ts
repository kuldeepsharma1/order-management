import { Router } from "express";
import { getRoles, createRole } from "../controllers/role.controller";
import { requireTenant } from "../middleware/tenant.middleware";

const router = Router();

router.use(requireTenant); // Enforce tenant isolation

router.get("/", getRoles);
router.post("/", createRole);

export default router;