import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/auth.config.js";
import { normalizeRole } from "./role.util.js";

/** @param {{ _id: import("mongoose").Types.ObjectId | string, role: string }} user */
export function signAccessToken(user) {
  const sub = typeof user._id === "string" ? user._id : user._id.toString();
  const role = normalizeRole(user.role);
  return jwt.sign({ sub, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
