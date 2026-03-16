import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { AuthRequest } from "../types";

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM focus_sessions WHERE user_id = ?", [userId]);
    res.json({ success: true, data: result.rows.map(formatSession) });
  } catch (err) {
    console.error("[Focus] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM focus_sessions WHERE user_id = ? AND id = ?", [userId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Focus session not found" });
      return;
    }
    res.json({ success: true, data: formatSession(result.rows[0]) });
  } catch (err) {
    console.error("[Focus] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { task, duration, elapsed, status, started_at, ended_at } = req.body;

    if (!duration) {
      res.status(400).json({ success: false, error: "Duration is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();
    const startedAt = started_at ? new Date(started_at) : now;
    const endedAt = ended_at ? new Date(ended_at) : null;

    await db.execute(
      `INSERT INTO focus_sessions (id, user_id, task, duration, elapsed, status, started_at, ended_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, task || null, duration, elapsed || 0, status || "completed", startedAt, endedAt, now]
    );

    res.status(201).json({
      success: true,
      data: { id, user_id: userId, task, duration, elapsed: elapsed || 0, status: status || "completed", started_at: startedAt, ended_at: endedAt, created_at: now },
    });
  } catch (err) {
    console.error("[Focus] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM focus_sessions WHERE user_id = ? AND id = ?", [userId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Focus session not found" });
      return;
    }

    const row = existing.rows[0];
    const { task, duration, elapsed, status, started_at, ended_at } = req.body;
    const startedAt = started_at ? new Date(started_at) : row.started_at;
    const endedAt = ended_at ? new Date(ended_at) : row.ended_at;

    await db.execute(
      `UPDATE focus_sessions SET task = ?, duration = ?, elapsed = ?, status = ?, started_at = ?, ended_at = ?
       WHERE user_id = ? AND id = ?`,
      [task ?? row.task, duration ?? row.duration, elapsed ?? row.elapsed, status ?? row.status, startedAt, endedAt, userId, id]
    );

    res.json({ success: true, data: { id, updated_at: new Date() } });
  } catch (err) {
    console.error("[Focus] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await db.execute("DELETE FROM focus_sessions WHERE user_id = ? AND id = ?", [userId, id]);
    res.json({ success: true, message: "Focus session deleted" });
  } catch (err) {
    console.error("[Focus] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function formatSession(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    task: row.task,
    duration: row.duration,
    elapsed: row.elapsed,
    status: row.status,
    started_at: row.started_at,
    ended_at: row.ended_at,
    created_at: row.created_at,
  };
}
