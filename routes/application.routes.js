import express from "express";
import {
  createApplication,
  listMyApplications,
  withdrawApplication,
  listRecruiterInbox,
  updateApplicationStatus,
  getApplicantProfileForRecruiter,
  downloadApplicantResumeForRecruiter,
} from "../controllers/application.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate, requireRoles("job_seeker"), createApplication);
router.get("/me", authenticate, requireRoles("job_seeker"), listMyApplications);
router.delete("/:id/withdraw", authenticate, requireRoles("job_seeker"), withdrawApplication);

router.get("/inbox", authenticate, requireRoles("recruiter"), listRecruiterInbox);
router.get("/:id/applicant-profile", authenticate, requireRoles("recruiter"), getApplicantProfileForRecruiter);
router.get("/:id/applicant-resume", authenticate, requireRoles("recruiter"), downloadApplicantResumeForRecruiter);
router.patch("/:id/status", authenticate, requireRoles("recruiter"), updateApplicationStatus);

export default router;
