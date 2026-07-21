import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Drawer, Spinner } from '@/components/ui';
import { Plus, Trash2, Edit2, Users, Layers, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '@/api';
import { TableDetails } from './TableDetails';

export const TableManager = ({ socket }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('live'); // 'live' or 'config'

  // Drawer Form states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

  // Table details states for live view
  const [selectedTableForDetails, setSelectedTableForDetails] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [form, setForm] = useState({
    tableNumber: '',
    capacity: 4,
    floor: 'Ground Floor',
    customFloor: ''
  });

  const [selectedFloorTab, setSelectedFloorTab] = useState('All');

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tables');
      setTables(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load table configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleTablesUpdated = () => {
      fetchTables();
    };

    socket.on('tables_updated', handleTablesUpdated);

    return () => {
      socket.off('tables_updated', handleTablesUpdated);
    };
  }, [socket]);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setSelectedTable(null);
    setForm({
      tableNumber: '',
      capacity: 4,
      floor: 'Ground Floor',
      customFloor: ''
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (table) => {
    setIsEditMode(true);
    setSelectedTable(table);
    const standardFloors = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', 'Terrace', 'Rooftop', 'Outdoor'];
    const isStandard = standardFloors.includes(table.floor);
    
    setForm({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      floor: isStandard ? table.floor : 'Custom',
      customFloor: isStandard ? '' : table.floor
    });
    setIsOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const finalFloor = form.floor === 'Custom' ? form.customFloor.trim() : form.floor;
    
    if (!form.tableNumber.trim()) {
      toast.error('Table number is required');
      return;
    }
    if (!finalFloor) {
      toast.error('Floor name is required');
      return;
    }

    try {
      if (isEditMode) {
        await api.patch(`/tables/${selectedTable._id}`, {
          tableNumber: form.tableNumber.trim(),
          capacity: parseInt(form.capacity),
          floor: finalFloor
        });
        toast.success('Table updated successfully');
      } else {
        await api.post('/tables', {
          tableNumber: form.tableNumber.trim(),
          capacity: parseInt(form.capacity),
          floor: finalFloor
        });
        toast.success('Table created successfully');
      }
      setIsOpen(false);
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save table');
    }
  };

  const handleDelete = async (tableId) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;
    try {
      await api.delete(`/tables/${tableId}`);
      toast.success('Table deleted successfully');
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete table');
    }
  };

  // Group and sort tables
  const groupedTables = tables.reduce((acc, table) => {
    const floor = table.floor || 'Ground Floor';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(table);
    return acc;
  }, {});

  // Sort tables inside each floor naturally (e.g. Table 1, Table 2, Table 10)
  Object.keys(groupedTables).forEach((floor) => {
    groupedTables[floor].sort((a, b) => 
      a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true, sensitivity: 'base' })
    );
  });

  const uniqueFloors = Object.keys(groupedTables).sort();
  const floorTabs = ['All', ...uniqueFloors];

  // Stats
  const totalTables = tables.length;
  const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
  const totalFloors = uniqueFloors.length;
  const occupiedCount = tables.filter(t => t.status === 'Occupied').length;
  const availableCount = tables.filter(t => t.status === 'Available' || t.status === 'Free').length;

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Available':
      case 'Free':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Occupied':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'Reserved':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Cleaning':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'Billing':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-dark-500/10 text-dark-600 dark:text-dark-400 border-dark-500/20';
    }
  };

  const getCardStatusBorder = (table) => {
    if (viewMode !== 'live') return 'border-dark-200 dark:border-dark-800';
    switch (table.status) {
      case 'Available':
        return 'border-emerald-500/30 hover:border-emerald-500 dark:border-emerald-500/20 dark:hover:border-emerald-400';
      case 'Occupied':
        return 'border-rose-500/30 hover:border-rose-500 dark:border-rose-500/20 dark:hover:border-rose-400';
      case 'Billing':
        return 'border-purple-500/30 hover:border-purple-500 dark:border-purple-500/20 dark:hover:border-purple-400';
      default:
        return 'border-dark-200 dark:border-dark-800';
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading mb-1 text-dark-900 dark:text-white">Table Workspace</h1>
          <p className="text-sm text-dark-500 font-medium">Coordinate table bookings, orders, checkout billing, and arrange room layouts.</p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'config' && (
            <Button variant="primary" onClick={handleOpenAdd} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Table
            </Button>
          )}
          <Button variant="secondary" onClick={fetchTables} size="sm" className="h-10 px-3">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mode Selector and Stats Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Toggle Mode */}
        <div className="flex bg-dark-100 dark:bg-dark-800/80 p-1 rounded-xl border border-dark-200 dark:border-dark-750">
          <button
            onClick={() => setViewMode('live')}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              viewMode === 'live'
                ? 'bg-white dark:bg-dark-900 text-dark-900 dark:text-white shadow-sm'
                : 'text-dark-500 hover:text-dark-750 dark:hover:text-dark-350'
            }`}
          >
            Live Monitor
          </button>
          <button
            onClick={() => setViewMode('config')}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              viewMode === 'config'
                ? 'bg-white dark:bg-dark-900 text-dark-900 dark:text-white shadow-sm'
                : 'text-dark-500 hover:text-dark-750 dark:hover:text-dark-350'
            }`}
          >
            Configure Seating
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-dark-850 border border-dark-200 dark:border-dark-800 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 text-brand-650 dark:text-brand-400 rounded-xl">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Total Floors</p>
              <p className="text-2xl font-bold text-dark-900 dark:text-white mt-0.5">{totalFloors}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-dark-850 border border-dark-200 dark:border-dark-800 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Total Seats</p>
              <p className="text-2xl font-bold text-dark-900 dark:text-white mt-0.5">{totalCapacity}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-dark-850 border border-dark-200 dark:border-dark-800 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Available / Free</p>
              <p className="text-2xl font-bold text-dark-900 dark:text-white mt-0.5">{availableCount} / {totalTables}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-dark-850 border border-dark-200 dark:border-dark-800 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Occupied Tables</p>
              <p className="text-2xl font-bold text-dark-900 dark:text-white mt-0.5">{occupiedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floor Filter Tabs */}
      {uniqueFloors.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-nowrap border-b border-dark-200 dark:border-dark-800">
          {floorTabs.map((floor) => {
            const isActive = selectedFloorTab === floor;
            const count = floor === 'All' ? tables.length : groupedTables[floor]?.length || 0;
            return (
              <button
                key={floor}
                onClick={() => setSelectedFloorTab(floor)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-650/15'
                    : 'bg-white dark:bg-dark-850 border border-dark-200 dark:border-dark-800 hover:bg-dark-50 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-300'
                }`}
              >
                <span>{floor}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-brand-700/60 text-white' : 'bg-dark-100 dark:bg-dark-800 text-dark-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tables Floor-wise Workspace Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Spinner size="lg" />
        </div>
      ) : tables.length === 0 ? (
        <Card className="border border-dashed border-dark-300 dark:border-dark-700 py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center gap-3">
            <Layers className="h-10 w-10 text-dark-400 animate-pulse" />
            <h3 className="text-lg font-semibold text-dark-700 dark:text-dark-300">No Tables Configured</h3>
            <p className="text-sm text-dark-500 max-w-sm">Setup your first table layout by specifying a floor and capacity layout.</p>
            <Button variant="primary" onClick={handleOpenAdd} className="mt-2">
              Create First Table
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {uniqueFloors
            .filter((floor) => selectedFloorTab === 'All' || selectedFloorTab === floor)
            .map((floor) => (
              <div key={floor} className="space-y-4">
                {/* Floor Title Row */}
                <div className="flex items-center gap-2 border-b border-dark-100 dark:border-dark-850 pb-2">
                  <Layers className="h-5 w-5 text-brand-500" />
                  <h2 className="text-xl font-bold text-dark-900 dark:text-white font-heading">{floor}</h2>
                  <span className="text-xs bg-brand-50 dark:bg-brand-950/40 text-brand-650 dark:text-brand-400 px-2 py-0.5 rounded-full font-semibold">
                    {groupedTables[floor]?.length || 0} Tables
                  </span>
                </div>

                {/* Table Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {groupedTables[floor]?.map((table) => {
                    const normalizedStatus = table.status === 'Free' ? 'Available' : table.status;
                    return (
                      <Card
                        key={table._id}
                        onClick={() => {
                          if (viewMode === 'live') {
                            setSelectedTableForDetails(table);
                            setIsDetailsOpen(true);
                          }
                        }}
                        className={`bg-white dark:bg-dark-850 border shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between ${
                          viewMode === 'live' ? 'cursor-pointer' : ''
                        } ${getCardStatusBorder(table)}`}
                      >
                        <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-center flex-grow">
                          {/* Table Number */}
                          <div className="text-2xl font-extrabold text-dark-900 dark:text-white font-heading">
                            {table.tableNumber}
                          </div>
                          
                          {/* Seats Capacity */}
                          <div className="flex items-center gap-1.5 text-xs text-dark-500 font-medium">
                            <Users className="h-3.5 w-3.5" />
                            <span>{table.capacity} Seats</span>
                          </div>

                          {/* Status Badge */}
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadgeColor(normalizedStatus)}`}>
                            {normalizedStatus}
                          </span>
                        </CardContent>

                        {/* Hover Action Buttons (Config mode only) */}
                        {viewMode === 'config' && (
                          <div className="border-t border-dark-100 dark:border-dark-800 p-2 flex items-center justify-between gap-1.5 bg-dark-50/50 dark:bg-dark-900/30">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(table);
                              }}
                              className="flex-1 h-8 text-xs text-dark-600 hover:text-brand-600 dark:text-dark-400 dark:hover:text-brand-400 gap-1 rounded-md"
                            >
                              <Edit2 className="h-3 w-3" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(table._id);
                              }}
                              className="h-8 w-8 p-0 text-dark-400 hover:text-rose-600 dark:text-dark-500 dark:hover:text-rose-400 rounded-md"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add / Edit Drawer */}
      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={isEditMode ? 'Modify Table Settings' : 'Add New Table'}
      >
        <form onSubmit={handleSave} className="space-y-5 text-left h-full flex flex-col justify-between">
          <div className="space-y-4">
            {/* Table Number */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-dark-700 dark:text-dark-300">Table Name / Number</label>
              <Input
                placeholder="e.g. Table 1, T15, VIP"
                value={form.tableNumber}
                onChange={(e) => setForm(prev => ({ ...prev, tableNumber: e.target.value }))}
                required
              />
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-dark-700 dark:text-dark-300">Seating Capacity</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={form.capacity}
                onChange={(e) => setForm(prev => ({ ...prev, capacity: e.target.value }))}
                required
              />
            </div>

            {/* Floor Setup */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-dark-700 dark:text-dark-300">Floor Assignment</label>
              <Select
                value={form.floor}
                onChange={(e) => setForm(prev => ({ ...prev, floor: e.target.value }))}
              >
                <option value="Ground Floor">Ground Floor</option>
                <option value="1st Floor">1st Floor</option>
                <option value="2nd Floor">2nd Floor</option>
                <option value="3rd Floor">3rd Floor</option>
                <option value="Terrace">Terrace</option>
                <option value="Rooftop">Rooftop</option>
                <option value="Outdoor">Outdoor</option>
                <option value="Custom">Custom Floor Name...</option>
              </Select>
            </div>

            {/* Custom Floor Input */}
            {form.floor === 'Custom' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-sm font-semibold text-dark-700 dark:text-dark-300">Custom Floor Name</label>
                <Input
                  placeholder="e.g. Poolside, Garden, Balcony"
                  value={form.customFloor}
                  onChange={(e) => setForm(prev => ({ ...prev, customFloor: e.target.value }))}
                  required
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="border-t border-dark-100 dark:border-dark-800 pt-4 mt-8 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditMode ? 'Update Table' : 'Create Table'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Interactive Table Details Drawer */}
      <TableDetails
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTableForDetails(null);
          fetchTables();
        }}
        table={selectedTableForDetails}
        socket={socket}
      />
    </div>
  );
};

export default TableManager;
