import React, { useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, Printer, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

interface OrderSlipProps {
  order: Order;
  onClose: () => void;
}

const OrderSlip: React.FC<OrderSlipProps> = ({ order, onClose }) => {
  const slipRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (slipRef.current) {
      const printContent = slipRef.current.innerHTML;
      const originalContent = document.body.innerHTML;
      
      document.body.innerHTML = `
        <html>
          <head>
            <title>Order Slip - ${order.token_number}</title>
            <style>
              body { font-family: monospace; margin: 20px; }
              .slip { max-width: 300px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
              .item { display: flex; justify-content: space-between; margin: 5px 0; }
              .total { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
              .footer { text-align: center; margin-top: 20px; border-top: 1px solid #000; padding-top: 10px; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `;
      
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  const handleDownload = () => {
    if (slipRef.current) {
      const slipContent = slipRef.current.innerText;
      const blob = new Blob([slipContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-slip-${order.token_number}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Downloaded',
        description: 'Order slip has been downloaded',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Order Slip</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={slipRef} className="slip bg-white p-4 border rounded">
            <div className="header text-center">
              <h2 className="text-xl font-bold">TEA MATES</h2>
              <p className="text-sm">Smart Ordering System</p>
              <p className="text-xs">Order Slip</p>
            </div>
            
            <div className="order-info mb-4">
              <div className="flex justify-between">
                <span>Token:</span>
                <span className="font-bold">#{order.token_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatDate(order.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span>{order.order_type === 'dine-in' ? 'Dine-In' : 'Takeaway'}</span>
              </div>
              {order.table_number && (
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span>#{order.table_number}</span>
                </div>
              )}
              {order.customer_info?.name && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{order.customer_info.name}</span>
                </div>
              )}
              {order.customer_info?.phone && (
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{order.customer_info.phone}</span>
                </div>
              )}
            </div>

            <div className="items mb-4">
              <div className="border-b pb-2 mb-2">
                <div className="flex justify-between font-semibold">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
              </div>
              {order.items.map((item: any, index: number) => (
                <div key={index} className="item flex justify-between">
                  <span>{item.quantity}x {item.name}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="total border-t pt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL:</span>
                <span>₹{order.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment:</span>
                <span>{order.payment_method === 'online' ? 'Paid Online' : 'Pay at Counter'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <span className="capitalize">{order.status}</span>
              </div>
            </div>

            <div className="footer text-center text-xs mt-4 pt-2 border-t">
              <p>Thank you for your order!</p>
              <p>Please keep this slip for reference</p>
              {order.order_type === 'takeaway' && (
                <p>Show this slip when collecting your order</p>
              )}
            </div>
          </div>

          <div className="flex space-x-2 mt-4">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSlip;