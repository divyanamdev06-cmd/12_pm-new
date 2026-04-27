import express from "express";
import { getAdminAnalytics, getRecruiterAnalytics } from "../controllers/analytics.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/admin", authenticate, requireRoles("admin"), getAdminAnalytics);
router.get("/recruiter", authenticate, requireRoles("recruiter"), getRecruiterAnalytics);

export default router;
