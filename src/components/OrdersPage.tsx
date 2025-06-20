import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, Truck, Package, ArrowLeft, Coffee, Search, RefreshCw, Download, Printer, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrder } from '@/context/OrderContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import OrderSlip from './OrderSlip';

interface Order {
  id: string;
  items: any[];
  total: number;
  status: string;
  token_number: string;
  timestamp: string;
  customer_info?: {
    name?: string;
    phone?: string;
  };
  order_type: string;
  table_number?: string;
  pickup_time?: string;
  payment_method: string;
}

const OrdersPage = () => {
  const { state, dispatch } = useOrder();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderSlip, setShowOrderSlip] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const navigate = useNavigate();

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationsEnabled(permission === 'granted');
        });
      } else {
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    }
  }, []);

  // Function to show browser notification
  const showNotification = (title: string, body: string, icon?: string) => {
    if (notificationsEnabled && 'Notification' in window) {
      try {
        new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'order-update',
          requireInteraction: true,
        });
      } catch (error) {
        console.log('Notification error:', error);
      }
    }
  };

  // Function to play notification sound
  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio notification error:', error);
    }
  };

  // Fetch orders based on search criteria
  const fetchOrders = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`token_number.ilike.%${searchTerm}%,customer_info->>phone.ilike.%${searchTerm}%,customer_info->>name.ilike.%${searchTerm}%`)
        .order('timestamp', { ascending: false });
      
      if (!error && data) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription for order updates
  // 
  
  useEffect(() => {
  const channel = supabase
    .channel('orders-all-live')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders',
    }, (payload) => {
      const newOrder = payload.new as Order;
      const oldOrder = payload.old as Order;

      setOrders(prevOrders => {
        const exists = prevOrders.find(o => o.id === newOrder.id);

        if (payload.eventType === 'INSERT') {
          return exists ? prevOrders : [newOrder, ...prevOrders];
        }

        if (payload.eventType === 'UPDATE') {
          return prevOrders.map(order =>
            order.id === newOrder.id ? newOrder : order
          );
        }

        return prevOrders;
      });

      // Optional: Handle status change notification
      if (
        payload.eventType === 'UPDATE' &&
        oldOrder?.status !== newOrder.status
      ) {
        showNotification(`Order #${newOrder.token_number}`, `Status changed to ${newOrder.status}`);
        playNotificationSound();
        toast({
          title: `Order Updated`,
          description: `Order #${newOrder.token_number} is now ${newOrder.status}`,
        });
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

useEffect(() => {
  const loadInitialOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(30); // recent 30 orders

    if (error) {
      toast({
        title: 'Error loading orders',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setOrders(data);
    }
    setLoading(false);
  };

  loadInitialOrders();
}, []);


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
      case 'accepted':
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'preparing':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'ready':
      case 'done':
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
      case 'accepted':
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-orange-100 text-orange-800';
      case 'ready':
      case 'done':
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

  const getEstimatedTime = (orderTime: string, status: string) => {
    const orderDate = new Date(orderTime);
    const now = new Date();
    const timeDiff = Math.floor((now.getTime() - orderDate.getTime()) / 1000 / 60); // minutes
    
    switch (status) {
      case 'pending':
        return '2-3 minutes';
      case 'accepted':
      case 'confirmed':
        return '5-10 minutes';
      case 'preparing':
        return '3-5 minutes';
      case 'ready':
      case 'done':
        return 'Ready now!';
      case 'delivered':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setSubmitted(true);
      fetchOrders(search.trim());
    }
  };

  const refreshOrders = () => {
    if (search.trim()) {
      fetchOrders(search.trim());
    }
  };

  const handleViewOrderSlip = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderSlip(true);
  };

  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive order status updates',
        });
      } else {
        toast({
          title: 'Notifications Disabled',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
      }
    }
  };

  if (!submitted) {
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
              <h1 className="text-xl font-bold text-gray-900">Track Your Orders</h1>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-12 w-12 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Your Orders</h2>
              <p className="text-gray-600 mb-6">Enter your phone number or order token to track your orders</p>
              
              {/* Notification Permission */}
              {!notificationsEnabled && 'Notification' in window && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Bell className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-800 font-medium">Enable Notifications</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    Get instant notifications when your order status changes
                  </p>
                  <Button
                    onClick={enableNotifications}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Enable Notifications
                  </Button>
                </div>
              )}
            </div>
            
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="Enter phone number or token (e.g., A123)"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                    disabled={!search.trim()}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search Orders
                  </Button>
                </form>
              </CardContent>
            </Card>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSubmitted(false)}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Your Orders</h1>
                <p className="text-sm text-gray-600">Searching for: {search}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Status */}
              <div className="flex items-center space-x-2">
                <Bell className={`h-4 w-4 ${notificationsEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-xs text-gray-600">
                  {notificationsEnabled ? 'Notifications On' : 'Notifications Off'}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshOrders}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <div className="text-right">
                <p className="text-sm text-gray-500">Current time</p>
                <p className="font-mono text-lg">{formatTime(currentTime)}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coffee className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h2>
            <p className="text-gray-600 mb-6">No orders found for "{search}". Please check your search term.</p>
            <Button onClick={() => setSubmitted(false)} variant="outline">
              Search Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className={order.status === 'ready' || order.status === 'done' ? 'border-green-200 bg-green-50 shadow-lg' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-amber-600">
                        #{order.token_number}
                      </span>
                      <Badge className={`${getStatusColor(order.status)} capitalize`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{order.status}</span>
                      </Badge>
                      {(order.status === 'ready' || order.status === 'done') && (
                        <Badge className="bg-green-500 text-white animate-pulse">
                          Ready!
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {order.order_type === 'dine-in' ? 'Dine-in' : 'Takeaway'}
                        {order.table_number && ` • Table #${order.table_number}`}
                      </p>
                      <p className="font-semibold">
                        ETA: {getEstimatedTime(order.timestamp, order.status)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {order.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{item.quantity}x {item.name}</span>
                        <span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 mb-4">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>₹{order.total}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Payment: {order.payment_method === 'online' ? 'Paid Online' : 'Pay at Counter'}
                    </p>
                    {order.customer_info?.name && (
                      <p className="text-sm text-gray-600">
                        Customer: {order.customer_info.name}
                      </p>
                    )}
                  </div>

                  {/* Order Slip Button */}
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrderSlip(order)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      View Order Slip
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Order Progress</span>
                      <span>{Math.min(
                        ['pending', 'accepted', 'preparing', 'ready', 'delivered'].indexOf(order.status) + 1,
                        4
                      )}/4</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            (['pending', 'accepted', 'preparing', 'ready', 'delivered'].indexOf(order.status) + 1) * 25,
                            100
                          )}%`
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
            ))}
          </div>
        )}
      </div>

      {/* Order Slip Modal */}
      {showOrderSlip && selectedOrder && (
        <OrderSlip
          order={selectedOrder}
          onClose={() => {
            setShowOrderSlip(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default OrdersPage;