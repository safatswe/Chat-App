import express from "express";
import {
  getMessages,
  deleteConversation,
} from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:userId", protect, getMessages);
router.delete("/:userId", protect, deleteConversation);

export default router;