import React, { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import { PWAPermissionsPrompt } from "@/components/PWAPermissionsPrompt";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";

// Lazy load heavy pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AccountActivation = lazy(() => import("./pages/AccountActivation"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const IdentityVerificationPage = lazy(() => import("./pages/IdentityVerificationPage"));
const Deposits = lazy(() => import("./pages/Deposits"));
const Transfer = lazy(() => import("./pages/Transfer"));
const Withdrawals = lazy(() => import("./pages/Withdrawals"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Cards = lazy(() => import("./pages/Cards"));
const CardDelivery = lazy(() => import("./pages/CardDelivery"));
const GameTopup = lazy(() => import("./pages/GameTopup"));
const P2P = lazy(() => import("./pages/P2P"));
const BecomePartner = lazy(() => import("./pages/BecomePartner"));
const MerchantDashboard = lazy(() => import("./pages/MerchantDashboard"));
const Install = lazy(() => import("./pages/Install"));
const Settings = lazy(() => import("./pages/Settings"));
const Stores = lazy(() => import("./pages/Stores"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Shop = lazy(() => import("./pages/Shop"));
const AliExpress = lazy(() => import("./pages/AliExpress"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Diaspora = lazy(() => import("./pages/Diaspora"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
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
              <Route path="/card-delivery" element={
                <ProtectedRoute requireActivation={false}>
                  <CardDelivery />
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
              <Route path="/rewards" element={
                <ProtectedRoute requireActivation={false}>
                  <Rewards />
                </ProtectedRoute>
              } />
              <Route path="/merchant" element={
                <ProtectedRoute requireActivation={false}>
                  <MerchantDashboard />
                </ProtectedRoute>
              } />
              <Route path="/install" element={<Install />} />
              <Route path="/settings" element={
                <ProtectedRoute requireActivation={false}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/stores" element={
                <ProtectedRoute requireActivation={false}>
                  <Stores />
                </ProtectedRoute>
              } />
              <Route path="/transactions" element={
                <ProtectedRoute requireActivation={false}>
                  <Transactions />
                </ProtectedRoute>
              } />
              <Route path="/shop" element={
                <ProtectedRoute requireActivation={false}>
                  <Shop />
                </ProtectedRoute>
              } />
              <Route path="/aliexpress" element={
                <ProtectedRoute requireActivation={false}>
                  <AliExpress />
                </ProtectedRoute>
              } />
              <Route path="/about-us" element={
                <ProtectedRoute requireActivation={false}>
                  <AboutUs />
                </ProtectedRoute>
              } />
              <Route path="/diaspora" element={
                <ProtectedRoute requireActivation={false}>
                  <Diaspora />
                </ProtectedRoute>
              } />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PWAPermissionsPrompt />
          <BrowserRouter>
            <ScrollToTop />
            <AnimatedRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;