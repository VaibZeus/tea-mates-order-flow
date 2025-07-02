import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Textarea } from "./ui/textarea";
import { RefreshCw, CheckCircle, X, Clock, Smartphone, Phone, User, Calendar, Hash, AlertTriangle, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  order_id: string;
  utr: string;
  amount: number;
  time_submitted: string;
  status: string;
  created_at: string;
  verified_by?: string;
  verified_at?: string;
  admin_notes?: string;
  orders?: {
    token_number: string;
    customer_info?: {
      name?: string;
      phone?: string;
    };
  };
}

export default function AdminPaymentsPanel() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          orders (
            token_number,
            customer_info
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payments:", error);
        toast({
          title: "Error",
          description: "Failed to fetch payments",
          variant: "destructive",
        });
      } else {
        setPayments(data || []);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    // Set up real-time subscription for new payments
    const channel = supabase
      .channel('admin-payments-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'payments' 
      }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const newPayment = payload.new as Payment;
          if (newPayment.status === 'pending') {
            setPayments(prevPayments => [newPayment, ...prevPayments]);
            
            // Show notification for new payment
            toast({
              title: 'New UPI Payment Received!',
              description: `Payment of ₹${newPayment.amount} - UTR: ${newPayment.utr}`,
              duration: 5000,
            });

            // Play notification sound
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
              oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
              oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
              
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.3);
            } catch (e) {
              console.log('Audio notification failed:', e);
            }
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const updatedPayment = payload.new as Payment;
          setPayments(prevPayments => 
            prevPayments.filter(payment => payment.id !== updatedPayment.id)
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    setActionLoading(id + status);
    try {
      const adminUser = 'admin'; // In a real app, get from auth context
      const notes = adminNotes[id] || '';

      // Update payment status
      const { error: paymentError } = await supabase
        .from("payments")
        .update({ 
          status,
          verified_by: adminUser,
          verified_at: new Date().toISOString(),
          admin_notes: notes
        })
        .eq("id", id);

      if (paymentError) {
        console.error("Error updating payment status:", paymentError);
        throw paymentError;
      }

      // If payment is approved, update order status and mark as verified
      if (status === 'success') {
        const payment = payments.find(p => p.id === id);
        if (payment) {
          const { error: orderError } = await supabase
            .from("orders")
            .update({ 
              status: 'accepted',
              payment_verified: true,
              payment_verification_notes: notes
            })
            .eq("id", payment.order_id);

          if (orderError) {
            console.error("Error updating order:", orderError);
            throw orderError;
          }
        }
      } else if (status === 'failed') {
        // If payment is rejected, mark order as cancelled
        const payment = payments.find(p => p.id === id);
        if (payment) {
          const { error: orderError } = await supabase
            .from("orders")
            .update({ 
              status: 'cancelled',
              payment_verified: false,
              payment_verification_notes: notes
            })
            .eq("id", payment.order_id);

          if (orderError) {
            console.error("Error updating order:", orderError);
            throw orderError;
          }
        }
      }

      toast({
        title: "Payment Updated",
        description: `UPI payment has been ${status === 'success' ? 'approved and order confirmed' : 'rejected and order cancelled'}`,
      });
      
      // Remove from pending list
      setPayments(prevPayments => 
        prevPayments.filter(payment => payment.id !== id)
      );

      // Clear admin notes for this payment
      setAdminNotes(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const copyUTR = (utr: string) => {
    navigator.clipboard.writeText(utr);
    toast({
      title: "UTR Copied",
      description: "UTR number has been copied to clipboard",
      duration: 2000,
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <span>UPI Payment Verification</span>
          </h2>
          <p className="text-gray-600">Review and approve pending UPI payments manually</p>
        </div>
        <Button
          onClick={fetchPayments}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading UPI payments...</p>
        </div>
      ) : payments.length === 0 ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            No pending UPI payments to review. All payments have been processed.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="border-l-4 border-l-blue-400">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <Smartphone className="h-4 w-4 text-white" />
                    </div>
                    <span>UPI Payment Verification</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending Verification
                    </Badge>
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Submitted: {formatDateTime(payment.created_at)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Payment Details */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 mb-3">UPI Payment Details</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Hash className="h-4 w-4 text-blue-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">UPI UTR Number</p>
                          <div className="flex items-center space-x-2">
                            <p className="font-mono text-sm bg-blue-100 px-2 py-1 rounded border">
                              {payment.utr}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyUTR(payment.utr)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Transaction Time</p>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(payment.time_submitted)}
                          </p>
                        </div>
                      </div>

                      {payment.orders && (
                        <div className="flex items-center space-x-3">
                          <Hash className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Order Token</p>
                            <p className="text-sm font-bold text-amber-600">
                              #{payment.orders.token_number}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Customer Information</h4>
                    
                    <div className="space-y-3">
                      {payment.orders?.customer_info?.name && (
                        <div className="flex items-center space-x-3">
                          <User className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Customer Name</p>
                            <p className="text-sm text-gray-600">
                              {payment.orders.customer_info.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {payment.orders?.customer_info?.phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Phone Number</p>
                            <p className="text-sm text-gray-600">
                              {payment.orders.customer_info.phone}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-800 mb-1">
                          Manual Verification Steps:
                        </p>
                        <ol className="text-xs text-blue-700 space-y-1">
                          <li>1. Check your bank/UPI app transaction history</li>
                          <li>2. Search for UTR: {payment.utr}</li>
                          <li>3. Verify amount matches: {formatCurrency(payment.amount)}</li>
                          <li>4. Confirm transaction time is correct</li>
                          <li>5. Approve or reject the payment below</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold text-gray-900">Admin Notes (Optional)</h4>
                  <Textarea
                    placeholder="Add verification notes or comments..."
                    value={adminNotes[payment.id] || ''}
                    onChange={(e) => setAdminNotes(prev => ({
                      ...prev,
                      [payment.id]: e.target.value
                    }))}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mt-6 pt-4 border-t">
                  <Button
                    onClick={() => handleUpdateStatus(payment.id, "success")}
                    disabled={actionLoading === payment.id + "success"}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading === payment.id + "success" ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Payment & Confirm Order
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleUpdateStatus(payment.id, "failed")}
                    disabled={actionLoading === payment.id + "failed"}
                    variant="destructive"
                    className="flex-1"
                  >
                    {actionLoading === payment.id + "failed" ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Reject Payment & Cancel Order
                      </>
                    )}
                  </Button>
                </div>

                {/* Warning Alert */}
                <Alert className="mt-4 border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Important:</strong> Approving this payment will automatically confirm the order and notify the customer. 
                    Rejecting will cancel the order. Please verify the UTR in your bank statement before taking action.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}