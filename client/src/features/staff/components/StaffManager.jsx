import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Edit2, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Drawer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/utils/formatCurrency';
import api from '@/api';

export const StaffManager = () => {
  const { currentBranch, currentRestaurant } = useAuthStore();
  const currencyCode = currentRestaurant?.currency || 'USD';
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drawer Form states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', roleName: 'Waiter', hourlyRate: '15', password: '', status: 'active' });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const [staffRes, rolesRes] = await Promise.all([
        api.get('/employees'),
        api.get('/employees/roles')
      ]);
      setEmployees(staffRes.data.data);
      setRoles(rolesRes.data.data);
    } catch {
      toast.error('Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleInviteClick = () => {
    setIsEditMode(false);
    setSelectedEmployeeId(null);
    setForm({ name: '', email: '', roleName: 'Waiter', hourlyRate: '15', password: '', status: 'active' });
    setIsDrawerOpen(true);
  };

  const handleEditClick = (emp) => {
    setIsEditMode(true);
    setSelectedEmployeeId(emp._id);
    setForm({
      name: emp.userId?.name || '',
      email: emp.userId?.email || '',
      roleName: emp.roleId?.name || 'Waiter',
      hourlyRate: emp.hourlyRate?.toString() || '15',
      status: emp.status || 'active',
      password: ''
    });
    setIsDrawerOpen(true);
  };

  const handleDeleteClick = async (employeeId) => {
    if (!window.confirm('Are you sure you want to remove this staff member? This will permanently delete their employee record and any associated waiter account login.')) return;
    try {
      await api.delete(`/employees/${employeeId}`);
      toast.success('Staff employee deleted successfully!');
      fetchStaffData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete staff member');
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email) return;
    try {
      if (isEditMode) {
        const payload = {
          name: form.name,
          email: form.email,
          roleName: form.roleName,
          hourlyRate: parseFloat(form.hourlyRate),
          status: form.status
        };
        if (form.password) {
          payload.password = form.password;
        }
        await api.put(`/employees/${selectedEmployeeId}`, payload);
        toast.success('Staff employee updated successfully!');
      } else {
        if (!currentBranch) return;
        await api.post('/employees', {
          ...form,
          branchId: currentBranch.id || currentBranch._id,
          hourlyRate: parseFloat(form.hourlyRate)
        });
        toast.success('Staff employee registered successfully!');
      }
      setIsDrawerOpen(false);
      setForm({ name: '', email: '', roleName: 'Waiter', hourlyRate: '15', password: '', status: 'active' });
      fetchStaffData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} employee`);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading mb-1 text-dark-900 dark:text-white">Staff Directory</h1>
          <p className="text-xs text-dark-500">Manage employee shift payroll, roles, and platform permissions</p>
        </div>
        <Button variant="primary" onClick={handleInviteClick}>
          Invite Staff
        </Button>
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : employees.length === 0 ? (
        <div className="text-center text-dark-400 py-16">No staff members registered.</div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp._id}>
                    <TableCell className="font-semibold">{emp.userId?.name || 'Loading...'}</TableCell>
                    <TableCell>{emp.userId?.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{emp.roleId?.name || 'Staff'}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(emp.hourlyRate || 0, currencyCode)}/hr</TableCell>
                    <TableCell>
                      <Badge variant={emp.status === 'active' ? 'success' : emp.status === 'inactive' ? 'secondary' : 'danger'}>
                        {emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(emp)}
                          className="h-8 w-8 p-0 text-dark-500 hover:text-brand-650"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(emp._id)}
                          className="h-8 w-8 p-0 text-dark-500 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Staff Invitation/Edit Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={isEditMode ? "Edit Staff Details" : "Invite Staff Member"}>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Full Name</label>
            <Input
              placeholder="e.g., Sarah Chef"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Email Address</label>
            <Input
              type="email"
              placeholder="e.g., sarah@bistro.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              disabled={isEditMode}
            />
          </div>
          {isEditMode && (
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Status</label>
              <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
          )}
          {form.roleName === 'Waiter' && (
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">
                {isEditMode ? "Change Waiter Password (leave blank to keep current)" : "Waiter Password"}
              </label>
              <Input
                type="password"
                placeholder={isEditMode ? "New Password" : "Required for Waiter Login"}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Role Type</label>
              <Select value={form.roleName} onChange={e => setForm({ ...form, roleName: e.target.value })}>
                {roles.length > 0 ? (
                  roles.filter(r => r.name !== 'Owner').map(r => (
                    <option key={r._id || r.name} value={r.name}>{r.name}</option>
                  ))
                ) : (
                  <>
                    <option value="Manager">Manager</option>
                    <option value="Chef">Chef</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Waiter">Waiter</option>
                  </>
                )}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Hourly Rate ($)</label>
              <Input
                type="number"
                placeholder="15"
                value={form.hourlyRate}
                onChange={e => setForm({ ...form, hourlyRate: e.target.value })}
              />
            </div>
          </div>
          <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={!form.name || !form.email}>
            {isEditMode ? "Save Changes" : "Register Staff Account"}
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

export default StaffManager;
