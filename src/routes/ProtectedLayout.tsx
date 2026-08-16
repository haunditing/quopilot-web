import { Navigate, Outlet } from "react-router-dom";

import AppLayout from "../components/AppLayout.js";
import { getAccessToken, getUser } from "../services/auth-storage.js";

export default function ProtectedLayout() {
  const token = getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const user = getUser();
  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
