import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { AuthRequest } from "../types";

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM journal_entries WHERE user_id = ?", [userId]);
    res.json({ success: true, data: result.rows.map(formatJournal) });
  } catch (err) {
    console.error("[Journal] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM journal_entries WHERE user_id = ? AND id = ?", [userId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Journal entry not found" });
      return;
    }
    res.json({ success: true, data: formatJournal(result.rows[0]) });
  } catch (err) {
    console.error("[Journal] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { date, mood, prompt, content, gratitude } = req.body;

    if (!content) {
      res.status(400).json({ success: false, error: "Content is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO journal_entries (id, user_id, date, mood, prompt, content, gratitude, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, date || null, mood || null, prompt || null, content, gratitude || [], now, now]
    );

    res.status(201).json({
      success: true,
      data: { id, user_id: userId, date, mood, prompt, content, gratitude: gratitude || [], created_at: now, updated_at: now },
    });
  } catch (err) {
    console.error("[Journal] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM journal_entries WHERE user_id = ? AND id = ?", [userId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Journal entry not found" });
      return;
    }

    const row = existing.rows[0];
    const { date, mood, prompt, content, gratitude } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE journal_entries SET date = ?, mood = ?, prompt = ?, content = ?, gratitude = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`,
      [date ?? row.date, mood ?? row.mood, prompt ?? row.prompt, content ?? row.content, gratitude ?? row.gratitude, now, userId, id]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Journal] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await db.execute("DELETE FROM journal_entries WHERE user_id = ? AND id = ?", [userId, id]);
    res.json({ success: true, message: "Journal entry deleted" });
  } catch (err) {
    console.error("[Journal] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function formatJournal(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    date: row.date,
    mood: row.mood,
    prompt: row.prompt,
    content: row.content,
    gratitude: row.gratitude,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
