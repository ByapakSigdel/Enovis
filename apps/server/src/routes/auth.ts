import { Router } from "express";
import { register, login, getMe, updateMode } from "../controllers/auth";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.put("/mode", authMiddleware, updateMode);

export default router;
