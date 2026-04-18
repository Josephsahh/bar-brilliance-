import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { testSupabaseConnection } from "@/lib/testSupabase";
import LoginPage from "./pages/LoginPage";

import DashboardPage from "./pages/Dashboard";
import PurchasePage from "./pages/PurchasePage";
import InventoryPage from "./pages/InventoryPage";
import StandingStockPage from "./pages/StandingStockPage";
import POSPage from "./pages/POSPage";
import WhiskeyPage from "./pages/WhiskeyPage";
import DraftPage from "./pages/DraftPage";
import ExpensesPage from "./pages/ExpensesPage";
import CostPage from "./pages/CostPage";
import ExchangePage from "./pages/ExchangePage";
import LoanManagementPage from "./pages/LoanManagementPage";
import ReportsPage from "./pages/ReportsPage";
import ProductsPage from "./pages/ProductsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    testSupabaseConnection();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="st-mary-bar-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <AppProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  
                  <Route path="/" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/purchase" element={<ProtectedRoute><AppLayout><PurchasePage /></AppLayout></ProtectedRoute>} />
                  <Route path="/inventory" element={<ProtectedRoute><AppLayout><InventoryPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/standing-stock" element={<ProtectedRoute><AppLayout><StandingStockPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/pos" element={<ProtectedRoute><AppLayout><POSPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/whiskey" element={<ProtectedRoute><AppLayout><WhiskeyPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/draft" element={<ProtectedRoute><AppLayout><DraftPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/expenses" element={<ProtectedRoute><AppLayout><ExpensesPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/cost" element={<ProtectedRoute><AppLayout><CostPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/exchange" element={<ProtectedRoute><AppLayout><ExchangePage /></AppLayout></ProtectedRoute>} />
                  <Route path="/loans" element={<ProtectedRoute><AppLayout><LoanManagementPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/products" element={<ProtectedRoute><AppLayout><ProductsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </AppProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;