import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { initSocket } from "./socket/socket.js";

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
// Allow bigger request bodies (profile pictures are sent as base64 text)
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

// Attach Socket.IO to the same HTTP server and share it with the routes,
// so controllers can emit events (used for the "usersChanged" event)
const io = initSocket(server);
app.set("io", io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});