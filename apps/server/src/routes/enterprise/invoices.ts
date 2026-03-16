import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getAll,
  getOne,
  create,
  update,
  remove,
  sendInvoice,
  getPayments,
  addPayment,
} from "../../controllers/enterprise/invoices";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

router.post("/:id/send", sendInvoice);
router.get("/:invoiceId/payments", getPayments);
router.post("/:invoiceId/payments", addPayment);

export default router;
