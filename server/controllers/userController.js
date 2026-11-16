import User from "../models/User.js";

// GET /api/users  (protected) - everyone except the logged-in user
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("username email")
      .sort({ username: 1 });

    res.json(users);
  } catch (error) {
    console.error("Get users error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};