import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { AuthRequest } from "../types";

// ── Habits ──────────────────────────────────────────────────────

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM habits WHERE user_id = ?", [userId]);
    res.json({ success: true, data: result.rows.map(formatHabit) });
  } catch (err) {
    console.error("[Habits] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM habits WHERE user_id = ? AND id = ?", [userId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Habit not found" });
      return;
    }
    res.json({ success: true, data: formatHabit(result.rows[0]) });
  } catch (err) {
    console.error("[Habits] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { name, description, icon, color, frequency, tracking_type, target, category } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: "Name is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO habits (id, user_id, name, description, icon, color, frequency, tracking_type, target, current_streak, longest_streak, category, archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, name, description || null, icon || null, color || null, frequency || "daily", tracking_type || "boolean", target || 1, 0, 0, category || null, false, now, now]
    );

    res.status(201).json({
      success: true,
      data: { id, user_id: userId, name, description, icon, color, frequency: frequency || "daily", tracking_type: tracking_type || "boolean", target: target || 1, current_streak: 0, longest_streak: 0, category, archived: false, created_at: now, updated_at: now },
    });
  } catch (err) {
    console.error("[Habits] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM habits WHERE user_id = ? AND id = ?", [userId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Habit not found" });
      return;
    }

    const row = existing.rows[0];
    const { name, description, icon, color, frequency, tracking_type, target, current_streak, longest_streak, category, archived } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE habits SET name = ?, description = ?, icon = ?, color = ?, frequency = ?, tracking_type = ?, target = ?, current_streak = ?, longest_streak = ?, category = ?, archived = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`,
      [name ?? row.name, description ?? row.description, icon ?? row.icon, color ?? row.color, frequency ?? row.frequency, tracking_type ?? row.tracking_type, target ?? row.target, current_streak ?? row.current_streak, longest_streak ?? row.longest_streak, category ?? row.category, archived ?? row.archived, now, userId, id]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Habits] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await db.execute("DELETE FROM habits WHERE user_id = ? AND id = ?", [userId, id]);
    res.json({ success: true, message: "Habit deleted" });
  } catch (err) {
    console.error("[Habits] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

// ── Habit Completions ───────────────────────────────────────────

export async function getCompletions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute(
      "SELECT * FROM habit_completions WHERE user_id = ? AND habit_id = ?",
      [userId, id]
    );
    res.json({
      success: true,
      data: result.rows.map((row) => ({
        habit_id: String(row.habit_id),
        user_id: String(row.user_id),
        date: row.date,
        completed: row.completed,
        value: row.value,
        note: row.note,
        created_at: row.created_at,
      })),
    });
  } catch (err) {
    console.error("[Habits] getCompletions error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function addCompletion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params; // habit_id
    const { date, completed, value, note } = req.body;

    if (!date) {
      res.status(400).json({ success: false, error: "Date is required" });
      return;
    }

    const now = new Date();

    await db.execute(
      `INSERT INTO habit_completions (habit_id, user_id, date, completed, value, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, date, completed ?? true, value || null, note || null, now]
    );

    res.status(201).json({
      success: true,
      data: { habit_id: id, user_id: userId, date, completed: completed ?? true, value, note, created_at: now },
    });
  } catch (err) {
    console.error("[Habits] addCompletion error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function removeCompletion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id, date } = req.params;
    await db.execute(
      "DELETE FROM habit_completions WHERE user_id = ? AND habit_id = ? AND date = ?",
      [userId, id, date]
    );
    res.json({ success: true, message: "Completion deleted" });
  } catch (err) {
    console.error("[Habits] removeCompletion error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function formatHabit(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    frequency: row.frequency,
    tracking_type: row.tracking_type,
    target: row.target,
    current_streak: row.current_streak,
    longest_streak: row.longest_streak,
    category: row.category,
    archived: row.archived,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
