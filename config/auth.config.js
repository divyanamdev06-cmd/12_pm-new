/**
 * JobNest JWT configuration.
 * Set JWT_SECRET in production (never commit real secrets).
 */
export const JWT_SECRET = process.env.JWT_SECRET || "jobnest-dev-only-change-in-production";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
