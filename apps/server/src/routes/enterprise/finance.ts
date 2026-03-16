import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  removeAccount,
  getEntries,
  getEntry,
  createEntry,
  updateEntry,
  removeEntry,
  approveEntry,
} from "../../controllers/enterprise/finance";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/accounts", getAccounts);
router.get("/accounts/:id", getAccount);
router.post("/accounts", createAccount);
router.put("/accounts/:id", updateAccount);
router.delete("/accounts/:id", removeAccount);

router.get("/entries", getEntries);
router.get("/entries/:id", getEntry);
router.post("/entries", createEntry);
router.put("/entries/:id", updateEntry);
router.delete("/entries/:id", removeEntry);

router.post("/entries/:id/approve", approveEntry);

export default router;
