import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getAll,
  getOne,
  create,
  update,
  remove,
  createVersion,
  move,
} from "../../controllers/enterprise/documents";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

router.post("/:id/versions", createVersion);
router.patch("/:id/move", move);

export default router;
