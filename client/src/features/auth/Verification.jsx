import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Spinner } from '@/components/ui';
import api from '@/api';

export const Verification = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await api.get(`/auth/verify-email/${token}`);
        setSuccess(true);
        setMessage(res.data.message || 'Email verified successfully!');
      } catch (err) {
        setSuccess(false);
        setMessage(err.response?.data?.message || 'Verification token is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-grid-pattern p-4">
      <Card className="w-full max-w-md shadow-2xl text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-heading">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center space-y-4">
              <Spinner size="lg" />
              <p className="text-sm text-dark-500 dark:text-dark-400">Verifying your email address...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className={`text-sm ${success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {message}
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-block bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  Proceed to Login
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Verification;
