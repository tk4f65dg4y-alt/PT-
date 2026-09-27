import express from "express";
import http from "http";
import path from "path";
import { WebSocket, WebSocketServer } from "ws";
import { RoomManager } from "./roomManager";
import { InternalPlayer } from "./room";
import { ClientMsg, MAX_DEALER_PHOTO_BYTES } from "./types";

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

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

app.post(
  "/api/rooms/:code/dealer-photo",
  express.raw({ type: ALLOWED_IMAGE_TYPES, limit: MAX_DEALER_PHOTO_BYTES }),
  (req, res) => {
    const room = manager.get(req.params.code);
    if (!room) return res.status(404).json({ error: "Room not found." });
    const contentType = (req.headers["content-type"] || "").split(";")[0].trim();
    if (!ALLOWED_IMAGE_TYPES.includes(contentType) || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "Send a JPEG, PNG, WebP, or GIF image." });
    }
    room.setDealerPhoto(req.body, contentType);
    res.json({ ok: true });
  }
);

app.delete("/api/rooms/:code/dealer-photo", (req, res) => {
  const room = manager.get(req.params.code);
  if (!room) return res.status(404).json({ error: "Room not found." });
  room.clearDealerPhoto();
  res.json({ ok: true });
});

app.get("/api/rooms/:code/dealer-photo", (req, res) => {
  const room = manager.get(req.params.code);
  const photo = room?.getDealerPhoto();
  if (!room || !photo) return res.status(404).end();
  res.set("Content-Type", photo.contentType);
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.send(photo.data);
});

app.post("/api/rooms/:code/dealer-name", (req, res) => {
  const room = manager.get(req.params.code);
  if (!room) return res.status(404).json({ error: "Room not found." });
  const name = typeof req.body?.name === "string" ? req.body.name : "";
  room.setDealerName(name);
  res.json({ ok: true });
});

app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  res.status(400).json({ error: "That photo was too large or malformed." });
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
