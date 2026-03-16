import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { AuthRequest } from "../types";

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM health_metrics WHERE user_id = ?", [userId]);
    res.json({ success: true, data: result.rows.map(formatMetric) });
  } catch (err) {
    console.error("[Health] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM health_metrics WHERE user_id = ? AND id = ?", [userId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Health metric not found" });
      return;
    }
    res.json({ success: true, data: formatMetric(result.rows[0]) });
  } catch (err) {
    console.error("[Health] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { type, value, unit, date, notes } = req.body;

    if (!type || value === undefined) {
      res.status(400).json({ success: false, error: "Type and value are required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO health_metrics (id, user_id, type, value, unit, date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, type, value, unit || null, date || null, notes || null, now]
    );

    res.status(201).json({
      success: true,
      data: { id, user_id: userId, type, value, unit, date, notes, created_at: now },
    });
  } catch (err) {
    console.error("[Health] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM health_metrics WHERE user_id = ? AND id = ?", [userId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Health metric not found" });
      return;
    }

    const row = existing.rows[0];
    const { type, value, unit, date, notes } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE health_metrics SET type = ?, value = ?, unit = ?, date = ?, notes = ?, created_at = ?
       WHERE user_id = ? AND id = ?`,
      [type ?? row.type, value ?? row.value, unit ?? row.unit, date ?? row.date, notes ?? row.notes, now, userId, id]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Health] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await db.execute("DELETE FROM health_metrics WHERE user_id = ? AND id = ?", [userId, id]);
    res.json({ success: true, message: "Health metric deleted" });
  } catch (err) {
    console.error("[Health] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function formatMetric(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    type: row.type,
    value: row.value,
    unit: row.unit,
    date: row.date,
    notes: row.notes,
    created_at: row.created_at,
  };
}
