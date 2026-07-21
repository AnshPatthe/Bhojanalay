import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Image, Upload, Trash2, Edit3, Utensils } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Drawer, Spinner, Switch } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';
import api from '@/api';

export const MenuManager = () => {
  const { currentRestaurant } = useAuthStore();
  const currencyCode = currentRestaurant?.currency || 'USD';
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Drawer Form states
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', categoryId: '', isAvailable: true, image: '' });

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      const [catsRes, itemsRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items')
      ]);
      setCategories(catsRes.data.data);
      setMenuItems(itemsRes.data.data);

      if (catsRes.data.data.length > 0 && itemForm.categoryId === '') {
        setItemForm(prev => ({ ...prev, categoryId: catsRes.data.data[0]._id }));
      }
    } catch (err) {
      toast.error('Failed to load menu registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  const handleAddCategory = async () => {
    if (!categoryForm.name) return;
    try {
      await api.post('/menu/categories', categoryForm);
      toast.success('Category created!');
      setIsCategoryDrawerOpen(false);
      setCategoryForm({ name: '', description: '' });
      fetchMenuData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleAddDishClick = () => {
    setIsEditMode(false);
    setSelectedItemId(null);
    setItemForm({ name: '', description: '', price: '', categoryId: categories[0]?._id || '', isAvailable: true, image: '' });
    setIsItemDrawerOpen(true);
  };

  const handleEditClick = (item) => {
    setIsEditMode(true);
    setSelectedItemId(item._id);
    setItemForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price?.toString() || '',
      categoryId: item.categoryId?._id || item.categoryId || '',
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
      image: item.image || ''
    });
    setIsItemDrawerOpen(true);
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu dish?')) return;
    try {
      await api.delete(`/menu/items/${itemId}`);
      toast.success('Menu dish deleted!');
      fetchMenuData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete dish');
    }
  };

  const handleImageFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Limit file size to 3MB for base64 safety
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image size should be less than 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setItemForm(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddItem = async () => {
    if (!itemForm.name || !itemForm.price || !itemForm.categoryId) return;
    try {
      const payload = {
        ...itemForm,
        price: parseFloat(itemForm.price)
      };
      
      if (isEditMode) {
        await api.put(`/menu/items/${selectedItemId}`, payload);
        toast.success('Menu dish updated!');
      } else {
        await api.post('/menu/items', payload);
        toast.success('Menu dish created!');
      }
      setIsItemDrawerOpen(false);
      setItemForm({ name: '', description: '', price: '', categoryId: categories[0]?._id || '', isAvailable: true, image: '' });
      fetchMenuData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} menu dish`);
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await api.put(`/menu/items/${item._id}`, {
        isAvailable: !item.isAvailable
      });
      toast.success('Dish status modified');
      fetchMenuData();
    } catch (err) {
      toast.error('Failed to update dish status');
    }
  };

  const filteredItems = menuItems.filter(item => 
    selectedCategory === 'all' ? true : (item.categoryId?._id || item.categoryId) === selectedCategory
  );

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading mb-1 text-dark-900 dark:text-white">Menu Config</h1>
          <p className="text-xs text-dark-500">Configure dish catalog, active categories, images, and price matrices</p>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <Button variant="secondary" onClick={() => setIsCategoryDrawerOpen(true)}>
            Add Category
          </Button>
          <Button variant="primary" onClick={handleAddDishClick} disabled={categories.length === 0}>
            Add Dish
          </Button>
        </div>
      </div>

      {/* Category Filter list */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <Button
          variant={selectedCategory === 'all' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Dishes
        </Button>
        {categories.map(cat => (
          <Button
            key={cat._id}
            variant={selectedCategory === cat._id ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedCategory(cat._id)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {/* Menu Items Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center text-dark-400 py-16">No menu dishes found. Create one now.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <Card key={item._id} className="flex flex-col justify-between overflow-hidden">
              <div>
                {item.image ? (
                  <div className="h-44 w-full overflow-hidden bg-dark-100 dark:bg-dark-800 relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-24 w-full bg-gradient-to-r from-brand-500/10 to-brand-600/10 dark:from-dark-800 dark:to-dark-850 flex items-center justify-center text-dark-400">
                    <Utensils className="h-8 w-8 opacity-40" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <p className="text-xs text-dark-400 mt-1 line-clamp-2">{item.description || 'No description added'}</p>
                    </div>
                    <span className="font-bold text-lg text-brand-650 ml-2">{formatCurrency(item.price, currencyCode)}</span>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="pt-2 flex justify-between items-center border-t border-dark-100 dark:border-dark-800 bg-dark-50/20 dark:bg-dark-900/20">
                <span className="text-xs text-dark-500 font-medium">Availability</span>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-dark-500 hover:text-brand-650" onClick={() => handleEditClick(item)}>
                    <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-dark-400 hover:text-rose-600" onClick={() => handleDeleteItem(item._id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Switch checked={item.isAvailable} onChange={() => toggleAvailability(item)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Creation Drawer */}
      <Drawer isOpen={isCategoryDrawerOpen} onClose={() => setIsCategoryDrawerOpen(false)} title="New Category">
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Category Title</label>
            <Input
              placeholder="e.g., Appetizers, Main Course"
              value={categoryForm.name}
              onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Description</label>
            <Input
              placeholder="e.g., Soups, salads, and starters"
              value={categoryForm.description}
              onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
          </div>
          <Button variant="primary" className="w-full" onClick={handleAddCategory} disabled={!categoryForm.name}>
            Save Category
          </Button>
        </div>
      </Drawer>

      {/* Dish Creation/Edit Drawer */}
      <Drawer isOpen={isItemDrawerOpen} onClose={() => setIsItemDrawerOpen(false)} title={isEditMode ? "Edit Dish Details" : "Add New Dish"}>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Dish Name</label>
            <Input
              placeholder="e.g., Truffle Tagliatelle"
              value={itemForm.name}
              onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Category Scope</label>
              <Select value={itemForm.categoryId} onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })}>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Price ($)</label>
              <Input
                type="number"
                placeholder="24.99"
                value={itemForm.price}
                onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Description</label>
            <Input
              placeholder="e.g., Tagliatelle tossed in black winter truffle cream sauce"
              value={itemForm.description}
              onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
            />
          </div>

          {/* Dish Image Option */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block">Dish Image</label>
            
            {/* Image Preview if available */}
            {itemForm.image && (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-dark-200 dark:border-dark-700 mb-3 bg-dark-100 dark:bg-dark-800">
                <img src={itemForm.image} alt="Dish Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setItemForm(prev => ({ ...prev, image: '' }))}
                  className="absolute top-2 right-2 bg-dark-900/80 hover:bg-rose-600 text-white rounded-full p-1.5 transition-colors shadow-md"
                  title="Remove Image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input URL */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Image className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <Input
                  className="pl-9 text-xs"
                  placeholder="Paste Image URL (https://...)"
                  value={itemForm.image}
                  onChange={e => setItemForm({ ...itemForm, image: e.target.value })}
                />
              </div>

              {/* Upload file button */}
              <label className="cursor-pointer flex items-center justify-center px-3 py-2 border border-dark-200 dark:border-dark-700 rounded-md bg-dark-50 dark:bg-dark-850 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors text-xs font-medium text-dark-700 dark:text-dark-300">
                <Upload className="w-4 h-4 mr-1 text-brand-650" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-2xs text-dark-450">You can paste an image URL or upload an image file from your device.</p>
          </div>

          <Button variant="primary" className="w-full" onClick={handleAddItem} disabled={!itemForm.name || !itemForm.price}>
            {isEditMode ? "Save Changes" : "Add Dish to Menu"}
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

export default MenuManager;
