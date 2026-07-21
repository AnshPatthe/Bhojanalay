import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, Button, Input, Drawer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';
import api from '@/api';

export const InventoryManager = () => {
  const { currentBranch, currentRestaurant } = useAuthStore();
  const currencyCode = currentRestaurant?.currency || 'USD';
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drawer Form states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [form, setForm] = useState({ itemName: '', quantity: '', unit: 'kg', reorderLevel: '10', costPrice: '5', supplierName: '' });

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory');
      setInventory(res.data.data);
    } catch {
      toast.error('Failed to load branch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleAddNewClick = () => {
    setIsEditMode(false);
    setSelectedItemId(null);
    setForm({ itemName: '', quantity: '', unit: 'kg', reorderLevel: '10', costPrice: '5', supplierName: '' });
    setIsDrawerOpen(true);
  };

  const handleEditClick = (item) => {
    setIsEditMode(true);
    setSelectedItemId(item._id);
    setForm({
      itemName: item.itemName || '',
      quantity: item.quantity !== undefined ? item.quantity.toString() : '',
      unit: item.unit || 'kg',
      reorderLevel: item.reorderLevel !== undefined ? item.reorderLevel.toString() : '10',
      costPrice: item.costPrice !== undefined ? item.costPrice.toString() : '5',
      supplierName: item.supplierName || ''
    });
    setIsDrawerOpen(true);
  };

  const handleDeleteClick = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this stock item from inventory?')) return;
    try {
      await api.delete(`/inventory/${itemId}`);
      toast.success('Inventory item deleted successfully!');
      fetchInventoryData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete inventory item');
    }
  };

  const handleSubmit = async () => {
    if (!form.itemName || !form.unit) return;
    try {
      const payload = {
        itemName: form.itemName,
        quantity: parseFloat(form.quantity || '0'),
        unit: form.unit,
        reorderLevel: parseFloat(form.reorderLevel || '10'),
        costPrice: parseFloat(form.costPrice || '0'),
        supplierName: form.supplierName
      };

      if (isEditMode) {
        await api.put(`/inventory/${selectedItemId}`, payload);
        toast.success('Inventory item updated successfully!');
      } else {
        if (!currentBranch) return;
        await api.post('/inventory', payload);
        toast.success('Inventory item registered!');
      }
      setIsDrawerOpen(false);
      setForm({ itemName: '', quantity: '', unit: 'kg', reorderLevel: '10', costPrice: '5', supplierName: '' });
      fetchInventoryData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} inventory item`);
    }
  };

  const handleUpdateStock = async (itemId, currentQty, amount) => {
    const newQty = Math.max(0, Number(currentQty) + amount);
    try {
      await api.put(`/inventory/${itemId}`, { quantity: newQty });
      toast.success('Stock adjusted');
      fetchInventoryData();
    } catch {
      toast.error('Failed to adjust stock quantity');
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading mb-1 text-dark-900 dark:text-white">Inventory</h1>
          <p className="text-xs text-dark-500">Monitor ingredient supply sheets and raw restock thresholds</p>
        </div>
        <Button variant="primary" onClick={handleAddNewClick}>
          Add Stock Item
        </Button>
      </div>

      {/* Stock Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : inventory.length === 0 ? (
        <div className="text-center text-dark-400 py-16">No inventory items found. Add ingredients first.</div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Available Stock</TableHead>
                  <TableHead>Reorder Threshold</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Quick Adjust</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => {
                  const isLow = item.quantity <= item.reorderLevel;
                  return (
                    <TableRow key={item._id}>
                      <TableCell className="font-semibold">{item.itemName}</TableCell>
                      <TableCell>{item.quantity} {item.unit}</TableCell>
                      <TableCell>{item.reorderLevel} {item.unit}</TableCell>
                      <TableCell>{formatCurrency(item.costPrice, currencyCode)}</TableCell>
                      <TableCell>{item.supplierName || 'General'}</TableCell>
                      <TableCell>
                        <Badge variant={isLow ? 'danger' : 'success'}>
                          {isLow ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="secondary" size="sm" onClick={() => handleUpdateStock(item._id, item.quantity, -5)}>
                          -5
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleUpdateStock(item._id, item.quantity, 5)}>
                          +5
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(item)}
                            className="h-8 w-8 p-0 text-dark-500 hover:text-brand-650"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(item._id)}
                            className="h-8 w-8 p-0 text-dark-500 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Inventory Item Creation / Edit Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={isEditMode ? "Edit Stock Ingredient" : "New Stock Ingredient"}>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Item Title</label>
            <Input
              placeholder="e.g., Avocado, Pizza Flour"
              value={form.itemName}
              onChange={e => setForm({ ...form, itemName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">{isEditMode ? 'Stock Qty' : 'Initial Qty'}</label>
              <Input
                type="number"
                placeholder="50"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Stock Unit</label>
              <select
                className="flex h-10 w-full rounded-md border border-dark-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-dark-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-800 dark:bg-dark-950 dark:ring-offset-dark-950 dark:placeholder:text-dark-400 dark:focus-visible:ring-brand-500 transition-colors"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="liter">Liters (L)</option>
                <option value="piece">Piece (pcs)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Reorder Level</label>
              <Input
                type="number"
                placeholder="10"
                value={form.reorderLevel}
                onChange={e => setForm({ ...form, reorderLevel: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Cost Price ($)</label>
              <Input
                type="number"
                placeholder="3.50"
                value={form.costPrice}
                onChange={e => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Supplier Name</label>
            <Input
              placeholder="e.g., Sysco Foods"
              value={form.supplierName}
              onChange={e => setForm({ ...form, supplierName: e.target.value })}
            />
          </div>
          <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={!form.itemName || !form.unit}>
            {isEditMode ? "Update Item" : "Save Item"}
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

export default InventoryManager;
