import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const userSchema = z.object({
  email: z.string().email("Invalid email format"),
  roleId: z.string().uuid("Invalid Role ID"),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateUserSchema = z.object({
  roleId: z.string().uuid("Invalid Role ID").optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// GET /api/v1/users
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const users = await prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      include: { role: true }, // Include their role details
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/users
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const validatedData = userSchema.parse(req.body);

    // 1. Ensure the Role belongs to this Tenant
    const role = await prisma.role.findFirst({
      where: { id: validatedData.roleId, tenantId },
    });

    if (!role) {
      return res.status(400).json({ message: "Invalid Role ID or Role does not belong to this tenant" });
    }

    // 2. Create the User
    const user = await prisma.user.create({
      data: {
        ...validatedData,
        tenantId,
      },
      include: { role: true }
    });

    res.status(201).json({
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    next(error); // Global error handler catches Prisma unique constraint errors (e.g., duplicate email)
  }
};

// PATCH /api/v1/users/:id
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const userId = String(req.params.id);
    const validatedData = updateUserSchema.parse(req.body);

    // If updating role, verify the new role belongs to this tenant
    if (validatedData.roleId) {
      const role = await prisma.role.findFirst({
        where: { id: validatedData.roleId, tenantId },
      });
      if (!role) return res.status(400).json({ message: "Invalid Role ID" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId, tenantId },
      data: validatedData,
      include: { role: true }
    });

    res.json({ message: "User updated", data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/users/:id
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const userId = String(req.params.id);

    // Soft delete ensuring it only deletes users in the current tenant
    await prisma.user.updateMany({
      where: { id: userId, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};