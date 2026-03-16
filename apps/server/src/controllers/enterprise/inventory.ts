import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

function formatProduct(row: any) {
  return {
    id: row.id?.toString() ?? null,
    enterprise_id: row.enterprise_id?.toString() ?? null,
    sku: row.sku ?? null,
    name: row.name ?? null,
    description: row.description ?? null,
    category: row.category ?? null,
    brand: row.brand ?? null,
    variants: row.variants ?? null,
    stock_level: row.stock_level ?? 0,
    reorder_point: row.reorder_point ?? 0,
    cost_price: row.cost_price ?? 0,
    selling_price: row.selling_price ?? 0,
    unit: row.unit ?? null,
    location: row.location ?? null,
    status: row.status ?? null,
    primary_supplier: row.primary_supplier?.toString() ?? null,
    barcode: row.barcode ?? null,
    tags: row.tags ?? [],
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function formatMovement(row: any) {
  return {
    id: row.id?.toString() ?? null,
    enterprise_id: row.enterprise_id?.toString() ?? null,
    product_id: row.product_id?.toString() ?? null,
    type: row.type ?? null,
    quantity: row.quantity ?? 0,
    from_location: row.from_location ?? null,
    to_location: row.to_location ?? null,
    date: row.date ?? null,
    reason: row.reason ?? null,
    performed_by: row.performed_by?.toString() ?? null,
    created_at: row.created_at ?? null,
  };
}

// --- Products ---

export const getAll = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;

  try {
    const query = "SELECT * FROM inventory_products WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });
    const products = result.rows.map(formatProduct);
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

export const getOne = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const query =
      "SELECT * FROM inventory_products WHERE enterprise_id = ? AND id = ?";
    const result = await db.execute(query, [enterpriseId, id], {
      prepare: true,
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(formatProduct(result.rows[0]));
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

export const create = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;

  try {
    const {
      sku,
      name,
      description,
      category,
      brand,
      variants,
      stock_level,
      reorder_point,
      cost_price,
      selling_price,
      unit,
      location,
      primary_supplier,
      barcode,
      tags,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Product name is required" });
    }

    const id = uuidv4();
    const now = new Date();
    const generatedSku =
      sku || "SKU-" + require("crypto").randomBytes(3).toString("hex");

    const query = `INSERT INTO inventory_products (
      enterprise_id, id, sku, name, description, category, brand, variants,
      stock_level, reorder_point, cost_price, selling_price, unit, location,
      status, primary_supplier, barcode, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      generatedSku,
      name,
      description || null,
      category || null,
      brand || null,
      variants || null,
      stock_level ?? 0,
      reorder_point ?? 0,
      cost_price ?? 0,
      selling_price ?? 0,
      unit || null,
      location || null,
      "active",
      primary_supplier || null,
      barcode || null,
      tags || [],
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json(
      formatProduct({
        id,
        enterprise_id: enterpriseId,
        sku: generatedSku,
        name,
        description: description || null,
        category: category || null,
        brand: brand || null,
        variants: variants || null,
        stock_level: stock_level ?? 0,
        reorder_point: reorder_point ?? 0,
        cost_price: cost_price ?? 0,
        selling_price: selling_price ?? 0,
        unit: unit || null,
        location: location || null,
        status: "active",
        primary_supplier: primary_supplier || null,
        barcode: barcode || null,
        tags: tags || [],
        created_at: now,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
};

export const update = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM inventory_products WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const existing = fetchResult.rows[0];
    const updates = req.body;
    const now = new Date();

    const merged = {
      sku: updates.sku ?? existing.sku,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      category: updates.category ?? existing.category,
      brand: updates.brand ?? existing.brand,
      variants: updates.variants ?? existing.variants,
      stock_level: updates.stock_level ?? existing.stock_level,
      reorder_point: updates.reorder_point ?? existing.reorder_point,
      cost_price: updates.cost_price ?? existing.cost_price,
      selling_price: updates.selling_price ?? existing.selling_price,
      unit: updates.unit ?? existing.unit,
      location: updates.location ?? existing.location,
      status: updates.status ?? existing.status,
      primary_supplier: updates.primary_supplier ?? existing.primary_supplier,
      barcode: updates.barcode ?? existing.barcode,
      tags: updates.tags ?? existing.tags,
    };

    const query = `INSERT INTO inventory_products (
      enterprise_id, id, sku, name, description, category, brand, variants,
      stock_level, reorder_point, cost_price, selling_price, unit, location,
      status, primary_supplier, barcode, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      enterpriseId,
      id,
      merged.sku,
      merged.name,
      merged.description,
      merged.category,
      merged.brand,
      merged.variants,
      merged.stock_level,
      merged.reorder_point,
      merged.cost_price,
      merged.selling_price,
      merged.unit,
      merged.location,
      merged.status,
      merged.primary_supplier,
      merged.barcode,
      merged.tags,
      existing.created_at,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.json(
      formatProduct({
        id,
        enterprise_id: enterpriseId,
        ...merged,
        created_at: existing.created_at,
        updated_at: now,
      })
    );
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
};

export const remove = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { id } = req.params;

  try {
    const fetchQuery =
      "SELECT * FROM inventory_products WHERE enterprise_id = ? AND id = ?";
    const fetchResult = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const deleteQuery =
      "DELETE FROM inventory_products WHERE enterprise_id = ? AND id = ?";
    await db.execute(deleteQuery, [enterpriseId, id], { prepare: true });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

// --- Stock Movements ---

export const getStockMovements = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const { productId } = req.params;

  try {
    const query =
      "SELECT * FROM stock_movements WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });

    const movements = result.rows
      .filter((row) => row.product_id?.toString() === productId)
      .map(formatMovement);

    res.json(movements);
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    res.status(500).json({ error: "Failed to fetch stock movements" });
  }
};

export const createStockMovement = async (req: AuthRequest, res: Response) => {
  const enterpriseId = req.enterpriseId!;
  const userId = req.user!.userId;

  try {
    const { product_id, type, quantity, from_location, to_location, reason } =
      req.body;

    if (!product_id || !type || quantity == null) {
      return res
        .status(400)
        .json({ error: "product_id, type, and quantity are required" });
    }

    // Fetch the product to update stock level
    const productQuery =
      "SELECT * FROM inventory_products WHERE enterprise_id = ? AND id = ?";
    const productResult = await db.execute(
      productQuery,
      [enterpriseId, product_id],
      { prepare: true }
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = productResult.rows[0];
    let newStockLevel = product.stock_level ?? 0;

    switch (type) {
      case "received":
        newStockLevel += quantity;
        break;
      case "sold":
        newStockLevel -= quantity;
        break;
      case "adjustment":
        newStockLevel = quantity;
        break;
      case "transferred":
        // No net change
        break;
      case "returned":
        newStockLevel += quantity;
        break;
      case "damaged":
      case "lost":
        newStockLevel -= quantity;
        break;
      default:
        return res.status(400).json({ error: `Invalid movement type: ${type}` });
    }

    // Update product stock level
    const updateQuery = `INSERT INTO inventory_products (
      enterprise_id, id, sku, name, description, category, brand, variants,
      stock_level, reorder_point, cost_price, selling_price, unit, location,
      status, primary_supplier, barcode, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const now = new Date();

    const updateParams = [
      enterpriseId,
      product_id,
      product.sku,
      product.name,
      product.description,
      product.category,
      product.brand,
      product.variants,
      newStockLevel,
      product.reorder_point,
      product.cost_price,
      product.selling_price,
      product.unit,
      product.location,
      product.status,
      product.primary_supplier,
      product.barcode,
      product.tags,
      product.created_at,
      now,
    ];

    await db.execute(updateQuery, updateParams, { prepare: true });

    // Create the stock movement
    const movementId = uuidv4();
    const dateStr = now.toISOString().split("T")[0];

    const movementQuery = `INSERT INTO stock_movements (
      enterprise_id, id, product_id, type, quantity, from_location,
      to_location, date, reason, performed_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const movementParams = [
      enterpriseId,
      movementId,
      product_id,
      type,
      quantity,
      from_location || null,
      to_location || null,
      dateStr,
      reason || null,
      userId,
      now,
    ];

    await db.execute(movementQuery, movementParams, { prepare: true });

    res.status(201).json(
      formatMovement({
        id: movementId,
        enterprise_id: enterpriseId,
        product_id,
        type,
        quantity,
        from_location: from_location || null,
        to_location: to_location || null,
        date: dateStr,
        reason: reason || null,
        performed_by: userId,
        created_at: now,
      })
    );
  } catch (error) {
    console.error("Error creating stock movement:", error);
    res.status(500).json({ error: "Failed to create stock movement" });
  }
};
