import { useEffect, useState } from "react";
import { enablePush, getPushStatus } from "../lib/push";

export default function EnableNotifications({ text }: { text?: string }) {
  const [status, setStatus] = useState<"unsupported" | "denied" | "subscribed" | "available" | "checking">(
    "checking"
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushStatus()
      .then(setStatus)
      .catch(() => setStatus("unsupported"));
  }, []);

  if (status === "checking" || status === "unsupported" || status === "denied" || status === "subscribed") {
    return null;
  }

  async function onEnable() {
    setBusy(true);
    setError("");
    try {
      await enablePush();
      setStatus("subscribed");
    } catch (err: any) {
      setError(err.message || "Couldn't enable notifications");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notif-banner">
      <div style={{ fontSize: 22 }}>🔔</div>
      <div className="txt">
        {error || text || "Get reminders on workout days — enable notifications."}
      </div>
      <button onClick={onEnable} disabled={busy}>
        {busy ? "…" : "Enable"}
      </button>
    </div>
  );
}
