import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getAll, getOne, create, update, remove,
  getCompletions, addCompletion, removeCompletion,
} from "../controllers/habits";

const router = Router();
router.use(authMiddleware);

// Habit CRUD
router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

// Habit Completions
router.get("/:id/completions", getCompletions);
router.post("/:id/completions", addCompletion);
router.delete("/:id/completions/:date", removeCompletion);

export default router;
