import express from "express";
import http from "http";
import path from "path";
import { WebSocket, WebSocketServer } from "ws";
import { RoomManager } from "./roomManager";
import { InternalPlayer } from "./room";
import { ClientMsg } from "./types";

const PORT = parseInt(process.env.PORT || "3210", 10);

const app = express();
app.use(express.json());

const manager = new RoomManager();

app.post("/api/rooms", (_req, res) => {
  const room = manager.create();
  res.json({ code: room.code });
});

app.get("/api/rooms/:code", (req, res) => {
  const room = manager.get(req.params.code);
  if (!room) return res.status(404).json({ exists: false });
  res.json({ exists: true });
});

const webDist = path.join(__dirname, "..", "..", "web", "dist");
app.use(express.static(webDist));
app.get(/^\/(?!api|ws).*/, (_req, res) => {
  res.sendFile(path.join(webDist, "index.html"));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

interface Conn {
  roomCode: string;
  player: InternalPlayer;
}
const connections = new WeakMap<WebSocket, Conn>();

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", "http://localhost");
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  const code = (url.searchParams.get("code") || "").toUpperCase();
  const room = manager.get(code);
  if (!room) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, room);
  });
});

wss.on("connection", (ws: WebSocket, _req: http.IncomingMessage, room: ReturnType<RoomManager["get"]>) => {
  if (!room) {
    ws.close();
    return;
  }

  ws.on("message", (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const existing = connections.get(ws);

    if (msg.type === "join") {
      const player = room.handleJoin(ws, msg.name, msg.token);
      connections.set(ws, { roomCode: room.code, player });
      room.sendWelcome(player);
      if (typeof msg.seat === "number" && player.seat === -1) {
        try {
          room.sit(player, msg.seat);
        } catch (err) {
          room.sendError(player, (err as Error).message);
        }
      }
      return;
    }

    if (!existing) return;
    try {
      room.handleMessage(existing.player, msg);
    } catch (err) {
      room.sendError(existing.player, (err as Error).message);
    }
  });

  ws.on("close", () => {
    room.handleClose(ws);
  });
});

setInterval(() => manager.sweep(), 10 * 60 * 1000).unref();

server.listen(PORT, () => {
  console.log(`Blackjack server listening on :${PORT}`);
});
