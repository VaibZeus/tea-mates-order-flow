import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle, Clock, AlertCircle, CreditCard, Smartphone, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UPIPaymentFormProps {
  orderId: string;
  amount: number;
}

export default function UPIPaymentForm({ orderId, amount }: UPIPaymentFormProps) {
  const [utr, setUtr] = useState("");
  const [timeSubmitted, setTimeSubmitted] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  // Tea Mates UPI ID - Replace with your actual UPI ID
  const BUSINESS_UPI_ID = "br0shashi@axl"; // Replace with your actual UPI ID
  const BUSINESS_NAME = "Tea Mates"; // Your business name
  const MERCHANT_CODE = "TEAMATES"; // Your merchant code (optional)
  
  // UPI payment string format
  const upiString = `upi://pay?pa=${BUSINESS_UPI_ID}&pn=${encodeURIComponent(BUSINESS_NAME)}&am=${amount}&tn=Order+${orderId}&mc=${MERCHANT_CODE}&mode=02&purpose=00`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      // Validate UTR format (UPI UTRs are typically 12 digits)
      if (!/^\d{12}$/.test(utr.trim())) {
        setStatus("Please enter a valid 12-digit UTR number");
        setLoading(false);
        return;
      }

      // Check for duplicate UTR for this order
      const { data: existing, error: fetchError } = await supabase
        .from("payments")
        .select("id")
        .eq("utr", utr.trim())
        .eq("order_id", orderId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error checking UTR:", fetchError);
        setStatus("Error checking UTR. Please try again.");
        setLoading(false);
        return;
      }

      if (existing) {
        setStatus("Duplicate Transaction: This UTR has already been submitted for this order.");
        setLoading(false);
        return;
      }

      // Validate transaction time (should not be in future)
      const submittedTime = new Date(timeSubmitted);
      const now = new Date();
      if (submittedTime > now) {
        setStatus("Transaction time cannot be in the future.");
        setLoading(false);
        return;
      }

      // Check if transaction time is too old (more than 24 hours)
      const hoursDiff = (now.getTime() - submittedTime.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        setStatus("Transaction time cannot be more than 24 hours old.");
        setLoading(false);
        return;
      }

      // Insert new payment as pending
      const { error: insertError } = await supabase
        .from("payments")
        .insert([
          {
            order_id: orderId,
            utr: utr.trim(),
            amount: amount,
            time_submitted: timeSubmitted,
            status: "pending",
          },
        ]);

      if (insertError) {
        console.error("Payment submission error:", insertError);
        setStatus("Error submitting payment. Please try again.");
      } else {
        setStatus("Payment submitted successfully! Awaiting admin verification.");
        setPaymentSubmitted(true);
        setUtr("");
        setTimeSubmitted("");
        
        // Show success toast
        toast({
          title: "Payment Submitted",
          description: "Your payment details have been submitted for verification. You will be notified once verified.",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Payment submission error:", error);
      setStatus("Error submitting payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyUPIId = () => {
    navigator.clipboard.writeText(BUSINESS_UPI_ID);
    toast({
      title: "UPI ID Copied",
      description: "UPI ID has been copied to clipboard",
      duration: 2000,
    });
  };

  const openUPIApp = () => {
    // Try to open UPI app directly
    window.location.href = upiString;
  };

  if (!orderId || !amount) {
    return (
      <div className="max-w-md mx-auto p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Order not found or amount missing. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <span>UPI Payment</span>
          </CardTitle>
          <p className="text-lg font-semibold text-green-600">₹{amount.toFixed(2)}</p>
          <p className="text-sm text-gray-600">Secure UPI Payment</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* UPI App Button */}
          <div className="text-center">
            <Button
              onClick={openUPIApp}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 mb-4"
            >
              <Smartphone className="h-5 w-5 mr-2" />
              Pay with UPI App
            </Button>
            <p className="text-xs text-gray-500">
              Click above to open your UPI app directly
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or scan QR code</span>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white border-2 border-blue-200 rounded-lg">
              <QRCodeCanvas 
                value={upiString} 
                size={180}
                bgColor="#ffffff"
                fgColor="#2563eb"
                level="M"
                includeMargin={true}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Business UPI ID:
              </p>
              <div className="flex items-center space-x-2 bg-blue-50 p-2 rounded border">
                <p className="text-sm text-blue-600 font-mono break-all flex-1">
                  {BUSINESS_UPI_ID}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyUPIId}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <strong className="text-blue-800">Payment Instructions:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-blue-700">
                <li>Click "Pay with UPI App" or scan the QR code</li>
                <li>Complete the payment in your UPI app</li>
                <li>Note down the 12-digit UTR number from your UPI app</li>
                <li>Note the exact transaction time</li>
                <li>Fill the form below to submit payment details</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Payment Submission Form */}
          {!paymentSubmitted && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="utr">UPI UTR Number *</Label>
                <Input
                  id="utr"
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="Enter 12-digit UTR number"
                  required
                  maxLength={12}
                  className="font-mono text-center text-lg tracking-wider"
                />
                <p className="text-xs text-gray-500">
                  UPI UTR number is exactly 12 digits long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeSubmitted">Transaction Time *</Label>
                <Input
                  id="timeSubmitted"
                  type="datetime-local"
                  value={timeSubmitted}
                  onChange={(e) => setTimeSubmitted(e.target.value)}
                  required
                  max={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-500">
                  Select the exact time when you completed the payment
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading || utr.length !== 12}
              >
                {loading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Payment Details
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Status Messages */}
          {status && (
            <Alert className={paymentSubmitted ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {paymentSubmitted ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={paymentSubmitted ? "text-green-800" : "text-red-800"}>
                {status}
              </AlertDescription>
            </Alert>
          )}

          {paymentSubmitted && (
            <div className="text-center space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  Payment Details Submitted Successfully!
                </p>
              </div>
              <p className="text-sm text-green-700">
                Your payment is being verified by our admin team.
              </p>
              <p className="text-xs text-green-600">
                You will be notified once the payment is confirmed and your order is placed.
              </p>
            </div>
          )}

          {/* UPI Branding */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              Secure payments via UPI
            </p>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-xs font-semibold text-blue-600">UPI Payments</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}