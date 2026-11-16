import { io } from "socket.io-client";

const API = "http://localhost:5000";

const login = async (email) => {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "123456" }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}`);
  return res.json();
};

const connect = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(API, { auth: { token } });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });

const safat = await login("safat@test.com");
const rahim = await login("rahim@test.com");

const safatSocket = await connect(safat.token);
const rahimSocket = await connect(rahim.token);

rahimSocket.on("onlineUsers", (ids) => console.log("Online users:", ids));
rahimSocket.on("newMessage", (m) => console.log("Rahim received:", m.text));
safatSocket.on("newMessage", (m) => console.log("Safat sees own message:", m.text));

safatSocket.emit(
  "sendMessage",
  { receiverId: rahim._id, text: "Hello Rahim!" },
  (response) => console.log("Server ack:", response.ok)
);

setTimeout(() => {
  safatSocket.disconnect();
  rahimSocket.disconnect();
  process.exit(0);
}, 1500);