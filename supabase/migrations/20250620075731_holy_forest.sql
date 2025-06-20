/*
  # Add tax and sales tracking columns to orders table

  1. New Columns
    - `subtotal` (numeric, amount before tax)
    - `sgst_amount` (numeric, 2.5% SGST amount)
    - `cgst_amount` (numeric, 2.5% CGST amount)
    - `total_tax` (numeric, total tax amount)
    - `final_total` (numeric, total amount including tax)

  2. Updates
    - Migrate existing orders to have proper tax breakdown
    - Update total column to be final_total for backward compatibility

  3. Indexes
    - Add indexes for sales reporting queries
*/

-- Add new tax-related columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tax numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_total numeric DEFAULT 0;

-- Update existing orders to have proper tax breakdown
UPDATE orders 
SET 
  subtotal = total / 1.05,
  sgst_amount = (total / 1.05) * 0.025,
  cgst_amount = (total / 1.05) * 0.025,
  total_tax = (total / 1.05) * 0.05,
  final_total = total
WHERE subtotal = 0;

-- Create indexes for sales reporting
CREATE INDEX IF NOT EXISTS idx_orders_date_range ON orders(DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_orders_final_total ON orders(final_total);
CREATE INDEX IF NOT EXISTS idx_orders_tax_amounts ON orders(total_tax, sgst_amount, cgst_amount);

-- Create view for sales reporting
CREATE OR REPLACE VIEW sales_summary AS
SELECT 
  DATE(timestamp) as sale_date,
  COUNT(*) as total_orders,
  SUM(subtotal) as total_subtotal,
  SUM(sgst_amount) as total_sgst,
  SUM(cgst_amount) as total_cgst,
  SUM(total_tax) as total_tax_collected,
  SUM(final_total) as total_sales,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN order_type = 'dine-in' THEN 1 END) as dine_in_orders,
  COUNT(CASE WHEN order_type = 'takeaway' THEN 1 END) as takeaway_orders
FROM orders 
WHERE status IN ('delivered', 'done', 'ready')
GROUP BY DATE(timestamp)
ORDER BY sale_date DESC;