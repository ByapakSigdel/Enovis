import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

function formatVendor(row: any) {
  return {
    id: row.id?.toString() ?? null,
    enterprise_id: row.enterprise_id?.toString() ?? null,
    name: row.name ?? null,
    contact_name: row.contact_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    website: row.website ?? null,
    category: row.category ?? null,
    payment_terms: row.payment_terms ?? null,
    rating: row.rating ?? 0,
    performance: row.performance ?? null,
    status: row.status ?? null,
    notes: row.notes ?? null,
    tags: row.tags ?? [],
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function formatPurchaseOrder(row: any) {
  return {
    id: row.id?.toString() ?? null,
    enterprise_id: row.enterprise_id?.toString() ?? null,
    po_number: row.po_number ?? null,
    vendor_id: row.vendor_id?.toString() ?? null,
    items: row.items ?? null,
    subtotal: row.subtotal ?? 0,
    tax: row.tax ?? 0,
    total: row.total ?? 0,
    status: row.status ?? null,
    expected_date: row.expected_date ?? null,
    notes: row.notes ?? null,
    created_by: row.created_by?.toString() ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

// --- Vendors ---

export const getAll = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;

  try {
    const query = "SELECT * FROM vendors WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });
    const vendors = result.rows.map(formatVendor);
    res.json(vendors);
  } catch (error) {
    console.error("[Vendors] Error fetching vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
};

export const getOne = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const query =
      "SELECT * FROM vendors WHERE enterprise_id = ? AND id = ?";
    const result = await db.execute(query, [enterpriseId, id], {
      prepare: true,
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.json(formatVendor(result.rows[0]));
  } catch (error) {
    console.error("[Vendors] Error fetching vendor:", error);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
};

export const create = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;

  try {
    const {
      name,
      contact_name,
      email,
      phone,
      address,
      website,
      category,
      payment_terms,
      tags,
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Vendor name is required" });
    }

    const id = uuidv4();
    const now = new Date();

    const query = `INSERT INTO vendors (
      enterprise_id, id, name, contact_name, email, phone, address, website,
      category, payment_terms, rating, performance, status, notes, tags,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      name,
      contact_name || null,
      email || null,
      phone || null,
      address || null,
      website || null,
      category || null,
      payment_terms || null,
      0,
      null,
      "active",
      notes || null,
      tags || [],
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json(
      formatVendor({
        id,
        enterprise_id: enterpriseId,
        name,
        contact_name: contact_name || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        website: website || null,
        category: category || null,
        payment_terms: payment_terms || null,
        rating: 0,
        performance: null,
        status: "active",
        notes: notes || null,
        tags: tags || [],
        created_at: now,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[Vendors] Error creating vendor:", error);
    res.status(500).json({ error: "Failed to create vendor" });
  }
};

export const update = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM vendors WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const existing = fetchResult.rows[0];
    const updates = req.body;
    const now = new Date();

    const merged = {
      name: updates.name ?? existing.name,
      contact_name: updates.contact_name ?? existing.contact_name,
      email: updates.email ?? existing.email,
      phone: updates.phone ?? existing.phone,
      address: updates.address ?? existing.address,
      website: updates.website ?? existing.website,
      category: updates.category ?? existing.category,
      payment_terms: updates.payment_terms ?? existing.payment_terms,
      rating: updates.rating ?? existing.rating,
      performance: updates.performance ?? existing.performance,
      status: updates.status ?? existing.status,
      notes: updates.notes ?? existing.notes,
      tags: updates.tags ?? existing.tags,
    };

    const query = `INSERT INTO vendors (
      enterprise_id, id, name, contact_name, email, phone, address, website,
      category, payment_terms, rating, performance, status, notes, tags,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      merged.name,
      merged.contact_name,
      merged.email,
      merged.phone,
      merged.address,
      merged.website,
      merged.category,
      merged.payment_terms,
      merged.rating,
      merged.performance,
      merged.status,
      merged.notes,
      merged.tags,
      existing.created_at,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.json(
      formatVendor({
        id,
        enterprise_id: enterpriseId,
        ...merged,
        created_at: existing.created_at,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[Vendors] Error updating vendor:", error);
    res.status(500).json({ error: "Failed to update vendor" });
  }
};

export const remove = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM vendors WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const deleteQuery =
      "DELETE FROM vendors WHERE enterprise_id = ? AND id = ?";
    await db.execute(deleteQuery, [enterpriseId, id], { prepare: true });

    res.json({ message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("[Vendors] Error deleting vendor:", error);
    res.status(500).json({ error: "Failed to delete vendor" });
  }
};

// --- Purchase Orders ---

export const getPurchaseOrders = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;

  try {
    const query = "SELECT * FROM purchase_orders WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });
    const orders = result.rows.map(formatPurchaseOrder);
    res.json(orders);
  } catch (error) {
    console.error("[Vendors] Error fetching purchase orders:", error);
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
};

export const getPurchaseOrder = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const query =
      "SELECT * FROM purchase_orders WHERE enterprise_id = ? AND id = ?";
    const result = await db.execute(query, [enterpriseId, id], {
      prepare: true,
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    res.json(formatPurchaseOrder(result.rows[0]));
  } catch (error) {
    console.error("[Vendors] Error fetching purchase order:", error);
    res.status(500).json({ error: "Failed to fetch purchase order" });
  }
};

export const createPurchaseOrder = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const userId = req.user!.userId;

  try {
    const { vendor_id, items, subtotal, tax, total, expected_date, notes } =
      req.body;

    if (!vendor_id) {
      return res.status(400).json({ error: "vendor_id is required" });
    }

    const id = uuidv4();
    const now = new Date();
    const poNumber =
      "PO-" + require("crypto").randomBytes(3).toString("hex");

    const query = `INSERT INTO purchase_orders (
      enterprise_id, id, po_number, vendor_id, items, subtotal, tax, total,
      status, expected_date, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      poNumber,
      vendor_id,
      items || null,
      subtotal ?? 0,
      tax ?? 0,
      total ?? 0,
      "draft",
      expected_date || null,
      notes || null,
      userId,
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json(
      formatPurchaseOrder({
        id,
        enterprise_id: enterpriseId,
        po_number: poNumber,
        vendor_id,
        items: items || null,
        subtotal: subtotal ?? 0,
        tax: tax ?? 0,
        total: total ?? 0,
        status: "draft",
        expected_date: expected_date || null,
        notes: notes || null,
        created_by: userId,
        created_at: now,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[Vendors] Error creating purchase order:", error);
    res.status(500).json({ error: "Failed to create purchase order" });
  }
};

export const updatePurchaseOrder = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM purchase_orders WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const existing = fetchResult.rows[0];
    const updates = req.body;
    const now = new Date();

    const merged = {
      po_number: updates.po_number ?? existing.po_number,
      vendor_id: updates.vendor_id ?? existing.vendor_id,
      items: updates.items ?? existing.items,
      subtotal: updates.subtotal ?? existing.subtotal,
      tax: updates.tax ?? existing.tax,
      total: updates.total ?? existing.total,
      status: updates.status ?? existing.status,
      expected_date: updates.expected_date ?? existing.expected_date,
      notes: updates.notes ?? existing.notes,
      created_by: existing.created_by,
    };

    const query = `INSERT INTO purchase_orders (
      enterprise_id, id, po_number, vendor_id, items, subtotal, tax, total,
      status, expected_date, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      merged.po_number,
      merged.vendor_id,
      merged.items,
      merged.subtotal,
      merged.tax,
      merged.total,
      merged.status,
      merged.expected_date,
      merged.notes,
      merged.created_by,
      existing.created_at,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.json(
      formatPurchaseOrder({
        id,
        enterprise_id: enterpriseId,
        ...merged,
        created_at: existing.created_at,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[Vendors] Error updating purchase order:", error);
    res.status(500).json({ error: "Failed to update purchase order" });
  }
};

export const removePurchaseOrder = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM purchase_orders WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const deleteQuery =
      "DELETE FROM purchase_orders WHERE enterprise_id = ? AND id = ?";
    await db.execute(deleteQuery, [enterpriseId, id], { prepare: true });

    res.json({ message: "Purchase order deleted successfully" });
  } catch (error) {
    console.error("[Vendors] Error deleting purchase order:", error);
    res.status(500).json({ error: "Failed to delete purchase order" });
  }
};
