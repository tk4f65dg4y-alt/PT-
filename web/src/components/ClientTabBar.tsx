import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import Icon from "./Icon";

export default function ClientTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api
        .get("/client/messages/unread-count")
        .then((r) => !cancelled && setUnread(r.count))
        .catch(() => {});
    }
    load();
    const t = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [location.pathname]);

  const items = [
    { path: "/", icon: "home" as const, label: "Home" },
    { path: "/book", icon: "calendar" as const, label: "Book" },
    { path: "/messages", icon: "chat" as const, label: "Messages", dot: unread > 0 },
    { path: "/history", icon: "history" as const, label: "History" },
  ];

  return (
    <div className="tabbar">
      {items.map((item) => (
        <div
          key={item.path}
          className={`tabbar-item ${location.pathname === item.path ? "active" : ""}`}
          onClick={() => navigate(item.path)}
        >
          <div className="tabbar-icon">
            <Icon name={item.icon} size={20} />
          </div>
          <div>{item.label}</div>
          {item.dot && <div className="dot" />}
        </div>
      ))}
    </div>
  );
}
