import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

// ── Formatters ──────────────────────────────────────────────────────────────

function formatContact(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    enterprise_id: String(row.enterprise_id),
    type: row.type,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    company_name: row.company_name,
    company_website: row.company_website,
    company_size: row.company_size,
    source: row.source,
    status: row.status,
    lead_score: row.lead_score,
    owner: row.owner ? String(row.owner) : null,
    tags: row.tags,
    notes: row.notes,
    address: row.address,
    last_contacted: row.last_contacted,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatDeal(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    enterprise_id: String(row.enterprise_id),
    deal_name: row.deal_name,
    contact_id: row.contact_id ? String(row.contact_id) : null,
    pipeline_id: row.pipeline_id ? String(row.pipeline_id) : null,
    stage: row.stage,
    deal_value: row.deal_value,
    probability: row.probability,
    expected_close_date: row.expected_close_date,
    status: row.status,
    products: row.products,
    owner: row.owner ? String(row.owner) : null,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatPipeline(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    enterprise_id: String(row.enterprise_id),
    name: row.name,
    stages: row.stages,
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── Contacts ────────────────────────────────────────────────────────────────

export async function getContacts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const result = await db.execute("SELECT * FROM crm_contacts WHERE enterprise_id = ?", [enterpriseId]);
    res.json({ success: true, data: result.rows.map(formatContact) });
  } catch (err) {
    console.error("[CRM] getContacts error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getContact(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM crm_contacts WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }
    res.json({ success: true, data: formatContact(result.rows[0]) });
  } catch (err) {
    console.error("[CRM] getContact error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function createContact(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const userId = req.user!.userId;
    const { type, first_name, last_name, email, phone, company_name, company_website, company_size, source, tags, notes, address } = req.body;

    if (!first_name || !last_name) {
      res.status(400).json({ success: false, error: "First name and last name are required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO crm_contacts (id, enterprise_id, type, first_name, last_name, email, phone, company_name, company_website, company_size, source, status, lead_score, owner, tags, notes, address, last_contacted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, enterpriseId, type || null, first_name, last_name, email || null, phone || null, company_name || null, company_website || null, company_size || null, source || null, "active", 0, userId, tags || [], notes || null, address || null, null, now, now]
    );

    res.status(201).json({
      success: true,
      data: {
        id, enterprise_id: enterpriseId, type, first_name, last_name, email, phone, company_name,
        company_website, company_size, source, status: "active", lead_score: 0, owner: userId,
        tags: tags || [], notes, address, last_contacted: null, created_at: now, updated_at: now,
      },
    });
  } catch (err) {
    console.error("[CRM] createContact error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function updateContact(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM crm_contacts WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }

    const row = existing.rows[0];
    const { type, first_name, last_name, email, phone, company_name, company_website, company_size, source, status, lead_score, tags, notes, address, last_contacted } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE crm_contacts SET type = ?, first_name = ?, last_name = ?, email = ?, phone = ?, company_name = ?, company_website = ?, company_size = ?, source = ?, status = ?, lead_score = ?, tags = ?, notes = ?, address = ?, last_contacted = ?, updated_at = ?
       WHERE enterprise_id = ? AND id = ?`,
      [
        type ?? row.type, first_name ?? row.first_name, last_name ?? row.last_name, email ?? row.email,
        phone ?? row.phone, company_name ?? row.company_name, company_website ?? row.company_website,
        company_size ?? row.company_size, source ?? row.source, status ?? row.status,
        lead_score ?? row.lead_score, tags ?? row.tags, notes ?? row.notes, address ?? row.address,
        last_contacted ?? row.last_contacted, now, enterpriseId, id,
      ]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[CRM] updateContact error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function removeContact(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    await db.execute("DELETE FROM crm_contacts WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    res.json({ success: true, message: "Contact deleted" });
  } catch (err) {
    console.error("[CRM] removeContact error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

// ── Deals ───────────────────────────────────────────────────────────────────

export async function getDeals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const result = await db.execute("SELECT * FROM crm_deals WHERE enterprise_id = ?", [enterpriseId]);
    res.json({ success: true, data: result.rows.map(formatDeal) });
  } catch (err) {
    console.error("[CRM] getDeals error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getDeal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM crm_deals WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Deal not found" });
      return;
    }
    res.json({ success: true, data: formatDeal(result.rows[0]) });
  } catch (err) {
    console.error("[CRM] getDeal error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function createDeal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const userId = req.user!.userId;
    const { deal_name, contact_id, pipeline_id, stage, deal_value, probability, expected_close_date, products, notes } = req.body;

    if (!deal_name) {
      res.status(400).json({ success: false, error: "Deal name is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO crm_deals (id, enterprise_id, deal_name, contact_id, pipeline_id, stage, deal_value, probability, expected_close_date, status, products, owner, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, enterpriseId, deal_name, contact_id || null, pipeline_id || null, stage || null, deal_value || 0, probability || 0, expected_close_date || null, "open", products || null, userId, notes || null, now, now]
    );

    res.status(201).json({
      success: true,
      data: {
        id, enterprise_id: enterpriseId, deal_name, contact_id, pipeline_id, stage,
        deal_value: deal_value || 0, probability: probability || 0, expected_close_date,
        status: "open", products, owner: userId, notes, created_at: now, updated_at: now,
      },
    });
  } catch (err) {
    console.error("[CRM] createDeal error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function updateDeal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM crm_deals WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Deal not found" });
      return;
    }

    const row = existing.rows[0];
    const { deal_name, contact_id, pipeline_id, stage, deal_value, probability, expected_close_date, status, products, notes } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE crm_deals SET deal_name = ?, contact_id = ?, pipeline_id = ?, stage = ?, deal_value = ?, probability = ?, expected_close_date = ?, status = ?, products = ?, notes = ?, updated_at = ?
       WHERE enterprise_id = ? AND id = ?`,
      [
        deal_name ?? row.deal_name, contact_id ?? row.contact_id, pipeline_id ?? row.pipeline_id,
        stage ?? row.stage, deal_value ?? row.deal_value, probability ?? row.probability,
        expected_close_date ?? row.expected_close_date, status ?? row.status,
        products ?? row.products, notes ?? row.notes, now, enterpriseId, id,
      ]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[CRM] updateDeal error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function removeDeal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    await db.execute("DELETE FROM crm_deals WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    res.json({ success: true, message: "Deal deleted" });
  } catch (err) {
    console.error("[CRM] removeDeal error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

// ── Pipelines ───────────────────────────────────────────────────────────────

export async function getPipelines(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const result = await db.execute("SELECT * FROM crm_pipelines WHERE enterprise_id = ?", [enterpriseId]);
    res.json({ success: true, data: result.rows.map(formatPipeline) });
  } catch (err) {
    console.error("[CRM] getPipelines error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function createPipeline(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { name, stages } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: "Pipeline name is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO crm_pipelines (id, enterprise_id, name, stages, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, enterpriseId, name, stages || null, false, now, now]
    );

    res.status(201).json({
      success: true,
      data: { id, enterprise_id: enterpriseId, name, stages, is_default: false, created_at: now, updated_at: now },
    });
  } catch (err) {
    console.error("[CRM] createPipeline error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function updatePipeline(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM crm_pipelines WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Pipeline not found" });
      return;
    }

    const row = existing.rows[0];
    const { name, stages, is_default } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE crm_pipelines SET name = ?, stages = ?, is_default = ?, updated_at = ?
       WHERE enterprise_id = ? AND id = ?`,
      [name ?? row.name, stages ?? row.stages, is_default ?? row.is_default, now, enterpriseId, id]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[CRM] updatePipeline error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function removePipeline(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    await db.execute("DELETE FROM crm_pipelines WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    res.json({ success: true, message: "Pipeline deleted" });
  } catch (err) {
    console.error("[CRM] removePipeline error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
