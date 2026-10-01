import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { orgScope } from "../middleware/auth";

export async function listAuditLogs(req: Request, res: Response) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const action = req.query.action as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const filterOrgId = req.query.orgId as string | undefined;

  const where: any = { ...orgScope(req) };
  
  if (req.user?.role === "SUPER_ADMIN" && filterOrgId) {
    where.orgId = filterOrgId;
  }
  if (action) {
    where.action = action;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    logs,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function exportAuditLogs(req: Request, res: Response) {
  const action = req.query.action as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const filterOrgId = req.query.orgId as string | undefined;

  const where: any = { ...orgScope(req) };

  if (req.user?.role === "SUPER_ADMIN" && filterOrgId) {
    where.orgId = filterOrgId;
  }
  if (action) {
    where.action = action;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const headers = ["Timestamp", "User Email", "Action", "Target", "Target ID", "Organization ID", "Details"];
  const rows = logs.map(log => [
    log.createdAt.toISOString(),
    log.userEmail || "System",
    log.action,
    log.target || "",
    log.targetId || "",
    log.orgId || "",
    log.details ? JSON.stringify(log.details) : ""
  ]);

  const tsv = [
    headers.join("\t"),
    ...rows.map(row => row.map(cell => String(cell).replace(/\t/g, " ").replace(/\n/g, " ")).join("\t"))
  ].join("\n");

  res.setHeader("Content-Type", "text/tab-separated-values");
  res.setHeader("Content-Disposition", 'attachment; filename="audit-logs.tsv"');
  res.send(tsv);
}
