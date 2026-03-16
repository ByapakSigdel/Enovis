import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";
import { signToken } from "../../utils/jwt";

function formatEnterprise(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    industry: row.industry,
    size: row.size,
    owner_id: String(row.owner_id),
    logo: row.logo,
    website: row.website,
    address: row.address,
    phone: row.phone,
    settings: row.settings,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatMember(row: Record<string, unknown>) {
  return {
    enterprise_id: String(row.enterprise_id),
    user_id: String(row.user_id),
    role: row.role,
    department: row.department,
    title: row.title,
    status: row.status,
    invited_by: row.invited_by ? String(row.invited_by) : null,
    joined_at: row.joined_at,
  };
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { name, industry, size } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: "Name is required" });
      return;
    }

    const id = uuidv4();
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const now = new Date();

    await db.execute(
      `INSERT INTO enterprises (id, name, slug, industry, size, owner_id, logo, website, address, phone, settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, slug, industry || null, size || null, userId, null, null, null, null, null, now, now]
    );

    await db.execute(
      `INSERT INTO enterprise_members (enterprise_id, user_id, role, department, title, status, invited_by, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, "owner", null, null, "active", null, now]
    );

    await db.execute(
      `INSERT INTO user_enterprises (user_id, enterprise_id, role, enterprise_name, joined_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, id, "owner", name, now]
    );

    await db.execute(
      `UPDATE users SET mode = ?, updated_at = ? WHERE id = ?`,
      ["enterprise", now, userId]
    );

    const token = signToken({
      userId,
      email: req.user!.email,
      mode: "enterprise",
      enterpriseId: id,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        enterprise: {
          id,
          name,
          slug,
          industry: industry || null,
          size: size || null,
          owner_id: userId,
          logo: null,
          website: null,
          address: null,
          phone: null,
          settings: null,
          created_at: now,
          updated_at: now,
        },
      },
    });
  } catch (err) {
    console.error("[Enterprises] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM user_enterprises WHERE user_id = ?", [userId]);
    res.json({
      success: true,
      data: result.rows.map((row) => ({
        enterprise_id: String(row.enterprise_id),
        user_id: String(row.user_id),
        role: row.role,
        enterprise_name: row.enterprise_name,
        joined_at: row.joined_at,
      })),
    });
  } catch (err) {
    console.error("[Enterprises] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const result = await db.execute("SELECT * FROM enterprises WHERE id = ?", [enterpriseId]);

    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Enterprise not found" });
      return;
    }

    res.json({ success: true, data: formatEnterprise(result.rows[0]) });
  } catch (err) {
    console.error("[Enterprises] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const role = req.enterpriseRole;

    if (role !== "owner" && role !== "admin") {
      res.status(403).json({ success: false, error: "Only owner or admin can update the enterprise" });
      return;
    }

    const existing = await db.execute("SELECT * FROM enterprises WHERE id = ?", [enterpriseId]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Enterprise not found" });
      return;
    }

    const row = existing.rows[0];
    const { name, industry, size, logo, website, address, phone, settings } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE enterprises SET name = ?, industry = ?, size = ?, logo = ?, website = ?, address = ?, phone = ?, settings = ?, updated_at = ?
       WHERE id = ?`,
      [
        name ?? row.name,
        industry ?? row.industry,
        size ?? row.size,
        logo ?? row.logo,
        website ?? row.website,
        address ?? row.address,
        phone ?? row.phone,
        settings ?? row.settings,
        now,
        enterpriseId,
      ]
    );

    res.json({ success: true, data: { id: enterpriseId, updated_at: now } });
  } catch (err) {
    console.error("[Enterprises] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const result = await db.execute("SELECT * FROM enterprise_members WHERE enterprise_id = ?", [enterpriseId]);
    res.json({ success: true, data: result.rows.map(formatMember) });
  } catch (err) {
    console.error("[Enterprises] getMembers error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function addMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const invitedBy = req.user!.userId;
    const role = req.enterpriseRole;

    if (role !== "owner" && role !== "admin") {
      res.status(403).json({ success: false, error: "Only owner or admin can add members" });
      return;
    }

    const { user_id, role: memberRole, department, title } = req.body;

    if (!user_id) {
      res.status(400).json({ success: false, error: "user_id is required" });
      return;
    }

    const now = new Date();

    // Get enterprise name for user_enterprises
    const entResult = await db.execute("SELECT name FROM enterprises WHERE id = ?", [enterpriseId]);
    const enterpriseName = entResult.rowLength > 0 ? entResult.rows[0].name : null;

    await db.execute(
      `INSERT INTO enterprise_members (enterprise_id, user_id, role, department, title, status, invited_by, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [enterpriseId, user_id, memberRole || "member", department || null, title || null, "active", invitedBy, now]
    );

    await db.execute(
      `INSERT INTO user_enterprises (user_id, enterprise_id, role, enterprise_name, joined_at)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, enterpriseId, memberRole || "member", enterpriseName, now]
    );

    res.status(201).json({
      success: true,
      data: {
        enterprise_id: enterpriseId,
        user_id,
        role: memberRole || "member",
        department: department || null,
        title: title || null,
        status: "active",
        invited_by: invitedBy,
        joined_at: now,
      },
    });
  } catch (err) {
    console.error("[Enterprises] addMember error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function removeMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const role = req.enterpriseRole;

    if (role !== "owner" && role !== "admin") {
      res.status(403).json({ success: false, error: "Only owner or admin can remove members" });
      return;
    }

    const { userId } = req.params;

    // Check if the member is the owner
    const memberResult = await db.execute(
      "SELECT role FROM enterprise_members WHERE enterprise_id = ? AND user_id = ?",
      [enterpriseId, userId]
    );

    if (memberResult.rowLength === 0) {
      res.status(404).json({ success: false, error: "Member not found" });
      return;
    }

    if (memberResult.rows[0].role === "owner") {
      res.status(403).json({ success: false, error: "Cannot remove the owner of the enterprise" });
      return;
    }

    await db.execute(
      "DELETE FROM enterprise_members WHERE enterprise_id = ? AND user_id = ?",
      [enterpriseId, userId]
    );

    await db.execute(
      "DELETE FROM user_enterprises WHERE user_id = ? AND enterprise_id = ?",
      [userId, enterpriseId]
    );

    res.json({ success: true, message: "Member removed" });
  } catch (err) {
    console.error("[Enterprises] removeMember error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function updateMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const callerRole = req.enterpriseRole;

    if (callerRole !== "owner" && callerRole !== "admin") {
      res.status(403).json({ success: false, error: "Only owner or admin can update members" });
      return;
    }

    const { userId } = req.params;
    const { role, department, title } = req.body;

    const existing = await db.execute(
      "SELECT * FROM enterprise_members WHERE enterprise_id = ? AND user_id = ?",
      [enterpriseId, userId]
    );

    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Member not found" });
      return;
    }

    const row = existing.rows[0];

    await db.execute(
      `UPDATE enterprise_members SET role = ?, department = ?, title = ?
       WHERE enterprise_id = ? AND user_id = ?`,
      [
        role ?? row.role,
        department ?? row.department,
        title ?? row.title,
        enterpriseId,
        userId,
      ]
    );

    // Also update role in user_enterprises if role changed
    if (role && role !== row.role) {
      await db.execute(
        `UPDATE user_enterprises SET role = ? WHERE user_id = ? AND enterprise_id = ?`,
        [role, userId, enterpriseId]
      );
    }

    res.json({ success: true, data: { enterprise_id: enterpriseId, user_id: userId, updated: true } });
  } catch (err) {
    console.error("[Enterprises] updateMember error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
