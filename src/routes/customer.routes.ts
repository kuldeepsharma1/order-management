import { Router } from "express";
import { getCustomers, createCustomer, deleteCustomer, updateCustomer } from "../controllers/customer.controller";
import { requireTenant } from "../middleware/tenant.middleware";

const router = Router();

router.use(requireTenant); // Enforce tenant context on all customer routes

router.get("/", getCustomers);
router.post("/", createCustomer);
router.patch("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;