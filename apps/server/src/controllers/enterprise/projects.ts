import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../../config/database";
import { AuthRequest } from "../../types";

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatProject(row: any) {
  return {
    id: row.id?.toString(),
    enterprise_id: row.enterprise_id?.toString(),
    project_code: row.project_code,
    name: row.name,
    description: row.description,
    methodology: row.methodology,
    project_manager: row.project_manager?.toString(),
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    budget_type: row.budget_type,
    estimated_hours: row.estimated_hours,
    actual_hours: row.actual_hours,
    budget_amount: row.budget_amount,
    actual_cost: row.actual_cost,
    progress: row.progress,
    milestones: row.milestones,
    tags: row.tags,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatSprint(row: any) {
  return {
    id: row.id?.toString(),
    enterprise_id: row.enterprise_id?.toString(),
    project_id: row.project_id?.toString(),
    name: row.name,
    goal: row.goal,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatProjectTask(row: any) {
  return {
    id: row.id?.toString(),
    enterprise_id: row.enterprise_id?.toString(),
    project_id: row.project_id?.toString(),
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigned_to: row.assigned_to?.toString(),
    assigned_by: row.assigned_by?.toString(),
    watchers: row.watchers?.map((w: any) => w.toString()),
    dependencies: row.dependencies?.map((d: any) => d.toString()),
    estimated_hours: row.estimated_hours,
    actual_hours: row.actual_hours,
    billable: row.billable,
    sprint_id: row.sprint_id?.toString(),
    epic_id: row.epic_id?.toString(),
    story_points: row.story_points,
    due_date: row.due_date,
    category: row.category,
    tags: row.tags,
    comments: row.comments,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatProjectMember(row: any) {
  return {
    project_id: row.project_id?.toString(),
    enterprise_id: row.enterprise_id?.toString(),
    user_id: row.user_id?.toString(),
    role: row.role,
    added_at: row.added_at,
  };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const getAll = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;

    const query = "SELECT * FROM projects WHERE enterprise_id = ?";
    const result = await db.execute(query, [enterpriseId], { prepare: true });

    res.json(result.rows.map(formatProject));
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
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
      "SELECT * FROM projects WHERE enterprise_id = ? AND id = ?";
    const result = await db.execute(query, [enterpriseId, id], {
      prepare: true,
    });

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(formatProject(result.rows[0]));
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
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
      description,
      methodology,
      start_date,
      end_date,
      budget_type,
      estimated_hours,
      budget_amount,
      tags,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: "Project name is required" });
      return;
    }

    const id = uuidv4();
    const projectCode =
      "PRJ-" +
      [...Array(6)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("")
        .toUpperCase();
    const now = new Date();

    const query = `INSERT INTO projects (
      id, enterprise_id, project_code, name, description, methodology,
      project_manager, start_date, end_date, status, budget_type,
      estimated_hours, actual_hours, budget_amount, actual_cost, progress,
      tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      id,
      enterpriseId,
      projectCode,
      name,
      description || null,
      methodology || null,
      userId,
      start_date || null,
      end_date || null,
      "active",
      budget_type || null,
      estimated_hours || null,
      0,
      budget_amount || null,
      0,
      0,
      tags || null,
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json({
      id,
      enterprise_id: enterpriseId,
      project_code: projectCode,
      name,
      description: description || null,
      methodology: methodology || null,
      project_manager: userId,
      start_date: start_date || null,
      end_date: end_date || null,
      status: "active",
      budget_type: budget_type || null,
      estimated_hours: estimated_hours || null,
      actual_hours: 0,
      budget_amount: budget_amount || null,
      actual_cost: 0,
      progress: 0,
      tags: tags || null,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
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
      "SELECT * FROM projects WHERE enterprise_id = ? AND id = ?";
    const existing = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const current = existing.rows[0];
    const now = new Date();

    const merged = {
      name: req.body.name ?? current.name,
      description: req.body.description ?? current.description,
      methodology: req.body.methodology ?? current.methodology,
      start_date: req.body.start_date ?? current.start_date,
      end_date: req.body.end_date ?? current.end_date,
      status: req.body.status ?? current.status,
      budget_type: req.body.budget_type ?? current.budget_type,
      estimated_hours: req.body.estimated_hours ?? current.estimated_hours,
      actual_hours: req.body.actual_hours ?? current.actual_hours,
      budget_amount: req.body.budget_amount ?? current.budget_amount,
      actual_cost: req.body.actual_cost ?? current.actual_cost,
      progress: req.body.progress ?? current.progress,
      milestones: req.body.milestones ?? current.milestones,
      tags: req.body.tags ?? current.tags,
    };

    const query = `UPDATE projects SET
      name = ?, description = ?, methodology = ?, start_date = ?,
      end_date = ?, status = ?, budget_type = ?, estimated_hours = ?,
      actual_hours = ?, budget_amount = ?, actual_cost = ?, progress = ?,
      milestones = ?, tags = ?, updated_at = ?
      WHERE enterprise_id = ? AND id = ?`;

    const params = [
      merged.name,
      merged.description,
      merged.methodology,
      merged.start_date,
      merged.end_date,
      merged.status,
      merged.budget_type,
      merged.estimated_hours,
      merged.actual_hours,
      merged.budget_amount,
      merged.actual_cost,
      merged.progress,
      merged.milestones,
      merged.tags,
      now,
      enterpriseId,
      id,
    ];

    await db.execute(query, params, { prepare: true });

    res.json({
      ...formatProject(current),
      ...merged,
      id: current.id?.toString(),
      enterprise_id: current.enterprise_id?.toString(),
      project_manager: current.project_manager?.toString(),
      project_code: current.project_code,
      updated_at: now,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
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
      "SELECT * FROM projects WHERE enterprise_id = ? AND id = ?";
    const existing = await db.execute(fetchQuery, [enterpriseId, id], {
      prepare: true,
    });

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const query =
      "DELETE FROM projects WHERE enterprise_id = ? AND id = ?";
    await db.execute(query, [enterpriseId, id], { prepare: true });

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
};

// ---------------------------------------------------------------------------
// Sprints
// ---------------------------------------------------------------------------

export const getSprints = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { projectId } = req.params;

    const query =
      "SELECT * FROM sprints WHERE enterprise_id = ? AND project_id = ?";
    const result = await db.execute(query, [enterpriseId, projectId], {
      prepare: true,
    });

    res.json(result.rows.map(formatSprint));
  } catch (error) {
    console.error("Error fetching sprints:", error);
    res.status(500).json({ error: "Failed to fetch sprints" });
  }
};

export const createSprint = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { projectId } = req.params;
    const { name, goal, start_date, end_date } = req.body;

    if (!name) {
      res.status(400).json({ error: "Sprint name is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    const query = `INSERT INTO sprints (
      id, enterprise_id, project_id, name, goal, start_date, end_date,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      id,
      enterpriseId,
      projectId,
      name,
      goal || null,
      start_date || null,
      end_date || null,
      "planned",
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json({
      id,
      enterprise_id: enterpriseId,
      project_id: projectId,
      name,
      goal: goal || null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: "planned",
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error("Error creating sprint:", error);
    res.status(500).json({ error: "Failed to create sprint" });
  }
};

export const updateSprint = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { projectId, sprintId } = req.params;

    const fetchQuery =
      "SELECT * FROM sprints WHERE enterprise_id = ? AND project_id = ? AND id = ?";
    const existing = await db.execute(
      fetchQuery,
      [enterpriseId, projectId, sprintId],
      { prepare: true }
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Sprint not found" });
      return;
    }

    const current = existing.rows[0];
    const now = new Date();

    const merged = {
      name: req.body.name ?? current.name,
      goal: req.body.goal ?? current.goal,
      start_date: req.body.start_date ?? current.start_date,
      end_date: req.body.end_date ?? current.end_date,
      status: req.body.status ?? current.status,
    };

    const query = `UPDATE sprints SET
      name = ?, goal = ?, start_date = ?, end_date = ?, status = ?, updated_at = ?
      WHERE enterprise_id = ? AND project_id = ? AND id = ?`;

    const params = [
      merged.name,
      merged.goal,
      merged.start_date,
      merged.end_date,
      merged.status,
      now,
      enterpriseId,
      projectId,
      sprintId,
    ];

    await db.execute(query, params, { prepare: true });

    res.json({
      ...formatSprint(current),
      ...merged,
      id: current.id?.toString(),
      enterprise_id: current.enterprise_id?.toString(),
      project_id: current.project_id?.toString(),
      updated_at: now,
    });
  } catch (error) {
    console.error("Error updating sprint:", error);
    res.status(500).json({ error: "Failed to update sprint" });
  }
};

// ---------------------------------------------------------------------------
// Project Tasks
// ---------------------------------------------------------------------------

export const getProjectTasks = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { projectId } = req.params;

    const query =
      "SELECT * FROM project_tasks WHERE enterprise_id = ? AND project_id = ?";
    const result = await db.execute(query, [enterpriseId, projectId], {
      prepare: true,
    });

    res.json(result.rows.map(formatProjectTask));
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    res.status(500).json({ error: "Failed to fetch project tasks" });
  }
};

export const createProjectTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const userId = req.user!.userId;
    const { projectId } = req.params;
    const {
      title,
      description,
      status,
      priority,
      assigned_to,
      estimated_hours,
      billable,
      sprint_id,
      story_points,
      due_date,
      category,
      tags,
    } = req.body;

    if (!title) {
      res.status(400).json({ error: "Task title is required" });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    const query = `INSERT INTO project_tasks (
      id, enterprise_id, project_id, title, description, status, priority,
      assigned_to, assigned_by, estimated_hours, billable, sprint_id,
      story_points, due_date, category, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      id,
      enterpriseId,
      projectId,
      title,
      description || null,
      status || "todo",
      priority || "medium",
      assigned_to || null,
      userId,
      estimated_hours || null,
      billable ?? false,
      sprint_id || null,
      story_points || null,
      due_date || null,
      category || null,
      tags || null,
      now,
      now,
    ];

    await db.execute(query, params, { prepare: true });

    res.status(201).json({
      id,
      enterprise_id: enterpriseId,
      project_id: projectId,
      title,
      description: description || null,
      status: status || "todo",
      priority: priority || "medium",
      assigned_to: assigned_to || null,
      assigned_by: userId,
      watchers: null,
      dependencies: null,
      estimated_hours: estimated_hours || null,
      actual_hours: null,
      billable: billable ?? false,
      sprint_id: sprint_id || null,
      epic_id: null,
      story_points: story_points || null,
      due_date: due_date || null,
      category: category || null,
      tags: tags || null,
      comments: null,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error("Error creating project task:", error);
    res.status(500).json({ error: "Failed to create project task" });
  }
};

export const updateProjectTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { projectId, taskId } = req.params;

    const fetchQuery =
      "SELECT * FROM project_tasks WHERE enterprise_id = ? AND project_id = ? AND id = ?";
    const existing = await db.execute(
      fetchQuery,
      [enterpriseId, projectId, taskId],
      { prepare: true }
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const current = existing.rows[0];
    const now = new Date();

    const merged = {
      title: req.body.title ?? current.title,
      description: req.body.description ?? current.description,
      status: req.body.status ?? current.status,
      priority: req.body.priority ?? current.priority,
      assigned_to: req.body.assigned_to ?? current.assigned_to,
      watchers: req.body.watchers ?? current.watchers,
      dependencies: req.body.dependencies ?? current.dependencies,
      estimated_hours: req.body.estimated_hours ?? current.estimated_hours,
      actual_hours: req.body.actual_hours ?? current.actual_hours,
      billable: req.body.billable ?? current.billable,
      sprint_id: req.body.sprint_id ?? current.sprint_id,
      epic_id: req.body.epic_id ?? current.epic_id,
      story_points: req.body.story_points ?? current.story_points,
      due_date: req.body.due_date ?? current.due_date,
      category: req.body.category ?? current.category,
      tags: req.body.tags ?? current.tags,
      comments: req.body.comments ?? current.comments,
    };

    const query = `UPDATE project_tasks SET
      title = ?, description = ?, status = ?, priority = ?, assigned_to = ?,
      watchers = ?, dependencies = ?, estimated_hours = ?, actual_hours = ?,
      billable = ?, sprint_id = ?, epic_id = ?, story_points = ?,
      due_date = ?, category = ?, tags = ?, comments = ?, updated_at = ?
      WHERE enterprise_id = ? AND project_id = ? AND id = ?`;

    const params = [
      merged.title,
      merged.description,
      merged.status,
      merged.priority,
      merged.assigned_to,
      merged.watchers,
      merged.dependencies,
      merged.estimated_hours,
      merged.actual_hours,
      merged.billable,
      merged.sprint_id,
      merged.epic_id,
      merged.story_points,
      merged.due_date,
      merged.category,
      merged.tags,
      merged.comments,
      now,
      enterpriseId,
      projectId,
      taskId,
    ];

    await db.execute(query, params, { prepare: true });

    res.json({
      ...formatProjectTask(current),
      ...merged,
      id: current.id?.toString(),
      enterprise_id: current.enterprise_id?.toString(),
      project_id: current.project_id?.toString(),
      assigned_to: merged.assigned_to?.toString(),
      assigned_by: current.assigned_by?.toString(),
      sprint_id: merged.sprint_id?.toString(),
      epic_id: merged.epic_id?.toString(),
      watchers: merged.watchers?.map((w: any) => w.toString()),
      dependencies: merged.dependencies?.map((d: any) => d.toString()),
      updated_at: now,
    });
  } catch (error) {
    console.error("Error updating project task:", error);
    res.status(500).json({ error: "Failed to update project task" });
  }
};

export const removeProjectTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { projectId, taskId } = req.params;

    const fetchQuery =
      "SELECT * FROM project_tasks WHERE enterprise_id = ? AND project_id = ? AND id = ?";
    const existing = await db.execute(
      fetchQuery,
      [enterpriseId, projectId, taskId],
      { prepare: true }
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const query =
      "DELETE FROM project_tasks WHERE enterprise_id = ? AND project_id = ? AND id = ?";
    await db.execute(query, [enterpriseId, projectId, taskId], {
      prepare: true,
    });

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting project task:", error);
    res.status(500).json({ error: "Failed to delete project task" });
  }
};

// ---------------------------------------------------------------------------
// Project Members
// ---------------------------------------------------------------------------

export const getProjectMembers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { projectId } = req.params;

    const query =
      "SELECT * FROM project_members WHERE enterprise_id = ? AND project_id = ?";
    const result = await db.execute(query, [enterpriseId, projectId], {
      prepare: true,
    });

    res.json(result.rows.map(formatProjectMember));
  } catch (error) {
    console.error("Error fetching project members:", error);
    res.status(500).json({ error: "Failed to fetch project members" });
  }
};

export const addProjectMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { projectId } = req.params;
    const { user_id, role } = req.body;

    if (!user_id || !role) {
      res.status(400).json({ error: "user_id and role are required" });
      return;
    }

    const now = new Date();

    const query = `INSERT INTO project_members (
      project_id, enterprise_id, user_id, role, added_at
    ) VALUES (?, ?, ?, ?, ?)`;

    const params = [projectId, enterpriseId, user_id, role, now];

    await db.execute(query, params, { prepare: true });

    res.status(201).json({
      project_id: projectId,
      enterprise_id: enterpriseId,
      user_id,
      role,
      added_at: now,
    });
  } catch (error) {
    console.error("Error adding project member:", error);
    res.status(500).json({ error: "Failed to add project member" });
  }
};

export const removeProjectMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enterpriseId = req.enterpriseId!;
    const { projectId, userId } = req.params;

    const query =
      "DELETE FROM project_members WHERE enterprise_id = ? AND project_id = ? AND user_id = ?";
    await db.execute(query, [enterpriseId, projectId, userId], {
      prepare: true,
    });

    res.json({ message: "Project member removed successfully" });
  } catch (error) {
    console.error("Error removing project member:", error);
    res.status(500).json({ error: "Failed to remove project member" });
  }
};
