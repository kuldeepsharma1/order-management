import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
});

// GET /api/v1/roles
export const getRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const roles = await prisma.role.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { users: true } // Let's also return how many users have this role
        }
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(roles);
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/roles
export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const { name } = roleSchema.parse(req.body);

    const role = await prisma.role.create({
      data: {
        tenantId,
        name,
      },
    });

    res.status(201).json({
      message: "Role created successfully",
      data: role,
    });
  } catch (error) {
    next(error);
  }
};