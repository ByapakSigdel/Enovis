import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

function formatOrder(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    enterprise_id: String(row.enterprise_id),
    order_number: row.order_number,
    type: row.type,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    customer_address: row.customer_address,
    items: row.items,
    subtotal: row.subtotal,
    tax_total: row.tax_total,
    shipping_cost: row.shipping_cost,
    discount: row.discount,
    total_amount: row.total_amount,
    fulfillment_status: row.fulfillment_status,
    payment_status: row.payment_status,
    payment_method: row.payment_method,
    channel: row.channel,
    notes: row.notes,
    shipping_address: row.shipping_address,
    tracking_number: row.tracking_number,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const result = await db.execute("SELECT * FROM orders WHERE enterprise_id = ?", [enterpriseId]);
    res.json({ success: true, data: result.rows.map(formatOrder) });
  } catch (err) {
    console.error("[Orders] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM orders WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Order not found" });
      return;
    }
    res.json({ success: true, data: formatOrder(result.rows[0]) });
  } catch (err) {
    console.error("[Orders] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const userId = req.user!.userId;
    const {
      type,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      items,
      subtotal,
      tax_total,
      shipping_cost,
      discount,
      total_amount,
      payment_method,
      channel,
      notes,
      shipping_address,
    } = req.body;

    if (!type || !customer_name || total_amount === undefined) {
      res.status(400).json({ success: false, error: "Type, customer_name, and total_amount are required" });
      return;
    }

    const id = uuidv4();
    const orderNumber = "ORD-" + uuidv4().replace(/-/g, "").substring(0, 6).toUpperCase();
    const now = new Date();

    await db.execute(
      `INSERT INTO orders (id, enterprise_id, order_number, type, customer_name, customer_email, customer_phone, customer_address, items, subtotal, tax_total, shipping_cost, discount, total_amount, fulfillment_status, payment_status, payment_method, channel, notes, shipping_address, tracking_number, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        enterpriseId,
        orderNumber,
        type,
        customer_name,
        customer_email || null,
        customer_phone || null,
        customer_address || null,
        items || null,
        subtotal ?? 0,
        tax_total ?? 0,
        shipping_cost ?? 0,
        discount ?? 0,
        total_amount,
        "pending",
        "unpaid",
        payment_method || null,
        channel || null,
        notes || null,
        shipping_address || null,
        null,
        userId,
        now,
        now,
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id,
        enterprise_id: enterpriseId,
        order_number: orderNumber,
        type,
        customer_name,
        customer_email: customer_email || null,
        customer_phone: customer_phone || null,
        customer_address: customer_address || null,
        items: items || null,
        subtotal: subtotal ?? 0,
        tax_total: tax_total ?? 0,
        shipping_cost: shipping_cost ?? 0,
        discount: discount ?? 0,
        total_amount,
        fulfillment_status: "pending",
        payment_status: "unpaid",
        payment_method: payment_method || null,
        channel: channel || null,
        notes: notes || null,
        shipping_address: shipping_address || null,
        tracking_number: null,
        created_by: userId,
        created_at: now,
        updated_at: now,
      },
    });
  } catch (err) {
    console.error("[Orders] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM orders WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Order not found" });
      return;
    }

    const row = existing.rows[0];
    const {
      type,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      items,
      subtotal,
      tax_total,
      shipping_cost,
      discount,
      total_amount,
      fulfillment_status,
      payment_status,
      payment_method,
      channel,
      notes,
      shipping_address,
      tracking_number,
    } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE orders SET type = ?, customer_name = ?, customer_email = ?, customer_phone = ?, customer_address = ?, items = ?, subtotal = ?, tax_total = ?, shipping_cost = ?, discount = ?, total_amount = ?, fulfillment_status = ?, payment_status = ?, payment_method = ?, channel = ?, notes = ?, shipping_address = ?, tracking_number = ?, updated_at = ?
       WHERE enterprise_id = ? AND id = ?`,
      [
        type ?? row.type,
        customer_name ?? row.customer_name,
        customer_email ?? row.customer_email,
        customer_phone ?? row.customer_phone,
        customer_address ?? row.customer_address,
        items ?? row.items,
        subtotal ?? row.subtotal,
        tax_total ?? row.tax_total,
        shipping_cost ?? row.shipping_cost,
        discount ?? row.discount,
        total_amount ?? row.total_amount,
        fulfillment_status ?? row.fulfillment_status,
        payment_status ?? row.payment_status,
        payment_method ?? row.payment_method,
        channel ?? row.channel,
        notes ?? row.notes,
        shipping_address ?? row.shipping_address,
        tracking_number ?? row.tracking_number,
        now,
        enterpriseId,
        id,
      ]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Orders] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    await db.execute("DELETE FROM orders WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    console.error("[Orders] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function updateFulfillmentStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const { status, tracking_number } = req.body;

    if (!status) {
      res.status(400).json({ success: false, error: "Status is required" });
      return;
    }

    const existing = await db.execute("SELECT * FROM orders WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Order not found" });
      return;
    }

    const now = new Date();
    const row = existing.rows[0];

    await db.execute(
      `UPDATE orders SET fulfillment_status = ?, tracking_number = ?, updated_at = ?
       WHERE enterprise_id = ? AND id = ?`,
      [status, tracking_number ?? row.tracking_number, now, enterpriseId, id]
    );

    res.json({ success: true, data: { id, fulfillment_status: status, tracking_number: tracking_number ?? row.tracking_number, updated_at: now } });
  } catch (err) {
    console.error("[Orders] updateFulfillmentStatus error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function updatePaymentStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const { payment_status, payment_method } = req.body;

    if (!payment_status) {
      res.status(400).json({ success: false, error: "Payment status is required" });
      return;
    }

    const existing = await db.execute("SELECT * FROM orders WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Order not found" });
      return;
    }

    const now = new Date();
    const row = existing.rows[0];

    await db.execute(
      `UPDATE orders SET payment_status = ?, payment_method = ?, updated_at = ?
       WHERE enterprise_id = ? AND id = ?`,
      [payment_status, payment_method ?? row.payment_method, now, enterpriseId, id]
    );

    res.json({ success: true, data: { id, payment_status, payment_method: payment_method ?? row.payment_method, updated_at: now } });
  } catch (err) {
    console.error("[Orders] updatePaymentStatus error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
