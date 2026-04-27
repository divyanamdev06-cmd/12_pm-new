import mongoose from "mongoose";
import Job from "../models/Job.js";
import Category from "../models/category.model.js";
import { sendResponse } from "../utils/response.js";
import { normalizeRole } from "../utils/role.util.js";

const PUBLIC_PUBLICATION_OR = [
  { publicationStatus: "published" },
  { publicationStatus: { $exists: false } },
  { publicationStatus: null },
];

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function canManageJob(req, job) {
  if (!req.auth?.userId || !job) return false;
  const role = normalizeRole(req.auth.role);
  if (role === "admin") return true;
  if (role === "recruiter" && job.createdBy && String(job.createdBy) === String(req.auth.userId)) {
    return true;
  }
  return false;
}

function canViewJobById(req, job) {
  if (!job) return false;
  const published =
    job.publicationStatus === "published" ||
    job.publicationStatus === undefined ||
    job.publicationStatus === null;
  const pub = job.isActive && published;
  if (pub) return true;
  return canManageJob(req, job);
}

const WRITABLE_KEYS = new Set([
  "title",
  "company",
  "location",
  "salary",
  "type",
  "mode",
  "category",
  "description",
  "summary",
  "publicationStatus",
  "experienceLevel",
  "department",
  "openings",
  "requirements",
  "benefits",
  "skills",
  "applicationDeadline",
  "externalApplyUrl",
  "isActive",
]);

function parseStringArray(val) {
  if (Array.isArray(val)) {
    return val.map((x) => String(x).trim()).filter(Boolean).slice(0, 80);
  }
  if (typeof val === "string") {
    return val
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 80);
  }
  return undefined;
}

function pickJobPayload(body) {
  const out = {};
  if (!body || typeof body !== "object") return out;
  for (const key of WRITABLE_KEYS) {
    if (body[key] === undefined) continue;
    if (key === "requirements" || key === "benefits" || key === "skills") {
      const arr = parseStringArray(body[key]);
      if (arr !== undefined) out[key] = arr;
      continue;
    }
    if (key === "openings") {
      const n = Number(body[key]);
      if (!Number.isNaN(n) && n >= 1) out[key] = Math.min(Math.floor(n), 9999);
      continue;
    }
    if (key === "applicationDeadline") {
      if (body[key] === "" || body[key] === null) {
        out[key] = null;
      } else {
        const d = new Date(body[key]);
        if (!Number.isNaN(d.getTime())) out[key] = d;
      }
      continue;
    }
    if (key === "category" && (body[key] === "" || body[key] === null)) {
      out[key] = null;
      continue;
    }
    out[key] = body[key];
  }
  return out;
}

async function validateCategoryId(categoryId) {
  if (!categoryId) return { ok: false, message: "Category is required" };
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return { ok: false, message: "Invalid category id" };
  }
  const cat = await Category.findById(categoryId).lean();
  if (!cat) return { ok: false, message: "Category not found" };
  if (cat.isActive === false) {
    return { ok: false, message: "That category is disabled" };
  }
  return { ok: true };
}

async function populateJob(doc) {
  if (!doc) return null;
  const id = doc._id ?? doc;
  return Job.findById(id)
    .populate("category")
    .populate("createdBy", "name email companyName role");
}

export const createJob = async (req, res) => {
  try {
    if (!req.auth?.userId) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Authentication required",
      });
    }
    const role = normalizeRole(req.auth.role);
    if (role !== "admin" && role !== "recruiter") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Only admins and recruiters can create jobs",
      });
    }

    const payload = pickJobPayload(req.body);
    const catCheck = await validateCategoryId(payload.category);
    if (!catCheck.ok) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: catCheck.message,
      });
    }

    payload.createdBy = req.auth.userId;

    let job = await Job.create(payload);
    job = await populateJob(job);

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

export const getJobs = async (req, res) => {
  try {
    const role = req.auth ? normalizeRole(req.auth.role) : null;
    const { categoryId, mode, type, publicationStatus, search, status } = req.query;
    const isPublic = !req.auth || (role !== "admin" && role !== "recruiter");

    let filter = {};

    if (isPublic) {
      filter = {
        isActive: true,
        $and: [{ $or: PUBLIC_PUBLICATION_OR }],
      };
      if (categoryId && mongoose.Types.ObjectId.isValid(String(categoryId))) {
        const cat = await Category.findById(categoryId).lean();
        if (!cat || cat.isActive === false) {
          return sendResponse(res, {
            message: "Jobs fetched successfully",
            data: [],
          });
        }
        filter.category = categoryId;
      } else {
        const activeCatIds = await Category.find({
          $or: [{ isActive: true }, { isActive: { $exists: false } }],
        }).distinct("_id");
        if (!activeCatIds.length) {
          return sendResponse(res, {
            message: "Jobs fetched successfully",
            data: [],
          });
        }
        filter.category = { $in: activeCatIds };
      }
    } else if (role === "recruiter") {
      filter = { createdBy: req.auth.userId };
      if (categoryId && mongoose.Types.ObjectId.isValid(String(categoryId))) {
        filter.category = categoryId;
      }
    } else {
      filter = {};
      if (categoryId && mongoose.Types.ObjectId.isValid(String(categoryId))) {
        filter.category = categoryId;
      }
    }

    if (mode) filter.mode = String(mode);
    if (type) filter.type = String(type);
    if (publicationStatus) filter.publicationStatus = String(publicationStatus);
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    if (search && String(search).trim()) {
      const t = String(search).trim();
      const rx = new RegExp(escapeReg(t), "i");
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: rx },
          { company: rx },
          { location: rx },
          { summary: rx },
          { description: rx },
          { skills: { $elemMatch: { $regex: escapeReg(t), $options: "i" } } },
        ],
      });
    }

    const jobs = await Job.find(filter)
      .populate("category")
      .populate("createdBy", "name email companyName role")
      .sort({ updatedAt: -1 });

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

/**
 * Public job discovery: search, filters, pagination, and active categories.
 * Always ignores auth — safe for the marketing site and logged-in job seekers.
 *
 * Query: q | search, categoryId, mode, type, experienceLevel, skills (comma-separated),
 *        page (default 1), limit (default 12, max 50)
 */
export const getJobBrowse = async (req, res) => {
  try {
    const {
      q,
      search,
      categoryId,
      mode,
      type,
      experienceLevel,
      skills,
      page = "1",
      limit = "12",
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      isActive: true,
      $and: [{ $or: PUBLIC_PUBLICATION_OR }],
    };

    if (categoryId && mongoose.Types.ObjectId.isValid(String(categoryId))) {
      const cat = await Category.findById(categoryId).lean();
      if (!cat || cat.isActive === false) {
        const categories = await Category.find({
          $or: [{ isActive: true }, { isActive: { $exists: false } }],
        })
          .select("name slug description sortOrder")
          .sort({ sortOrder: 1, name: 1 })
          .lean();
        return sendResponse(res, {
          message: "Browse results",
          data: {
            jobs: [],
            total: 0,
            page: pageNum,
            limit: limitNum,
            pageCount: 0,
            categories,
          },
        });
      }
      filter.category = categoryId;
    } else {
      const activeCatIds = await Category.find({
        $or: [{ isActive: true }, { isActive: { $exists: false } }],
      }).distinct("_id");
      if (!activeCatIds.length) {
        const categories = await Category.find({
          $or: [{ isActive: true }, { isActive: { $exists: false } }],
        })
          .select("name slug description sortOrder")
          .sort({ sortOrder: 1, name: 1 })
          .lean();
        return sendResponse(res, {
          message: "Browse results",
          data: {
            jobs: [],
            total: 0,
            page: pageNum,
            limit: limitNum,
            pageCount: 0,
            categories,
          },
        });
      }
      filter.category = { $in: activeCatIds };
    }

    if (mode) filter.mode = String(mode);
    if (type) filter.type = String(type);
    if (experienceLevel) filter.experienceLevel = String(experienceLevel);

    const searchText = String(q || search || "").trim();
    if (searchText) {
      const rx = new RegExp(escapeReg(searchText), "i");
      filter.$and.push({
        $or: [
          { title: rx },
          { company: rx },
          { location: rx },
          { summary: rx },
          { description: rx },
          { skills: { $elemMatch: { $regex: escapeReg(searchText), $options: "i" } } },
        ],
      });
    }

    if (skills && String(skills).trim()) {
      const tokens = String(skills)
        .split(/[,+]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8);
      for (const token of tokens) {
        filter.$and.push({
          skills: { $elemMatch: { $regex: escapeReg(token), $options: "i" } },
        });
      }
    }

    const categoriesPromise = Category.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    })
      .select("name slug description sortOrder")
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const [jobs, total, categories] = await Promise.all([
      Job.find(filter)
        .populate("category")
        .populate("createdBy", "name email companyName role")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Job.countDocuments(filter),
      categoriesPromise,
    ]);

    return sendResponse(res, {
      message: "Browse results",
      data: {
        jobs,
        total,
        page: pageNum,
        limit: limitNum,
        pageCount: total === 0 ? 0 : Math.ceil(total / limitNum),
        categories,
      },
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to browse jobs",
      error: err.message,
    });
  }
};

export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("category")
      .populate("createdBy", "name email companyName role");

    if (!job) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Job not found",
      });
    }

    if (!canViewJobById(req, job)) {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "You do not have access to this job",
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

export const updateJob = async (req, res) => {
  try {
    if (!req.auth?.userId) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Authentication required",
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Job not found",
      });
    }

    if (!canManageJob(req, job)) {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "You can only edit jobs you posted (or be an admin)",
      });
    }

    const payload = pickJobPayload(req.body);
    if (payload.category !== undefined) {
      if (!payload.category) {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: "Category is required",
        });
      }
      const catCheck = await validateCategoryId(payload.category);
      if (!catCheck.ok) {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: catCheck.message,
        });
      }
    }

    const updated = await Job.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    const populated = await populateJob(updated);

    return sendResponse(res, {
      message: "Job updated successfully",
      data: populated,
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

export const deleteJob = async (req, res) => {
  try {
    if (!req.auth?.userId) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Authentication required",
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Job not found",
      });
    }

    if (!canManageJob(req, job)) {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "You can only delete jobs you posted (or be an admin)",
      });
    }

    const deleted = await Job.findByIdAndDelete(req.params.id);
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

export const toggleJobStatus = async (req, res) => {
  try {
    if (!req.auth?.userId) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Authentication required",
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Job not found",
      });
    }

    if (!canManageJob(req, job)) {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "You can only change jobs you posted (or be an admin)",
      });
    }

    job.isActive = !job.isActive;
    await job.save();

    const populated = await populateJob(job);

    return sendResponse(res, {
      message: `Job is now ${job.isActive ? "active" : "inactive"}`,
      data: populated,
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
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(categoryId))) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid category id",
      });
    }

    const cat = await Category.findById(categoryId).lean();
    if (!cat || cat.isActive === false) {
      return sendResponse(res, {
        message: "Jobs fetched successfully",
        data: [],
      });
    }

    const filter = {
      category: categoryId,
      isActive: true,
      $and: [{ $or: PUBLIC_PUBLICATION_OR }],
    };

    const jobs = await Job.find(filter)
      .populate("category")
      .populate("createdBy", "name email companyName role")
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
