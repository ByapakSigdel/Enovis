import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { AuthRequest } from "../types";

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM calendar_events WHERE user_id = ?", [userId]);
    res.json({ success: true, data: result.rows.map(formatEvent) });
  } catch (err) {
    console.error("[Events] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM calendar_events WHERE user_id = ? AND id = ?", [userId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    res.json({ success: true, data: formatEvent(result.rows[0]) });
  } catch (err) {
    console.error("[Events] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { title, description, start_datetime, end_datetime, all_day, category, color, location, recurrence, status } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: "Title is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();
    const startDt = start_datetime ? new Date(start_datetime) : null;
    const endDt = end_datetime ? new Date(end_datetime) : null;

    await db.execute(
      `INSERT INTO calendar_events (id, user_id, title, description, start_datetime, end_datetime, all_day, category, color, location, recurrence, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, title, description || null, startDt, endDt, all_day || false, category || null, color || null, location || null, recurrence || null, status || "confirmed", now, now]
    );

    res.status(201).json({
      success: true,
      data: { id, user_id: userId, title, description, start_datetime: startDt, end_datetime: endDt, all_day: all_day || false, category, color, location, recurrence, status: status || "confirmed", created_at: now, updated_at: now },
    });
  } catch (err) {
    console.error("[Events] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM calendar_events WHERE user_id = ? AND id = ?", [userId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }

    const row = existing.rows[0];
    const { title, description, start_datetime, end_datetime, all_day, category, color, location, recurrence, status } = req.body;
    const now = new Date();
    const startDt = start_datetime ? new Date(start_datetime) : row.start_datetime;
    const endDt = end_datetime ? new Date(end_datetime) : row.end_datetime;

    await db.execute(
      `UPDATE calendar_events SET title = ?, description = ?, start_datetime = ?, end_datetime = ?, all_day = ?, category = ?, color = ?, location = ?, recurrence = ?, status = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`,
      [title ?? row.title, description ?? row.description, startDt, endDt, all_day ?? row.all_day, category ?? row.category, color ?? row.color, location ?? row.location, recurrence ?? row.recurrence, status ?? row.status, now, userId, id]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Events] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await db.execute("DELETE FROM calendar_events WHERE user_id = ? AND id = ?", [userId, id]);
    res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    console.error("[Events] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function formatEvent(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: row.title,
    description: row.description,
    start_datetime: row.start_datetime,
    end_datetime: row.end_datetime,
    all_day: row.all_day,
    category: row.category,
    color: row.color,
    location: row.location,
    recurrence: row.recurrence,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
