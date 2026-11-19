import express from "express";
import { getUsers, updateAvatar } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getUsers);
router.put("/avatar", protect, updateAvatar);

export default router;