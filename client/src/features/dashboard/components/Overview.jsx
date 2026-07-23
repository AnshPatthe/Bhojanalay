import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, AlertTriangle, Users, ArrowUpRight, TrendingUp, X, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Spinner, Select } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';
import api from '@/api';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export const Overview = ({ setActiveTab }) => {
  const { currentRestaurant } = useAuthStore();
  const currencyCode = currentRestaurant?.currency || 'USD';
  const [stats, setStats] = useState({ revenue: 0, ordersCount: 0, lowStockCount: 0, staffCount: 0, pendingLeaves: 0 });
  const [tableStats, setTableStats] = useState({ free: 0, occupied: 0, reserved: 0, total: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [allOrdersData, setAllOrdersData] = useState([]);
  const [revenueTimeframe, setRevenueTimeframe] = useState('daily');

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

        let pendingLeavesCount = 0;
        try {
          const leavesRes = await api.get('/employees/leaves');
          const leaves = leavesRes.data.data || [];
          pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;
        } catch (e) {
          console.log('Failed to fetch pending leaves for overview:', e);
        }

        // Compute stats
        const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready', 'billing'].includes(o.status));
        const totalRev = orders.filter(o => o.paymentStatus === 'paid').reduce((acc, curr) => acc + curr.total, 0);

        const free = tables.filter(t => t.status?.toLowerCase() === 'available' || t.status?.toLowerCase() === 'free').length;
        const occupied = tables.filter(t => t.status?.toLowerCase() === 'occupied').length;
        const reserved = tables.filter(t => t.status?.toLowerCase() === 'reserved').length;
        setTableStats({ free, occupied, reserved, total: tables.length });


        setAllOrdersData(orders);

        setStats({
          revenue: totalRev,
          ordersCount: activeOrders.length,
          lowStockCount: lowStock.length,
          staffCount: employees.length,
          pendingLeaves: pendingLeavesCount
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

  const getRevenueTrend = (allOrders, timeframe) => {
    const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');
    const salesByGroup = {};

    paidOrders.forEach(o => {
      const date = new Date(o.createdAt);
      let key = '';
      let displayName = '';

      if (timeframe === 'monthly') {
        const year = date.getFullYear();
        const month = date.getMonth();
        key = `${year}-${String(month + 1).padStart(2, '0')}`;
        displayName = date.toLocaleDateString([], { month: 'short', year: 'numeric' });
      } else if (timeframe === 'yearly') {
        const year = date.getFullYear();
        key = `${year}`;
        displayName = `${year}`;
      } else if (timeframe === 'weekly') {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        
        const year = startOfWeek.getFullYear();
        const month = startOfWeek.getMonth();
        const dateNum = startOfWeek.getDate();
        
        key = `${year}-${String(month + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
        displayName = `Wk of ${startOfWeek.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      } else {
        // default to 'daily'
        key = date.toISOString().slice(0, 10);
        displayName = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      if (!salesByGroup[key]) {
        salesByGroup[key] = { label: displayName, total: 0 };
      }
      salesByGroup[key].total += o.total;
    });

    const sortedKeys = Object.keys(salesByGroup).sort();

    return sortedKeys.map(key => ({
      name: salesByGroup[key].label,
      revenue: parseFloat(salesByGroup[key].total.toFixed(2))
    }));
  };

  const getTopSellingItems = (allOrders) => {
    const itemsAgg = {};
    allOrders.forEach(o => {
      if (o.status === 'cancelled') return;
      (o.items || []).forEach(item => {
        if (item.status === 'cancelled') return;
        if (!itemsAgg[item.name]) {
          itemsAgg[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        itemsAgg[item.name].quantity += item.quantity;
        itemsAgg[item.name].revenue += item.subtotal;
      });
    });

    return Object.values(itemsAgg)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const getOrderTypeData = (allOrders) => {
    const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');
    const typesAgg = {};
    paidOrders.forEach(o => {
      const type = o.orderType ? (o.orderType.charAt(0).toUpperCase() + o.orderType.slice(1).toLowerCase()) : 'Dine-In';
      typesAgg[type] = (typesAgg[type] || 0) + o.total;
    });
    return Object.entries(typesAgg).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

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

      {stats.pendingLeaves > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 text-amber-600 px-4 py-3.5 rounded-2xl flex items-center justify-between text-sm shadow-sm animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-400">Leave Requests Pending Action</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                There are <span className="font-bold text-amber-900 dark:text-amber-300">{stats.pendingLeaves} leave requests</span> waiting for your approval.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('staff')}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Review Requests
          </button>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <Card 
            key={idx} 
            className="hover:shadow-md transition-all cursor-pointer hover:border-brand-500/30 dark:hover:border-brand-500/20" 
            onClick={() => {
              if (card.title === 'Total Sales') {
                setShowRevenueModal(true);
              } else {
                setActiveTab(card.tab);
              }
            }}
          >
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

      {/* Sales Analytics Modal */}
      {showRevenueModal && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-850 border border-dark-200 dark:border-dark-800 rounded-3xl w-full max-w-5xl shadow-2xl p-6 relative flex flex-col gap-6 max-h-[90vh] overflow-y-auto text-left animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-dark-100 dark:border-dark-800 pb-4">
              <div>
                <h3 className="text-xl font-bold font-heading text-dark-900 dark:text-white flex items-center gap-2">
                  📊 Sales & Revenue Analytics
                </h3>
                <p className="text-xs text-dark-400 mt-0.5">Detailed breakdown of branch revenues and product performance</p>
              </div>
              <button
                onClick={() => setShowRevenueModal(false)}
                className="p-1.5 rounded-lg text-dark-400 hover:text-dark-900 dark:hover:text-white hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Metrics Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-dark-50 dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-750">
                <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400 block mb-1">Gross Revenue</span>
                <span className="text-lg font-extrabold text-dark-900 dark:text-white font-heading">
                  {formatCurrency(stats.revenue, currencyCode)}
                </span>
              </div>
              <div className="p-4 bg-dark-50 dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-750">
                <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400 block mb-1">Total Paid Orders</span>
                <span className="text-lg font-extrabold text-dark-900 dark:text-white font-heading">
                  {allOrdersData.filter(o => o.paymentStatus === 'paid').length}
                </span>
              </div>
              <div className="p-4 bg-dark-50 dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-750">
                <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400 block mb-1">Average Order Value</span>
                <span className="text-lg font-extrabold text-dark-900 dark:text-white font-heading">
                  {formatCurrency(
                    stats.revenue / (allOrdersData.filter(o => o.paymentStatus === 'paid').length || 1),
                    currencyCode
                  )}
                </span>
              </div>
              <div className="p-4 bg-dark-50 dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-750">
                <span className="text-[10px] uppercase font-bold tracking-wider text-dark-400 block mb-1">Estimated Tax (8%)</span>
                <span className="text-lg font-extrabold text-dark-900 dark:text-white font-heading">
                  {formatCurrency(stats.revenue * 0.08, currencyCode)}
                </span>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily Sales Trend Chart */}
              <div className="p-4 bg-dark-50 dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-750 flex flex-col gap-3">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <h4 className="text-sm font-bold text-dark-900 dark:text-white">
                      {revenueTimeframe.charAt(0).toUpperCase() + revenueTimeframe.slice(1)} Revenue Trend
                    </h4>
                    <p className="text-[10px] text-dark-400">
                      Paid transaction values grouped by {revenueTimeframe}
                    </p>
                  </div>
                  <div className="w-32">
                    <Select
                      value={revenueTimeframe}
                      onChange={(e) => setRevenueTimeframe(e.target.value)}
                      className="h-8 py-1 px-2 text-xs"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </Select>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getRevenueTrend(allOrdersData, revenueTimeframe)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                      <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Selling Items Bar Chart */}
              <div className="p-4 bg-dark-50 dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-750 flex flex-col gap-3">
                <div>
                  <h4 className="text-sm font-bold text-dark-900 dark:text-white">Highest Sold Menu Items</h4>
                  <p className="text-[10px] text-dark-400">Top 5 dishes by quantity ordered</p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getTopSellingItems(allOrdersData)} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <XAxis type="number" stroke="#6b7280" fontSize={10} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={9} tickLine={false} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                      <Bar dataKey="quantity" fill="#6366f1" radius={[0, 4, 4, 0]}>
                        {getTopSellingItems(allOrdersData).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Breakdown Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Type breakdown */}
              <div className="p-4 bg-dark-50 dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-750 flex flex-col gap-3">
                <div>
                  <h4 className="text-sm font-bold text-dark-900 dark:text-white">Sales by Order Type</h4>
                  <p className="text-[10px] text-dark-400">Revenue split across dining modes</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-48">
                  <div className="h-36 w-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getOrderTypeData(allOrdersData)}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={45}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {getOrderTypeData(allOrdersData).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xs text-left">
                    {getOrderTypeData(allOrdersData).map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-dark-500 font-medium">{entry.name}:</span>
                        <span className="text-dark-900 dark:text-white font-bold">{formatCurrency(entry.value, currencyCode)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Items Table list */}
              <div className="p-4 bg-dark-50 dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-750 flex flex-col gap-3">
                <div>
                  <h4 className="text-sm font-bold text-dark-900 dark:text-white">Leaderboard Menu Performance</h4>
                  <p className="text-[10px] text-dark-400">Total units sold and revenue contribution</p>
                </div>
                <div className="overflow-y-auto max-h-48 pr-1">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-dark-200 dark:border-dark-750 text-left text-dark-400 font-bold uppercase pb-2">
                        <th className="pb-2">Item Name</th>
                        <th className="pb-2 text-center">Qty Sold</th>
                        <th className="pb-2 text-right">Contribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-200/50 dark:divide-dark-700/50">
                      {getTopSellingItems(allOrdersData).map((item, idx) => (
                        <tr key={idx} className="text-dark-800 dark:text-dark-200">
                          <td className="py-2.5 font-medium">{item.name}</td>
                          <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                          <td className="py-2.5 text-right font-semibold text-brand-650 dark:text-brand-400">
                            {formatCurrency(item.revenue, currencyCode)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
