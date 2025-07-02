import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, Clock, AlertCircle, Smartphone, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

interface PhonePePaymentProps {
  orderId: string;
  amount: number;
  customerInfo: {
    name: string;
    phone?: string;
  };
  onPaymentSuccess: () => void;
  onPaymentFailure: () => void;
}

export default function PhonePePayment({ 
  orderId, 
  amount, 
  customerInfo, 
  onPaymentSuccess, 
  onPaymentFailure 
}: PhonePePaymentProps) {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Poll for payment status
  useEffect(() => {
    if (paymentStatus === 'processing' && transactionId) {
      const pollInterval = setInterval(async () => {
        try {
          const { data: payment } = await supabase
            .from('payments')
            .select('status')
            .eq('order_id', orderId)
            .eq('phonepe_transaction_id', transactionId)
            .single();

          if (payment?.status === 'success') {
            setPaymentStatus('success');
            clearInterval(pollInterval);
            toast({
              title: 'Payment Successful!',
              description: 'Your PhonePe payment has been verified automatically.',
            });
            onPaymentSuccess();
          } else if (payment?.status === 'failed') {
            setPaymentStatus('failed');
            clearInterval(pollInterval);
            toast({
              title: 'Payment Failed',
              description: 'Your PhonePe payment could not be processed.',
              variant: 'destructive',
            });
            onPaymentFailure();
          }
        } catch (error) {
          console.error('Error polling payment status:', error);
        }
      }, 3000);

      // Clear interval after 10 minutes
      setTimeout(() => clearInterval(pollInterval), 600000);

      return () => clearInterval(pollInterval);
    }
  }, [paymentStatus, transactionId, orderId, onPaymentSuccess, onPaymentFailure]);

  const initiatePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phonepe-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          orderId,
          amount,
          customerInfo,
        }),
      });

      const result = await response.json();

      if (result.success && result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
        setTransactionId(result.merchantTransactionId);
        setPaymentStatus('processing');
        
        // Open payment URL in new window
        const paymentWindow = window.open(result.paymentUrl, 'phonepe-payment', 'width=600,height=700');
        
        // Monitor payment window
        const checkClosed = setInterval(() => {
          if (paymentWindow?.closed) {
            clearInterval(checkClosed);
            // Window closed, start polling for status
            console.log('Payment window closed, polling for status...');
          }
        }, 1000);

        toast({
          title: 'Payment Initiated',
          description: 'Please complete your payment in the PhonePe window.',
        });
      } else {
        throw new Error(result.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to initiate PhonePe payment. Please try again.',
        variant: 'destructive',
      });
      setPaymentStatus('failed');
      onPaymentFailure();
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <span>PhonePe Business Payment</span>
        </CardTitle>
        <p className="text-lg font-semibold text-green-600">{formatCurrency(amount)}</p>
        <p className="text-sm text-gray-600">Secure & Instant Payment</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {paymentStatus === 'idle' && (
          <>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Ready to Pay</h3>
                <p className="text-sm text-gray-600">
                  Click below to pay securely with PhonePe Business
                </p>
              </div>
            </div>

            <Alert className="border-purple-200 bg-purple-50">
              <Smartphone className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                <strong>Fully Automated Payment:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Instant payment verification</li>
                  <li>No manual UTR entry required</li>
                  <li>Automatic order confirmation</li>
                  <li>Real-time status updates</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={initiatePayment}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Initiating Payment...
                </>
              ) : (
                <>
                  <Smartphone className="h-5 w-5 mr-2" />
                  Pay with PhonePe Business
                </>
              )}
            </Button>
          </>
        )}

        {paymentStatus === 'processing' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-yellow-600 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Payment Processing</h3>
              <p className="text-sm text-gray-600">
                Please complete your payment in the PhonePe window
              </p>
            </div>
            <Alert className="border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Processing your payment...</strong>
                <p className="text-sm mt-1">
                  Your payment will be verified automatically. Please don't close this window.
                </p>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Payment Successful!</h3>
              <p className="text-sm text-green-700">
                Your PhonePe payment has been verified automatically
              </p>
            </div>
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Order Confirmed!</strong>
                <p className="text-sm mt-1">
                  Your order has been placed successfully and is being processed.
                </p>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Payment Failed</h3>
              <p className="text-sm text-red-700">
                Your PhonePe payment could not be processed
              </p>
            </div>
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Payment Error</strong>
                <p className="text-sm mt-1">
                  Please try again or contact support if the issue persists.
                </p>
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => {
                setPaymentStatus('idle');
                setPaymentUrl(null);
                setTransactionId(null);
              }}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* PhonePe Branding */}
        <div className="text-center pt-4 border-t">
          <p className="text-xs text-gray-500">
            Secure payments powered by PhonePe Business API
          </p>
          <div className="flex items-center justify-center space-x-1 mt-1">
            <div className="w-4 h-4 bg-purple-600 rounded"></div>
            <span className="text-xs font-semibold text-purple-600">PhonePe Business</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}