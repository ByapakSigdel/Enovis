import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getAll,
  getOne,
  create,
  update,
  remove,
  updateFulfillmentStatus,
  updatePaymentStatus,
} from "../../controllers/enterprise/orders";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

router.put("/:id/fulfillment", updateFulfillmentStatus);
router.put("/:id/payment", updatePaymentStatus);

export default router;
