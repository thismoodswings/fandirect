import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "@/pages/PageNotFound";
import { AuthProvider, useAuth } from "@/components/AuthContext";

import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import Creators from "@/pages/Creators";
import CreatorProfile from "@/pages/CreatorProfile";
import ProductDetail from "@/pages/ProductDetail";
import Events from "@/pages/Events";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Wishlist from "@/pages/Wishlist";
import Dashboard from "@/pages/Dashboard";
import Mine from "@/pages/Mine";
import InvestorDashboard from "@/pages/InvestorDashboard";
import CreatorPortal from "@/pages/CreatorPortal.jsx";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ManageCreators from "@/pages/admin/ManageCreators";
import ManageInvestors from "@/pages/admin/ManageInvestors";
import ManageProducts from "@/pages/admin/ManageProducts";
import ManageOrders from "@/pages/admin/ManageOrders";

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/creators" element={<Creators />} />
        <Route path="/creator/:username" element={<CreatorProfile />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/investors" element={<InvestorDashboard />} />
        <Route path="/mine" element={<Mine />} />
        <Route path="/creator-portal" element={<CreatorPortal />} />

        <Route element={<Admin />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/creators" element={<ManageCreators />} />
          <Route path="/admin/investors" element={<ManageInvestors />} />
          <Route path="/admin/products" element={<ManageProducts />} />
          <Route path="/admin/orders" element={<ManageOrders />} />
        </Route>
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthenticatedApp />
      </Router>

      <Toaster />
      <SonnerToaster richColors position="top-right" />
    </AuthProvider>
  );
}

export default App;
