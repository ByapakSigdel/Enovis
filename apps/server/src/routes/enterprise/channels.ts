import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getAll,
  getOne,
  create,
  update,
  remove,
  addMember,
  removeMember,
  getMessages,
  createMessage,
  updateMessage,
  removeMessage,
  addReaction,
} from "../../controllers/enterprise/channels";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);

router.get("/:channelId/messages", getMessages);
router.post("/:channelId/messages", createMessage);
router.put("/:channelId/messages/:messageId", updateMessage);
router.delete("/:channelId/messages/:messageId", removeMessage);

router.post("/:channelId/messages/:messageId/reactions", addReaction);

export default router;
