
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: string[];
  image?: string;
  category: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  orderType: 'dine-in' | 'takeaway';
  tableNumber?: string;
  pickupTime?: string;
  paymentMethod: 'online' | 'cash';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
  tokenNumber: string;
  timestamp: Date;
  customerInfo?: {
    name?: string;
    phone?: string;
  };
}

interface OrderState {
  cart: CartItem[];
  orders: Order[];
  currentOrder: Order | null;
}

type OrderAction =
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'PLACE_ORDER'; payload: Omit<Order, 'id' | 'tokenNumber' | 'timestamp'> }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { id: string; status: Order['status'] } }
  | { type: 'SET_CURRENT_ORDER'; payload: Order | null };

const initialState: OrderState = {
  cart: [],
  orders: [],
  currentOrder: null,
};

const generateTokenNumber = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const number = Math.floor(Math.random() * 999) + 100;
  return `${letter}${number}`;
};

const orderReducer = (state: OrderState, action: OrderAction): OrderState => {
  switch (action.type) {
    case 'ADD_TO_CART':
      const existingItem = state.cart.find(item => 
        item.id === action.payload.id && 
        JSON.stringify(item.customizations) === JSON.stringify(action.payload.customizations)
      );
      
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.id === existingItem.id && 
            JSON.stringify(item.customizations) === JSON.stringify(existingItem.customizations)
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
        };
      }
      
      return {
        ...state,
        cart: [...state.cart, action.payload],
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item.id !== action.payload),
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ).filter(item => item.quantity > 0),
      };

    case 'CLEAR_CART':
      return {
        ...state,
        cart: [],
      };

    case 'PLACE_ORDER':
      const newOrder: Order = {
        ...action.payload,
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tokenNumber: generateTokenNumber(),
        timestamp: new Date(),
      };
      
      return {
        ...state,
        orders: [...state.orders, newOrder],
        currentOrder: newOrder,
        cart: [],
      };

    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.id
            ? { ...order, status: action.payload.status }
            : order
        ),
      };

    case 'SET_CURRENT_ORDER':
      return {
        ...state,
        currentOrder: action.payload,
      };

    default:
      return state;
  }
};

const OrderContext = createContext<{
  state: OrderState;
  dispatch: React.Dispatch<OrderAction>;
} | null>(null);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  return (
    <OrderContext.Provider value={{ state, dispatch }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
