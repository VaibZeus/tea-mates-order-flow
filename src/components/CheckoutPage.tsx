import React, { useState } from "react";
import { useOrder } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabaseClient";
import { generateTokenNumber } from "../lib/utils";

const CheckoutPage = () => {
  const { state, dispatch } = useOrder();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!name.trim() || !phone.trim()) {
      setError("Please enter your name and phone number.");
      return;
    }
    setLoading(true);
    setError("");
    const tokenNumber = generateTokenNumber();
    // Insert order into Supabase
    const { data, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          items: state.cart,
          total,
          status: 'pending',
          tokenNumber,
          timestamp: new Date().toISOString(),
          customerInfo: { name, phone },
        },
      ]);
    setLoading(false);
    if (orderError) {
      setError("Failed to place order. Please try again.");
      return;
    }
    dispatch({ type: "CLEAR_CART" });
    setOrderPlaced(true);
    setTimeout(() => navigate("/orders"), 2000);
  };

  if (orderPlaced) {
    return <div className="p-8 text-center">Order placed! Redirecting to orders...</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-4">Checkout</h2>
      {state.cart.length === 0 ? (
        <div>Your cart is empty.</div>
      ) : (
        <>
          <ul className="mb-4">
            {state.cart.map((item, idx) => (
              <li key={idx} className="flex justify-between py-2 border-b">
                <span>{item.name} x{item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="font-semibold mb-4">Total: ${total.toFixed(2)}</div>
          <div className="mb-4">
            <label className="block mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <Button onClick={handlePlaceOrder} className="w-full" disabled={loading}>
            {loading ? "Placing Order..." : "Place Order"}
          </Button>
        </>
      )}
    </div>
  );
};

export default CheckoutPage; 