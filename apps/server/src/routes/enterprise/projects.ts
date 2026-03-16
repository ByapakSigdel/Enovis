import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getAll,
  getOne,
  create,
  update,
  remove,
  getSprints,
  createSprint,
  updateSprint,
  getProjectTasks,
  createProjectTask,
  updateProjectTask,
  removeProjectTask,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} from "../../controllers/enterprise/projects";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

router.get("/:projectId/sprints", getSprints);
router.post("/:projectId/sprints", createSprint);
router.put("/:projectId/sprints/:sprintId", updateSprint);

router.get("/:projectId/tasks", getProjectTasks);
router.post("/:projectId/tasks", createProjectTask);
router.put("/:projectId/tasks/:taskId", updateProjectTask);
router.delete("/:projectId/tasks/:taskId", removeProjectTask);

router.get("/:projectId/members", getProjectMembers);
router.post("/:projectId/members", addProjectMember);
router.delete("/:projectId/members/:userId", removeProjectMember);

export default router;
