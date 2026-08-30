import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../lib/AuthContext";

export function RequireAuth({ role, children }: { role?: "TRAINER" | "CLIENT"; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="empty">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "TRAINER" ? "/admin" : "/"} replace />;
  }
  return <>{children}</>;
}
