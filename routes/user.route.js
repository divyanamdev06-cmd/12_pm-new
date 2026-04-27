import express from "express";
import {
  completeProfile,
  deleteUser,
  getAllUser,
  getMe,
  login,
  signup,
  toggleUserStatus,
  updateUser,
} from "../controllers/user.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", authenticate, getMe);
router.put("/profile/complete", authenticate, completeProfile);

router.get(
  "/getalluser",
  authenticate,
  requireRoles("admin"),
  getAllUser
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
