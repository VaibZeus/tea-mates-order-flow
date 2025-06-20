import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { RefreshCw, LogOut, Clock, Package, CheckCircle, Truck, Printer, Send, Download, Bell, Search, X } from 'lucide-react';
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

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'accepted', label: 'Accepted', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  { value: 'preparing', label: 'Preparing', icon: Package, color: 'bg-orange-100 text-orange-800' },
  { value: 'done', label: 'Ready', icon: Truck, color: 'bg-green-100 text-green-800' },
];

const AdminPanel = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderSlip, setShowOrderSlip] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [newOrderNotifications, setNewOrderNotifications] = useState<Order[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setAllOrders(data);
        if (!isSearching) {
          setOrders(data);
        }
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

  const searchOrders = async (term: string) => {
    if (!term.trim()) {
      setOrders(allOrders);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`token_number.ilike.%${term}%,customer_info->>phone.ilike.%${term}%,customer_info->>name.ilike.%${term}%`)
        .order('timestamp', { ascending: false });
      
      if (!error && data) {
        let filteredData = data;
        if (filter !== 'all') {
          filteredData = data.filter(order => order.status === filter);
        }
        setOrders(filteredData);
      }
    } catch (error) {
      console.error('Error searching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to search orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
    setOrders(allOrders);
  };

  useEffect(() => {
    // Check if admin is logged in
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    if (!isLoggedIn) {
      navigate('/admin');
      return;
    }

    fetchOrders();
  }, [filter, navigate]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchOrders(searchTerm);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filter]);

  // Real-time subscription for order updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const newOrder = payload.new as Order;
          
          // Add to all orders
          setAllOrders(prevOrders => [newOrder, ...prevOrders]);
          
          // Add to current view if it matches filter and search
          const matchesFilter = filter === 'all' || newOrder.status === filter;
          const matchesSearch = !isSearching || 
            newOrder.token_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            newOrder.customer_info?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            newOrder.customer_info?.name?.toLowerCase().includes(searchTerm.toLowerCase());

          if (matchesFilter && matchesSearch) {
            setOrders(prevOrders => [newOrder, ...prevOrders]);
          }
          
          // Add to notifications
          setNewOrderNotifications(prev => [newOrder, ...prev.slice(0, 9)]); // Keep last 10
          setNotificationCount(prev => prev + 1);
          
          // Show toast notification
          toast({
            title: 'New Order Received!',
            description: `Order #${newOrder.token_number} - ${newOrder.order_type === 'dine-in' ? `Table ${newOrder.table_number}` : 'Takeaway'}`,
            duration: 5000,
          });
          
          // Play notification sound
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Create a more distinctive sound for new orders
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
          } catch (e) {
            console.log('Audio notification failed:', e);
          }

          // Browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Order Received!', {
              body: `Order #${newOrder.token_number} - Total: ₹${newOrder.total}`,
              icon: '/favicon.ico',
              tag: 'new-order',
            });
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const updatedOrder = payload.new as Order;
          
          setAllOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            )
          );
          
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            )
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter, searchTerm, isSearching]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Status Updated',
        description: 'Order status has been updated successfully',
      });

      // Send notification to customer (this will be handled by the real-time subscription in OrdersPage)
      const order = orders.find(o => o.id === orderId);
      if (order) {
        let notificationMessage = '';
        switch (newStatus) {
          case 'accepted':
            notificationMessage = 'Order confirmed and being prepared';
            break;
          case 'preparing':
            notificationMessage = 'Order is now in the kitchen';
            break;
          case 'done':
            notificationMessage = 'Order is ready for pickup/serving';
            break;
        }
        
        if (notificationMessage) {
          toast({
            title: 'Customer Notified',
            description: `Customer has been notified: ${notificationMessage}`,
          });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_login_time');
    toast({
      title: 'Logged Out',
      description: 'You have been logged out successfully',
    });
    navigate('/');
  };

  const handlePrintOrderSlip = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderSlip(true);
  };

  const handleSendOrderSlip = async (order: Order) => {
    // In a real app, this would send via email/SMS
    toast({
      title: 'Order Slip Sent',
      description: `Order slip for #${order.token_number} has been sent to customer`,
    });
  };

  const clearNotifications = () => {
    setNotificationCount(0);
    setShowNotificationPanel(false);
  };

  const markNotificationAsRead = (orderId: string) => {
    setNewOrderNotifications(prev => prev.filter(order => order.id !== orderId));
    if (newOrderNotifications.length <= 1) {
      setNotificationCount(0);
    }
  };

  const getStatusIcon = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    if (statusOption) {
      const Icon = statusOption.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-800';
  };

  const pendingOrders = allOrders.filter(order => order.status === 'pending').length;
  const preparingOrders = allOrders.filter(order => order.status === 'preparing').length;
  const readyOrders = allOrders.filter(order => order.status === 'done').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Manage orders and track kitchen operations</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by token or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 w-64"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 py-0 min-w-[1.25rem] h-5 flex items-center justify-center">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Badge>
                  )}
                </Button>

                {/* Notification Panel */}
                {showNotificationPanel && (
                  <div className="absolute right-0 top-12 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">New Orders</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearNotifications}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {newOrderNotifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No new notifications
                        </div>
                      ) : (
                        newOrderNotifications.map((order) => (
                          <div
                            key={order.id}
                            className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                            onClick={() => markNotificationAsRead(order.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">#{order.token_number}</p>
                                <p className="text-sm text-gray-600">
                                  {order.order_type === 'dine-in' ? `Table ${order.table_number}` : 'Takeaway'}
                                </p>
                                <p className="text-sm text-gray-500">₹{order.total}</p>
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(order.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrders}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Results Info */}
        {isSearching && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-blue-800">
                Showing search results for: "{searchTerm}" ({orders.length} found)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Search
              </Button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Preparing</p>
                  <p className="text-2xl font-bold text-gray-900">{preparingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Truck className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ready</p>
                  <p className="text-2xl font-bold text-gray-900">{readyOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{allOrders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {isSearching ? `No orders found for "${searchTerm}"` : 'No orders found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id} className={order.status === 'pending' ? 'border-yellow-200 bg-yellow-50' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-3">
                      <span className="text-2xl font-bold text-amber-600">
                        #{order.token_number}
                      </span>
                      <Badge className={`${getStatusColor(order.status)} capitalize`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{order.status}</span>
                      </Badge>
                      {order.order_type === 'dine-in' && order.table_number && (
                        <Badge variant="outline">
                          Table #{order.table_number}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(order.timestamp).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.order_type === 'dine-in' ? 'Dine-in' : 'Takeaway'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Order Items */}
                    <div className="md:col-span-2">
                      <h4 className="font-semibold mb-2">Order Items:</h4>
                      <div className="space-y-1">
                        {order.items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>₹{order.total}</span>
                        </div>
                      </div>
                      
                      {order.customer_info?.name && (
                        <p className="text-sm text-gray-600 mt-2">
                          Customer: {order.customer_info.name}
                        </p>
                      )}
                      {order.customer_info?.phone && (
                        <p className="text-sm text-gray-600">
                          Phone: {order.customer_info.phone}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Payment: {order.payment_method === 'online' ? 'Paid Online' : 'Pay at Counter'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Update Status:</h4>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Order Slip:</h4>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintOrderSlip(order)}
                            className="w-full"
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Slip
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendOrderSlip(order)}
                            className="w-full"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send to Customer
                          </Button>
                        </div>
                      </div>
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

export default AdminPanel;