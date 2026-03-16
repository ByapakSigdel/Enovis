import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

function formatEntry(row: any) {
  return {
    id: row.id?.toString() ?? null,
    enterprise_id: row.enterprise_id?.toString() ?? null,
    user_id: row.user_id?.toString() ?? null,
    clock_in_time: row.clock_in_time ?? null,
    clock_out_time: row.clock_out_time ?? null,
    total_hours: row.total_hours ?? 0,
    regular_hours: row.regular_hours ?? 0,
    overtime_hours: row.overtime_hours ?? 0,
    break_time: row.break_time ?? 0,
    work_location: row.work_location ?? null,
    status: row.status ?? null,
    notes: row.notes ?? null,
    approved_by: row.approved_by?.toString() ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function formatLeave(row: any) {
  return {
    id: row.id?.toString() ?? null,
    enterprise_id: row.enterprise_id?.toString() ?? null,
    user_id: row.user_id?.toString() ?? null,
    type: row.type ?? null,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    reason: row.reason ?? null,
    status: row.status ?? null,
    approved_by: row.approved_by?.toString() ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

// --- Time Clock ---

export const getAll = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;

  try {
    const query = "SELECT * FROM time_clock WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });
    const entries = result.rows.map(formatEntry);
    res.json(entries);
  } catch (error) {
    console.error("[TimeClock] Error fetching entries:", error);
    res.status(500).json({ error: "Failed to fetch time clock entries" });
  }
};

export const getMyEntries = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const userId = req.user!.userId;

  try {
    const query =
      "SELECT * FROM time_clock_by_user WHERE enterprise_id = ? AND user_id = ?";
    const result = await db.execute(query, [enterpriseId, userId], {
      prepare: true,
    });
    const entries = result.rows.map(formatEntry);
    res.json(entries);
  } catch (error) {
    console.error("[TimeClock] Error fetching my entries:", error);
    res.status(500).json({ error: "Failed to fetch time clock entries" });
  }
};

export const clockIn = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const userId = req.user!.userId;

  try {
    const { work_location, notes } = req.body;

    const id = uuidv4();
    const now = new Date();

    const mainQuery = `INSERT INTO time_clock (
      enterprise_id, id, user_id, clock_in_time, clock_out_time,
      total_hours, regular_hours, overtime_hours, break_time,
      work_location, status, notes, approved_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const mainParams = [
      enterpriseId,
      id,
      userId,
      now,
      null,
      0,
      0,
      0,
      0,
      work_location || null,
      "clocked_in",
      notes || null,
      null,
      now,
      now,
    ];

    const userQuery = `INSERT INTO time_clock_by_user (
      enterprise_id, user_id, id, clock_in_time, clock_out_time,
      total_hours, status, work_location, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const userParams = [
      enterpriseId,
      userId,
      id,
      now,
      null,
      0,
      "clocked_in",
      work_location || null,
      now,
    ];

    await db.execute(mainQuery, mainParams, { prepare: true });
    await db.execute(userQuery, userParams, { prepare: true });

    res.status(201).json(
      formatEntry({
        id,
        enterprise_id: enterpriseId,
        user_id: userId,
        clock_in_time: now,
        clock_out_time: null,
        total_hours: 0,
        regular_hours: 0,
        overtime_hours: 0,
        break_time: 0,
        work_location: work_location || null,
        status: "clocked_in",
        notes: notes || null,
        approved_by: null,
        created_at: now,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[TimeClock] Error clocking in:", error);
    res.status(500).json({ error: "Failed to clock in" });
  }
};

export const clockOut = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const userId = req.user!.userId;

  try {
    const userQuery =
      "SELECT * FROM time_clock_by_user WHERE enterprise_id = ? AND user_id = ?";
    const userResult = await db.execute(userQuery, [enterpriseId, userId], {
      prepare: true,
    });

    const activeEntry = userResult.rows.find(
      (row) => row.status === "clocked_in"
    );

    if (!activeEntry) {
      return res
        .status(404)
        .json({ error: "No active clock-in entry found" });
    }

    const entryId = activeEntry.id;
    const now = new Date();
    const clockInTime = new Date(activeEntry.clock_in_time);
    const diffMs = now.getTime() - clockInTime.getTime();
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    const regularHours = parseFloat(Math.min(totalHours, 8).toFixed(2));
    const overtimeHours = parseFloat(Math.max(0, totalHours - 8).toFixed(2));

    const mainQuery = `INSERT INTO time_clock (
      enterprise_id, id, user_id, clock_in_time, clock_out_time,
      total_hours, regular_hours, overtime_hours, break_time,
      work_location, status, notes, approved_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const mainParams = [
      enterpriseId,
      entryId,
      userId,
      activeEntry.clock_in_time,
      now,
      totalHours,
      regularHours,
      overtimeHours,
      activeEntry.break_time ?? 0,
      activeEntry.work_location ?? null,
      "completed",
      activeEntry.notes ?? null,
      activeEntry.approved_by ?? null,
      activeEntry.created_at,
      now,
    ];

    const userUpdateQuery = `INSERT INTO time_clock_by_user (
      enterprise_id, user_id, id, clock_in_time, clock_out_time,
      total_hours, status, work_location, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const userUpdateParams = [
      enterpriseId,
      userId,
      entryId,
      activeEntry.clock_in_time,
      now,
      totalHours,
      "completed",
      activeEntry.work_location ?? null,
      activeEntry.created_at,
    ];

    await db.execute(mainQuery, mainParams, { prepare: true });
    await db.execute(userUpdateQuery, userUpdateParams, { prepare: true });

    res.json(
      formatEntry({
        id: entryId,
        enterprise_id: enterpriseId,
        user_id: userId,
        clock_in_time: activeEntry.clock_in_time,
        clock_out_time: now,
        total_hours: totalHours,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        break_time: activeEntry.break_time ?? 0,
        work_location: activeEntry.work_location ?? null,
        status: "completed",
        notes: activeEntry.notes ?? null,
        approved_by: activeEntry.approved_by ?? null,
        created_at: activeEntry.created_at,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[TimeClock] Error clocking out:", error);
    res.status(500).json({ error: "Failed to clock out" });
  }
};

export const getOne = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const query =
      "SELECT * FROM time_clock WHERE enterprise_id = ? AND id = ?";
    const result = await db.execute(query, [enterpriseId, id], {
      prepare: true,
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Time clock entry not found" });
    }

    res.json(formatEntry(result.rows[0]));
  } catch (error) {
    console.error("[TimeClock] Error fetching entry:", error);
    res.status(500).json({ error: "Failed to fetch time clock entry" });
  }
};

export const update = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM time_clock WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Time clock entry not found" });
    }

    const existing = fetchResult.rows[0];
    const updates = req.body;
    const now = new Date();

    const merged = {
      user_id: existing.user_id,
      clock_in_time: updates.clock_in_time ?? existing.clock_in_time,
      clock_out_time: updates.clock_out_time ?? existing.clock_out_time,
      total_hours: updates.total_hours ?? existing.total_hours,
      regular_hours: updates.regular_hours ?? existing.regular_hours,
      overtime_hours: updates.overtime_hours ?? existing.overtime_hours,
      break_time: updates.break_time ?? existing.break_time,
      work_location: updates.work_location ?? existing.work_location,
      status: updates.status ?? existing.status,
      notes: updates.notes ?? existing.notes,
      approved_by: updates.approved_by ?? existing.approved_by,
    };

    const mainQuery = `INSERT INTO time_clock (
      enterprise_id, id, user_id, clock_in_time, clock_out_time,
      total_hours, regular_hours, overtime_hours, break_time,
      work_location, status, notes, approved_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const mainParams = [
      enterpriseId,
      id,
      merged.user_id,
      merged.clock_in_time,
      merged.clock_out_time,
      merged.total_hours,
      merged.regular_hours,
      merged.overtime_hours,
      merged.break_time,
      merged.work_location,
      merged.status,
      merged.notes,
      merged.approved_by,
      existing.created_at,
      now,
    ];

    const userUpdateQuery = `INSERT INTO time_clock_by_user (
      enterprise_id, user_id, id, clock_in_time, clock_out_time,
      total_hours, status, work_location, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const userUpdateParams = [
      enterpriseId,
      merged.user_id,
      id,
      merged.clock_in_time,
      merged.clock_out_time,
      merged.total_hours,
      merged.status,
      merged.work_location,
      existing.created_at,
    ];

    await db.execute(mainQuery, mainParams, { prepare: true });
    await db.execute(userUpdateQuery, userUpdateParams, { prepare: true });

    res.json(
      formatEntry({
        id,
        enterprise_id: enterpriseId,
        ...merged,
        created_at: existing.created_at,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[TimeClock] Error updating entry:", error);
    res.status(500).json({ error: "Failed to update time clock entry" });
  }
};

// --- Leave Requests ---

export const getLeaveRequests = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;

  try {
    const query = "SELECT * FROM leave_requests WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });
    const requests = result.rows.map(formatLeave);
    res.json(requests);
  } catch (error) {
    console.error("[TimeClock] Error fetching leave requests:", error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
};

export const getMyLeaveRequests = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const userId = req.user!.userId;

  try {
    const query = "SELECT * FROM leave_requests WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });
    const requests = result.rows
      .filter((row) => row.user_id?.toString() === userId)
      .map(formatLeave);
    res.json(requests);
  } catch (error) {
    console.error("[TimeClock] Error fetching my leave requests:", error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
};

export const createLeaveRequest = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const userId = req.user!.userId;

  try {
    const { type, start_date, end_date, reason } = req.body;

    if (!type || !start_date || !end_date) {
      return res
        .status(400)
        .json({ error: "Type, start_date, and end_date are required" });
    }

    const id = uuidv4();
    const now = new Date();

    const query = `INSERT INTO leave_requests (
      enterprise_id, id, user_id, type, start_date, end_date,
      reason, status, approved_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      userId,
      type,
      start_date,
      end_date,
      reason || null,
      "pending",
      null,
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json(
      formatLeave({
        id,
        enterprise_id: enterpriseId,
        user_id: userId,
        type,
        start_date,
        end_date,
        reason: reason || null,
        status: "pending",
        approved_by: null,
        created_at: now,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[TimeClock] Error creating leave request:", error);
    res.status(500).json({ error: "Failed to create leave request" });
  }
};

export const updateLeaveRequest = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM leave_requests WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    const existing = fetchResult.rows[0];
    const updates = req.body;
    const now = new Date();

    const merged = {
      user_id: existing.user_id,
      type: updates.type ?? existing.type,
      start_date: updates.start_date ?? existing.start_date,
      end_date: updates.end_date ?? existing.end_date,
      reason: updates.reason ?? existing.reason,
      status: updates.status ?? existing.status,
      approved_by:
        updates.status === "approved" || updates.status === "rejected"
          ? userId
          : existing.approved_by,
    };

    const query = `INSERT INTO leave_requests (
      enterprise_id, id, user_id, type, start_date, end_date,
      reason, status, approved_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      merged.user_id,
      merged.type,
      merged.start_date,
      merged.end_date,
      merged.reason,
      merged.status,
      merged.approved_by,
      existing.created_at,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.json(
      formatLeave({
        id,
        enterprise_id: enterpriseId,
        ...merged,
        created_at: existing.created_at,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[TimeClock] Error updating leave request:", error);
    res.status(500).json({ error: "Failed to update leave request" });
  }
};

export const removeLeaveRequest = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM leave_requests WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    const query =
      "DELETE FROM leave_requests WHERE enterprise_id = ? AND id = ?";
    await db.execute(query, [enterpriseId, id], { prepare: true });

    res.json({ message: "Leave request deleted successfully" });
  } catch (error) {
    console.error("[TimeClock] Error deleting leave request:", error);
    res.status(500).json({ error: "Failed to delete leave request" });
  }
};
