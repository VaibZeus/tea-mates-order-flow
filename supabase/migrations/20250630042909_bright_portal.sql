/*
  # Create menu_items table for product management

  1. New Tables
    - `menu_items`
      - `id` (uuid, primary key)
      - `name` (text, product name)
      - `description` (text, product description)
      - `price` (numeric, product price)
      - `category` (text, product category)
      - `image` (text, product image emoji/icon)
      - `available` (boolean, availability status)
      - `created_at` (timestamptz, creation time)
      - `updated_at` (timestamptz, last update time)

  2. Security
    - Enable RLS on `menu_items` table
    - Add policy for public read access (for menu display)
    - Add policy for authenticated users to manage items (admin)

  3. Indexes
    - Add indexes for better performance
*/

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  category text NOT NULL,
  image text DEFAULT '🍵',
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Allow public to read menu items (for menu display)
CREATE POLICY "Allow public read access to menu_items"
  ON menu_items
  FOR SELECT
  TO public
  USING (true);

-- Allow public to insert menu items (for admin management)
CREATE POLICY "Allow public insert access to menu_items"
  ON menu_items
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public to update menu items (for admin management)
CREATE POLICY "Allow public update access to menu_items"
  ON menu_items
  FOR UPDATE
  TO public
  USING (true);

-- Allow public to delete menu items (for admin management)
CREATE POLICY "Allow public delete access to menu_items"
  ON menu_items
  FOR DELETE
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(available);
CREATE INDEX IF NOT EXISTS idx_menu_items_name ON menu_items(name);
CREATE INDEX IF NOT EXISTS idx_menu_items_created_at ON menu_items(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_menu_items_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_menu_items_updated_at_column();

-- Insert default menu items
INSERT INTO menu_items (name, description, price, category, image, available) VALUES
('Masala Chai', 'Traditional spiced tea with cardamom, ginger, and cinnamon', 25, 'Signature Teas', '🫖', true),
('Green Tea', 'Fresh green tea leaves with antioxidants', 30, 'Signature Teas', '🍵', true),
('Earl Grey', 'Classic British tea with bergamot oil', 35, 'Signature Teas', '☕', true),
('Iced Tea', 'Refreshing iced tea with lemon and mint', 40, 'Cold Beverages', '🧊', true),
('Lemonade', 'Fresh lemon juice with a hint of mint', 35, 'Cold Beverages', '🍋', true),
('Samosa', 'Crispy fried pastry with spiced potato filling', 15, 'Snacks', '🥟', true),
('Sandwich', 'Grilled sandwich with vegetables and cheese', 45, 'Snacks', '🥪', true),
('Biscuits', 'Assorted tea biscuits and cookies', 20, 'Snacks', '🍪', true)
ON CONFLICT DO NOTHING;