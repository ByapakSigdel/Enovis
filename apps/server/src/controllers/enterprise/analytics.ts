import { Response } from "express";
import db from "../../config/database";
import { AuthRequest } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function countBy<T>(rows: T[], key: keyof T): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const k = String(row[key] ?? "unknown");
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}

// ---------------------------------------------------------------------------
// 1. Dashboard — enterprise overview
// ---------------------------------------------------------------------------

export async function getDashboard(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;

    const [
      projectsRes,
      ordersRes,
      contactsRes,
      dealsRes,
      invoicesRes,
      timeClockRes,
      membersRes,
    ] = await Promise.all([
      db.execute("SELECT * FROM projects WHERE enterprise_id = ?", [enterpriseId]),
      db.execute("SELECT * FROM orders WHERE enterprise_id = ?", [enterpriseId]),
      db.execute("SELECT * FROM crm_contacts WHERE enterprise_id = ?", [enterpriseId]),
      db.execute("SELECT * FROM crm_deals WHERE enterprise_id = ?", [enterpriseId]),
      db.execute("SELECT * FROM invoices WHERE enterprise_id = ?", [enterpriseId]),
      db.execute("SELECT * FROM time_clock WHERE enterprise_id = ?", [enterpriseId]),
      db.execute("SELECT * FROM enterprise_members WHERE enterprise_id = ?", [enterpriseId]),
    ]);

    // Projects
    const projects = projectsRes.rows;
    const projectsByStatus = countBy(projects, "status");

    // Orders
    const orders = ordersRes.rows;
    const ordersTotalAmount = orders.reduce((sum, r) => sum + toNumber(r.total_amount), 0);

    // Contacts
    const contacts = contactsRes.rows;
    const contactsByType = countBy(contacts, "type");

    // Deals
    const deals = dealsRes.rows;
    const dealsTotalValue = deals.reduce((sum, r) => sum + toNumber(r.deal_value), 0);
    const dealsByStatus = countBy(deals, "status");

    // Invoices
    const invoices = invoicesRes.rows;
    const invoicesTotal = invoices.reduce((sum, r) => sum + toNumber(r.total), 0);
    const invoicesByStatus = countBy(invoices, "status");
    const invoicesAmountPaid = invoices.reduce((sum, r) => sum + toNumber(r.amount_paid), 0);

    // Time clock
    const timeEntries = timeClockRes.rows;

    // Members
    const members = membersRes.rows;

    res.json({
      success: true,
      data: {
        projects: {
          total: projects.length,
          by_status: projectsByStatus,
        },
        orders: {
          total: orders.length,
          total_amount: ordersTotalAmount,
        },
        contacts: {
          total: contacts.length,
          by_type: contactsByType,
        },
        deals: {
          total: deals.length,
          total_value: dealsTotalValue,
          by_status: dealsByStatus,
        },
        invoices: {
          total: invoices.length,
          total_invoiced: invoicesTotal,
          total_paid: invoicesAmountPaid,
          by_status: invoicesByStatus,
        },
        time_clock: {
          total_entries: timeEntries.length,
        },
        members: {
          total: members.length,
        },
      },
    });
  } catch (err) {
    console.error("[Analytics] getDashboard error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 2. Project Stats
// ---------------------------------------------------------------------------

export async function getProjectStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;

    const result = await db.execute(
      "SELECT * FROM projects WHERE enterprise_id = ?",
      [enterpriseId]
    );
    const projects = result.rows;

    const byStatus: Record<string, {
      count: number;
      estimated_hours: number;
      actual_hours: number;
      budget_amount: number;
      actual_cost: number;
    }> = {};

    let totalEstimatedHours = 0;
    let totalActualHours = 0;
    let totalBudget = 0;
    let totalActualCost = 0;

    for (const p of projects) {
      const status = String(p.status ?? "unknown");
      if (!byStatus[status]) {
        byStatus[status] = {
          count: 0,
          estimated_hours: 0,
          actual_hours: 0,
          budget_amount: 0,
          actual_cost: 0,
        };
      }

      const est = toNumber(p.estimated_hours);
      const act = toNumber(p.actual_hours);
      const bud = toNumber(p.budget_amount);
      const cost = toNumber(p.actual_cost);

      byStatus[status].count += 1;
      byStatus[status].estimated_hours += est;
      byStatus[status].actual_hours += act;
      byStatus[status].budget_amount += bud;
      byStatus[status].actual_cost += cost;

      totalEstimatedHours += est;
      totalActualHours += act;
      totalBudget += bud;
      totalActualCost += cost;
    }

    res.json({
      success: true,
      data: {
        total: projects.length,
        total_estimated_hours: totalEstimatedHours,
        total_actual_hours: totalActualHours,
        total_budget: totalBudget,
        total_actual_cost: totalActualCost,
        by_status: byStatus,
      },
    });
  } catch (err) {
    console.error("[Analytics] getProjectStats error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 3. Sales Stats
// ---------------------------------------------------------------------------

export async function getSalesStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;

    const [ordersRes, dealsRes] = await Promise.all([
      db.execute("SELECT * FROM orders WHERE enterprise_id = ?", [enterpriseId]),
      db.execute("SELECT * FROM crm_deals WHERE enterprise_id = ?", [enterpriseId]),
    ]);

    // Orders — aggregate by month and status
    const orders = ordersRes.rows;
    const ordersByMonth: Record<string, { count: number; total_amount: number }> = {};
    const ordersByStatus: Record<string, { count: number; total_amount: number }> = {};
    const ordersByChannel: Record<string, number> = {};

    for (const o of orders) {
      // By month (YYYY-MM)
      const createdAt = o.created_at ? new Date(o.created_at as string) : null;
      const monthKey = createdAt
        ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`
        : "unknown";
      if (!ordersByMonth[monthKey]) {
        ordersByMonth[monthKey] = { count: 0, total_amount: 0 };
      }
      ordersByMonth[monthKey].count += 1;
      ordersByMonth[monthKey].total_amount += toNumber(o.total_amount);

      // By fulfillment status
      const status = String(o.fulfillment_status ?? "unknown");
      if (!ordersByStatus[status]) {
        ordersByStatus[status] = { count: 0, total_amount: 0 };
      }
      ordersByStatus[status].count += 1;
      ordersByStatus[status].total_amount += toNumber(o.total_amount);

      // By channel
      const channel = String(o.channel ?? "unknown");
      ordersByChannel[channel] = (ordersByChannel[channel] || 0) + 1;
    }

    // Deals — pipeline summary (count & value by stage)
    const deals = dealsRes.rows;
    const dealsByStage: Record<string, { count: number; total_value: number }> = {};

    for (const d of deals) {
      const stage = String(d.stage ?? "unknown");
      if (!dealsByStage[stage]) {
        dealsByStage[stage] = { count: 0, total_value: 0 };
      }
      dealsByStage[stage].count += 1;
      dealsByStage[stage].total_value += toNumber(d.deal_value);
    }

    res.json({
      success: true,
      data: {
        orders: {
          total: orders.length,
          total_amount: orders.reduce((s, o) => s + toNumber(o.total_amount), 0),
          by_month: ordersByMonth,
          by_status: ordersByStatus,
          by_channel: ordersByChannel,
        },
        deals: {
          total: deals.length,
          total_value: deals.reduce((s, d) => s + toNumber(d.deal_value), 0),
          by_stage: dealsByStage,
        },
      },
    });
  } catch (err) {
    console.error("[Analytics] getSalesStats error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 4. Finance Stats
// ---------------------------------------------------------------------------

export async function getFinanceStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;

    const [invoicesRes, accountsRes] = await Promise.all([
      db.execute("SELECT * FROM invoices WHERE enterprise_id = ?", [enterpriseId]),
      db.execute("SELECT * FROM chart_of_accounts WHERE enterprise_id = ?", [enterpriseId]),
    ]);

    // Invoices
    const invoices = invoicesRes.rows;
    const totalInvoiced = invoices.reduce((s, r) => s + toNumber(r.total), 0);
    const totalPaid = invoices.reduce((s, r) => s + toNumber(r.amount_paid), 0);
    const overdueCount = invoices.filter((r) => r.status === "overdue").length;
    const invoicesByStatus = countBy(invoices, "status");

    // Chart of accounts — balances by type
    const accounts = accountsRes.rows;
    const accountsByType: Record<string, { count: number; total_balance: number }> = {};

    for (const a of accounts) {
      const type = String(a.type ?? "unknown");
      if (!accountsByType[type]) {
        accountsByType[type] = { count: 0, total_balance: 0 };
      }
      accountsByType[type].count += 1;
      accountsByType[type].total_balance += toNumber(a.balance);
    }

    res.json({
      success: true,
      data: {
        invoices: {
          total: invoices.length,
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          outstanding: totalInvoiced - totalPaid,
          overdue_count: overdueCount,
          by_status: invoicesByStatus,
        },
        accounts: {
          total: accounts.length,
          by_type: accountsByType,
        },
      },
    });
  } catch (err) {
    console.error("[Analytics] getFinanceStats error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// 5. Team Stats
// ---------------------------------------------------------------------------

export async function getTeamStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const enterpriseId = req.enterpriseId!;

    const [membersRes, timeClockRes] = await Promise.all([
      db.execute("SELECT * FROM enterprise_members WHERE enterprise_id = ?", [enterpriseId]),
      db.execute("SELECT * FROM time_clock WHERE enterprise_id = ?", [enterpriseId]),
    ]);

    // Members — by department & role
    const members = membersRes.rows;
    const membersByDepartment = countBy(members, "department");
    const membersByRole = countBy(members, "role");

    // Time clock — avg hours & total overtime
    const entries = timeClockRes.rows;
    let totalHours = 0;
    let totalOvertime = 0;

    for (const e of entries) {
      totalHours += toNumber(e.total_hours);
      totalOvertime += toNumber(e.overtime_hours);
    }

    const avgHours = entries.length > 0 ? totalHours / entries.length : 0;

    res.json({
      success: true,
      data: {
        members: {
          total: members.length,
          by_department: membersByDepartment,
          by_role: membersByRole,
        },
        time_clock: {
          total_entries: entries.length,
          total_hours: totalHours,
          avg_hours: Math.round(avgHours * 100) / 100,
          total_overtime: totalOvertime,
        },
      },
    });
  } catch (err) {
    console.error("[Analytics] getTeamStats error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
