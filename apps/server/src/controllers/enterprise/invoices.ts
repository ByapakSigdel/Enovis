import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

function formatInvoice(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    enterprise_id: String(row.enterprise_id),
    invoice_number: row.invoice_number,
    order_id: row.order_id ? String(row.order_id) : null,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_address: row.customer_address,
    line_items: row.line_items,
    subtotal: row.subtotal,
    tax_amount: row.tax_amount,
    discount: row.discount,
    total: row.total,
    amount_paid: row.amount_paid,
    status: row.status,
    due_date: row.due_date,
    issued_date: row.issued_date,
    payment_terms: row.payment_terms,
    notes: row.notes,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatPayment(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    enterprise_id: String(row.enterprise_id),
    invoice_id: String(row.invoice_id),
    amount: row.amount,
    method: row.method,
    reference: row.reference,
    date: row.date,
    notes: row.notes,
    created_at: row.created_at,
  };
}

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const result = await db.execute("SELECT * FROM invoices WHERE enterprise_id = ?", [enterpriseId]);
    res.json({ success: true, data: result.rows.map(formatInvoice) });
  } catch (err) {
    console.error("[Invoices] getAll error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const result = await db.execute("SELECT * FROM invoices WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }
    res.json({ success: true, data: formatInvoice(result.rows[0]) });
  } catch (err) {
    console.error("[Invoices] getOne error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const userId = req.user!.userId;
    const {
      order_id,
      customer_name,
      customer_email,
      customer_address,
      line_items,
      subtotal,
      tax_amount,
      discount,
      total,
      due_date,
      issued_date,
      payment_terms,
      notes,
    } = req.body;

    if (!customer_name || total === undefined) {
      res.status(400).json({ success: false, error: "customer_name and total are required" });
      return;
    }

    const id = uuidv4();
    const invoiceNumber = "INV-" + uuidv4().replace(/-/g, "").substring(0, 6).toUpperCase();
    const now = new Date();

    await db.execute(
      `INSERT INTO invoices (id, enterprise_id, invoice_number, order_id, customer_name, customer_email, customer_address, line_items, subtotal, tax_amount, discount, total, amount_paid, status, due_date, issued_date, payment_terms, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        enterpriseId,
        invoiceNumber,
        order_id || null,
        customer_name,
        customer_email || null,
        customer_address || null,
        line_items || null,
        subtotal ?? 0,
        tax_amount ?? 0,
        discount ?? 0,
        total,
        0,
        "draft",
        due_date || null,
        issued_date || null,
        payment_terms || null,
        notes || null,
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
        invoice_number: invoiceNumber,
        order_id: order_id || null,
        customer_name,
        customer_email: customer_email || null,
        customer_address: customer_address || null,
        line_items: line_items || null,
        subtotal: subtotal ?? 0,
        tax_amount: tax_amount ?? 0,
        discount: discount ?? 0,
        total,
        amount_paid: 0,
        status: "draft",
        due_date: due_date || null,
        issued_date: issued_date || null,
        payment_terms: payment_terms || null,
        notes: notes || null,
        created_by: userId,
        created_at: now,
        updated_at: now,
      },
    });
  } catch (err) {
    console.error("[Invoices] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM invoices WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    const row = existing.rows[0];
    const {
      order_id,
      customer_name,
      customer_email,
      customer_address,
      line_items,
      subtotal,
      tax_amount,
      discount,
      total,
      status,
      due_date,
      issued_date,
      payment_terms,
      notes,
    } = req.body;
    const now = new Date();

    await db.execute(
      `UPDATE invoices SET order_id = ?, customer_name = ?, customer_email = ?, customer_address = ?, line_items = ?, subtotal = ?, tax_amount = ?, discount = ?, total = ?, status = ?, due_date = ?, issued_date = ?, payment_terms = ?, notes = ?, updated_at = ?
       WHERE enterprise_id = ? AND id = ?`,
      [
        order_id ?? row.order_id,
        customer_name ?? row.customer_name,
        customer_email ?? row.customer_email,
        customer_address ?? row.customer_address,
        line_items ?? row.line_items,
        subtotal ?? row.subtotal,
        tax_amount ?? row.tax_amount,
        discount ?? row.discount,
        total ?? row.total,
        status ?? row.status,
        due_date ?? row.due_date,
        issued_date ?? row.issued_date,
        payment_terms ?? row.payment_terms,
        notes ?? row.notes,
        now,
        enterpriseId,
        id,
      ]
    );

    res.json({ success: true, data: { id, updated_at: now } });
  } catch (err) {
    console.error("[Invoices] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    await db.execute("DELETE FROM invoices WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    res.json({ success: true, message: "Invoice deleted" });
  } catch (err) {
    console.error("[Invoices] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function sendInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;

    const existing = await db.execute("SELECT * FROM invoices WHERE enterprise_id = ? AND id = ?", [enterpriseId, id]);
    if (existing.rowLength === 0) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    const row = existing.rows[0];
    const now = new Date();
    const issuedDate = row.issued_date || now.toISOString().split("T")[0];

    await db.execute(
      `UPDATE invoices SET status = ?, issued_date = ?, updated_at = ?
       WHERE enterprise_id = ? AND id = ?`,
      ["sent", issuedDate, now, enterpriseId, id]
    );

    res.json({ success: true, data: { id, status: "sent", issued_date: issuedDate, updated_at: now } });
  } catch (err) {
    console.error("[Invoices] sendInvoice error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getPayments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { invoiceId } = req.params;
    const result = await db.execute(
      "SELECT * FROM invoice_payments WHERE enterprise_id = ? AND invoice_id = ?",
      [enterpriseId, invoiceId]
    );
    res.json({ success: true, data: result.rows.map(formatPayment) });
  } catch (err) {
    console.error("[Invoices] getPayments error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function addPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;
    const { invoiceId } = req.params;
    const { amount, method, reference, date, notes } = req.body;

    if (amount === undefined || !method) {
      res.status(400).json({ success: false, error: "amount and method are required" });
      return;
    }

    const invoiceResult = await db.execute(
      "SELECT * FROM invoices WHERE enterprise_id = ? AND id = ?",
      [enterpriseId, invoiceId]
    );
    if (invoiceResult.rowLength === 0) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    const invoice = invoiceResult.rows[0];
    const id = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO invoice_payments (id, enterprise_id, invoice_id, amount, method, reference, date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        enterpriseId,
        invoiceId,
        amount,
        method,
        reference || null,
        date || null,
        notes || null,
        now,
      ]
    );

    const newAmountPaid = (Number(invoice.amount_paid) || 0) + Number(amount);
    const newStatus = newAmountPaid >= Number(invoice.total) ? "paid" : invoice.status;

    await db.execute(
      `UPDATE invoices SET amount_paid = ?, status = ?, updated_at = ?
       WHERE enterprise_id = ? AND id = ?`,
      [newAmountPaid, newStatus, now, enterpriseId, invoiceId]
    );

    res.status(201).json({
      success: true,
      data: {
        payment: {
          id,
          enterprise_id: enterpriseId,
          invoice_id: invoiceId,
          amount,
          method,
          reference: reference || null,
          date: date || null,
          notes: notes || null,
          created_at: now,
        },
        invoice: {
          id: invoiceId,
          amount_paid: newAmountPaid,
          status: newStatus,
          updated_at: now,
        },
      },
    });
  } catch (err) {
    console.error("[Invoices] addPayment error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
