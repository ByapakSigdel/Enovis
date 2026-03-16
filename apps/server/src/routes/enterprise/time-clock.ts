import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getAll,
  getMyEntries,
  getOne,
  update,
  clockIn,
  clockOut,
  getLeaveRequests,
  getMyLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
  removeLeaveRequest,
} from "../../controllers/enterprise/time-clock";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/", getAll);
router.get("/my", getMyEntries);
router.get("/:id", getOne);
router.put("/:id", update);

router.post("/clock-in", clockIn);
router.post("/clock-out", clockOut);

router.get("/leave", getLeaveRequests);
router.get("/leave/my", getMyLeaveRequests);
router.post("/leave", createLeaveRequest);
router.put("/leave/:id", updateLeaveRequest);
router.delete("/leave/:id", removeLeaveRequest);

export default router;
