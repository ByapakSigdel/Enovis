import { Response, NextFunction } from "express";
import db from "../config/database";
import { AuthRequest } from "../types";

/**
 * Enterprise middleware — validates enterprise access.
 * Expects `enterpriseId` in req.params, req.query, or req.headers['x-enterprise-id'].
 * Sets req.enterpriseId and req.enterpriseRole on success.
 */
export async function enterpriseMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    // Resolve enterprise ID from multiple sources
    const enterpriseId =
      (req.params.enterpriseId as string) ||
      (req.query.enterpriseId as string) ||
      (req.headers["x-enterprise-id"] as string) ||
      req.user?.enterpriseId;

    if (!enterpriseId) {
      res.status(400).json({ success: false, error: "Enterprise ID is required" });
      return;
    }

    // Check membership
    const result = await db.execute(
      "SELECT role FROM enterprise_members WHERE enterprise_id = ? AND user_id = ?",
      [enterpriseId, userId]
    );

    if (result.rowLength === 0) {
      res.status(403).json({ success: false, error: "Not a member of this enterprise" });
      return;
    }

    req.enterpriseId = enterpriseId;
    req.enterpriseRole = result.rows[0].role;
    next();
  } catch (err) {
    console.error("[Enterprise] Middleware error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Role check middleware — ensures user has one of the allowed roles.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.enterpriseRole || !allowedRoles.includes(req.enterpriseRole)) {
      res.status(403).json({ success: false, error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
