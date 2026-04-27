import express from "express";
import {createJob,getJobs,getJobById,updateJob,deleteJob,toggleJobStatus, getJobsByCategory} from "../controllers/job.Controller.js";

const router = express.Router();

router.post("/create", createJob);
router.get("/get", getJobs);
router.get("/getJobById:id", getJobById);
router.put("/updateJob :id", updateJob);
router.delete("/:id", deleteJob);
router.patch("/toggle/:id", toggleJobStatus);
router.get("/category/:categoryId", getJobsByCategory);

export default router;