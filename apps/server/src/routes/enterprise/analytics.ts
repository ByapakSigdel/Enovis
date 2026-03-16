import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getDashboard,
  getProjectStats,
  getSalesStats,
  getFinanceStats,
  getTeamStats,
} from "../../controllers/enterprise/analytics";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/dashboard", getDashboard);
router.get("/projects", getProjectStats);
router.get("/sales", getSalesStats);
router.get("/finance", getFinanceStats);
router.get("/team", getTeamStats);

export default router;
