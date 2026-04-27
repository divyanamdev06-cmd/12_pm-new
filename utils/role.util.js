/** Legacy `user` role behaves like job_seeker in tokens and authorization. */
export function normalizeRole(role) {
  if (!role || role === "user") return "job_seeker";
  return role;
}
