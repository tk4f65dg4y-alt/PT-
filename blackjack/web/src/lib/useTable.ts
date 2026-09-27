import { useCallback, useEffect, useRef, useState } from "react";
import { ClientMsg, RoomStateMsg, ServerMsg } from "../types";

function tokenKey(code: string) {
  return `bj_token_${code}`;
}

export type ConnectionStatus = "connecting" | "open" | "closed";

export interface TableConnection {
  state: RoomStateMsg | null;
  playerId: string | null;
  status: ConnectionStatus;
  error: string | null;
  send: (msg: ClientMsg) => void;
}

export function useTable(code: string, name: string): TableConnection {
  const [state, setState] = useState<RoomStateMsg | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const closedByUs = useRef(false);
  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => {
    closedByUs.current = false;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/ws?code=${encodeURIComponent(code)}`);
      wsRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => {
        setStatus("open");
        retryDelay = 1000;
        const token = localStorage.getItem(tokenKey(code)) || undefined;
        const join: ClientMsg = { type: "join", name: nameRef.current, token };
        ws.send(JSON.stringify(join));
      };

      ws.onmessage = (ev) => {
        const msg: ServerMsg = JSON.parse(ev.data);
        if (msg.type === "welcome") {
          localStorage.setItem(tokenKey(code), msg.token);
          setPlayerId(msg.playerId);
        } else if (msg.type === "state") {
          setState(msg);
        } else if (msg.type === "error") {
          setError(msg.message);
          setTimeout(() => setError((cur) => (cur === msg.message ? null : cur)), 4000);
        }
      };

      ws.onclose = () => {
        setStatus("closed");
        if (closedByUs.current) return;
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 1.6, 8000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();
    return () => {
      closedByUs.current = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [code]);

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  return { state, playerId, status, error, send };
}
