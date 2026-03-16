import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getAll,
  getOne,
  create,
  update,
  remove,
  getStockMovements,
  createStockMovement,
} from "../../controllers/enterprise/inventory";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

router.get("/:productId/stock", getStockMovements);
router.post("/:productId/stock", createStockMovement);

export default router;
