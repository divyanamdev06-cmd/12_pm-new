import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Application from "../models/application.model.js";
import Job from "../models/Job.js";
import { User } from "../models/user.model.js";
import { sendResponse } from "../utils/response.js";
import { normalizeRole } from "../utils/role.util.js";

function jobIsOpenForApplications(job) {
  if (!job || !job.isActive) return false;
  const p = job.publicationStatus;
  if (p === "draft" || p === "archived") return false;
  return p === "published" || p === undefined || p === null;
}

async function loadJobForApply(jobId) {
  if (!mongoose.Types.ObjectId.isValid(String(jobId))) return null;
  return Job.findById(jobId).populate("category");
}

/** Recruiter must own the job this application is for. */
async function assertRecruiterOwnsApplication(req, applicationId) {
  if (!mongoose.Types.ObjectId.isValid(String(applicationId))) {
    return { error: { statusCode: 400, message: "Invalid application id" } };
  }
  const app = await Application.findById(applicationId).populate("job", "createdBy title company");
  if (!app) {
    return { error: { statusCode: 404, message: "Application not found" } };
  }
  if (!app.job || String(app.job.createdBy) !== String(req.auth.userId)) {
    return { error: { statusCode: 403, message: "You can only view applicants for your own job posts" } };
  }
  return { app };
}

function leanApplicantForRecruiter(userLean) {
  if (!userLean) return null;
  const o = { ...userLean };
  delete o.password;
  if (o.resume?.path) {
    o.resume = {
      originalName: o.resume.originalName,
      mimeType: o.resume.mimeType,
      uploadedAt: o.resume.uploadedAt,
      hasFile: true,
    };
  } else {
    o.resume = { hasFile: false };
  }
  return o;
}

export const createApplication = async (req, res) => {
  try {
    const role = normalizeRole(req.auth?.role);
    if (role !== "job_seeker") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Only job seekers can submit applications",
      });
    }

    const jobId = req.body?.jobId;
    const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 2000) : "";

    const job = await loadJobForApply(jobId);
    if (!job) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Job not found",
      });
    }

    if (!jobIsOpenForApplications(job)) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "This job is not accepting applications right now",
      });
    }

    if (job.category?.isActive === false) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "This job category is no longer active",
      });
    }

    if (String(job.createdBy) === String(req.auth.userId)) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "You cannot apply to your own job post",
      });
    }

    const doc = await Application.create({
      job: job._id,
      applicant: req.auth.userId,
      message,
      status: "pending",
    });

    const populated = await Application.findById(doc._id)
      .populate({
        path: "job",
        select: "title company location type mode category",
        populate: { path: "category", select: "name" },
      })
      .populate("applicant", "name email headline");

    return sendResponse(res, {
      statusCode: 201,
      message: "Application submitted",
      data: populated,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "You have already applied to this job",
      });
    }
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Could not submit application",
      error: err.message,
    });
  }
};

export const listMyApplications = async (req, res) => {
  try {
    const role = normalizeRole(req.auth?.role);
    if (role !== "job_seeker") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Only job seekers can view this list",
      });
    }

    const rows = await Application.find({ applicant: req.auth.userId })
      .populate({
        path: "job",
        select: "title company location type mode salary category publicationStatus isActive",
        populate: { path: "category", select: "name" },
      })
      .sort({ updatedAt: -1 })
      .lean();

    return sendResponse(res, {
      message: "Applications fetched",
      data: rows,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to load applications",
      error: err.message,
    });
  }
};

export const withdrawApplication = async (req, res) => {
  try {
    const role = normalizeRole(req.auth?.role);
    if (role !== "job_seeker") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Only applicants can withdraw",
      });
    }

    const app = await Application.findById(req.params.id);
    if (!app || String(app.applicant) !== String(req.auth.userId)) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Application not found",
      });
    }

    if (app.status !== "pending") {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "You can only withdraw while the application is still pending",
      });
    }

    await Application.deleteOne({ _id: app._id });

    return sendResponse(res, {
      message: "Application withdrawn",
      data: { id: app._id },
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Withdraw failed",
      error: err.message,
    });
  }
};

export const listRecruiterInbox = async (req, res) => {
  try {
    const role = normalizeRole(req.auth?.role);
    if (role !== "recruiter") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Only recruiters can open the inbox",
      });
    }

    const myJobIds = await Job.find({ createdBy: req.auth.userId }).distinct("_id");
    if (!myJobIds.length) {
      return sendResponse(res, {
        message: "Inbox fetched",
        data: [],
      });
    }

    const rows = await Application.find({
      job: { $in: myJobIds },
    })
      .populate({
        path: "job",
        select: "title company location type mode category",
        populate: { path: "category", select: "name" },
      })
      .populate("applicant", "name email mobile headline skills bio")
      .sort({ updatedAt: -1 })
      .lean();

    return sendResponse(res, {
      message: "Inbox fetched",
      data: rows,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to load inbox",
      error: err.message,
    });
  }
};

const RECRUITER_STATUSES = ["reviewed", "shortlisted", "rejected"];

export const updateApplicationStatus = async (req, res) => {
  try {
    const role = normalizeRole(req.auth?.role);
    if (role !== "recruiter") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Only recruiters can update application status",
      });
    }

    const next = String(req.body?.status || "").toLowerCase();
    if (!RECRUITER_STATUSES.includes(next)) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: `Invalid status. Use: ${RECRUITER_STATUSES.join(", ")}`,
      });
    }

    const check = await assertRecruiterOwnsApplication(req, req.params.id);
    if (check.error) {
      return sendResponse(res, {
        success: false,
        statusCode: check.error.statusCode,
        message: check.error.message,
      });
    }

    const app = check.app;
    app.status = next;
    await app.save();

    const populated = await Application.findById(app._id)
      .populate({
        path: "job",
        select: "title company location type mode category",
        populate: { path: "category", select: "name" },
      })
      .populate("applicant", "name email mobile headline skills bio")
      .lean();

    return sendResponse(res, {
      message: "Status updated",
      data: populated,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Update failed",
      error: err.message,
    });
  }
};

export const getApplicantProfileForRecruiter = async (req, res) => {
  try {
    const role = normalizeRole(req.auth?.role);
    if (role !== "recruiter") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Only recruiters can view applicant profiles this way",
      });
    }

    const check = await assertRecruiterOwnsApplication(req, req.params.id);
    if (check.error) {
      return sendResponse(res, {
        success: false,
        statusCode: check.error.statusCode,
        message: check.error.message,
      });
    }

    const user = await User.findById(check.app.applicant).select("-password").lean();
    if (!user) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Applicant not found",
      });
    }

    return sendResponse(res, {
      message: "Applicant profile",
      data: leanApplicantForRecruiter(user),
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to load profile",
      error: err.message,
    });
  }
};

export const downloadApplicantResumeForRecruiter = async (req, res) => {
  try {
    const role = normalizeRole(req.auth?.role);
    if (role !== "recruiter") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Only recruiters can download this resume",
      });
    }

    const check = await assertRecruiterOwnsApplication(req, req.params.id);
    if (check.error) {
      return sendResponse(res, {
        success: false,
        statusCode: check.error.statusCode,
        message: check.error.message,
      });
    }

    const user = await User.findById(check.app.applicant).select("resume");
    if (!user?.resume?.path) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Applicant has no resume on file",
      });
    }

    const absPath = path.resolve(user.resume.path);
    if (!fs.existsSync(absPath)) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Resume file missing on server",
      });
    }

    const downloadName = user.resume.originalName || "resume.pdf";
    return res.download(absPath, downloadName);
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Download failed",
      error: err.message,
    });
  }
};
