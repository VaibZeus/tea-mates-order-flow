/*
  # Create payments table for manual verification

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `utr` (text, UPI transaction reference)
      - `amount` (numeric, payment amount)
      - `time_submitted` (timestamptz, when user submitted payment)
      - `status` (text, pending/success/failed)
      - `created_at` (timestamptz, auto-generated)
      - `updated_at` (timestamptz, auto-updated)

  2. Security
    - Enable RLS on `payments` table
    - Add policy for public read/insert access
    - Add policy for public update access (admin verification)

  3. Indexes
    - Add indexes for performance optimization
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  utr text NOT NULL,
  amount numeric NOT NULL,
  time_submitted timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow public to read payments (for status checking)
CREATE POLICY "Allow public read access to payments"
  ON payments
  FOR SELECT
  TO public
  USING (true);

-- Allow public to insert payments (for submitting payments)
CREATE POLICY "Allow public insert access to payments"
  ON payments
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public to update payments (for admin verification)
CREATE POLICY "Allow public update access to payments"
  ON payments
  FOR UPDATE
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_utr ON payments(utr);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at_column();

-- Add unique constraint to prevent duplicate UTR submissions for same order
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order_utr_unique 
ON payments(order_id, utr);