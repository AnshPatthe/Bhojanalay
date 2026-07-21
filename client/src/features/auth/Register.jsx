import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/api';

export const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const loginStore = useAuthStore(state => state.login);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      const { accessToken, user } = res.data;

      // Save user session
      loginStore(user, accessToken);

      toast.success('Registration successful!');
      navigate('/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
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
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-heading">Create Account</CardTitle>
          <p className="text-xs text-dark-400 mt-1">Start your 14-day free trial. No credit card required.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Full Name</label>
              <Input
                placeholder="e.g., Marcus Aurelius"
                {...register('name', { required: 'Name is required' })}
                error={errors.name}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Email Address</label>
              <Input
                type="email"
                placeholder="e.g., marcus@bistro.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' }
                })}
                error={errors.email}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Password</label>
              <Input
                type="password"
                placeholder="Minimum 6 characters"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
                error={errors.password}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full flex items-center justify-center" disabled={loading}>
              {loading ? <Spinner size="sm" className="mr-2 border-white" /> : 'Sign Up'}
            </Button>
          </form>

          <div className="text-center mt-6 text-xs text-dark-500 dark:text-dark-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">Log in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
