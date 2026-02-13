import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SocketProvider } from "@/contexts/SocketContext";
import { MatchProvider } from "@/contexts/MatchContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Analytics from "./pages/Analytics";
import { KPIProvider } from "@/contexts/KPIContext";
import KPIEngine from "./pages/KPIEngine";
import Monitoring from "./pages/Monitoring";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminPortal from "./pages/AdminPortal";

import { IPTVAuthProvider } from "@/contexts/IPTVAuthContext";
import { ScribeProvider } from "@/contexts/ScribeContext";
import AnalystAudit from "./pages/AnalystAudit";
// ... (rest of imports)

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <IPTVAuthProvider>
            <ScribeProvider>
              <SocketProvider>
                <MatchProvider>
                  <Routes>
                    <Route path="/audit" element={<AnalystAudit />} />
                    <Route path="/login" element={<Login />} />

                    <Route path="/" element={
                      <ProtectedRoute allowedRoles={['operational_analyst', 'tactical_analyst', 'quality_controller', 'admin', 'early_tester', 'lead_analyst', 'live_tagger', 'eye_spotter', 'logger']}>
                        <Index />
                      </ProtectedRoute>
                    } />

                    <Route path="/admin" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminPortal />
                      </ProtectedRoute>
                    } />

                    <Route path="/analytics" element={
                      <ProtectedRoute allowedRoles={['tactical_analyst', 'admin']}>
                        <Analytics />
                      </ProtectedRoute>
                    } />

                    <Route path="/analysis/kpi" element={
                      <ProtectedRoute allowedRoles={['tactical_analyst', 'admin']}>
                        <KPIProvider>
                          <KPIEngine />
                        </KPIProvider>
                      </ProtectedRoute>
                    } />

                    <Route path="/monitoring" element={
                      <ProtectedRoute allowedRoles={['quality_controller', 'admin']}>
                        <Monitoring />
                      </ProtectedRoute>
                    } />

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </MatchProvider>
              </SocketProvider>
            </ScribeProvider>
          </IPTVAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
// Re-trigger HMR