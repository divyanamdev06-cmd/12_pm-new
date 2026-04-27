import Job from "../models/Job.js";
import { sendResponse } from "../utils/response.js";

// CREATE JOB (Admin)
// export const createJob = async (req, res) => {
//   try {
//     const job = await Job.create(req.body);
//     res.status(201).json({ success: true, job });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
export const createJob = async (req, res) => {
  try {
    let job = await Job.create(req.body);

    // populate after creation
    job = await job.populate("category");

    return sendResponse(res, {
      statusCode: 201,
      message: "Job created successfully",
      data: job,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to create job",
      error: err.message,
    });
  }
};

// GET ALL JOBS
// export const getJobs = async (req, res) => {
//   try {
//     const jobs = await Job.find().sort({ createdAt: -1 });
//     res.json({ success: true, jobs });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
export const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("category")   // 👈 here
      .sort({ createdAt: -1 });

    return sendResponse(res, {
      message: "Jobs fetched successfully",
      data: jobs,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to fetch jobs",
      error: err.message,
    });
  }
};

// GET SINGLE JOB
// export const getJobById = async (req, res) => {
//   try {
//     const job = await Job.findById(req.params.id);
//     res.json({ success: true, job });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
export const getJobById = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id)
      .populate("category");   // 👈 here

    if (!job) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Job not found",
      });
    }

    return sendResponse(res, {
      message: "Job fetched successfully",
      data: job,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to fetch job",
      error: err.message,
    });
  }
};

// UPDATE JOB
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!job) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Job not found",
      });
    }
    return sendResponse(res, {
      message: "Job updated successfully",
      data: job,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to update job",
      error: err.message,
    });
  }
};

// DELETE JOB
export const deleteJob = async (req, res) => {
  try {
    const deleted = await Job.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Job not found",
      });
    }
    return sendResponse(res, {
      message: "Job deleted successfully",
      data: deleted,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to delete job",
      error: err.message,
    });
  }
};

// TOGGLE ACTIVE / INACTIVE
export const toggleJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Job not found",
      });
    }

    job.isActive = !job.isActive;
    await job.save();

    return sendResponse(res, {
      message: `Job is now ${job.isActive ? "active" : "inactive"}`,
      data: job,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to toggle job status",
      error: err.message,
    });
  }
};

export const getJobsByCategory = async (req, res) => {
  try {
    const jobs = await Job.find({
      category: req.params.categoryId,
      isActive: true
    })
    .populate("category")
    .sort({ createdAt: -1 });

    return sendResponse(res, {
      message: "Jobs fetched successfully",
      data: jobs,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to fetch jobs by category",
      error: err.message,
    });
  }
};