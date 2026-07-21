import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, AlertTriangle, Users, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';
import api from '@/api';

export const Overview = ({ setActiveTab }) => {
  const { currentRestaurant } = useAuthStore();
  const currencyCode = currentRestaurant?.currency || 'USD';
  const [stats, setStats] = useState({ revenue: 0, ordersCount: 0, lowStockCount: 0, staffCount: 0 });
  const [tableStats, setTableStats] = useState({ free: 0, occupied: 0, reserved: 0, total: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const [ordersRes, inventoryRes, employeesRes, tablesRes] = await Promise.all([
          api.get('/orders'),
          api.get('/inventory/low-stock'),
          api.get('/employees'),
          api.get('/tables')
        ]);

        const orders = ordersRes.data.data;
        const lowStock = inventoryRes.data.data;
        const employees = employeesRes.data.data;
        const tables = tablesRes.data.data;

        // Compute stats
        const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
        const totalRev = orders.filter(o => o.paymentStatus === 'paid').reduce((acc, curr) => acc + curr.total, 0);

        const free = tables.filter(t => t.status?.toLowerCase() === 'available' || t.status?.toLowerCase() === 'free').length;
        const occupied = tables.filter(t => t.status?.toLowerCase() === 'occupied').length;
        const reserved = tables.filter(t => t.status?.toLowerCase() === 'reserved').length;
        setTableStats({ free, occupied, reserved, total: tables.length });


        setStats({
          revenue: totalRev,
          ordersCount: activeOrders.length,
          lowStockCount: lowStock.length,
          staffCount: employees.length
        });

        setRecentOrders(orders.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch dashboard overview metrics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards = [
    { title: 'Total Sales', value: formatCurrency(stats.revenue, currencyCode), desc: '+12.5% from last week', icon: <DollarSign className="h-5 w-5 text-emerald-500" />, tab: 'orders' },
    { title: 'Active Orders', value: stats.ordersCount, desc: 'Real-time kitchen orders', icon: <ShoppingBag className="h-5 w-5 text-brand-650" />, tab: 'orders' },
    { title: 'Low Stock Alerts', value: stats.lowStockCount, desc: 'Requires reorder check', icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, tab: 'inventory' },
    { title: 'Staff Active', value: stats.staffCount, desc: 'On shift directory card', icon: <Users className="h-5 w-5 text-blue-500" />, tab: 'staff' }
  ];

  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading mb-1 text-dark-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-xs text-dark-500">Business insights and active tasks for your current branch</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <Card key={idx} className="hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab(card.tab)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-dark-400 uppercase">{card.title}</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-dark-50 dark:bg-dark-850 flex items-center justify-center">
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold font-heading text-dark-900 dark:text-white">{card.value}</div>
              <p className="text-2xs text-dark-500 dark:text-dark-450 mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                {card.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Sections: Table & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Order Feed</CardTitle>
              <p className="text-xs text-dark-400 mt-0.5">Summary of last order transactions</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')}>
              View All
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-dark-400 py-6">No orders registered yet</TableCell>
                  </TableRow>
                ) : (
                  recentOrders.map((ord) => (
                    <TableRow key={ord._id || ord.id}>
                      <TableCell className="font-semibold">{ord.tableNumber}</TableCell>
                      <TableCell className="capitalize">{ord.orderType}</TableCell>
                      <TableCell>{formatCurrency(ord.total, currencyCode)}</TableCell>
                      <TableCell>
                        <Badge variant={ord.status === 'completed' ? 'success' : ord.status === 'preparing' ? 'warning' : 'info'}>
                          {ord.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Table Status Tracker */}
          <Card>
            <CardHeader>
              <CardTitle>Table Status Tracker</CardTitle>
              <p className="text-xs text-dark-400 mt-0.5">Live floor capacity overview</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center text-dark-700 dark:text-dark-300">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" /> Free
                </span>
                <span className="font-bold">{tableStats.free}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center text-dark-700 dark:text-dark-300">
                  <div className="h-2 w-2 rounded-full bg-brand-500 mr-2" /> Occupied
                </span>
                <span className="font-bold">{tableStats.occupied}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center text-dark-700 dark:text-dark-300">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" /> Reserved
                </span>
                <span className="font-bold">{tableStats.reserved}</span>
              </div>
              <div className="pt-3 border-t border-dark-100 dark:border-dark-800 flex justify-between items-center text-sm">
                <span className="font-medium text-dark-500">Total Tables</span>
                <span className="font-bold text-dark-900 dark:text-white">{tableStats.total}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Overview;
