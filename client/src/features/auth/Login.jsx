import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { useWaiterAuth } from '@/features/waiter/store/useWaiterAuth';
import api from '@/api';

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState('owner'); // 'owner' or 'waiter'

  const navigate = useNavigate();
  const loginStore = useAuthStore(state => state.login);
  const setRestaurantContext = useAuthStore(state => state.setRestaurantContext);
  const waiterLogin = useWaiterAuth(state => state.login);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (loginType === 'owner') {
        const res = await api.post('/auth/login', data);
        const { accessToken, user } = res.data;

        // Save user session
        loginStore(user, accessToken);

        // Verify if user is already onboarded to a restaurant
        try {
          const profileRes = await api.get('/auth/me');
          const { employee } = profileRes.data;
          if (employee && employee.branchId) {
            setRestaurantContext(
              { id: employee.restaurantId, name: employee.restaurantName, currency: employee.restaurantCurrency },
              { id: employee.branchId?._id || employee.branchId, name: employee.branchName || employee.branchId?.name || 'Main Branch' },
              employee.role,
              employee.permissions
            );
            toast.success(`Welcome back, ${user.name}!`);
            navigate('/dashboard');
          } else {
            navigate('/onboarding');
          }
        } catch (profileErr) {
          navigate('/onboarding');
        }
      } else {
        // Waiter login
        await waiterLogin(data.email, data.password);
        toast.success('Logged in successfully!');
        navigate('/waiter/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-grid-pattern p-4">
      <div className="absolute top-8 left-8">
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded bg-brand-600 flex items-center justify-center">
            <span className="font-heading text-sm font-bold text-white">V</span>
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-dark-900 dark:text-white">
            Vyavastha
          </span>
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold font-heading">Access Dashboard</CardTitle>
          <p className="text-xs text-dark-400 mt-1">
            {loginType === 'owner' ? 'Log in to manage your restaurant operations' : 'Log in to manage your tables and orders'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex bg-dark-100 dark:bg-dark-800 p-1 rounded-lg mb-6">
            <button
              onClick={() => setLoginType('owner')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === 'owner' ? 'bg-white dark:bg-dark-700 shadow-sm' : 'text-dark-500 hover:text-dark-700 dark:hover:text-dark-300'}`}
              type="button"
            >
              Owner / Admin
            </button>
            <button
              onClick={() => setLoginType('waiter')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === 'waiter' ? 'bg-white dark:bg-dark-700 shadow-sm' : 'text-dark-500 hover:text-dark-700 dark:hover:text-dark-300'}`}
              type="button"
            >
              Waiter
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Email Address</label>
              <Input
                type="email"
                placeholder={loginType === 'owner' ? "owner@restaurant.com" : "waiter@restaurant.com"}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email format' }
                })}
                error={errors.email}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block">Password</label>
                {loginType === 'owner' && (
                  <Link to="/forgot-password" className="text-xs text-brand-650 hover:underline">Forgot password?</Link>
                )}
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
                error={errors.password}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full flex items-center justify-center" disabled={loading}>
              {loading ? <Spinner size="sm" className="mr-2 border-white" /> : 'Log In'}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
