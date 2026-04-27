import express from "express";
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  toggleJobStatus,
  getJobsByCategory,
} from "../controllers/job.Controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

const recruiterOrAdmin = [authenticate, requireRoles("admin", "recruiter")];

router.post("/create", ...recruiterOrAdmin, createJob);
router.get("/get", getJobs);
router.get("/getJobById/:id", getJobById);
router.put("/updateJob/:id", ...recruiterOrAdmin, updateJob);
router.delete("/:id", ...recruiterOrAdmin, deleteJob);
router.patch("/toggle/:id", ...recruiterOrAdmin, toggleJobStatus);
router.get("/category/:categoryId", getJobsByCategory);

export default router;