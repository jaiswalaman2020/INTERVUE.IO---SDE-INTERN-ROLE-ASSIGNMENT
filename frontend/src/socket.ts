import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket: Socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("connect_error", (error: Error) => {
  console.error("❌ Socket connection error:", error);
});

socket.on("disconnect", (reason: string) => {
  console.log("🔌 Socket disconnected:", reason);
});

export default socket;
