import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getAll,
  getOne,
  create,
  update,
  remove,
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  removePurchaseOrder,
} from "../../controllers/enterprise/vendors";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

router.get("/purchase-orders", getPurchaseOrders);
router.get("/purchase-orders/:id", getPurchaseOrder);
router.post("/purchase-orders", createPurchaseOrder);
router.put("/purchase-orders/:id", updatePurchaseOrder);
router.delete("/purchase-orders/:id", removePurchaseOrder);

export default router;
