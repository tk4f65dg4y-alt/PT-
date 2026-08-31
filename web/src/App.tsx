import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import { RequireAuth } from "./components/Guard";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import GroupDetail from "./pages/admin/GroupDetail";
import PlanBuilder from "./pages/admin/PlanBuilder";
import AdminPlanView from "./pages/admin/PlanView";
import ClientHome from "./pages/client/ClientHome";
import ClientPlanView from "./pages/client/PlanView";
import DayWorkout from "./pages/client/DayWorkout";
import History from "./pages/client/History";
import Messages from "./pages/client/Messages";
import BookSession from "./pages/client/BookSession";
import Bookings from "./pages/admin/Bookings";

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="empty">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "TRAINER") return <Navigate to="/admin" replace />;
  return <ClientHome />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Home />} />
      <Route
        path="/plans/:id"
        element={
          <RequireAuth role="CLIENT">
            <ClientPlanView />
          </RequireAuth>
        }
      />
      <Route
        path="/plans/:id/days/:dayId"
        element={
          <RequireAuth role="CLIENT">
            <DayWorkout />
          </RequireAuth>
        }
      />
      <Route
        path="/history"
        element={
          <RequireAuth role="CLIENT">
            <History />
          </RequireAuth>
        }
      />
      <Route
        path="/messages"
        element={
          <RequireAuth role="CLIENT">
            <Messages />
          </RequireAuth>
        }
      />
      <Route
        path="/book"
        element={
          <RequireAuth role="CLIENT">
            <BookSession />
          </RequireAuth>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAuth role="TRAINER">
            <AdminDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/groups/:id"
        element={
          <RequireAuth role="TRAINER">
            <GroupDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/groups/:groupId/plans/new"
        element={
          <RequireAuth role="TRAINER">
            <PlanBuilder />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/plans/:id"
        element={
          <RequireAuth role="TRAINER">
            <AdminPlanView />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/plans/:planId/edit"
        element={
          <RequireAuth role="TRAINER">
            <PlanBuilder />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <RequireAuth role="TRAINER">
            <Bookings />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
