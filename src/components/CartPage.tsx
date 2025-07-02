import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, Clock, CreditCard, Banknote, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NavigationHeader } from '@/components/ui/navigation-header';
import { useOrder } from '@/context/OrderContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { generateTokenNumber } from '@/lib/utils';
import UPIPaymentForm from './UPIPaymentForm';

const CartPage = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useOrder();
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('cash');
  const [pickupTime, setPickupTime] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showUPIPayment, setShowUPIPayment] = useState(false);

  // Tax calculations
  const cartSubtotal = state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const sgstAmount = Math.round(cartSubtotal * 0.025 * 100) / 100; // 2.5% SGST
  const cgstAmount = Math.round(cartSubtotal * 0.025 * 100) / 100; // 2.5% CGST
  const totalTax = sgstAmount + cgstAmount;
  const finalTotal = cartSubtotal + totalTax;

  // Get order type and table from URL
  const urlParams = new URLSearchParams(window.location.search);
  const orderType = urlParams.get('type') as 'dine-in' | 'takeaway' || 'takeaway';
  const tableNumber = urlParams.get('table') || undefined;

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: id });
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
    }
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: id });
    toast({
      title: 'Item removed',
      description: 'Item has been removed from your cart',
    });
  };

  const placeOrder = async () => {
    // Validation
    if (state.cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart before placing an order',
        variant: 'destructive',
      });
      return;
    }

    // Validate required customer name
    if (!customerInfo.name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name to place the order',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const tokenNumber = generateTokenNumber();
      const orderData = {
        items: state.cart,
        subtotal: cartSubtotal,
        sgst_amount: sgstAmount,
        cgst_amount: cgstAmount,
        total_tax: totalTax,
        final_total: finalTotal,
        total: finalTotal, // For backward compatibility
        status: 'pending',
        token_number: tokenNumber,
        timestamp: new Date().toISOString(),
        customer_info: customerInfo,
        order_type: orderType,
        table_number: tableNumber,
        pickup_time: orderType === 'takeaway' ? pickupTime : null,
        payment_method: paymentMethod,
        payment_verified: paymentMethod === 'cash', // Auto-verify cash payments
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();
        
      if (error) {
        console.error('Order creation error:', error);
        throw error;
      }
      
      if (paymentMethod === 'online') {
        // Show UPI payment form for online payments
        setOrderId(data.id);
        setShowUPIPayment(true);
      } else {
        // Cash payment - order placed immediately (auto-verified)
        dispatch({ type: 'CLEAR_CART' });
        toast({
          title: 'Order placed successfully!',
          description: `Your order #${tokenNumber} has been received and is being processed`,
        });
        navigate('/orders');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error placing order',
        description: 'Please try again or contact support',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    dispatch({ type: 'CLEAR_CART' });
    toast({
      title: 'Payment submitted successfully!',
      description: 'Your payment is being verified. You will be notified once confirmed.',
    });
    navigate('/orders');
  };

  const handlePaymentFailure = () => {
    toast({
      title: 'Payment submission failed',
      description: 'Please try again or choose a different payment method',
      variant: 'destructive',
    });
    setShowUPIPayment(false);
    setOrderId(null);
  };

  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (let hour = currentHour; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === currentHour && minute <= currentMinute + 15) continue;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  if (state.cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader 
          title="Your Cart" 
          subtitle="Cart is empty"
        />
        
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some delicious items to get started!</p>
            <Button onClick={() => navigate('/menu')} className="bg-gradient-to-r from-amber-500 to-orange-500">
              Browse Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render UPI payment interface if needed
  if (showUPIPayment && orderId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader 
          title="Payment" 
          subtitle="Complete your UPI payment"
          customBackAction={() => {
            setShowUPIPayment(false);
            setOrderId(null);
          }}
        />
        
        <div className="flex items-center justify-center p-4">
          <UPIPaymentForm
            orderId={orderId}
            amount={finalTotal}
          />
        </div>
      </div>
    );
  }

  const headerSubtitle = `${state.cart.length} items • ${orderType?.replace('-', ' ')} ${tableNumber ? `• Table #${tableNumber}` : ''}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader 
        title="Your Cart" 
        subtitle={headerSubtitle}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {state.cart.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center text-2xl">
                      {item.image || '🍵'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.category}</p>
                      <p className="text-lg font-bold text-green-600">₹{item.price}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary & Checkout */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="Enter your name"
                    required
                    className={!customerInfo.name.trim() ? 'border-red-300' : ''}
                  />
                  {!customerInfo.name.trim() && (
                    <p className="text-xs text-red-600 mt-1">Name is required</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pickup Time for Takeaway */}
            {orderType === 'takeaway' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Pickup Time</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pickup time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asap">As soon as possible</SelectItem>
                      {generateTimeSlots().map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(value: 'online' | 'cash') => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center space-x-2 cursor-pointer">
                      <Banknote className="h-4 w-4" />
                      <span>Pay at Counter</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="flex items-center space-x-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      <span>Pay Online (UPI)</span>
                    </Label>
                  </div>
                </RadioGroup>
                
                {paymentMethod === 'online' && (
                  <Alert className="mt-3 border-blue-200 bg-blue-50">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Manual Verification Process:</strong>
                      <ul className="list-disc list-inside mt-1 text-sm">
                        <li>Pay via UPI using QR code or UPI ID</li>
                        <li>Submit UTR number and transaction time</li>
                        <li>Admin will verify payment manually</li>
                        <li>Order confirmed after verification</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Order Summary with Tax Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Receipt className="h-5 w-5" />
                  <span>Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{cartSubtotal.toFixed(2)}</span>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>SGST (2.5%)</span>
                    <span>₹{sgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>CGST (2.5%)</span>
                    <span>₹{cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total Tax (5%)</span>
                    <span>₹{totalTax.toFixed(2)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Final Total</span>
                  <span>₹{finalTotal.toFixed(2)}</span>
                </div>
                
                {!customerInfo.name.trim() && (
                  <Alert>
                    <AlertDescription>
                      Please enter your name to place the order
                    </AlertDescription>
                  </Alert>
                )}
                
                <Button
                  onClick={placeOrder}
                  disabled={loading || !customerInfo.name.trim()}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-3"
                >
                  {loading ? 'Placing Order...' : paymentMethod === 'online' ? 'Proceed to Payment' : 'Place Order'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;