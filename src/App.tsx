import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AccountActivation from "./pages/AccountActivation";
import AdminPanel from "./pages/AdminPanel";
import IdentityVerificationPage from "./pages/IdentityVerificationPage";
import Deposits from "./pages/Deposits";
import Transfer from "./pages/Transfer";
import Withdrawals from "./pages/Withdrawals";
import Cards from "./pages/Cards";
import GameTopup from "./pages/GameTopup";
import P2P from "./pages/P2P";
import BecomePartner from "./pages/BecomePartner";
import MerchantDashboard from "./pages/MerchantDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={
                <ProtectedRoute requireActivation={false}>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/auth" element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              } />
              <Route path="/activate" element={
                <ProtectedRoute requireActivation={false}>
                  <AccountActivation />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute requireActivation={false}>
                  <Navigate to="/" replace />
                </ProtectedRoute>
              } />
              <Route path="/admin/*" element={
                <ProtectedRoute requireActivation={false}>
                  <AdminPanel />
                </ProtectedRoute>
              } />
              <Route path="/deposits" element={
                <ProtectedRoute requireActivation={false}>
                  <Deposits />
                </ProtectedRoute>
              } />
              <Route path="/transfer" element={
                <ProtectedRoute requireActivation={false}>
                  <Transfer />
                </ProtectedRoute>
              } />
              <Route path="/withdrawals" element={
                <ProtectedRoute requireActivation={false}>
                  <Withdrawals />
                </ProtectedRoute>
              } />
              <Route path="/identity-verification" element={
                <ProtectedRoute requireActivation={false}>
                  <IdentityVerificationPage />
                </ProtectedRoute>
              } />
              <Route path="/cards" element={
                <ProtectedRoute requireActivation={false}>
                  <Cards />
                </ProtectedRoute>
              } />
              <Route path="/game-topup" element={
                <ProtectedRoute requireActivation={false}>
                  <GameTopup />
                </ProtectedRoute>
              } />
              <Route path="/p2p" element={
                <ProtectedRoute requireActivation={false}>
                  <P2P />
                </ProtectedRoute>
              } />
              <Route path="/become-partner" element={
                <ProtectedRoute requireActivation={false}>
                  <BecomePartner />
                </ProtectedRoute>
              } />
              <Route path="/merchant" element={
                <ProtectedRoute requireActivation={false}>
                  <MerchantDashboard />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;