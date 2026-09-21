import { Request, Response, NextFunction } from "express";
import { ZodType, z } from "zod";

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Validation failed", details: z.treeifyError(result.error) });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: "Validation failed", details: z.treeifyError(result.error) });
    }
    (req as Request & { validatedQuery: unknown }).validatedQuery = result.data;
    next();
  };
}
