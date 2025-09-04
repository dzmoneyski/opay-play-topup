import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Create QueryClient with specific configuration to prevent issues
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Simple test component to verify basic functionality
const TestComponent = () => {
  const [test, setTest] = React.useState("App is working!");
  
  React.useEffect(() => {
    console.log("App loaded successfully");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-4xl font-bold mb-4">{test}</h1>
        <p className="text-xl">Basic React functionality is working</p>
      </div>
    </div>
  );
};

const App = () => {
  console.log("App component rendering...");
  
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="*" element={<TestComponent />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;