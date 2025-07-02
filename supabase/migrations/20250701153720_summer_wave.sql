/*
  # Fix Sales Summary View for Completed Orders

  1. Updates
    - Update sales_summary view to include 'completed' status
    - Fix status filtering to match actual order statuses
    - Add proper status mapping for sales reporting

  2. Changes
    - Include orders with status 'completed' in sales calculations
    - Update completed_orders calculation to use correct statuses
    - Ensure all final order statuses are counted in sales
*/

-- Drop existing view
DROP VIEW IF EXISTS sales_summary;

-- Create updated view with correct status filtering
CREATE OR REPLACE VIEW sales_summary AS
SELECT 
  DATE(timestamp) as sale_date,
  COUNT(*) as total_orders,
  SUM(subtotal) as total_subtotal,
  SUM(sgst_amount) as total_sgst,
  SUM(cgst_amount) as total_cgst,
  SUM(total_tax) as total_tax_collected,
  SUM(final_total) as total_sales,
  COUNT(CASE WHEN status IN ('completed', 'delivered', 'done') THEN 1 END) as completed_orders,
  COUNT(CASE WHEN order_type = 'dine-in' THEN 1 END) as dine_in_orders,
  COUNT(CASE WHEN order_type = 'takeaway' THEN 1 END) as takeaway_orders
FROM orders 
WHERE status IN ('completed', 'delivered', 'done', 'ready', 'accepted', 'preparing', 'pending')
GROUP BY DATE(timestamp)
ORDER BY sale_date DESC;

-- Create a function to update sales data when order status changes
CREATE OR REPLACE FUNCTION refresh_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be used to trigger sales summary refresh
    -- Currently just returns the new record, but can be extended
    -- to perform additional sales calculations if needed
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to refresh sales data when orders are updated
DROP TRIGGER IF EXISTS refresh_sales_on_order_update ON orders;
CREATE TRIGGER refresh_sales_on_order_update
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION refresh_sales_summary();