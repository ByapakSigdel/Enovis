import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatChannel(row: any) {
  return {
    id: row.id?.toString(),
    enterprise_id: row.enterprise_id?.toString(),
    name: row.name,
    type: row.type,
    description: row.description,
    project_id: row.project_id?.toString(),
    created_by: row.created_by?.toString(),
    members: row.members?.map((m: any) => m.toString()),
    pinned: row.pinned,
    archived: row.archived,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatMessage(row: any) {
  return {
    id: row.id?.toString(),
    enterprise_id: row.enterprise_id?.toString(),
    channel_id: row.channel_id?.toString(),
    sender_id: row.sender_id?.toString(),
    sender_name: row.sender_name,
    content: row.content,
    type: row.type,
    parent_id: row.parent_id?.toString(),
    attachments: row.attachments,
    reactions: row.reactions,
    edited: row.edited,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export const getAll = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;

    const query = "SELECT * FROM channels WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });

    res.json(result.rows.map(formatChannel));
  } catch (error) {
    console.error("[Channels] Error fetching channels:", error);
    res.status(500).json({ error: "Failed to fetch channels" });
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
      "SELECT * FROM channels WHERE enterprise_id = ? AND id = ?";
    const result = await db.execute(query, [enterpriseId, id], {
      prepare: true,
    });

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    res.json(formatChannel(result.rows[0]));
  } catch (error) {
    console.error("[Channels] Error fetching channel:", error);
    res.status(500).json({ error: "Failed to fetch channel" });
  }
};

export const create = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const userId = req.user!.userId;
    const { name, type, description, project_id, members } = req.body;

    if (!name) {
      res.status(400).json({ error: "Channel name is required" });
      return;
    }

    if (!type || !["public", "private", "direct_message"].includes(type)) {
      res
        .status(400)
        .json({ error: "Channel type must be public, private, or direct_message" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    // Ensure creator is in the members list
    const memberList: string[] = Array.isArray(members) ? [...members] : [];
    if (!memberList.includes(userId)) {
      memberList.push(userId);
    }

    const query = `INSERT INTO channels (
      id, enterprise_id, name, type, description, project_id, created_by,
      members, pinned, archived, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      id,
      enterpriseId,
      name,
      type,
      description || null,
      project_id || null,
      userId,
      memberList,
      false,
      false,
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json({
      id,
      enterprise_id: enterpriseId,
      name,
      type,
      description: description || null,
      project_id: project_id || null,
      created_by: userId,
      members: memberList,
      pinned: false,
      archived: false,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error("[Channels] Error creating channel:", error);
    res.status(500).json({ error: "Failed to create channel" });
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
      "SELECT * FROM channels WHERE enterprise_id = ? AND id = ?";
    const existing = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const current = existing.rows[0];
    const now = new Date();

    const merged = {
      name: req.body.name ?? current.name,
      description: req.body.description ?? current.description,
      pinned: req.body.pinned ?? current.pinned,
      archived: req.body.archived ?? current.archived,
    };

    const query = `UPDATE channels SET
      name = ?, description = ?, pinned = ?, archived = ?, updated_at = ?
      WHERE enterprise_id = ? AND id = ?`;

    const params = [
      merged.name,
      merged.description,
      merged.pinned,
      merged.archived,
      now,
      enterpriseId,
      id,
    ];

    await db.execute(query, params, { prepare: true });

    res.json({
      ...formatChannel(current),
      ...merged,
      id: current.id?.toString(),
      enterprise_id: current.enterprise_id?.toString(),
      created_by: current.created_by?.toString(),
      project_id: current.project_id?.toString(),
      members: current.members?.map((m: any) => m.toString()),
      updated_at: now,
    });
  } catch (error) {
    console.error("[Channels] Error updating channel:", error);
    res.status(500).json({ error: "Failed to update channel" });
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
      "SELECT * FROM channels WHERE enterprise_id = ? AND id = ?";
    const existing = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const query =
      "DELETE FROM channels WHERE enterprise_id = ? AND id = ?";
    await db.execute(query, [enterpriseId, id], { prepare: true });

    res.json({ message: "Channel deleted successfully" });
  } catch (error) {
    console.error("[Channels] Error deleting channel:", error);
    res.status(500).json({ error: "Failed to delete channel" });
  }
};

export const addMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({ error: "user_id is required" });
      return;
    }

    const fetchQuery =
      "SELECT * FROM channels WHERE enterprise_id = ? AND id = ?";
    const existing = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const current = existing.rows[0];
    const currentMembers: string[] = current.members
      ? current.members.map((m: any) => m.toString())
      : [];

    if (currentMembers.includes(user_id)) {
      res.status(400).json({ error: "User is already a member of this channel" });
      return;
    }

    currentMembers.push(user_id);
    const now = new Date();

    const query =
      "UPDATE channels SET members = ?, updated_at = ? WHERE enterprise_id = ? AND id = ?";
    await db.execute(query, [currentMembers, now, enterpriseId, id], {
      prepare: true,
    });

    res.json({
      ...formatChannel(current),
      members: currentMembers,
      updated_at: now,
    });
  } catch (error) {
    console.error("[Channels] Error adding member:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
};

export const removeMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({ error: "user_id is required" });
      return;
    }

    const fetchQuery =
      "SELECT * FROM channels WHERE enterprise_id = ? AND id = ?";
    const existing = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const current = existing.rows[0];
    const currentMembers: string[] = current.members
      ? current.members.map((m: any) => m.toString())
      : [];

    const filtered = currentMembers.filter((m) => m !== user_id);

    if (filtered.length === currentMembers.length) {
      res.status(400).json({ error: "User is not a member of this channel" });
      return;
    }

    const now = new Date();

    const query =
      "UPDATE channels SET members = ?, updated_at = ? WHERE enterprise_id = ? AND id = ?";
    await db.execute(query, [filtered, now, enterpriseId, id], {
      prepare: true,
    });

    res.json({
      ...formatChannel(current),
      members: filtered,
      updated_at: now,
    });
  } catch (error) {
    console.error("[Channels] Error removing member:", error);
    res.status(500).json({ error: "Failed to remove member" });
  }
};

// ---------------------------------------------------------------------------
// Channel Messages
// ---------------------------------------------------------------------------

export const getMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { channelId } = req.params;

    const query =
      "SELECT * FROM channel_messages WHERE enterprise_id = ? AND channel_id = ?";
    const result = await db.execute(query, [enterpriseId, channelId], {
      prepare: true,
    });

    res.json(result.rows.map(formatMessage));
  } catch (error) {
    console.error("[Channels] Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const createMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const userId = req.user!.userId;
    const { channelId } = req.params;
    const { content, type, parent_id, attachments, sender_name } = req.body;

    if (!content) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    const messageType = type || "text";
    if (!["text", "file", "system"].includes(messageType)) {
      res
        .status(400)
        .json({ error: "Message type must be text, file, or system" });
      return;
    }

    const id = uuidv4();
    const now = new Date();
    const resolvedSenderName = sender_name || req.user!.email || "Unknown";

    const query = `INSERT INTO channel_messages (
      id, enterprise_id, channel_id, sender_id, sender_name, content, type,
      parent_id, attachments, reactions, edited, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      id,
      enterpriseId,
      channelId,
      userId,
      resolvedSenderName,
      content,
      messageType,
      parent_id || null,
      attachments || null,
      null,
      false,
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json({
      id,
      enterprise_id: enterpriseId,
      channel_id: channelId,
      sender_id: userId,
      sender_name: resolvedSenderName,
      content,
      type: messageType,
      parent_id: parent_id || null,
      attachments: attachments || null,
      reactions: null,
      edited: false,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error("[Channels] Error creating message:", error);
    res.status(500).json({ error: "Failed to create message" });
  }
};

export const updateMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { channelId, messageId } = req.params;
    const { content, created_at } = req.body;

    if (!content) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    if (!created_at) {
      res
        .status(400)
        .json({ error: "created_at is required to identify the message" });
      return;
    }

    const fetchQuery =
      "SELECT * FROM channel_messages WHERE enterprise_id = ? AND channel_id = ? AND created_at = ? AND id = ?";
    const existing = await db.execute(
      fetchQuery,
      [enterpriseId, channelId, created_at, messageId],
      { prepare: true }
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const now = new Date();

    const query = `UPDATE channel_messages SET
      content = ?, edited = ?, updated_at = ?
      WHERE enterprise_id = ? AND channel_id = ? AND created_at = ? AND id = ?`;

    const params = [
      content,
      true,
      now,
      enterpriseId,
      channelId,
      created_at,
      messageId,
    ];

    await db.execute(query, params, { prepare: true });

    const current = existing.rows[0];
    res.json({
      ...formatMessage(current),
      content,
      edited: true,
      updated_at: now,
    });
  } catch (error) {
    console.error("[Channels] Error updating message:", error);
    res.status(500).json({ error: "Failed to update message" });
  }
};

export const removeMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { channelId, messageId } = req.params;
    const { created_at } = req.body;

    if (!created_at) {
      res
        .status(400)
        .json({ error: "created_at is required to identify the message" });
      return;
    }

    const fetchQuery =
      "SELECT * FROM channel_messages WHERE enterprise_id = ? AND channel_id = ? AND created_at = ? AND id = ?";
    const existing = await db.execute(
      fetchQuery,
      [enterpriseId, channelId, created_at, messageId],
      { prepare: true }
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const query =
      "DELETE FROM channel_messages WHERE enterprise_id = ? AND channel_id = ? AND created_at = ? AND id = ?";
    await db.execute(query, [enterpriseId, channelId, created_at, messageId], {
      prepare: true,
    });

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("[Channels] Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

export const addReaction = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const userId = req.user!.userId;
    const { channelId, messageId } = req.params;
    const { emoji, created_at } = req.body;

    if (!emoji) {
      res.status(400).json({ error: "emoji is required" });
      return;
    }

    if (!created_at) {
      res
        .status(400)
        .json({ error: "created_at is required to identify the message" });
      return;
    }

    const fetchQuery =
      "SELECT * FROM channel_messages WHERE enterprise_id = ? AND channel_id = ? AND created_at = ? AND id = ?";
    const existing = await db.execute(
      fetchQuery,
      [enterpriseId, channelId, created_at, messageId],
      { prepare: true }
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const current = existing.rows[0];
    let reactions: any[] = [];

    if (current.reactions) {
      try {
        reactions = JSON.parse(current.reactions);
      } catch {
        reactions = [];
      }
    }

    reactions.push({ emoji, user_id: userId, timestamp: new Date() });
    const now = new Date();

    const query = `UPDATE channel_messages SET
      reactions = ?, updated_at = ?
      WHERE enterprise_id = ? AND channel_id = ? AND created_at = ? AND id = ?`;

    const params = [
      JSON.stringify(reactions),
      now,
      enterpriseId,
      channelId,
      created_at,
      messageId,
    ];

    await db.execute(query, params, { prepare: true });

    res.json({
      ...formatMessage(current),
      reactions: JSON.stringify(reactions),
      updated_at: now,
    });
  } catch (error) {
    console.error("[Channels] Error adding reaction:", error);
    res.status(500).json({ error: "Failed to add reaction" });
  }
};
