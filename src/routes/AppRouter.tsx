import { Navigate, Route, Routes, useParams } from "react-router-dom";

import ProtectedLayout from "./ProtectedLayout.js";

import Login from "../pages/Login.js";
import ChangePassword from "../pages/ChangePassword.js";
import Dashboard from "../pages/Dashboard.js";
import Quotes from "../pages/Quotes.js";
import QuoteDetail from "../pages/QuoteDetail.js";
import Sales from "../pages/Sales.js";
import SaleDetail from "../pages/SaleDetail.js";
import Customers from "../pages/Customers.js";
import Products from "../pages/Products.js";
import Channels from "../pages/Channels.js";
import Conversations from "../pages/Conversations.js";
import Users from "../pages/Users.js";
import Tenants from "../pages/Tenants.js";
import AgentChat from "../pages/AgentChat.js";
import AgentConfig from "../pages/AgentConfig.js";
import AgentAssistant from "../pages/AgentAssistant.js";
import PublicChat from "../pages/PublicChat.js";
import { getAccessToken, getUser } from "../services/auth-storage.js";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/change-password" element={<ChangePasswordRoute />} />

      <Route
        path="/public/chat/:tenantId"
        element={<PublicChatRoute />}
      />

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/tenants" element={<Tenants />} />

        <Route path="/quotes" element={<Quotes />} />

        <Route path="/quotes/:quoteId" element={<QuoteDetailRoute />} />

        <Route path="/sales" element={<Sales />} />

        <Route path="/sales/:saleId" element={<SaleDetailRoute />} />

        <Route path="/customers" element={<Customers />} />

        <Route path="/products" element={<Products />} />

        <Route path="/channels" element={<Channels />} />

        <Route path="/conversations" element={<Conversations />} />

        <Route path="/users" element={<Users />} />

        <Route path="/chat" element={<AgentChat />} />

        <Route path="/agent" element={<AgentConfig />} />

        <Route path="/agent/assistant" element={<AgentAssistant />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

function ChangePasswordRoute() {
  const token = getAccessToken();
  const user = getUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.mustChangePassword) {
    return <Navigate to="/dashboard" replace />;
  }

  return <ChangePassword />;
}

function QuoteDetailRoute() {
  const { quoteId } = useParams<{
    quoteId: string;
  }>();

  if (!quoteId) {
    return <Navigate to="/quotes" replace />;
  }

  return <QuoteDetail quoteId={quoteId} />;
}

function SaleDetailRoute() {
  const { saleId } = useParams<{
    saleId: string;
  }>();

  if (!saleId) {
    return <Navigate to="/sales" replace />;
  }

  return <SaleDetail saleId={saleId} />;
}

function PublicChatRoute() {
  const { tenantId } = useParams<{
    tenantId: string;
  }>();

  if (!tenantId) {
    return <Navigate to="/" replace />;
  }

  return <PublicChat tenantId={tenantId} />;
}
