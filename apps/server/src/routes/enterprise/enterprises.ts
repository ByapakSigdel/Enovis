import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  create,
  getAll,
  getOne,
  update,
  getMembers,
  addMember,
  updateMember,
  removeMember,
} from "../../controllers/enterprise/enterprises";

const router = Router();

router.use(authMiddleware);

router.post("/", create);
router.get("/", getAll);
router.get("/details", enterpriseMiddleware, getOne);
router.put("/", enterpriseMiddleware, update);
router.get("/members", enterpriseMiddleware, getMembers);
router.post("/members", enterpriseMiddleware, addMember);
router.put("/members/:userId", enterpriseMiddleware, updateMember);
router.delete("/members/:userId", enterpriseMiddleware, removeMember);

export default router;
