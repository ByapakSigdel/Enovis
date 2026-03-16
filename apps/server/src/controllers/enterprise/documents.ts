import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatDocument(row: any) {
  return {
    id: row.id?.toString(),
    enterprise_id: row.enterprise_id?.toString(),
    name: row.name,
    path: row.path,
    type: row.type,
    mime_type: row.mime_type,
    size: row.size,
    version: row.version,
    versions: row.versions,
    parent_id: row.parent_id?.toString(),
    uploaded_by: row.uploaded_by?.toString(),
    permissions: row.permissions,
    tags: row.tags,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const getAll = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { parent_id } = req.query;

    let query: string;
    let params: any[];

    if (parent_id) {
      query =
        "SELECT * FROM documents WHERE enterprise_id = ? AND parent_id = ? ALLOW FILTERING";
      params = [enterpriseId, parent_id];
    } else {
      query = "SELECT * FROM documents WHERE enterprise_id = ?";
      params = [enterpriseId];
    }

    const result = await db.execute(query, params, { prepare: true });

    res.json(result.rows.map(formatDocument));
  } catch (error) {
    console.error("[Documents] Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
};

export const getOne = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;

    const query =
      "SELECT * FROM documents WHERE enterprise_id = ? AND id = ?";
    const result = await db.execute(query, [enterpriseId, id], {
      prepare: true,
    });

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.json(formatDocument(result.rows[0]));
  } catch (error) {
    console.error("[Documents] Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
};

export const create = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const userId = req.user!.userId;
    const {
      name,
      path,
      type,
      mime_type,
      size,
      parent_id,
      permissions,
      tags,
      description,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: "Document name is required" });
      return;
    }

    if (!type || !["file", "folder"].includes(type)) {
      res.status(400).json({ error: "Type must be 'file' or 'folder'" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    const query = `INSERT INTO documents (
      id, enterprise_id, name, path, type, mime_type, size, version, versions,
      parent_id, uploaded_by, permissions, tags, description, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      id,
      enterpriseId,
      name,
      path || null,
      type,
      mime_type || null,
      size || null,
      1,
      JSON.stringify([]),
      parent_id || null,
      userId,
      permissions || null,
      tags || null,
      description || null,
      "active",
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json({
      id,
      enterprise_id: enterpriseId,
      name,
      path: path || null,
      type,
      mime_type: mime_type || null,
      size: size || null,
      version: 1,
      versions: JSON.stringify([]),
      parent_id: parent_id || null,
      uploaded_by: userId,
      permissions: permissions || null,
      tags: tags || null,
      description: description || null,
      status: "active",
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error("[Documents] Error creating document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
};

export const update = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;

    const fetchQuery =
      "SELECT * FROM documents WHERE enterprise_id = ? AND id = ?";
    const existing = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const current = existing.rows[0];
    const now = new Date();

    const merged = {
      name: req.body.name ?? current.name,
      description: req.body.description ?? current.description,
      tags: req.body.tags ?? current.tags,
      permissions: req.body.permissions ?? current.permissions,
      status: req.body.status ?? current.status,
    };

    const query = `UPDATE documents SET
      name = ?, description = ?, tags = ?, permissions = ?, status = ?,
      updated_at = ?
      WHERE enterprise_id = ? AND id = ?`;

    const params = [
      merged.name,
      merged.description,
      merged.tags,
      merged.permissions,
      merged.status,
      now,
      enterpriseId,
      id,
    ];

    await db.execute(query, params, { prepare: true });

    res.json({
      ...formatDocument(current),
      ...merged,
      id: current.id?.toString(),
      enterprise_id: current.enterprise_id?.toString(),
      uploaded_by: current.uploaded_by?.toString(),
      parent_id: current.parent_id?.toString(),
      updated_at: now,
    });
  } catch (error) {
    console.error("[Documents] Error updating document:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
};

export const remove = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;

    const fetchQuery =
      "SELECT * FROM documents WHERE enterprise_id = ? AND id = ?";
    const existing = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const query =
      "DELETE FROM documents WHERE enterprise_id = ? AND id = ?";
    await db.execute(query, [enterpriseId, id], { prepare: true });

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("[Documents] Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
};

export const createVersion = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const { path, size } = req.body;

    if (!path) {
      res.status(400).json({ error: "Path is required for new version" });
      return;
    }

    const fetchQuery =
      "SELECT * FROM documents WHERE enterprise_id = ? AND id = ?";
    const existing = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const current = existing.rows[0];
    const now = new Date();
    const newVersion = (current.version || 1) + 1;

    let versions: any[] = [];
    try {
      versions = current.versions ? JSON.parse(current.versions) : [];
    } catch {
      versions = [];
    }

    versions.push({
      version: current.version || 1,
      path: current.path,
      size: current.size,
      updated_at: current.updated_at,
    });

    const query = `UPDATE documents SET
      version = ?, versions = ?, path = ?, size = ?, updated_at = ?
      WHERE enterprise_id = ? AND id = ?`;

    const params = [
      newVersion,
      JSON.stringify(versions),
      path,
      size || current.size,
      now,
      enterpriseId,
      id,
    ];

    await db.execute(query, params, { prepare: true });

    res.json({
      ...formatDocument(current),
      version: newVersion,
      versions: JSON.stringify(versions),
      path,
      size: size || current.size,
      updated_at: now,
    });
  } catch (error) {
    console.error("[Documents] Error creating version:", error);
    res.status(500).json({ error: "Failed to create document version" });
  }
};

export const move = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const { parent_id } = req.body;

    if (parent_id === undefined) {
      res.status(400).json({ error: "parent_id is required" });
      return;
    }

    const fetchQuery =
      "SELECT * FROM documents WHERE enterprise_id = ? AND id = ?";
    const existing = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const current = existing.rows[0];
    const now = new Date();

    const query = `UPDATE documents SET
      parent_id = ?, updated_at = ?
      WHERE enterprise_id = ? AND id = ?`;

    const params = [parent_id || null, now, enterpriseId, id];

    await db.execute(query, params, { prepare: true });

    res.json({
      ...formatDocument(current),
      parent_id: parent_id || null,
      updated_at: now,
    });
  } catch (error) {
    console.error("[Documents] Error moving document:", error);
    res.status(500).json({ error: "Failed to move document" });
  }
};
