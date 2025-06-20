import React, { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, Receipt, DollarSign, Package, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

interface SalesData {
  sale_date: string;
  total_orders: number;
  total_subtotal: number;
  total_sgst: number;
  total_cgst: number;
  total_tax_collected: number;
  total_sales: number;
  completed_orders: number;
  dine_in_orders: number;
  takeaway_orders: number;
}

interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  totalTax: number;
  avgOrderValue: number;
  completionRate: number;
  dineInPercentage: number;
  takeawayPercentage: number;
}

const SalesReports = () => {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set default dates based on report type
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (reportType) {
      case 'daily':
        setStartDate(formatDate(today));
        setEndDate(formatDate(today));
        break;
      case 'weekly':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        setStartDate(formatDate(weekStart));
        setEndDate(formatDate(today));
        break;
      case 'monthly':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(formatDate(monthStart));
        setEndDate(formatDate(today));
        break;
      default:
        break;
    }
  }, [reportType]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchSalesData();
    }
  }, [startDate, endDate]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      // Fetch detailed sales data
      const { data: salesData, error: salesError } = await supabase
        .from('sales_summary')
        .select('*')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      setSalesData(salesData || []);

      // Calculate summary
      if (salesData && salesData.length > 0) {
        const totalRevenue = salesData.reduce((sum, day) => sum + (day.total_sales || 0), 0);
        const totalOrders = salesData.reduce((sum, day) => sum + (day.total_orders || 0), 0);
        const totalTax = salesData.reduce((sum, day) => sum + (day.total_tax_collected || 0), 0);
        const completedOrders = salesData.reduce((sum, day) => sum + (day.completed_orders || 0), 0);
        const dineInOrders = salesData.reduce((sum, day) => sum + (day.dine_in_orders || 0), 0);
        const takeawayOrders = salesData.reduce((sum, day) => sum + (day.takeaway_orders || 0), 0);

        setSummary({
          totalRevenue,
          totalOrders,
          totalTax,
          avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
          dineInPercentage: totalOrders > 0 ? (dineInOrders / totalOrders) * 100 : 0,
          takeawayPercentage: totalOrders > 0 ? (takeawayOrders / totalOrders) * 100 : 0,
        });
      } else {
        setSummary({
          totalRevenue: 0,
          totalOrders: 0,
          totalTax: 0,
          avgOrderValue: 0,
          completionRate: 0,
          dineInPercentage: 0,
          takeawayPercentage: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch sales data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!salesData.length) {
      toast({
        title: 'No Data',
        description: 'No sales data available for the selected period',
        variant: 'destructive',
      });
      return;
    }

    // Create CSV content
    const headers = [
      'Date',
      'Total Orders',
      'Completed Orders',
      'Subtotal (₹)',
      'SGST (₹)',
      'CGST (₹)',
      'Total Tax (₹)',
      'Final Total (₹)',
      'Dine-in Orders',
      'Takeaway Orders',
      'Completion Rate (%)'
    ];

    const csvContent = [
      headers.join(','),
      ...salesData.map(row => [
        row.sale_date,
        row.total_orders,
        row.completed_orders,
        row.total_subtotal?.toFixed(2) || '0.00',
        row.total_sgst?.toFixed(2) || '0.00',
        row.total_cgst?.toFixed(2) || '0.00',
        row.total_tax_collected?.toFixed(2) || '0.00',
        row.total_sales?.toFixed(2) || '0.00',
        row.dine_in_orders,
        row.takeaway_orders,
        row.total_orders > 0 ? ((row.completed_orders / row.total_orders) * 100).toFixed(1) : '0.0'
      ].join(','))
    ].join('\n');

    // Add summary at the end
    const summaryContent = [
      '',
      'SUMMARY',
      `Total Revenue,₹${summary?.totalRevenue.toFixed(2) || '0.00'}`,
      `Total Orders,${summary?.totalOrders || 0}`,
      `Total Tax Collected,₹${summary?.totalTax.toFixed(2) || '0.00'}`,
      `Average Order Value,₹${summary?.avgOrderValue.toFixed(2) || '0.00'}`,
      `Overall Completion Rate,${summary?.completionRate.toFixed(1) || '0.0'}%`,
      `Dine-in Percentage,${summary?.dineInPercentage.toFixed(1) || '0.0'}%`,
      `Takeaway Percentage,${summary?.takeawayPercentage.toFixed(1) || '0.0'}%`,
    ].join('\n');

    const finalContent = csvContent + '\n' + summaryContent;

    // Download file
    const blob = new Blob([finalContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Downloaded',
      description: 'Sales report has been downloaded successfully',
    });
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Sales Reports</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={reportType !== 'custom'}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={reportType !== 'custom'}
              />
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={downloadReport}
                disabled={loading || !salesData.length}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Receipt className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tax Collected</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalTax)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.avgOrderValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Sales Data */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Sales Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading sales data...</p>
            </div>
          ) : salesData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No sales data found for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-right p-2">Orders</th>
                    <th className="text-right p-2">Subtotal</th>
                    <th className="text-right p-2">SGST</th>
                    <th className="text-right p-2">CGST</th>
                    <th className="text-right p-2">Total Tax</th>
                    <th className="text-right p-2">Final Total</th>
                    <th className="text-right p-2">Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">{formatDate(row.sale_date)}</td>
                      <td className="text-right p-2">{row.total_orders}</td>
                      <td className="text-right p-2">{formatCurrency(row.total_subtotal || 0)}</td>
                      <td className="text-right p-2">{formatCurrency(row.total_sgst || 0)}</td>
                      <td className="text-right p-2">{formatCurrency(row.total_cgst || 0)}</td>
                      <td className="text-right p-2">{formatCurrency(row.total_tax_collected || 0)}</td>
                      <td className="text-right p-2 font-semibold">{formatCurrency(row.total_sales || 0)}</td>
                      <td className="text-right p-2">
                        {row.total_orders > 0 ? ((row.completed_orders / row.total_orders) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Insights */}
      {summary && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Dine-in Orders</span>
                  <span className="font-semibold">{summary.dineInPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${summary.dineInPercentage}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Takeaway Orders</span>
                  <span className="font-semibold">{summary.takeawayPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${summary.takeawayPercentage}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>SGST (2.5%)</span>
                  <span className="font-semibold">{formatCurrency(summary.totalTax / 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (2.5%)</span>
                  <span className="font-semibold">{formatCurrency(summary.totalTax / 2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total Tax (5%)</span>
                  <span>{formatCurrency(summary.totalTax)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Tax Rate: 5% (2.5% SGST + 2.5% CGST)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SalesReports;