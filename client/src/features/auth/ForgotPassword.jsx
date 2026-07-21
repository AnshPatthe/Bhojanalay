import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Spinner } from '@/components/ui';
import api from '@/api';

export const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [sentToken, setSentToken] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', data);
      toast.success('Reset link generated!');
      if (res.data.resetToken) {
        setSentToken(res.data.resetToken);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-grid-pattern p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-heading">Forgot Password</CardTitle>
          <p className="text-xs text-dark-400 mt-1">Receive a link to reset your account password</p>
        </CardHeader>
        <CardContent>
          {!sentToken ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="chef@bistro.com"
                  {...register('email', { required: 'Email is required' })}
                  error={errors.email}
                />
              </div>

              <Button type="submit" variant="primary" className="w-full flex items-center justify-center" disabled={loading}>
                {loading ? <Spinner size="sm" className="mr-2 border-white" /> : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-dark-600 dark:text-dark-300">
                A password reset token was generated for testing. Click the link below to set a new password:
              </p>
              <Link
                to={`/reset-password/${sentToken}`}
                className="inline-block bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Reset Password Now
              </Link>
            </div>
          )}

          <div className="text-center mt-6 text-xs text-dark-500 dark:text-dark-400">
            Back to{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">Log in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
