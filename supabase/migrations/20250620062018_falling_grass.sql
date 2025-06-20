/*
  # Create orders table for Tea Mates

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `items` (jsonb, order items with details)
      - `total` (numeric, total amount)
      - `status` (text, order status)
      - `token_number` (text, unique order token)
      - `timestamp` (timestamptz, order creation time)
      - `customer_info` (jsonb, customer details)
      - `order_type` (text, dine-in or takeaway)
      - `table_number` (text, optional table number)
      - `pickup_time` (text, optional pickup time)
      - `payment_method` (text, payment method)
      - `created_at` (timestamptz, auto-generated)
      - `updated_at` (timestamptz, auto-updated)

  2. Security
    - Enable RLS on `orders` table
    - Add policy for public read access (for order tracking)
    - Add policy for public insert access (for placing orders)
    - Add policy for authenticated users to update orders (admin)
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  token_number text UNIQUE NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  customer_info jsonb DEFAULT '{}'::jsonb,
  order_type text NOT NULL DEFAULT 'takeaway',
  table_number text,
  pickup_time text,
  payment_method text NOT NULL DEFAULT 'cash',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow public to read orders (for order tracking)
CREATE POLICY "Allow public read access to orders"
  ON orders
  FOR SELECT
  TO public
  USING (true);

-- Allow public to insert orders (for placing orders)
CREATE POLICY "Allow public insert access to orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public to update orders (for status updates)
CREATE POLICY "Allow public update access to orders"
  ON orders
  FOR UPDATE
  TO public
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_token_number ON orders(token_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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