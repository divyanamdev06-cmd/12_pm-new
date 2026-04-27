import express from "express"
import { completeProfile, deleteUser, getAllUser, login, signup, toggleUserStatus, updateUser } from "../controllers/user.controller.js";
const router = express.Router();

router.post("/signup", signup)
router.post("/login", login)
router.get("/getalluser", getAllUser)
router.put("/completeProfile/:id", completeProfile)
router.put("/update/:id", updateUser);
router.delete("/delete/:id", deleteUser);
router.patch("/status/:id", toggleUserStatus);

export default router