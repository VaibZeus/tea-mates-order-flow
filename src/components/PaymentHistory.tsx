import React, { useState, useEffect } from 'react';
import { Calendar, Download, CreditCard, Smartphone, Phone, User, Hash, Clock, CheckCircle, XCircle, AlertTriangle, Search, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

interface PaymentHistoryItem {
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
    payment_method: string;
    order_type: string;
    table_number?: string;
    customer_info?: {
      name?: string;
      phone?: string;
    };
  };
}

interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  onlinePayments: number;
  cashPayments: number;
}

const PaymentHistory = () => {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<PaymentSummary | null>(null);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [statusFilter, paymentMethodFilter, searchTerm, startDate, endDate, allPayments]);

  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          orders (
            token_number,
            payment_method,
            order_type,
            table_number,
            customer_info
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment history:', error);
        throw error;
      }

      setAllPayments(data || []);
      calculateSummary(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payment history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...allPayments];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    // Filter by payment method
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.orders?.payment_method === paymentMethodFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(payment =>
        payment.utr.toLowerCase().includes(term) ||
        payment.orders?.token_number.toLowerCase().includes(term) ||
        payment.orders?.customer_info?.name?.toLowerCase().includes(term) ||
        payment.orders?.customer_info?.phone?.toLowerCase().includes(term)
      );
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(payment => 
        new Date(payment.created_at) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(payment => 
        new Date(payment.created_at) <= new Date(endDate + 'T23:59:59')
      );
    }

    setPayments(filtered);
  };

  const calculateSummary = (paymentData: PaymentHistoryItem[]) => {
    const summary: PaymentSummary = {
      totalPayments: paymentData.length,
      totalAmount: paymentData.reduce((sum, payment) => sum + payment.amount, 0),
      successfulPayments: paymentData.filter(p => p.status === 'success').length,
      failedPayments: paymentData.filter(p => p.status === 'failed').length,
      pendingPayments: paymentData.filter(p => p.status === 'pending').length,
      onlinePayments: paymentData.filter(p => p.orders?.payment_method === 'online').length,
      cashPayments: paymentData.filter(p => p.orders?.payment_method === 'cash').length,
    };

    setSummary(summary);
  };

  const downloadReport = () => {
    if (!payments.length) {
      toast({
        title: 'No Data',
        description: 'No payment data available for the selected filters',
        variant: 'destructive',
      });
      return;
    }

    // Create CSV content
    const headers = [
      'Date',
      'Time',
      'Order Token',
      'Customer Name',
      'Customer Phone',
      'Payment Method',
      'UTR Number',
      'Amount (₹)',
      'Status',
      'Verified By',
      'Verified At',
      'Order Type',
      'Table Number',
      'Admin Notes'
    ];

    const csvContent = [
      headers.join(','),
      ...payments.map(payment => [
        new Date(payment.created_at).toLocaleDateString(),
        new Date(payment.created_at).toLocaleTimeString(),
        payment.orders?.token_number || '',
        payment.orders?.customer_info?.name || '',
        payment.orders?.customer_info?.phone || '',
        payment.orders?.payment_method || '',
        payment.utr || '',
        payment.amount.toFixed(2),
        payment.status,
        payment.verified_by || '',
        payment.verified_at ? new Date(payment.verified_at).toLocaleString() : '',
        payment.orders?.order_type || '',
        payment.orders?.table_number || '',
        payment.admin_notes || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    // Add summary at the end
    const summaryContent = [
      '',
      'PAYMENT SUMMARY',
      `Total Payments,${summary?.totalPayments || 0}`,
      `Total Amount,₹${summary?.totalAmount.toFixed(2) || '0.00'}`,
      `Successful Payments,${summary?.successfulPayments || 0}`,
      `Failed Payments,${summary?.failedPayments || 0}`,
      `Pending Payments,${summary?.pendingPayments || 0}`,
      `Online Payments,${summary?.onlinePayments || 0}`,
      `Cash Payments,${summary?.cashPayments || 0}`,
    ].join('\n');

    const finalContent = csvContent + '\n' + summaryContent;

    // Download file
    const blob = new Blob([finalContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Downloaded',
      description: 'Payment history report has been downloaded successfully',
    });
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentMethodFilter('all');
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
          <p className="text-gray-600">Complete payment transaction history with UPI details</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={fetchPaymentHistory}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={downloadReport}
            disabled={loading || !payments.length}
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalPayments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Smartphone className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Online Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.onlinePayments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.totalPayments > 0 ? ((summary.successfulPayments / summary.totalPayments) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentMethodFilter">Payment Method</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="online">Online UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="UTR, Token, Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={clearFilters}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payment history...</p>
            </div>
          ) : payments.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No payment transactions found matching your criteria.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <Card key={payment.id} className="border-l-4 border-l-blue-400">
                  <CardContent className="p-4">
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Payment Info */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900">Payment Details</h4>
                          <Badge className={`${getStatusColor(payment.status)} capitalize`}>
                            {getStatusIcon(payment.status)}
                            <span className="ml-1">{payment.status}</span>
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Hash className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-gray-500">Order Token</p>
                              <p className="font-mono text-sm font-medium">#{payment.orders?.token_number}</p>
                            </div>
                          </div>

                          {payment.orders?.payment_method === 'online' && (
                            <div className="flex items-center space-x-2">
                              <Smartphone className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="text-xs text-gray-500">UPI UTR Number</p>
                                <p className="font-mono text-sm font-medium">{payment.utr}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-gray-500">Amount</p>
                              <p className="text-lg font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-gray-500">Transaction Time</p>
                              <p className="text-sm">{formatDateTime(payment.time_submitted)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">Customer Details</h4>
                        
                        <div className="space-y-2">
                          {payment.orders?.customer_info?.name && (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-green-500" />
                              <div>
                                <p className="text-xs text-gray-500">Customer Name</p>
                                <p className="text-sm font-medium">{payment.orders.customer_info.name}</p>
                              </div>
                            </div>
                          )}

                          {payment.orders?.customer_info?.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-green-500" />
                              <div>
                                <p className="text-xs text-gray-500">Phone Number</p>
                                <p className="text-sm font-medium">{payment.orders.customer_info.phone}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-gray-500">Payment Method</p>
                              <p className="text-sm font-medium capitalize">
                                {payment.orders?.payment_method === 'online' ? 'Online UPI' : 'Cash'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Hash className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-gray-500">Order Type</p>
                              <p className="text-sm font-medium capitalize">
                                {payment.orders?.order_type}
                                {payment.orders?.table_number && ` - Table #${payment.orders.table_number}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Verification Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">Verification Details</h4>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-purple-500" />
                            <div>
                              <p className="text-xs text-gray-500">Submitted At</p>
                              <p className="text-sm">{formatDateTime(payment.created_at)}</p>
                            </div>
                          </div>

                          {payment.verified_by && (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-purple-500" />
                              <div>
                                <p className="text-xs text-gray-500">Verified By</p>
                                <p className="text-sm font-medium">{payment.verified_by}</p>
                              </div>
                            </div>
                          )}

                          {payment.verified_at && (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-purple-500" />
                              <div>
                                <p className="text-xs text-gray-500">Verified At</p>
                                <p className="text-sm">{formatDateTime(payment.verified_at)}</p>
                              </div>
                            </div>
                          )}

                          {payment.admin_notes && (
                            <div className="mt-3 p-2 bg-gray-50 rounded border">
                              <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
                              <p className="text-sm">{payment.admin_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;