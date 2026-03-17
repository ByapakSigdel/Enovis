import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database";
import { signToken } from "../utils/jwt";
import { AuthRequest } from "../types";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: "Email, password, and name are required" });
      return;
    }

    // Check if email already exists
    const existing = await db.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.rowLength > 0) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();

    await db.execute(
      `INSERT INTO users (id, email, password, name, avatar, mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, hashedPassword, name, null, "individual", now, now]
    );

    const token = signToken({ userId: id, email, mode: "individual" });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id, email, name, avatar: null, mode: "individual", created_at: now },
      },
    });
  } catch (err) {
    console.error("[Auth] Register error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password are required" });
      return;
    }

    const result = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (result.rowLength === 0) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const token = signToken({
      userId: user.id.toString(),
      email: user.email,
      mode: user.mode || "individual",
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          mode: user.mode || "individual",
          created_at: user.created_at,
        },
      },
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await db.execute("SELECT * FROM users WHERE id = ?", [userId]);

    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        mode: user.mode || "individual",
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("[Auth] GetMe error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function updateMode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { mode } = req.body;

    if (!mode || (mode !== "individual" && mode !== "enterprise")) {
      res.status(400).json({ success: false, error: "Invalid mode. Must be 'individual' or 'enterprise'" });
      return;
    }

    const now = new Date();
    await db.execute(
      "UPDATE users SET mode = ?, updated_at = ? WHERE id = ?",
      [mode, now, userId]
    );

    // Generate new token with updated mode
    const result = await db.execute("SELECT * FROM users WHERE id = ?", [userId]);
    if (result.rowLength === 0) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    const user = result.rows[0];
    const token = signToken({
      userId: user.id.toString(),
      email: user.email,
      mode: mode,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          mode: mode,
          created_at: user.created_at,
        },
      },
    });
  } catch (err) {
    console.error("[Auth] UpdateMode error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
