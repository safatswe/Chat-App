import User from "../models/User.js";
import Message from "../models/Message.js";

// GET /api/users - everyone except me, with a hasChat flag
export const getUsers = async (req, res) => {
  try {
    const myId = req.user._id;

    const [sentTo, receivedFrom] = await Promise.all([
      Message.distinct("receiver", { sender: myId, deletedBy: { $ne: myId } }),
      Message.distinct("sender", { receiver: myId, deletedBy: { $ne: myId } }),
    ]);
    const chatIds = new Set([...sentTo, ...receivedFrom].map(String));

    const users = await User.find({ _id: { $ne: myId } })
      .select("username email avatar")
      .sort({ username: 1 })
      .lean();

    res.json(users.map((u) => ({ ...u, hasChat: chatIds.has(String(u._id)) })));
  } catch (error) {
    console.error("Get users error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/users/avatar - set or remove the profile picture
export const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    const isRemoval = avatar === "";
    const isValidImage =
      typeof avatar === "string" &&
      avatar.length <= 300000 &&
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar);

    if (!isRemoval && !isValidImage) {
      return res.status(400).json({ message: "Invalid or too large image" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    ).select("username email avatar");

    req.app.get("io")?.emit("usersChanged");

    res.json(user);
  } catch (error) {
    console.error("Update avatar error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};