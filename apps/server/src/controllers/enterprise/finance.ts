import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

function formatAccount(row: any) {
  return {
    id: row.id?.toString() ?? null,
    enterprise_id: row.enterprise_id?.toString() ?? null,
    code: row.code ?? null,
    name: row.name ?? null,
    type: row.type ?? null,
    parent_id: row.parent_id?.toString() ?? null,
    balance: row.balance ?? 0,
    currency: row.currency ?? null,
    description: row.description ?? null,
    is_active: row.is_active ?? true,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function formatEntry(row: any) {
  return {
    id: row.id?.toString() ?? null,
    enterprise_id: row.enterprise_id?.toString() ?? null,
    entry_number: row.entry_number ?? null,
    date: row.date ?? null,
    description: row.description ?? null,
    line_items: row.line_items ?? null,
    status: row.status ?? null,
    created_by: row.created_by?.toString() ?? null,
    approved_by: row.approved_by?.toString() ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

// --- Chart of Accounts ---

export const getAccounts = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;

  try {
    const query = "SELECT * FROM chart_of_accounts WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });
    const accounts = result.rows.map(formatAccount);
    res.json(accounts);
  } catch (error) {
    console.error("[Finance] Error fetching accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
};

export const getAccount = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const query =
      "SELECT * FROM chart_of_accounts WHERE enterprise_id = ? AND id = ?";
    const result = await db.execute(query, [enterpriseId, id], {
      prepare: true,
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    res.json(formatAccount(result.rows[0]));
  } catch (error) {
    console.error("[Finance] Error fetching account:", error);
    res.status(500).json({ error: "Failed to fetch account" });
  }
};

export const createAccount = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;

  try {
    const { code, name, type, parent_id, currency, description } = req.body;

    if (!code || !name || !type) {
      return res
        .status(400)
        .json({ error: "code, name, and type are required" });
    }

    const validTypes = ["asset", "liability", "equity", "revenue", "expense"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid account type: ${type}. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    const id = uuidv4();
    const now = new Date();

    const query = `INSERT INTO chart_of_accounts (
      enterprise_id, id, code, name, type, parent_id, balance, currency,
      description, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      code,
      name,
      type,
      parent_id || null,
      0,
      currency || null,
      description || null,
      true,
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json(
      formatAccount({
        id,
        enterprise_id: enterpriseId,
        code,
        name,
        type,
        parent_id: parent_id || null,
        balance: 0,
        currency: currency || null,
        description: description || null,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[Finance] Error creating account:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
};

export const updateAccount = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM chart_of_accounts WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const existing = fetchResult.rows[0];
    const updates = req.body;
    const now = new Date();

    const merged = {
      code: updates.code ?? existing.code,
      name: updates.name ?? existing.name,
      type: updates.type ?? existing.type,
      parent_id: updates.parent_id ?? existing.parent_id,
      balance: updates.balance ?? existing.balance,
      currency: updates.currency ?? existing.currency,
      description: updates.description ?? existing.description,
      is_active: updates.is_active ?? existing.is_active,
    };

    const query = `INSERT INTO chart_of_accounts (
      enterprise_id, id, code, name, type, parent_id, balance, currency,
      description, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      merged.code,
      merged.name,
      merged.type,
      merged.parent_id,
      merged.balance,
      merged.currency,
      merged.description,
      merged.is_active,
      existing.created_at,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.json(
      formatAccount({
        id,
        enterprise_id: enterpriseId,
        ...merged,
        created_at: existing.created_at,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[Finance] Error updating account:", error);
    res.status(500).json({ error: "Failed to update account" });
  }
};

export const removeAccount = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM chart_of_accounts WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const deleteQuery =
      "DELETE FROM chart_of_accounts WHERE enterprise_id = ? AND id = ?";
    await db.execute(deleteQuery, [enterpriseId, id], { prepare: true });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("[Finance] Error deleting account:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
};

// --- Accounting Entries ---

export const getEntries = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;

  try {
    const query = "SELECT * FROM accounting_entries WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });
    const entries = result.rows.map(formatEntry);
    res.json(entries);
  } catch (error) {
    console.error("[Finance] Error fetching entries:", error);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
};

export const getEntry = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const query =
      "SELECT * FROM accounting_entries WHERE enterprise_id = ? AND id = ?";
    const result = await db.execute(query, [enterpriseId, id], {
      prepare: true,
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json(formatEntry(result.rows[0]));
  } catch (error) {
    console.error("[Finance] Error fetching entry:", error);
    res.status(500).json({ error: "Failed to fetch entry" });
  }
};

export const createEntry = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const userId = req.user!.userId;

  try {
    const { date, description, line_items } = req.body;

    if (!date || !description || !line_items) {
      return res
        .status(400)
        .json({ error: "date, description, and line_items are required" });
    }

    let parsedItems: Array<{ account_id: string; debit: number; credit: number }>;
    try {
      parsedItems =
        typeof line_items === "string" ? JSON.parse(line_items) : line_items;
    } catch {
      return res.status(400).json({ error: "line_items must be valid JSON" });
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res
        .status(400)
        .json({ error: "line_items must be a non-empty array" });
    }

    const totalDebits = parsedItems.reduce(
      (sum, item) => sum + (item.debit || 0),
      0
    );
    const totalCredits = parsedItems.reduce(
      (sum, item) => sum + (item.credit || 0),
      0
    );

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      return res.status(400).json({
        error: `Total debits (${totalDebits}) must equal total credits (${totalCredits})`,
      });
    }

    const id = uuidv4();
    const now = new Date();
    const entryNumber =
      "JE-" + require("crypto").randomBytes(3).toString("hex");
    const lineItemsStr =
      typeof line_items === "string" ? line_items : JSON.stringify(line_items);

    const query = `INSERT INTO accounting_entries (
      enterprise_id, id, entry_number, date, description, line_items,
      status, created_by, approved_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      entryNumber,
      date,
      description,
      lineItemsStr,
      "draft",
      userId,
      null,
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json(
      formatEntry({
        id,
        enterprise_id: enterpriseId,
        entry_number: entryNumber,
        date,
        description,
        line_items: lineItemsStr,
        status: "draft",
        created_by: userId,
        approved_by: null,
        created_at: now,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[Finance] Error creating entry:", error);
    res.status(500).json({ error: "Failed to create entry" });
  }
};

export const updateEntry = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM accounting_entries WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const existing = fetchResult.rows[0];
    const updates = req.body;
    const now = new Date();

    const merged = {
      entry_number: updates.entry_number ?? existing.entry_number,
      date: updates.date ?? existing.date,
      description: updates.description ?? existing.description,
      line_items: updates.line_items ?? existing.line_items,
      status: updates.status ?? existing.status,
      created_by: existing.created_by,
      approved_by: updates.approved_by ?? existing.approved_by,
    };

    const query = `INSERT INTO accounting_entries (
      enterprise_id, id, entry_number, date, description, line_items,
      status, created_by, approved_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      merged.entry_number,
      merged.date,
      merged.description,
      merged.line_items,
      merged.status,
      merged.created_by,
      merged.approved_by,
      existing.created_at,
      now,
    ];

    await db.execute(query, params, { prepare: true });

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
    console.error("[Finance] Error updating entry:", error);
    res.status(500).json({ error: "Failed to update entry" });
  }
};

export const removeEntry = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM accounting_entries WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const deleteQuery =
      "DELETE FROM accounting_entries WHERE enterprise_id = ? AND id = ?";
    await db.execute(deleteQuery, [enterpriseId, id], { prepare: true });

    res.json({ message: "Entry deleted successfully" });
  } catch (error) {
    console.error("[Finance] Error deleting entry:", error);
    res.status(500).json({ error: "Failed to delete entry" });
  }
};

export const approveEntry = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM accounting_entries WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const existing = fetchResult.rows[0];

    if (existing.status === "approved") {
      return res.status(400).json({ error: "Entry is already approved" });
    }

    const now = new Date();

    // Parse line items to update account balances
    let parsedItems: Array<{ account_id: string; debit: number; credit: number }>;
    try {
      parsedItems =
        typeof existing.line_items === "string"
          ? JSON.parse(existing.line_items)
          : existing.line_items;
    } catch {
      return res
        .status(500)
        .json({ error: "Failed to parse entry line items" });
    }

    // Update each account's balance based on line items
    for (const item of parsedItems) {
      const accountQuery =
        "SELECT * FROM chart_of_accounts WHERE enterprise_id = ? AND id = ?";
      const accountResult = await db.execute(
        accountQuery,
        [enterpriseId, item.account_id],
        { prepare: true }
      );

      if (accountResult.rows.length === 0) {
        return res.status(400).json({
          error: `Account ${item.account_id} not found`,
        });
      }

      const account = accountResult.rows[0];
      let newBalance = account.balance ?? 0;
      const accountType = account.type;

      // Debit increases asset/expense, credit increases liability/equity/revenue
      if (accountType === "asset" || accountType === "expense") {
        newBalance += (item.debit || 0) - (item.credit || 0);
      } else {
        // liability, equity, revenue
        newBalance += (item.credit || 0) - (item.debit || 0);
      }

      const updateAccountQuery = `INSERT INTO chart_of_accounts (
        enterprise_id, id, code, name, type, parent_id, balance, currency,
        description, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const updateAccountParams = [
        enterpriseId,
        item.account_id,
        account.code,
        account.name,
        account.type,
        account.parent_id,
        newBalance,
        account.currency,
        account.description,
        account.is_active,
        account.created_at,
        now,
      ];

      await db.execute(updateAccountQuery, updateAccountParams, {
        prepare: true,
      });
    }

    // Update the entry status to approved
    const updateQuery = `INSERT INTO accounting_entries (
      enterprise_id, id, entry_number, date, description, line_items,
      status, created_by, approved_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const updateParams = [
      enterpriseId,
      id,
      existing.entry_number,
      existing.date,
      existing.description,
      existing.line_items,
      "approved",
      existing.created_by,
      userId,
      existing.created_at,
      now,
    ];

    await db.execute(updateQuery, updateParams, { prepare: true });

    res.json(
      formatEntry({
        id,
        enterprise_id: enterpriseId,
        entry_number: existing.entry_number,
        date: existing.date,
        description: existing.description,
        line_items: existing.line_items,
        status: "approved",
        created_by: existing.created_by,
        approved_by: userId,
        created_at: existing.created_at,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("[Finance] Error approving entry:", error);
    res.status(500).json({ error: "Failed to approve entry" });
  }
};
