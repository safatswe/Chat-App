import mongoose from "mongoose";
import Message from "../models/Message.js";

// GET /api/messages/:userId - conversation with one user
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId },
      ],
      deletedBy: { $ne: myId },
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/messages/:userId - delete my copy of a conversation
export const deleteConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const otherId = new mongoose.Types.ObjectId(userId);
    const pair = {
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId },
      ],
    };

    // Hide every message in this conversation from me
    await Message.updateMany(pair, { $addToSet: { deletedBy: myId } });

    // If both people deleted a message, remove it from the database
    await Message.deleteMany({ ...pair, deletedBy: { $all: [myId, otherId] } });

    // Tell my other open tabs
    req.app
      .get("io")
      ?.to(myId.toString())
      .emit("conversationDeleted", { userId });

    res.json({ message: "Conversation deleted" });
  } catch (error) {
    console.error("Delete conversation error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};