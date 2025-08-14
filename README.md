# Tea Mates Order Flow

A modern tea shop order management system built with React (Vite), Supabase, and a beautiful UI. This app allows users to browse the menu, add items to their cart, place orders, and track their order status in real time. Admins can manage and update orders via a secure login.

---

## Features
- User-friendly menu and cart system
- Order checkout with name and phone number
- Unique token generated for each order
- Real-time order status updates (pending, accepted, preparing, done)
- Users can view only their own orders (by phone or token)
- Admin panel for order management and status updates
- Supabase as backend (database, real-time, and authentication)

---

## Tech Stack
- [React (Vite)](https://vitejs.dev/)
- [Supabase](https://supabase.com/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

## Getting Started

### 1. Clone the Repository
```sh
git clone https://github.com/yourusername/tea-mates-order-flow.git
cd tea-mates-order-flow
```

### 2. Install Dependencies
```sh
npm install
```

### 3. Set Up Supabase
- Go to [supabase.com](https://supabase.com/) and create a new project.
- In the Supabase dashboard, go to **Table Editor** and create the following table:

#### `orders` Table (SQL)
```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null, -- array of cart items
  total numeric not null,
  status text not null default 'pending', -- e.g. pending, accepted, preparing, done, delivered
  tokenNumber text not null, -- unique order token
  timestamp timestamptz not null default now(),
  customerInfo jsonb, -- { name: string, phone: string }
  orderType text, -- 'dine-in' or 'takeaway'
  tableNumber text, -- optional
  pickupTime text, -- optional
  paymentMethod text -- 'online' or 'cash'
);
```

- (Optional) Add `menu_items` and `order_items` tables if you want to manage menu and order items separately.

### 4. Configure Environment Variables
Create a `.env` file in the project root:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Get these values from your Supabase project dashboard under **Project Settings → API**.

### 5. Start the App
```sh
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Usage

### User Flow
- Browse the menu and add items to your cart.
- Go to the cart and proceed to checkout.
- Enter your name and phone number to place an order.
- Receive a unique token for your order.
- Track your order status in real time by searching with your phone or token.

### Admin Flow
- Go to `/admin` and log in (default: `admin` / `admin123`).
- View all orders and update their status (accepted, preparing, done).
- Admin login is valid for 24 hours.

---

## Project Structure
```
src/
  components/         # React components (pages, UI, admin, etc.)
  context/            # React context for order state
  lib/                # Supabase client, utilities
  pages/              # Top-level pages (Index, NotFound)
  App.tsx             # Main app component and routes
```

---

## Customization
- Update the menu, branding, and UI as needed.
- Extend the database schema for more features (menu management, analytics, etc.).

