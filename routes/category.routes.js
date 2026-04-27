import express from "express";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { authenticate, optionalAuthenticate, requireRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

const adminOnly = [authenticate, requireRoles("admin")];

router.post("/create", ...adminOnly, createCategory);
router.get("/get", optionalAuthenticate, getCategories);
router.put("/update/:id", ...adminOnly, updateCategory);
router.delete("/delete/:id", ...adminOnly, deleteCategory);

export default router;