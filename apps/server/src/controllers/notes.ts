import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { AuthRequest } from "../types";

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM notes WHERE user_id = ?", [userId]);
    res.json({ success: true, data: result.rows.map(formatNote) });
  } catch (err) {
    console.error("[Notes] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM notes WHERE user_id = ? AND id = ?", [userId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Note not found" });
      return;
    }
    res.json({ success: true, data: formatNote(result.rows[0]) });
  } catch (err) {
    console.error("[Notes] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { title, content, notebook, tags, pinned, archived } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: "Title is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO notes (id, user_id, title, content, notebook, tags, pinned, archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, title, content || null, notebook || null, tags || [], pinned || false, archived || false, now, now]
    );

    res.status(201).json({
      success: true,
      data: { id, user_id: userId, title, content, notebook, tags: tags || [], pinned: pinned || false, archived: archived || false, created_at: now, updated_at: now },
    });
  } catch (err) {
    console.error("[Notes] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM notes WHERE user_id = ? AND id = ?", [userId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Note not found" });
      return;
    }

    const row = existing.rows[0];
    const { title, content, notebook, tags, pinned, archived } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE notes SET title = ?, content = ?, notebook = ?, tags = ?, pinned = ?, archived = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`,
      [title ?? row.title, content ?? row.content, notebook ?? row.notebook, tags ?? row.tags, pinned ?? row.pinned, archived ?? row.archived, now, userId, id]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Notes] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await db.execute("DELETE FROM notes WHERE user_id = ? AND id = ?", [userId, id]);
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    console.error("[Notes] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function formatNote(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: row.title,
    content: row.content,
    notebook: row.notebook,
    tags: row.tags,
    pinned: row.pinned,
    archived: row.archived,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
