
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, Truck, Package, ArrowLeft, Coffee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrder } from '@/context/OrderContext';

const OrdersPage = () => {
  const { state } = useOrder();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'preparing':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'ready':
        return <Truck className="h-5 w-5 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-orange-100 text-orange-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEstimatedTime = (orderTime: Date, status: string) => {
    const now = new Date();
    const timeDiff = Math.floor((now.getTime() - orderTime.getTime()) / 1000 / 60); // minutes
    
    switch (status) {
      case 'pending':
        return '2-3 minutes';
      case 'confirmed':
        return '5-10 minutes';
      case 'preparing':
        return '3-5 minutes';
      case 'ready':
        return 'Ready for pickup!';
      case 'delivered':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  if (state.orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Your Orders</h1>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coffee className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">Your order history will appear here</p>
            <Link to="/menu">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500">
                Start Ordering
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Your Orders</h1>
                <p className="text-sm text-gray-600">Track your order status</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current time</p>
              <p className="font-mono text-lg">{formatTime(currentTime)}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Current Order (if any) */}
        {state.currentOrder && state.currentOrder.status !== 'delivered' && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Order</h2>
            <Card className="border-2 border-amber-200 bg-amber-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-amber-600">
                      #{state.currentOrder.tokenNumber}
                    </span>
                    <Badge className={`${getStatusColor(state.currentOrder.status)} capitalize`}>
                      {getStatusIcon(state.currentOrder.status)}
                      <span className="ml-1">{state.currentOrder.status}</span>
                    </Badge>
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {state.currentOrder.orderType === 'dine-in' ? 'Dine-in' : 'Takeaway'}
                      {state.currentOrder.tableNumber && ` • Table #${state.currentOrder.tableNumber}`}
                    </p>
                    <p className="font-semibold">
                      ETA: {getEstimatedTime(state.currentOrder.timestamp, state.currentOrder.status)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {state.currentOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>{item.quantity}x {item.name}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>₹{state.currentOrder.total}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Payment: {state.currentOrder.paymentMethod === 'online' ? 'Paid Online' : 'Pay at Counter'}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Order Progress</span>
                    <span>{Math.min(
                      ['pending', 'confirmed', 'preparing', 'ready', 'delivered'].indexOf(state.currentOrder.status) + 1,
                      4
                    )}/4</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(
                          ['pending', 'confirmed', 'preparing', 'ready', 'delivered'].indexOf(state.currentOrder.status) + 1
                        ) * 25}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Placed</span>
                    <span>Confirmed</span>
                    <span>Preparing</span>
                    <span>Ready</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Order History */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order History</h2>
          <div className="space-y-4">
            {state.orders
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <span className="font-bold">#{order.tokenNumber}</span>
                        <Badge className={`${getStatusColor(order.status)} capitalize`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{order.status}</span>
                        </Badge>
                      </CardTitle>
                      <div className="text-right text-sm text-gray-600">
                        <p>{formatTime(order.timestamp)}</p>
                        <p>{order.orderType === 'dine-in' ? 'Dine-in' : 'Takeaway'}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 mb-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>₹{order.total}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
