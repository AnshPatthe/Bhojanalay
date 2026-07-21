import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import waiterApi from '../api/waiterApi';
import { Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TableDetails } from '@/features/tables/components/TableDetails';

const STATUS_COLORS = {
  Available: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
  Occupied: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20',
  Reserved: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20',
  Cleaning: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20',
  Billing: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-500/20',
};

export const TableManagement = ({ socket }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [selectedTableForDetails, setSelectedTableForDetails] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const navigate = useNavigate();

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

  const fetchTables = async () => {
    try {
      const res = await waiterApi.get('/waiter/tables');
      setTables(res.data.data);
    } catch (error) {
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-dark-100 dark:bg-dark-800 rounded-xl"></div>;
  }

  // Get unique sorted floors
  const floors = ['All', ...new Set(tables.map(t => t.floor || 'Ground Floor'))].sort();

  const filteredTables = selectedFloor === 'All'
    ? tables
    : tables.filter(t => (t.floor || 'Ground Floor') === selectedFloor);

  return (
    <div className="space-y-6 text-left">
      {/* Floor Filter Navigation */}
      {floors.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-nowrap border-b border-dark-100 dark:border-dark-800">
          {floors.map((floor) => {
            const isActive = selectedFloor === floor;
            const count = floor === 'All' ? tables.length : tables.filter(t => (t.floor || 'Ground Floor') === floor).length;
            return (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-dark-50 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-750'
                }`}
              >
                <span>{floor}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-brand-700/60 text-white' : 'bg-dark-100 dark:bg-dark-800 text-dark-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {filteredTables.length === 0 ? (
        <div className="text-center py-12 text-dark-400">No tables on this floor.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredTables.map((table) => {
            // Handle legacy lowercase values from database
            let normalizedStatus = table.status ? table.status.charAt(0).toUpperCase() + table.status.slice(1).toLowerCase() : 'Available';
            if (normalizedStatus === 'Free') normalizedStatus = 'Available';

            const statusColor = STATUS_COLORS[normalizedStatus] || STATUS_COLORS['Available'];
            
            return (
              <motion.div
                key={table._id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedTableForDetails(table);
                  setIsDetailsOpen(true);
                }}
                className={`cursor-pointer rounded-2xl p-4 border flex flex-col items-center justify-center gap-2 aspect-square transition-all shadow-sm ${statusColor}`}
              >
                <span className="text-2xl sm:text-3xl font-bold font-heading">{table.tableNumber}</span>
                <div className="flex items-center gap-1 opacity-90 text-xs sm:text-sm font-medium">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{table.capacity}</span>
                </div>
                <div className="flex flex-col items-center gap-1 mt-1 max-w-full">
                  <span className="text-[8px] sm:text-[9px] font-bold text-dark-400 tracking-wider truncate max-w-full">
                    {table.floor || 'Ground Floor'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/50 dark:bg-black/20 shadow-sm backdrop-blur-sm truncate max-w-full">
                    {normalizedStatus}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Table Details Drawer */}
      <TableDetails
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTableForDetails(null);
          fetchTables(); // Refresh tables list to catch state transitions
        }}
        table={selectedTableForDetails}
        socket={socket}
      />
    </div>
  );
};
