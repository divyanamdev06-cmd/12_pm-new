import { sendResponse } from "../utils/response.js";
import { verifyAccessToken } from "../utils/jwt.util.js";
import { normalizeRole } from "../utils/role.util.js";

/**
 * Validates `Authorization: Bearer <token>` and sets `req.auth = { userId, role }`.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return sendResponse(res, {
      success: false,
      statusCode: 401,
      message: "Authentication required",
    });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return sendResponse(res, {
      success: false,
      statusCode: 401,
      message: "Authentication required",
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.auth = {
      userId: decoded.sub,
      role: normalizeRole(decoded.role),
    };
    next();
  } catch {
    return sendResponse(res, {
      success: false,
      statusCode: 401,
      message: "Invalid or expired token",
    });
  }
}

/** Pass allowed role strings; user must be authenticated first (use after `authenticate`). */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth?.userId) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Authentication required",
      });
    }
    if (!allowedRoles.includes(req.auth.role)) {
      return sendResponse(res, {
        success: false,
        statusCode: 403,
        message: "You do not have permission for this action",
      });
    }
    next();
  };
}
