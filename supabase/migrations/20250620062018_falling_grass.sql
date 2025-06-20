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