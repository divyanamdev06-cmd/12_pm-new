import fs from "fs";
import path from "path";
import { User } from "../models/user.model.js";
import { sendResponse } from "../utils/response.js";
import { signAccessToken } from "../utils/jwt.util.js";
import { normalizeRole } from "../utils/role.util.js";

const MIN_PASSWORD_LEN = 8;

function toPublicUser(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  delete o.password;
  const out = {
    ...o,
    role: normalizeRole(o.role),
  };
  if (out.resume?.path) {
    out.resume = {
      originalName: out.resume.originalName,
      mimeType: out.resume.mimeType,
      uploadedAt: out.resume.uploadedAt,
      hasFile: true,
    };
  }
  return out;
}

/** Same shape as `toPublicUser` for plain/lean objects (e.g. list endpoints). */
function leanToPublicUser(u) {
  if (!u) return null;
  const o = { ...u };
  delete o.password;
  const out = {
    ...o,
    role: normalizeRole(o.role),
  };
  if (out.resume?.path) {
    out.resume = {
      originalName: out.resume.originalName,
      mimeType: out.resume.mimeType,
      uploadedAt: out.resume.uploadedAt,
      hasFile: true,
    };
  }
  return out;
}

const ADMIN_UPDATABLE_PROFILE_KEYS = new Set([
  "name",
  "headline",
  "bio",
  "mobile",
  "skills",
  "interests",
  "address",
  "companyName",
  "companyWebsite",
  "companyIndustry",
  "companySize",
  "companyDescription",
  "education",
  "workExperience",
  "gender",
  "dob",
  "isEmailVerified",
]);

const DB_ROLES = ["job_seeker", "recruiter", "admin", "user"];

async function issueAuthPayload(userDoc) {
  const role = normalizeRole(userDoc.role);
  const token = signAccessToken({ _id: userDoc._id, role });
  const user = toPublicUser(userDoc);
  user.role = role;
  return { token, user };
}

function parseEducation(input) {
  if (!Array.isArray(input)) return undefined;
  return input
    .filter((e) => e && (String(e.institution || "").trim() || String(e.degree || "").trim()))
    .map((e) => ({
      institution: String(e.institution || "").trim(),
      degree: String(e.degree || "").trim(),
      field: String(e.field || "").trim(),
      startYear:
        e.startYear !== undefined && e.startYear !== "" && !Number.isNaN(Number(e.startYear))
          ? Number(e.startYear)
          : undefined,
      endYear:
        e.endYear !== undefined && e.endYear !== "" && !Number.isNaN(Number(e.endYear))
          ? Number(e.endYear)
          : undefined,
      description: String(e.description || "").slice(0, 2000),
    }))
    .slice(0, 25);
}

function parseWorkExperience(input) {
  if (!Array.isArray(input)) return undefined;
  return input
    .filter((e) => e && (String(e.company || "").trim() || String(e.title || "").trim()))
    .map((e) => ({
      company: String(e.company || "").trim(),
      title: String(e.title || "").trim(),
      location: String(e.location || "").trim(),
      startDate: String(e.startDate || "").trim(),
      endDate: String(e.endDate || "").trim(),
      current: Boolean(e.current),
      description: String(e.description || "").slice(0, 3000),
    }))
    .slice(0, 25);
}

/** Public signup: job_seeker or recruiter only (never admin). */
export const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      mobile,
      role: rawRole,
      companyName,
      companyWebsite,
      companyIndustry,
      companySize,
      companyDescription,
    } = req.body;

    if (!name || !email || !password) {
      return sendResponse(res, {
        success: false,
        message: "Name, email, and password are required",
        statusCode: 400,
      });
    }

    if (String(password).length < MIN_PASSWORD_LEN) {
      return sendResponse(res, {
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LEN} characters`,
        statusCode: 400,
      });
    }

    let role = rawRole === "recruiter" ? "recruiter" : "job_seeker";
    if (rawRole === "admin") {
      role = "job_seeker";
    }

    const existuser = await User.findOne({ email });
    if (existuser) {
      return sendResponse(res, {
        success: false,
        message: "Email already exists",
        statusCode: 400,
      });
    }

    const newuser = new User({
      name,
      email,
      password: String(password),
      mobile,
      role,
      companyName: role === "recruiter" && companyName ? String(companyName).trim() : undefined,
      companyWebsite: role === "recruiter" && companyWebsite ? String(companyWebsite).trim() : "",
      companyIndustry: role === "recruiter" && companyIndustry ? String(companyIndustry).trim() : "",
      companySize: role === "recruiter" && companySize ? String(companySize).trim() : "",
      companyDescription:
        role === "recruiter" && companyDescription ? String(companyDescription).slice(0, 4000) : "",
      status: "Active",
    });
    await newuser.save();

    const { token, user } = await issueAuthPayload(newuser);

    return sendResponse(res, {
      statusCode: 201,
      message: "User created successfully",
      data: { user, token },
    });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      message: "Server error",
      error: error.message,
      statusCode: 500,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, {
        success: false,
        message: "All fields are required",
        statusCode: 400,
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return sendResponse(res, {
        success: false,
        message: "Email not registered",
        statusCode: 404,
      });
    }

    if (user.status === "Inactive" || user.isActive === false) {
      return sendResponse(res, {
        success: false,
        message: "Account is disabled. Contact support.",
        statusCode: 403,
      });
    }

    const passwordOk = user.password === password;

    if (!passwordOk) {
      return sendResponse(res, {
        success: false,
        message: "Wrong password",
        statusCode: 401,
      });
    }

    const { token, user: safeUser } = await issueAuthPayload(user);

    return sendResponse(res, {
      message: "Login successful",
      data: { user: safeUser, token },
    });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      message: "Server error",
      error: error.message,
      statusCode: 500,
    });
  }
};

/** Current user from JWT (no password). */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return sendResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }
    const safe = toPublicUser(user);
    safe.role = normalizeRole(safe.role);
    return sendResponse(res, {
      message: "Profile fetched",
      data: safe,
    });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to load profile",
      error: error.message,
    });
  }
};

export const completeProfile = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const {
      address,
      street,
      city,
      state,
      pincode,
      country,
      dob,
      gender,
      bio,
      skills,
      interests,
      companyName,
      companyWebsite,
      companyIndustry,
      companySize,
      companyDescription,
      name,
      mobile,
      headline,
      education,
      workExperience,
    } = req.body;

    const existing = await User.findById(userId);
    if (!existing) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "User not found",
      });
    }

    const role = normalizeRole(existing.role);

    let skillsArr = existing.skills;
    if (skills !== undefined) {
      skillsArr = Array.isArray(skills)
        ? skills.map(String)
        : String(skills)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    let interestsArr = existing.interests;
    if (interests !== undefined) {
      interestsArr = Array.isArray(interests)
        ? interests.map(String)
        : String(interests)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    const nextAddress = {
      ...(existing.address?.toObject?.() || existing.address || {}),
      ...(address && typeof address === "object" ? address : {}),
    };
    if (street !== undefined) nextAddress.street = String(street || "").trim();
    if (city !== undefined) nextAddress.city = city;
    if (state !== undefined) nextAddress.state = state;
    if (pincode !== undefined) nextAddress.pincode = pincode;
    if (country !== undefined) nextAddress.country = String(country || "").trim() || nextAddress.country;

    const updates = {
      address: nextAddress,
      skills: skillsArr,
      interests: interestsArr,
    };

    if (name !== undefined) {
      const n = String(name).trim();
      if (!n) {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: "Name cannot be empty",
        });
      }
      updates.name = n;
    }
    if (mobile !== undefined) updates.mobile = mobile;
    if (dob !== undefined) updates.dob = dob || null;
    if (gender !== undefined) updates.gender = gender;
    if (bio !== undefined) updates.bio = bio;
    if (headline !== undefined) updates.headline = String(headline || "").slice(0, 200);

    const eduParsed = parseEducation(education);
    if (eduParsed !== undefined) {
      if (role !== "job_seeker") {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: "Education is only stored for job seeker profiles",
        });
      }
      updates.education = eduParsed;
    }

    const workParsed = parseWorkExperience(workExperience);
    if (workParsed !== undefined) {
      if (role !== "job_seeker") {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: "Work experience is only stored for job seeker profiles",
        });
      }
      updates.workExperience = workParsed;
    }

    if (companyName !== undefined && role === "recruiter") {
      updates.companyName = String(companyName).trim();
    }
    if (companyWebsite !== undefined && role === "recruiter") {
      updates.companyWebsite = String(companyWebsite || "").trim();
    }
    if (companyIndustry !== undefined && role === "recruiter") {
      updates.companyIndustry = String(companyIndustry || "").trim();
    }
    if (companySize !== undefined && role === "recruiter") {
      updates.companySize = String(companySize || "").trim();
    }
    if (companyDescription !== undefined && role === "recruiter") {
      updates.companyDescription = String(companyDescription || "").slice(0, 4000);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    const safe = toPublicUser(updatedUser);
    safe.role = normalizeRole(safe.role);

    return sendResponse(res, {
      message: "Profile updated successfully",
      data: safe,
    });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

/** PDF resume — job seekers only. */
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "No file uploaded (use field name: resume)",
      });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
      return sendResponse(res, { success: false, statusCode: 404, message: "User not found" });
    }

    const role = normalizeRole(user.role);
    if (role !== "job_seeker") {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Only job seekers can upload a resume",
      });
    }

    if (user.resume?.path) {
      try {
        const oldPath = path.resolve(user.resume.path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch {
        /* ignore */
      }
    }

    user.resume = {
      path: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
    };
    await user.save();

    const safe = toPublicUser(await User.findById(user._id));
    safe.role = normalizeRole(safe.role);

    return sendResponse(res, {
      message: "Resume uploaded successfully",
      data: safe,
    });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to save resume",
      error: error.message,
    });
  }
};

export const deleteResume = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return sendResponse(res, { success: false, statusCode: 404, message: "User not found" });
    }
    if (normalizeRole(user.role) !== "job_seeker") {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "Only job seekers manage resumes here",
      });
    }
    if (user.resume?.path) {
      try {
        const p = path.resolve(user.resume.path);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
    user.resume = undefined;
    await user.save();
    const safe = toPublicUser(user);
    safe.role = normalizeRole(safe.role);
    return sendResponse(res, { message: "Resume removed", data: safe });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
};

/** Download own resume (auth required). */
export const downloadMyResume = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).select("resume role");
    if (!user?.resume?.path) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "No resume on file",
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
  } catch (error) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();
    const shaped = users.map((u) => leanToPublicUser(u));
    return sendResponse(res, {
      message: "Users fetched successfully",
      data: shaped,
    });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      message: "Server error",
      error: error.message,
      statusCode: 500,
    });
  }
};

export const getUserForAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return sendResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }
    return sendResponse(res, {
      message: "User fetched successfully",
      data: toPublicUser(user),
    });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const body = req.body || {};
    const { email, mobile, password, role } = body;

    const payload = {};
    for (const key of Object.keys(body)) {
      if (ADMIN_UPDATABLE_PROFILE_KEYS.has(key)) {
        payload[key] = body[key];
      }
    }

    if (email !== undefined) payload.email = String(email).toLowerCase().trim();
    if (mobile !== undefined) payload.mobile = mobile;

    if (role !== undefined) {
      const r = String(role).trim().toLowerCase().replace(/\s+/g, "_");
      if (!DB_ROLES.includes(r)) {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: `Invalid role. Allowed: ${DB_ROLES.join(", ")}`,
        });
      }
      payload.role = r;
    }

    if (password !== undefined && password !== null && String(password).trim() !== "") {
      const p = String(password);
      if (p.length < MIN_PASSWORD_LEN) {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: `Password must be at least ${MIN_PASSWORD_LEN} characters`,
        });
      }
      payload.password = p;
    }

    if (body.status !== undefined) {
      const s = String(body.status).trim();
      if (s === "Active" || s === "Inactive") {
        payload.status = s;
        payload.isActive = s === "Active";
      } else {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: "Invalid status (use Active or Inactive)",
        });
      }
    } else if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: "isActive must be a boolean",
        });
      }
      payload.isActive = body.isActive;
      payload.status = body.isActive ? "Active" : "Inactive";
    }

    if (Object.keys(payload).length === 0) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "No valid fields to update",
      });
    }

    if (String(userId) === String(req.auth?.userId)) {
      if (payload.status === "Inactive" || payload.isActive === false) {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: "You cannot deactivate your own account",
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, payload, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return sendResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    return sendResponse(res, {
      message: "User updated successfully",
      data: toPublicUser(updatedUser),
    });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (String(userId) === String(req.auth?.userId)) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "You cannot delete your own account from here",
      });
    }
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return sendResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    if (deletedUser.resume?.path) {
      try {
        const p = path.resolve(deletedUser.resume.path);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }

    return sendResponse(res, {
      message: "User deleted successfully",
      data: { id: userId },
    });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const raw = (req.body.status || "").toLowerCase();

    let status = "Active";
    let isActive = true;
    if (raw === "inactive" || raw === "disabled") {
      status = "Inactive";
      isActive = false;
    } else if (raw === "active") {
      status = "Active";
      isActive = true;
    } else {
      return sendResponse(res, {
        success: false,
        message: "Invalid status value (use active or inactive)",
        statusCode: 400,
      });
    }

    if (!isActive && String(userId) === String(req.auth?.userId)) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "You cannot deactivate your own account",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status, isActive },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return sendResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    return sendResponse(res, {
      message: `User is now ${status}`,
      data: toPublicUser(user),
    });
  } catch (error) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
};
