import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

// GET /api/v1/inventory
// Allows fetching the whole ledger or filtering by a specific product
export const getInventoryLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId;
    const productId = req.query.productId as string | undefined;
    const type = req.query.type as string | undefined; // e.g., PURCHASE, SALE, RETURN, ADJUSTMENT

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { 
        tenantId,
        ...(productId ? { productId } : {}),
        ...(type ? { type: type as any } : {})
      },
      include: {
        product: {
          select: { name: true, sku: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(transactions);
  } catch (error) {
    next(error);
  }
};