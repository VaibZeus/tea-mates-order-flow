import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { FloatingNav } from "./components/ui/floating-navbar";
import { Home, Menu, ShoppingCart, List, User } from "lucide-react";
import CheckoutPage from "./components/CheckoutPage";
import MenuPage from "./components/MenuPage";
import OrdersPage from "./components/OrdersPage";
import AdminPanel from "./components/AdminPanel";
import AdminLogin from "./components/AdminLogin";
import CartPage from "./components/CartPage";
import { OrderProvider } from "./context/OrderContext";

const queryClient = new QueryClient();

const App = () => {
  // Check if admin is logged in
  const isAdminLoggedIn = () => {
    const loggedIn = localStorage.getItem('admin_logged_in');
    const loginTime = localStorage.getItem('admin_login_time');

    if (!loggedIn || !loginTime) return false;

    // Check if login is still valid (24 hours)
    const loginDate = new Date(loginTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      localStorage.removeItem('admin_logged_in');
      localStorage.removeItem('admin_login_time');
      return false;
    }

    return true;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OrderProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard"
                element={isAdminLoggedIn() ? <AdminPanel /> : <AdminLogin />} 
              />
              <Route path="/checkout" element={<CheckoutPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <FloatingNav navItems={navItems} />
          </BrowserRouter>
        </OrderProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const navItems = [
  { name: "Home", link: "/", icon: <Home /> },
  { name: "Menu", link: "/menu", icon: <Menu /> },
  { name: "Cart", link: "/cart", icon: <ShoppingCart /> },
  { name: "Orders", link: "/orders", icon: <List /> },
  { name: "Admin", link: "/admin", icon: <User /> },
];

export default App;