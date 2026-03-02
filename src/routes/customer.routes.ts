import { Router } from "express";
import { getCustomers, createCustomer, deleteCustomer } from "../controllers/customer.controller";
import { requireTenant } from "../middleware/tenant.middleware";

const router = Router();

router.use(requireTenant); // Enforce tenant context on all customer routes

router.get("/", getCustomers);
router.post("/", createCustomer);
router.delete("/:id", deleteCustomer);

export default router;