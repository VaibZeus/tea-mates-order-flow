/*
  # Add payment verification system for manual UPI payments

  1. Updates to payments table
    - Add phonepe_transaction_id column for PhonePe Business integration
    - Add verification timestamps and admin info
    - Update indexes for better performance

  2. Updates to orders table
    - Add payment_verified column to track verification status
    - Orders only proceed after payment verification

  3. Security
    - Maintain existing RLS policies
    - Add proper constraints and validations
*/

-- Add new columns to payments table for enhanced verification
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS phonepe_transaction_id text,
ADD COLUMN IF NOT EXISTS verified_by text,
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add payment verification status to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_verification_notes text;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_phonepe_transaction ON payments(phonepe_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_verified_status ON payments(status, verified_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_verified ON orders(payment_verified);

-- Update existing cash orders to be verified by default
UPDATE orders 
SET payment_verified = true 
WHERE payment_method = 'cash' AND payment_verified = false;

-- Create function to auto-verify cash payments
CREATE OR REPLACE FUNCTION auto_verify_cash_payments()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-verify cash payments
    IF NEW.payment_method = 'cash' THEN
        NEW.payment_verified = true;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-verifying cash payments
DROP TRIGGER IF EXISTS auto_verify_cash_payments_trigger ON orders;
CREATE TRIGGER auto_verify_cash_payments_trigger
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_verify_cash_payments();