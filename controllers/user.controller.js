import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { sendResponse } from "../utils/response.js";
import { signAccessToken } from "../utils/jwt.util.js";
import { normalizeRole } from "../utils/role.util.js";

const SALT_ROUNDS = 10;

function toPublicUser(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  delete o.password;
  return {
    ...o,
    role: normalizeRole(o.role),
  };
}

async function issueAuthPayload(userDoc) {
  const role = normalizeRole(userDoc.role);
  const token = signAccessToken({ _id: userDoc._id, role });
  const user = toPublicUser(userDoc);
  user.role = role;
  return { token, user };
}

/** Public signup: job_seeker or recruiter only (never admin). */
export const signup = async (req, res) => {
  try {
    const { name, email, password, mobile, role: rawRole, companyName } = req.body;

    if (!name || !email || !password) {
      return sendResponse(res, {
        success: false,
        message: "Name, email, and password are required",
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

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const newuser = new User({
      name,
      email,
      password: hashed,
      mobile,
      role,
      companyName: role === "recruiter" && companyName ? String(companyName).trim() : undefined,
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

    let passwordOk = false;
    if (user.password?.startsWith("$2")) {
      passwordOk = await bcrypt.compare(password, user.password);
    } else {
      passwordOk = user.password === password;
      if (passwordOk) {
        user.password = await bcrypt.hash(password, SALT_ROUNDS);
        await user.save();
      }
    }

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
      city,
      state,
      pincode,
      dob,
      gender,
      bio,
      skills,
      interests,
      companyName,
    } = req.body;

    const existing = await User.findById(userId);
    if (!existing) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "User not found",
      });
    }

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
    if (city !== undefined) nextAddress.city = city;
    if (state !== undefined) nextAddress.state = state;
    if (pincode !== undefined) nextAddress.pincode = pincode;

    const updates = {
      address: nextAddress,
      skills: skillsArr,
      interests: interestsArr,
    };
    if (dob !== undefined) updates.dob = dob || null;
    if (gender !== undefined) updates.gender = gender;
    if (bio !== undefined) updates.bio = bio;
    if (companyName !== undefined && normalizeRole(existing.role) === "recruiter") {
      updates.companyName = String(companyName).trim();
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

export const getAllUser = async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();
    const shaped = users.map((u) => ({
      ...u,
      role: normalizeRole(u.role),
    }));
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

export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, mobile, password, role, ...rest } = req.body;

    const payload = { ...rest };
    if (email !== undefined) payload.email = String(email).toLowerCase();
    if (mobile !== undefined) payload.mobile = mobile;
    if (role !== undefined) payload.role = role;
    if (password) {
      payload.password = await bcrypt.hash(String(password), SALT_ROUNDS);
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
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return sendResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
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
