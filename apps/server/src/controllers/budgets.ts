import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { AuthRequest } from "../types";

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM budgets WHERE user_id = ?", [userId]);
    res.json({ success: true, data: result.rows.map(formatBudget) });
  } catch (err) {
    console.error("[Budgets] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM budgets WHERE user_id = ? AND id = ?", [userId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Budget not found" });
      return;
    }
    res.json({ success: true, data: formatBudget(result.rows[0]) });
  } catch (err) {
    console.error("[Budgets] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { category, amount, spent, period } = req.body;

    if (!category || amount === undefined) {
      res.status(400).json({ success: false, error: "Category and amount are required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO budgets (id, user_id, category, amount, spent, period, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, category, amount, spent || 0, period || "monthly", now, now]
    );

    res.status(201).json({
      success: true,
      data: { id, user_id: userId, category, amount, spent: spent || 0, period: period || "monthly", created_at: now, updated_at: now },
    });
  } catch (err) {
    console.error("[Budgets] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM budgets WHERE user_id = ? AND id = ?", [userId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Budget not found" });
      return;
    }

    const row = existing.rows[0];
    const { category, amount, spent, period } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE budgets SET category = ?, amount = ?, spent = ?, period = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`,
      [category ?? row.category, amount ?? row.amount, spent ?? row.spent, period ?? row.period, now, userId, id]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Budgets] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await db.execute("DELETE FROM budgets WHERE user_id = ? AND id = ?", [userId, id]);
    res.json({ success: true, message: "Budget deleted" });
  } catch (err) {
    console.error("[Budgets] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function formatBudget(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    category: row.category,
    amount: row.amount,
    spent: row.spent,
    period: row.period,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
