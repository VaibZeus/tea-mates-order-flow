import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Plus, Minus, Coffee, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrder, CartItem } from '@/context/OrderContext';
import { toast } from '@/hooks/use-toast';

const menuData = [
  {
    category: 'Signature Teas',
    items: [
      {
        id: 'tea_1',
        name: 'Masala Chai',
        price: 25,
        description: 'Traditional spiced tea with cardamom, ginger, and cinnamon',
        image: '🫖',
        popular: true,
      },
      {
        id: 'tea_2',
        name: 'Green Tea',
        price: 30,
        description: 'Fresh green tea leaves with antioxidants',
        image: '🍵',
      },
      {
        id: 'tea_3',
        name: 'Earl Grey',
        price: 35,
        description: 'Classic British tea with bergamot oil',
        image: '☕',
      },
    ],
  },
  {
    category: 'Cold Beverages',
    items: [
      {
        id: 'cold_1',
        name: 'Iced Tea',
        price: 40,
        description: 'Refreshing iced tea with lemon and mint',
        image: '🧊',
        popular: true,
      },
      {
        id: 'cold_2',
        name: 'Lemonade',
        price: 35,
        description: 'Fresh lemon juice with a hint of mint',
        image: '🍋',
      },
    ],
  },
  {
    category: 'Snacks',
    items: [
      {
        id: 'snack_1',
        name: 'Samosa',
        price: 15,
        description: 'Crispy fried pastry with spiced potato filling',
        image: '🥟',
        popular: true,
      },
      {
        id: 'snack_2',
        name: 'Sandwich',
        price: 45,
        description: 'Grilled sandwich with vegetables and cheese',
        image: '🥪',
      },
      {
        id: 'snack_3',
        name: 'Biscuits',
        price: 20,
        description: 'Assorted tea biscuits and cookies',
        image: '🍪',
      },
    ],
  },
];

const MenuPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useOrder();
  const [selectedCategory, setSelectedCategory] = useState('Signature Teas');

  const urlParams = new URLSearchParams(location.search);
  const orderType = urlParams.get('type') as 'dine-in' | 'takeaway';
  const tableNumber = urlParams.get('table');

  // New state for landing selection
  const [showLanding, setShowLanding] = useState<'none' | 'dine-in'>('none');
  const [tableInput, setTableInput] = useState('');

  // If no orderType, show landing choice
  if (!orderType) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold mb-6">Welcome to Tea Mates</h1>
        <div className="flex flex-col space-y-4 w-full max-w-xs">
          <button
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg"
            onClick={() => setShowLanding('dine-in')}
          >
            Dine-In (Scan QR or Enter Table)
          </button>
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg"
            onClick={() => {
              navigate(`?type=takeaway`);
            }}
          >
            Takeaway / Pickup
          </button>
        </div>
        {showLanding === 'dine-in' && (
          <div className="mt-8 w-full max-w-xs bg-white p-6 rounded-lg shadow">
            <label className="block mb-2 font-medium">Enter Table Number</label>
            <input
              type="number"
              min="1"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={tableInput}
              onChange={e => setTableInput(e.target.value)}
              placeholder="e.g. 5"
            />
            <button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded"
              disabled={!tableInput}
              onClick={() => {
                if (tableInput) {
                  navigate(`?type=dine-in&table=${tableInput}`);
                }
              }}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    );
  }

  // If dine-in but no table param, prompt for table number
  if (orderType === 'dine-in' && !tableNumber) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-xl font-bold mb-4">Enter Your Table Number</h1>
        <input
          type="number"
          min="1"
          className="w-full max-w-xs border border-gray-300 rounded px-3 py-2 mb-4"
          value={tableInput}
          onChange={e => setTableInput(e.target.value)}
          placeholder="e.g. 5"
        />
        <button
          className="w-full max-w-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded"
          disabled={!tableInput}
          onClick={() => {
            if (tableInput) {
              navigate(`?type=dine-in&table=${tableInput}`);
            }
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  const cartItemsCount = state.cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const addToCart = (item: any) => {
    const cartItem: CartItem = {
      id: `${item.id}_${Date.now()}`,
      name: item.name,
      price: item.price,
      quantity: 1,
      category: selectedCategory,
      image: item.image,
    };

    dispatch({ type: 'ADD_TO_CART', payload: cartItem });
    toast({
      title: 'Added to cart',
      description: `${item.name} has been added to your cart`,
    });
  };

  const categories = menuData.map(category => category.category);
  const currentCategoryItems = menuData.find(cat => cat.category === selectedCategory)?.items || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Our Menu</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="capitalize">{orderType?.replace('-', ' ')}</span>
                  {tableNumber && (
                    <>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>Table #{tableNumber}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate('/cart')}
              className="relative bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Cart
              {cartItemsCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1">
                  {cartItemsCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Category Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-4 mb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex-shrink-0 px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentCategoryItems.map((item) => (
            <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-4xl relative">
                  {item.image}
                  {item.popular && (
                    <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                      Popular
                    </Badge>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <span className="text-lg font-bold text-green-600">₹{item.price}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                  <Button
                    onClick={() => addToCart(item)}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Floating Cart Summary */}
        {cartItemsCount > 0 && (
          <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto">
            <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{cartItemsCount} items</p>
                    <p className="text-sm opacity-90">₹{cartTotal}</p>
                  </div>
                  <Button
                    onClick={() => navigate('/cart')}
                    variant="secondary"
                    className="bg-white text-orange-600 hover:bg-gray-100"
                  >
                    View Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuPage;
