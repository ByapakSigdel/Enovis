import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { AuthRequest } from "../types";

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM tasks WHERE user_id = ?", [userId]);
    res.json({ success: true, data: result.rows.map(formatTask) });
  } catch (err) {
    console.error("[Tasks] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM tasks WHERE user_id = ? AND id = ?", [userId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Task not found" });
      return;
    }
    res.json({ success: true, data: formatTask(result.rows[0]) });
  } catch (err) {
    console.error("[Tasks] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { title, description, status, priority, due_date, due_time, category, completed, tags } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: "Title is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, due_time, category, completed, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, title, description || null, status || "todo", priority || "medium", due_date || null, due_time || null, category || null, completed || false, tags || [], now, now]
    );

    res.status(201).json({
      success: true,
      data: { id, user_id: userId, title, description, status: status || "todo", priority: priority || "medium", due_date, due_time, category, completed: completed || false, tags: tags || [], created_at: now, updated_at: now },
    });
  } catch (err) {
    console.error("[Tasks] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check existence
    const existing = await db.execute("SELECT * FROM tasks WHERE user_id = ? AND id = ?", [userId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Task not found" });
      return;
    }

    const row = existing.rows[0];
    const { title, description, status, priority, due_date, due_time, category, completed, tags } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, due_time = ?, category = ?, completed = ?, tags = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`,
      [
        title ?? row.title, description ?? row.description, status ?? row.status, priority ?? row.priority,
        due_date ?? row.due_date, due_time ?? row.due_time, category ?? row.category,
        completed ?? row.completed, tags ?? row.tags, now, userId, id,
      ]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Tasks] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await db.execute("DELETE FROM tasks WHERE user_id = ? AND id = ?", [userId, id]);
    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    console.error("[Tasks] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function formatTask(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    due_date: row.due_date,
    due_time: row.due_time,
    category: row.category,
    completed: row.completed,
    tags: row.tags,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
