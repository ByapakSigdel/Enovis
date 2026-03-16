import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { enterpriseMiddleware } from "../../middleware/enterprise";
import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  removeContact,
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  removeDeal,
  getPipelines,
  createPipeline,
  updatePipeline,
  removePipeline,
} from "../../controllers/enterprise/crm";

const router = Router();

router.use(authMiddleware);
router.use(enterpriseMiddleware);

router.get("/contacts", getContacts);
router.get("/contacts/:id", getContact);
router.post("/contacts", createContact);
router.put("/contacts/:id", updateContact);
router.delete("/contacts/:id", removeContact);

router.get("/deals", getDeals);
router.get("/deals/:id", getDeal);
router.post("/deals", createDeal);
router.put("/deals/:id", updateDeal);
router.delete("/deals/:id", removeDeal);

router.get("/pipelines", getPipelines);
router.post("/pipelines", createPipeline);
router.put("/pipelines/:id", updatePipeline);
router.delete("/pipelines/:id", removePipeline);

export default router;
