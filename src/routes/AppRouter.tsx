import { Navigate, Route, Routes, useParams } from "react-router-dom";

import ProtectedLayout from "./ProtectedLayout.js";

import Login from "../pages/Login.js";
import ChangePassword from "../pages/ChangePassword.js";
import Dashboard from "../pages/Dashboard.js";
import Quotes from "../pages/Quotes.js";
import QuoteDetail from "../pages/QuoteDetail.js";
import CreateQuote from "../pages/CreateQuote.js";
import Sales from "../pages/Sales.js";
import SaleDetail from "../pages/SaleDetail.js";
import Customers from "../pages/Customers.js";
import CustomerDetail from "../pages/CustomerDetail.js";
import Products from "../pages/Products.js";
import ProductDetail from "../pages/ProductDetail.js";
import Channels from "../pages/Channels.js";
import ChannelForm from "../pages/ChannelForm.js";
import Conversations from "../pages/Conversations.js";
import Users from "../pages/Users.js";
import UserForm from "../pages/UserForm.js";
import AgentChat from "../pages/AgentChat.js";
import AgentConfig from "../pages/AgentConfig.js";
import AgentAssistant from "../pages/AgentAssistant.js";
import InternalAssistant from "../pages/InternalAssistant.js";
import CompanySettings from "../pages/CompanySettings.js";
import PublicChat from "../pages/PublicChat.js";
import PublicChannelChat from "../pages/PublicChannelChat.js";
import Unauthorized from "../pages/Unauthorized.js";
import CapabilityRoute from "./CapabilityRoute.js";
import { getAccessToken, getUser } from "../services/auth-storage.js";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/change-password" element={<ChangePasswordRoute />} />

      <Route path="/public/chat/:tenantId" element={<PublicChatRoute />} />

      {/* Widget público resuelto por token de canal */}
      <Route path="/c/:token" element={<PublicChannelChat />} />

      <Route element={<ProtectedLayout />}>
        <Route
          path="/dashboard"
          element={
            <CapabilityRoute requireAny={["dashboard.view", "superAdmin.dashboard"]}>
              <Dashboard />
            </CapabilityRoute>
          }
        />

        <Route path="/unauthorized" element={<Unauthorized />} />




        <Route
          path="/quotes"
          element={
            <CapabilityRoute requireAny={["quotes.view"]}>
              <Quotes />
            </CapabilityRoute>
          }
        />

        <Route
          path="/quotes/new"
          element={
            <CapabilityRoute requireAny={["quotes.create"]}>
              <CreateQuote />
            </CapabilityRoute>
          }
        />

        <Route
          path="/quotes/:quoteId"
          element={
            <CapabilityRoute requireAny={["quotes.view"]}>
              <QuoteDetailRoute />
            </CapabilityRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <CapabilityRoute requireAny={["sales.view"]}>
              <Sales />
            </CapabilityRoute>
          }
        />

        <Route
          path="/sales/:saleId"
          element={
            <CapabilityRoute requireAny={["sales.view"]}>
              <SaleDetailRoute />
            </CapabilityRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <CapabilityRoute requireAny={["customers.view"]}>
              <Customers />
            </CapabilityRoute>
          }
        />

        <Route
          path="/customers/new"
          element={
            <CapabilityRoute requireAny={["customers.create"]}>
              <CustomerDetail />
            </CapabilityRoute>
            }
        />

        <Route
          path="/customers/:customerId"
          element={
            <CapabilityRoute requireAny={["customers.view"]}>
              <CustomerDetailRoute />
            </CapabilityRoute>
          }
        />

        <Route
          path="/products"
          element={
            <CapabilityRoute requireAny={["products.view"]}>
              <Products />
            </CapabilityRoute>
          }
        />

        <Route
          path="/products/new"
          element={
            <CapabilityRoute requireAny={["products.create"]}>
              <ProductDetail />
            </CapabilityRoute>
            }
        />

        <Route
          path="/products/:productId"
          element={
            <CapabilityRoute requireAny={["products.view"]}>
              <ProductDetailRoute />
            </CapabilityRoute>
          }
        />

        <Route
          path="/channels"
          element={
            <CapabilityRoute requireAny={["channels.view"]}>
              <Channels />
            </CapabilityRoute>
          }
        />

        <Route
          path="/channels/new"
          element={
            <CapabilityRoute requireAny={["channels.create"]}>
              <ChannelForm />
            </CapabilityRoute>
            }
        />

        <Route
          path="/channels/:channelId"
          element={
            <CapabilityRoute requireAny={["channels.update"]}>
              <ChannelFormRoute />
            </CapabilityRoute>
          }
        />

        <Route
          path="/conversations"
          element={
            <CapabilityRoute requireAny={["conversations.view"]}>
              <Conversations />
            </CapabilityRoute>
          }
        />

        <Route
          path="/users"
          element={
            <CapabilityRoute requireAny={["users.view"]}>
              <Users />
            </CapabilityRoute>
          }
        />

        <Route
          path="/users/new"
          element={
            <CapabilityRoute requireAny={["users.create"]}>
              <UserForm />
            </CapabilityRoute>
            }
        />

        <Route
          path="/users/:userId"
          element={
            <CapabilityRoute requireAny={["users.update"]}>
              <UserFormRoute />
            </CapabilityRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <CapabilityRoute requireAny={["agent.chat"]}>
              <AgentChat />
            </CapabilityRoute>
          }
        />

        <Route
          path="/agent"
          element={
            <CapabilityRoute requireAny={["agent.configure"]}>
              <AgentConfig />
            </CapabilityRoute>
          }
        />

        <Route
          path="/agent/assistant"
          element={
            <CapabilityRoute requireAny={["agent.assistant", "agent.chat"]}>
              <AgentAssistant />
            </CapabilityRoute>
          }
        />

        <Route
          path="/internal/assistant"
          element={
            <CapabilityRoute requireAny={["internalAssistant.chat"]}>
              <InternalAssistant />
            </CapabilityRoute>
          }
        />


        <Route
          path="/settings/company"
          element={
            <CapabilityRoute requireAny={["tenants.updateMe"]}>
              <CompanySettings />
            </CapabilityRoute>
          }
        />

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

function CustomerDetailRoute() {
  const { customerId } = useParams<{
    customerId: string;
  }>();

  if (!customerId) {
    return <Navigate to="/customers" replace />;
  }

  return <CustomerDetail customerId={customerId} />;
}

function ProductDetailRoute() {
  const { productId } = useParams<{
    productId: string;
  }>();

  if (!productId) {
    return <Navigate to="/products" replace />;
  }

  return <ProductDetail productId={productId} />;
}

function ChannelFormRoute() {
  const { channelId } = useParams<{
    channelId: string;
  }>();

  if (!channelId) {
    return <Navigate to="/channels" replace />;
  }

  return <ChannelForm channelId={channelId} />;
}

function UserFormRoute() {
  const { userId } = useParams<{
    userId: string;
  }>();

  if (!userId) {
    return <Navigate to="/users" replace />;
  }

  return <UserForm userId={userId} />;
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
