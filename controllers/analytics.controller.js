import mongoose from "mongoose";
import Application from "../models/application.model.js";
import Job from "../models/Job.js";
import { User } from "../models/user.model.js";
import { sendResponse } from "../utils/response.js";
import { normalizeRole } from "../utils/role.util.js";

function statusMapFromAgg(rows) {
  const m = { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0 };
  for (const r of rows || []) {
    if (r._id && m[r._id] !== undefined) m[r._id] = r.count;
  }
  return m;
}

function mergeLegacyUserRole(roleCounts) {
  const out = {
    job_seeker: 0,
    recruiter: 0,
    admin: 0,
  };
  for (const { _id, count } of roleCounts) {
    const raw = _id == null ? "" : String(_id);
    const r = raw === "user" || raw === "" ? "job_seeker" : raw;
    if (r === "job_seeker" || r === "recruiter" || r === "admin") out[r] += count;
    else out.job_seeker += count;
  }
  return out;
}

export const getAdminAnalytics = async (req, res) => {
  try {
    if (normalizeRole(req.auth?.role) !== "admin") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Admin only",
      });
    }

    const now = Date.now();
    const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      roleAgg,
      activeUsersCount,
      jobStatusAgg,
      jobsTotal,
      appsTotal,
      appByStatus,
      appsLast7,
      appsLast30,
      jobsWithAppsDistinct,
      perJobApps,
      recentApps,
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      User.countDocuments({ $or: [{ isActive: true }, { status: "Active" }] }),
      Job.aggregate([
        {
          $group: {
            _id: "$publicationStatus",
            count: { $sum: 1 },
          },
        },
      ]),
      Job.countDocuments(),
      Application.countDocuments(),
      Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Application.countDocuments({ createdAt: { $gte: d7 } }),
      Application.countDocuments({ createdAt: { $gte: d30 } }),
      Application.distinct("job"),
      Application.aggregate([
        {
          $group: {
            _id: "$job",
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            reviewed: { $sum: { $cond: [{ $eq: ["$status", "reviewed"] }, 1, 0] } },
            shortlisted: { $sum: { $cond: [{ $eq: ["$status", "shortlisted"] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 80 },
        {
          $lookup: {
            from: "jobs",
            localField: "_id",
            foreignField: "_id",
            as: "jobDoc",
          },
        },
        { $unwind: { path: "$jobDoc", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "jobDoc.createdBy",
            foreignField: "_id",
            as: "recruiterDoc",
          },
        },
        { $unwind: { path: "$recruiterDoc", preserveNullAndEmptyArrays: true } },
        { $addFields: { jobRefId: "$_id" } },
        {
          $project: {
            _id: 0,
            jobId: "$jobRefId",
            title: "$jobDoc.title",
            company: "$jobDoc.company",
            publicationStatus: "$jobDoc.publicationStatus",
            isActive: "$jobDoc.isActive",
            recruiterName: "$recruiterDoc.name",
            recruiterEmail: "$recruiterDoc.email",
            applicationCount: "$total",
            pending: 1,
            reviewed: 1,
            shortlisted: 1,
            rejected: 1,
          },
        },
      ]),
      Application.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("job", "title company")
        .populate("applicant", "name email")
        .lean(),
    ]);

    const rolesMerged = mergeLegacyUserRole(roleAgg);
    const jobSeekers = rolesMerged.job_seeker;
    const recruiters = rolesMerged.recruiter;
    const admins = rolesMerged.admin;
    const totalUsers = jobSeekers + recruiters + admins;

    const pubMap = Object.fromEntries((jobStatusAgg || []).map((x) => [x._id || "unknown", x.count]));
    const publishedJobs = pubMap.published || 0;
    const draftJobs = pubMap.draft || 0;
    const archivedJobs = pubMap.archived || 0;

    const activeJobs = await Job.countDocuments({
      isActive: true,
      publicationStatus: "published",
    });

    const recruiterIdsWhoPosted = await Job.distinct("createdBy", {
      createdBy: { $exists: true, $ne: null },
    });
    const validRecruiterPosterIds = recruiterIdsWhoPosted.filter((id) => id != null);
    const jobsPostedByRecruiters = await Job.countDocuments({
      createdBy: { $exists: true, $ne: null },
    });

    const jobsWithAtLeastOneApplication = jobsWithAppsDistinct.filter(Boolean).length;
    const jobsWithNoApplications = Math.max(0, jobsTotal - jobsWithAtLeastOneApplication);

    const recent = (recentApps || []).map((a) => ({
      id: a._id,
      status: a.status,
      createdAt: a.createdAt,
      jobTitle: a.job?.title || "—",
      company: a.job?.company || "",
      applicantName: a.applicant?.name || "—",
      applicantEmail: a.applicant?.email || "",
    }));

    return sendResponse(res, {
      message: "Admin analytics",
      data: {
        generatedAt: new Date().toISOString(),
        users: {
          total: totalUsers,
          jobSeekers,
          recruiters,
          admins,
          activeAccounts: activeUsersCount,
        },
        recruiters: {
          registered: recruiters,
          postedAtLeastOneJob: validRecruiterPosterIds.length,
          idle: Math.max(0, recruiters - validRecruiterPosterIds.length),
        },
        jobs: {
          total: jobsTotal,
          published: publishedJobs,
          draft: draftJobs,
          archived: archivedJobs,
          activePublished: activeJobs,
          postedByRecruiters: jobsPostedByRecruiters,
          withApplications: jobsWithAtLeastOneApplication,
          withNoApplications: jobsWithNoApplications,
        },
        applications: {
          total: appsTotal,
          last7Days: appsLast7,
          last30Days: appsLast30,
          byStatus: statusMapFromAgg(appByStatus),
        },
        jobsByApplications: perJobApps,
        recentApplications: recent,
      },
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to load analytics",
      error: err.message,
    });
  }
};

export const getRecruiterAnalytics = async (req, res) => {
  try {
    if (normalizeRole(req.auth?.role) !== "recruiter") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Recruiters only",
      });
    }

    const uid = req.auth.userId;
    if (!mongoose.Types.ObjectId.isValid(String(uid))) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid user",
      });
    }

    const userId = new mongoose.Types.ObjectId(String(uid));
    const now = Date.now();
    const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const myJobs = await Job.find({ createdBy: userId })
      .select("title company publicationStatus isActive updatedAt createdAt")
      .lean();

    const jobIds = myJobs.map((j) => j._id);
    if (jobIds.length === 0) {
      return sendResponse(res, {
        message: "Recruiter analytics",
        data: {
          generatedAt: new Date().toISOString(),
          jobs: { total: 0, published: 0, draft: 0, archived: 0, activePublished: 0 },
          applications: {
            total: 0,
            last7Days: 0,
            last30Days: 0,
            byStatus: { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0 },
          },
          perJob: [],
        },
      });
    }

    const [appByStatus, appsLast7, appsLast30, appsTotal, perJobAgg] = await Promise.all([
      Application.aggregate([
        { $match: { job: { $in: jobIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Application.countDocuments({ job: { $in: jobIds }, createdAt: { $gte: d7 } }),
      Application.countDocuments({ job: { $in: jobIds }, createdAt: { $gte: d30 } }),
      Application.countDocuments({ job: { $in: jobIds } }),
      Application.aggregate([
        { $match: { job: { $in: jobIds } } },
        {
          $group: {
            _id: "$job",
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            reviewed: { $sum: { $cond: [{ $eq: ["$status", "reviewed"] }, 1, 0] } },
            shortlisted: { $sum: { $cond: [{ $eq: ["$status", "shortlisted"] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    const jobById = Object.fromEntries(myJobs.map((j) => [String(j._id), j]));
    const perJob = (perJobAgg || []).map((row) => {
      const j = jobById[String(row._id)];
      return {
        jobId: row._id,
        title: j?.title || "—",
        company: j?.company || "",
        publicationStatus: j?.publicationStatus,
        isActive: j?.isActive,
        applicationCount: row.total,
        pending: row.pending,
        reviewed: row.reviewed,
        shortlisted: row.shortlisted,
        rejected: row.rejected,
      };
    });

    const jobsWithZeroApps = myJobs.filter((j) => !perJob.some((p) => String(p.jobId) === String(j._id)));

    for (const j of jobsWithZeroApps) {
      perJob.push({
        jobId: j._id,
        title: j.title,
        company: j.company,
        publicationStatus: j.publicationStatus,
        isActive: j.isActive,
        applicationCount: 0,
        pending: 0,
        reviewed: 0,
        shortlisted: 0,
        rejected: 0,
      });
    }

    perJob.sort((a, b) => b.applicationCount - a.applicationCount);

    const published = myJobs.filter((j) => j.publicationStatus === "published").length;
    const draft = myJobs.filter((j) => j.publicationStatus === "draft").length;
    const archived = myJobs.filter((j) => j.publicationStatus === "archived").length;
    const activePublished = myJobs.filter((j) => j.publicationStatus === "published" && j.isActive).length;

    return sendResponse(res, {
      message: "Recruiter analytics",
      data: {
        generatedAt: new Date().toISOString(),
        jobs: {
          total: myJobs.length,
          published,
          draft,
          archived,
          activePublished,
        },
        applications: {
          total: appsTotal,
          last7Days: appsLast7,
          last30Days: appsLast30,
          byStatus: statusMapFromAgg(appByStatus),
        },
        perJob,
      },
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to load analytics",
      error: err.message,
    });
  }
};
