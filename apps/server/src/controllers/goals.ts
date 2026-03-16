import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { AuthRequest } from "../types";

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM goals WHERE user_id = ?", [userId]);
    res.json({ success: true, data: result.rows.map(formatGoal) });
  } catch (err) {
    console.error("[Goals] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM goals WHERE user_id = ? AND id = ?", [userId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Goal not found" });
      return;
    }
    res.json({ success: true, data: formatGoal(result.rows[0]) });
  } catch (err) {
    console.error("[Goals] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { title, description, category, status, progress, target_date, milestones } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: "Title is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();
    const milestonesJson = milestones ? JSON.stringify(milestones) : null;

    await db.execute(
      `INSERT INTO goals (id, user_id, title, description, category, status, progress, target_date, milestones, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, title, description || null, category || null, status || "in_progress", progress || 0, target_date || null, milestonesJson, now, now]
    );

    res.status(201).json({
      success: true,
      data: { id, user_id: userId, title, description, category, status: status || "in_progress", progress: progress || 0, target_date, milestones: milestones || [], created_at: now, updated_at: now },
    });
  } catch (err) {
    console.error("[Goals] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM goals WHERE user_id = ? AND id = ?", [userId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Goal not found" });
      return;
    }

    const row = existing.rows[0];
    const { title, description, category, status, progress, target_date, milestones } = req.body;
    const now = new Date();
    const milestonesJson = milestones !== undefined ? JSON.stringify(milestones) : row.milestones;

    await db.execute(
      `UPDATE goals SET title = ?, description = ?, category = ?, status = ?, progress = ?, target_date = ?, milestones = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`,
      [title ?? row.title, description ?? row.description, category ?? row.category, status ?? row.status, progress ?? row.progress, target_date ?? row.target_date, milestonesJson, now, userId, id]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Goals] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await db.execute("DELETE FROM goals WHERE user_id = ? AND id = ?", [userId, id]);
    res.json({ success: true, message: "Goal deleted" });
  } catch (err) {
    console.error("[Goals] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function formatGoal(row: Record<string, unknown>) {
  let milestones = [];
  try {
    milestones = row.milestones ? JSON.parse(row.milestones as string) : [];
  } catch { /* ignore parse errors */ }

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    progress: row.progress,
    target_date: row.target_date,
    milestones,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
