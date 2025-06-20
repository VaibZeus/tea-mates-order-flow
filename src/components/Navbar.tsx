import { Link } from "react-router-dom";

const Navbar = () => (
  <nav className="flex gap-4 p-4 bg-gray-100 border-b">
    <Link to="/">Home</Link>
    <Link to="/menu">Menu</Link>
    <Link to="/cart">Cart</Link>
    <Link to="/orders">Orders</Link>
    <Link to="/admin">Admin</Link>
  </nav>
);

export default Navbar; 