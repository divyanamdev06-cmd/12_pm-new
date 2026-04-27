import express from "express";
import {
  completeProfile,
  deleteResume,
  deleteUser,
  downloadMyResume,
  getAllUser,
  getUserForAdmin,
  getMe,
  login,
  signup,
  toggleUserStatus,
  updateUser,
  uploadResume,
} from "../controllers/user.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { uploadResumeMiddleware } from "../middleware/uploadResume.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", authenticate, getMe);
router.put("/profile/complete", authenticate, completeProfile);

router.get("/profile/resume", authenticate, downloadMyResume);
router.post("/profile/resume", authenticate, uploadResumeMiddleware, uploadResume);
router.delete("/profile/resume", authenticate, deleteResume);

router.get(
  "/getalluser",
  authenticate,
  requireRoles("admin"),
  getAllUser
);

router.get(
  "/admin/detail/:id",
  authenticate,
  requireRoles("admin"),
  getUserForAdmin
);

router.put(
  "/update/:id",
  authenticate,
  requireRoles("admin"),
  updateUser
);

router.delete(
  "/delete/:id",
  authenticate,
  requireRoles("admin"),
  deleteUser
);

router.patch(
  "/status/:id",
  authenticate,
  requireRoles("admin"),
  toggleUserStatus
);

export default router;
