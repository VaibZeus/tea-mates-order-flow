import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Package, Search, Filter, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
  created_at: string;
  updated_at: string;
}

const categories = [
  'Signature Teas',
  'Cold Beverages',
  'Snacks',
  'Hot Beverages',
  'Desserts',
  'Special Items'
];

const emojiOptions = [
  '🫖', '🍵', '☕', '🧊', '🍋', '🥟', '🥪', '🍪', '🧁', '🍰', 
  '🥤', '🥛', '🍯', '🫘', '🌿', '🍃', '🔥', '❄️', '🌶️', '🧈'
];

const ProductManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '🍵',
    available: true
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching menu items:', error);
        throw error;
      }
      
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch menu items. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Item name is required',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.category) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category',
        variant: 'destructive',
      });
      return false;
    }

    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price < 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid price (must be 0 or greater)',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const price = parseFloat(formData.price);
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: price,
        category: formData.category,
        image: formData.image,
        available: formData.available
      };

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) {
          console.error('Error updating menu item:', error);
          throw error;
        }

        toast({
          title: 'Success',
          description: 'Menu item updated successfully',
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('menu_items')
          .insert([itemData]);

        if (error) {
          console.error('Error creating menu item:', error);
          throw error;
        }

        toast({
          title: 'Success',
          description: 'Menu item added successfully',
        });
      }

      // Reset form and refresh data
      resetForm();
      fetchMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save menu item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      image: item.image,
      available: item.available
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting menu item:', error);
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Menu item deleted successfully',
      });

      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete menu item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleAvailability = async (id: string, available: boolean, name: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ available })
        .eq('id', id);

      if (error) {
        console.error('Error updating availability:', error);
        throw error;
      }

      toast({
        title: 'Success',
        description: `"${name}" ${available ? 'enabled' : 'disabled'} successfully`,
      });

      fetchMenuItems();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item availability. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image: '🍵',
      available: true
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
          <p className="text-gray-600">Manage your menu items and pricing</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700"
          disabled={showAddForm}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                disabled={submitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter item name"
                    required
                    disabled={submitting}
                    className={!formData.name.trim() ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Icon/Emoji</Label>
                  <Select 
                    value={formData.image} 
                    onValueChange={(value) => setFormData({ ...formData, image: value })}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {emojiOptions.map(emoji => (
                        <SelectItem key={emoji} value={emoji}>
                          <span className="text-lg">{emoji}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter item description (optional)"
                  rows={3}
                  disabled={submitting}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={formData.available}
                  onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                  disabled={submitting}
                />
                <Label htmlFor="available">Available for ordering</Label>
              </div>

              <div className="flex space-x-3">
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingItem ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingItem ? 'Update Item' : 'Add Item'}
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  disabled={submitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Menu Items List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {searchTerm || categoryFilter !== 'all' 
              ? 'No menu items match your search criteria.' 
              : 'No menu items found. Add your first item to get started.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className={`${!item.available ? 'opacity-60 bg-gray-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.image}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(item.price)}
                    </p>
                    <Badge className={item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={item.available}
                      onCheckedChange={(checked) => toggleAvailability(item.id, checked, item.name)}
                      size="sm"
                    />
                    <span className="text-xs text-gray-500">Available</span>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      disabled={showAddForm}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id, item.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mt-2">
                  Created: {new Date(item.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductManagement;