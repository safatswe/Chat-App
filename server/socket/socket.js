import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Message from "../models/Message.js";

// userId -> number of open connections (a user can have several tabs open)
const onlineUsers = new Map();

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Authentication: runs once when a client tries to connect
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error: no token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("Authentication error: user not found"));

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();

    // Every user joins a private room named after their own id.
    // Sending to that room reaches all of their open tabs.
    socket.join(userId);

    onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));

    // Send a message
    socket.on("sendMessage", async ({ receiverId, text } = {}, callback) => {
      try {
        const cleanText = typeof text === "string" ? text.trim() : "";

        if (!cleanText || cleanText.length > 2000) {
          throw new Error("Message must be 1-2000 characters");
        }
        if (!mongoose.isValidObjectId(receiverId)) {
          throw new Error("Invalid receiver");
        }
        const receiverExists = await User.exists({ _id: receiverId });
        if (!receiverExists) throw new Error("Receiver not found");

        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          text: cleanText,
        });

        // Deliver to the receiver and to the sender's own tabs
        io.to(receiverId).to(userId).emit("newMessage", message);

        if (typeof callback === "function") callback({ ok: true, message });
      } catch (error) {
        if (typeof callback === "function") {
          callback({ ok: false, error: error.message });
        }
      }
    });

    // Typing indicator
    socket.on("typing", ({ receiverId } = {}) => {
      if (receiverId) io.to(receiverId).emit("typing", { senderId: userId });
    });

    socket.on("stopTyping", ({ receiverId } = {}) => {
      if (receiverId) io.to(receiverId).emit("stopTyping", { senderId: userId });
    });

    // Disconnect
    socket.on("disconnect", () => {
      const count = (onlineUsers.get(userId) || 1) - 1;
      if (count <= 0) onlineUsers.delete(userId);
      else onlineUsers.set(userId, count);

      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });
  });

  return io;
};