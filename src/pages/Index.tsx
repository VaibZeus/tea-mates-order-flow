
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, ShoppingCart, Clock, MapPin, QrCode, Utensils, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import MenuPage from '@/components/MenuPage';
import CartPage from '@/components/CartPage';
import OrdersPage from '@/components/OrdersPage';
import AdminPanel from '@/components/AdminPanel';
import { OrderProvider } from '@/context/OrderContext';

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tableNumber, setTableNumber] = useState<string | null>(null);

  useEffect(() => {
    // Check if user came from QR code with table parameter
    const urlParams = new URLSearchParams(location.search);
    const table = urlParams.get('table');
    if (table) {
      setTableNumber(table);
    }
  }, [location]);

  const handleDineIn = () => {
    navigate('/menu?type=dine-in' + (tableNumber ? `&table=${tableNumber}` : ''));
  };

  const handleTakeaway = () => {
    navigate('/menu?type=takeaway');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                <Coffee className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tea Mates</h1>
                <p className="text-sm text-gray-600">Smart Ordering System</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/orders" className="text-gray-700 hover:text-amber-600 transition-colors">
                Orders
              </Link>
              <Link to="/admin" className="text-gray-700 hover:text-amber-600 transition-colors">
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {tableNumber && (
          <div className="mb-8 p-4 bg-green-100 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Welcome to Table #{tableNumber}
              </span>
            </div>
          </div>
        )}

        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Order Your Perfect
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500"> Tea</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Scan, browse, order, and enjoy! Experience our smart ordering system for the fastest tea service.
          </p>
        </div>

        {/* Ordering Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Dine-In Card */}
          <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <QrCode className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Dine-In Ordering</h3>
                <p className="text-gray-600 mb-6">
                  Already at the restaurant? Scan the QR code on your table or start ordering here.
                </p>
                <Button 
                  onClick={handleDineIn}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  <Utensils className="mr-2 h-5 w-5" />
                  Start Dine-In Order
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Takeaway Card */}
          <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Takeaway Ordering</h3>
                <p className="text-gray-600 mb-6">
                  Order from anywhere and pick up when ready. Schedule your pickup time.
                </p>
                <Button 
                  onClick={handleTakeaway}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Order for Pickup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Menu className="h-8 w-8 text-amber-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Digital Menu</h4>
            <p className="text-gray-600">Browse our complete menu with photos and detailed descriptions</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Real-time Tracking</h4>
            <p className="text-gray-600">Track your order status with live updates and token numbers</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Easy Payment</h4>
            <p className="text-gray-600">Pay online or at the counter - whatever works for you</p>
          </div>
        </div>
      </main>
    </div>
  );
};

const Index = () => {
  return (
    <OrderProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Router>
    </OrderProvider>
  );
};

export default Index;
