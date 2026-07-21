import React, { useState, useEffect, useRef } from 'react';
import { Bell, Sun, Moon, ArrowRight, User, Menu } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';
import { Dropdown, DropdownItem, Avatar, Drawer, Button, Input, Select, Spinner } from '@/components/ui';
import api from '@/api';

export const Topbar = ({ socket, onMenuToggle }) => {
  const { currentRestaurant, currentBranch, user, logout } = useAuthStore();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Real-time notifications state
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      const newNotif = {
        id: `new-order-${newOrder._id || newOrder.id}-${Date.now()}`,
        text: `New order placed for Table ${newOrder.tableNumber}`,
        timestamp: new Date(),
        isUnread: true
      };
      setNotifications(prev => [newNotif, ...prev]);
    };

    const handleStatusUpdated = ({ orderId, status }) => {
      const displayId = orderId ? orderId.substring(Math.max(0, orderId.length - 6)) : '';
      const newNotif = {
        id: `status-${orderId}-${Date.now()}`,
        text: `Order #${displayId} status updated to ${status}`,
        timestamp: new Date(),
        isUnread: true
      };
      setNotifications(prev => [newNotif, ...prev]);
    };

    socket.on('new_order', handleNewOrder);
    socket.on('order_status_updated', handleStatusUpdated);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_status_updated', handleStatusUpdated);
    };
  }, [socket]);

  const unreadCount = notifications.filter(n => n.isUnread).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
  };

  // Edit Profile state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    profilePhoto: '',
    password: '',
    branchId: '',
    gstPercentage: ''
  });
  const [branches, setBranches] = useState([]);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        profilePhoto: user.profilePhoto || '',
        password: '',
        branchId: currentBranch?._id || currentBranch?.id || '',
        gstPercentage: currentBranch?.gstPercentage?.toString() || '5'
      });
    }
  }, [user, currentBranch, isProfileOpen]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/auth/branches');
        setBranches(res.data.data);
      } catch (err) {
        console.error('Failed to fetch branches', err);
      }
    };
    if (isProfileOpen) {
      fetchBranches();
    }
  }, [isProfileOpen]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleBranchChange = (newBranchId) => {
    const selectedBranch = branches.find(b => (b._id || b.id) === newBranchId);
    setProfileForm(prev => ({
      ...prev,
      branchId: newBranchId,
      gstPercentage: selectedBranch?.gstPercentage?.toString() || '5'
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm(prev => ({
        ...prev,
        profilePhoto: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setUpdatingProfile(true);
    try {
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        profilePhoto: profileForm.profilePhoto,
        branchId: profileForm.branchId,
        restaurantId: currentRestaurant?._id || currentRestaurant?.id,
        gstPercentage: parseFloat(profileForm.gstPercentage)
      };
      if (profileForm.password) {
        payload.password = profileForm.password;
      }
      
      const res = await api.put('/auth/update-profile', payload);
      if (res.data.status === 'success') {
        toast.success('Profile updated successfully!');
        useAuthStore.getState().updateUser(res.data.user, res.data.employee);
        setIsProfileOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-dark-900 border-b border-dark-200 dark:border-dark-850 z-40 px-6 flex items-center justify-between">
      {/* Brand Context */}
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 rounded bg-brand-650 flex items-center justify-center">
          <span className="font-heading text-sm font-bold text-white">
            {currentRestaurant?.name ? currentRestaurant.name.charAt(0).toUpperCase() : 'V'}
          </span>
        </div>
        <div>
          <span className="font-heading font-bold text-dark-900 dark:text-white block text-sm sm:text-base leading-none">
            {currentRestaurant?.name || 'Vyavastha OS'}
          </span>
          {currentBranch && (
            <span className="text-xs text-dark-400 font-medium">
              {currentBranch.name || 'Main Branch'}
            </span>
          )}
        </div>
      </div>

      {/* Action triggers */}
      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800 text-dark-500 hover:text-dark-900 dark:text-dark-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications Icon with live alerts */}
        <Dropdown
          trigger={
            <button className="p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800 text-dark-500 hover:text-dark-900 dark:text-dark-400 dark:hover:text-white transition-colors relative cursor-pointer focus:outline-none">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          }
        >
          <div className="px-4 py-2 border-b border-dark-100 dark:border-dark-800 flex justify-between items-center w-80">
            <span className="text-sm font-semibold text-dark-900 dark:text-white">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-brand-650 hover:underline cursor-pointer">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto w-80">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-dark-400">
                No notifications yet
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b border-dark-100 dark:border-dark-800 text-left text-xs ${
                    notif.isUnread ? 'bg-brand-50/20 dark:bg-brand-950/10' : ''
                  }`}
                >
                  <p className="font-medium text-dark-850 dark:text-dark-200">{notif.text}</p>
                  <span className="text-[10px] text-dark-400 block mt-1">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </Dropdown>

        {/* Profile Dropdown */}
        <Dropdown
          trigger={
            <button className="flex items-center space-x-2 focus:outline-none cursor-pointer">
              <Avatar src={user?.profilePhoto} name={user?.name || 'Chef'} size="sm" />
            </button>
          }
        >
          <div className="px-4 py-2.5 border-b border-dark-100 dark:border-dark-800 text-left">
            <p className="text-sm font-semibold text-dark-900 dark:text-white leading-none mb-1">{user?.name}</p>
            <p className="text-xs text-dark-400">{user?.email}</p>
          </div>
          <DropdownItem onClick={() => setIsProfileOpen(true)}>
            My Profile
          </DropdownItem>
          <DropdownItem onClick={logout} danger>
            Log Out
          </DropdownItem>
        </Dropdown>
      </div>

      {/* Edit Profile Drawer */}
      <Drawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="My Profile Settings">
        <div className="space-y-6 text-left">
          <div className="flex flex-col items-center space-y-3 pb-4 border-b border-dark-100 dark:border-dark-850">
            <Avatar src={profileForm.profilePhoto} name={profileForm.name || 'Chef'} size="xl" />
            <span className="text-xs text-dark-400">Preview of your profile photo</span>
          </div>

          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Full Name</label>
            <Input
              placeholder="Your name"
              value={profileForm.name}
              onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Email Address</label>
            <Input
              type="email"
              placeholder="Your email"
              value={profileForm.email}
              onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Profile Photo</label>
            <div className="flex flex-col space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-xs text-dark-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer w-full"
              />
              {profileForm.profilePhoto && (
                <button
                  type="button"
                  className="text-xs text-rose-500 hover:underline text-left cursor-pointer font-semibold"
                  onClick={() => setProfileForm({ ...profileForm, profilePhoto: '' })}
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Active Branch</label>
            <Select value={profileForm.branchId} onChange={e => handleBranchChange(e.target.value)}>
              {branches.map(branch => (
                <option key={branch._id} value={branch._id}>{branch.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Branch GST Percentage (%)</label>
            <Input
              type="number"
              placeholder="5"
              value={profileForm.gstPercentage}
              onChange={e => setProfileForm({ ...profileForm, gstPercentage: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Change Password (leave blank to keep current)</label>
            <Input
              type="password"
              placeholder="New password"
              value={profileForm.password}
              onChange={e => setProfileForm({ ...profileForm, password: e.target.value })}
            />
          </div>

          <Button variant="primary" className="w-full" onClick={handleSaveProfile} disabled={updatingProfile || !profileForm.name || !profileForm.email}>
            {updatingProfile ? <Spinner size="sm" /> : "Save Changes"}
          </Button>
        </div>
      </Drawer>
    </header>
  );
};

export default Topbar;
