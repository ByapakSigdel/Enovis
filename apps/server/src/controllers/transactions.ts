import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { AuthRequest } from "../types";

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM transactions WHERE user_id = ?", [userId]);
    res.json({ success: true, data: result.rows.map(formatTransaction) });
  } catch (err) {
    console.error("[Transactions] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM transactions WHERE user_id = ? AND id = ?", [userId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Transaction not found" });
      return;
    }
    res.json({ success: true, data: formatTransaction(result.rows[0]) });
  } catch (err) {
    console.error("[Transactions] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { type, amount, currency, category, date, merchant, description, payment_method, tags } = req.body;

    if (!type || amount === undefined) {
      res.status(400).json({ success: false, error: "Type and amount are required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO transactions (id, user_id, type, amount, currency, category, date, merchant, description, payment_method, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, type, amount, currency || "USD", category || null, date || null, merchant || null, description || null, payment_method || null, tags || [], now, now]
    );

    res.status(201).json({
      success: true,
      data: { id, user_id: userId, type, amount, currency: currency || "USD", category, date, merchant, description, payment_method, tags: tags || [], created_at: now, updated_at: now },
    });
  } catch (err) {
    console.error("[Transactions] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM transactions WHERE user_id = ? AND id = ?", [userId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Transaction not found" });
      return;
    }

    const row = existing.rows[0];
    const { type, amount, currency, category, date, merchant, description, payment_method, tags } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE transactions SET type = ?, amount = ?, currency = ?, category = ?, date = ?, merchant = ?, description = ?, payment_method = ?, tags = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`,
      [type ?? row.type, amount ?? row.amount, currency ?? row.currency, category ?? row.category, date ?? row.date, merchant ?? row.merchant, description ?? row.description, payment_method ?? row.payment_method, tags ?? row.tags, now, userId, id]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Transactions] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await db.execute("DELETE FROM transactions WHERE user_id = ? AND id = ?", [userId, id]);
    res.json({ success: true, message: "Transaction deleted" });
  } catch (err) {
    console.error("[Transactions] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function formatTransaction(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    category: row.category,
    date: row.date,
    merchant: row.merchant,
    description: row.description,
    payment_method: row.payment_method,
    tags: row.tags,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
