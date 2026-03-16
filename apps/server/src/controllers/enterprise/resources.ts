import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

function formatAllocation(row: Record<string, unknown>) {
  return {
    id: row.id?.toString() ?? null,
    enterprise_id: row.enterprise_id?.toString() ?? null,
    user_id: row.user_id?.toString() ?? null,
    project_id: row.project_id?.toString() ?? null,
    allocation: row.allocation ?? 0,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    role: row.role ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const result = await db.execute(
      "SELECT * FROM resource_allocations WHERE enterprise_id = ?",
      [enterpriseId]
    );
    res.json({ success: true, data: result.rows.map(formatAllocation) });
  } catch (err) {
    console.error("[Resources] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const result = await db.execute(
      "SELECT * FROM resource_allocations WHERE enterprise_id = ? AND id = ?",
      [enterpriseId, id]
    );
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Allocation not found" });
      return;
    }
    res.json({ success: true, data: formatAllocation(result.rows[0]) });
  } catch (err) {
    console.error("[Resources] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { user_id, project_id, allocation, start_date, end_date, role, notes } = req.body;

    if (!user_id || !project_id) {
      res.status(400).json({ success: false, error: "user_id and project_id are required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO resource_allocations (id, enterprise_id, user_id, project_id, allocation, start_date, end_date, role, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, enterpriseId, user_id, project_id, allocation || 100, start_date || null, end_date || null, role || null, notes || null, now, now]
    );

    res.status(201).json({
      success: true,
      data: { id, enterprise_id: enterpriseId, user_id, project_id, allocation: allocation || 100, start_date, end_date, role, notes, created_at: now, updated_at: now },
    });
  } catch (err) {
    console.error("[Resources] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;

    const existing = await db.execute(
      "SELECT * FROM resource_allocations WHERE enterprise_id = ? AND id = ?",
      [enterpriseId, id]
    );
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Allocation not found" });
      return;
    }

    const row = existing.rows[0];
    const { user_id, project_id, allocation, start_date, end_date, role, notes } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE resource_allocations SET user_id = ?, project_id = ?, allocation = ?, start_date = ?, end_date = ?, role = ?, notes = ?, updated_at = ?
       WHERE enterprise_id = ? AND id = ?`,
      [
        user_id ?? row.user_id, project_id ?? row.project_id, allocation ?? row.allocation,
        start_date ?? row.start_date, end_date ?? row.end_date, role ?? row.role,
        notes ?? row.notes, now, enterpriseId, id,
      ]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Resources] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    await db.execute(
      "DELETE FROM resource_allocations WHERE enterprise_id = ? AND id = ?",
      [enterpriseId, id]
    );
    res.json({ success: true, message: "Allocation deleted" });
  } catch (err) {
    console.error("[Resources] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
