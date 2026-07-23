import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent, Input, Select, Button, Spinner, Typography } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/api';

export const OnboardingWizard = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setRestaurantContext = useAuthStore(state => state.setRestaurantContext);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      restaurant: {
        currency: 'USD',
        timezone: 'UTC',
        type: 'casual_dining'
      },
      branch: {}
    }
  });

  const restaurantName = watch('restaurant.name');

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      // In a real production setup, we would upload the logo file to Cloudinary first.
      // For this wizard, we submit the text fields.
      const res = await api.post('/onboarding', formData);
      const { restaurant, branch, employee } = res.data.data;

      // Update Zustand context
      setRestaurantContext(
        { id: restaurant._id, name: restaurant.name, currency: restaurant.currency },
        { id: branch._id, name: branch.name },
        'Owner',
        ['menu:read', 'menu:write', 'order:read', 'order:write', 'inventory:read', 'inventory:write', 'employees:manage', 'billing:manage']
      );

      toast.success('Restaurant OS initialized successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Onboarding failed. Please review your entries.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-grid-pattern p-4">
      <Card className="w-full max-w-2xl shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-dark-100 dark:border-dark-800 bg-dark-50/50 dark:bg-dark-900/50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-heading font-bold">Restaurant Configuration Wizard</CardTitle>
              <p className="text-xs text-dark-400 mt-1">Deploy your SaaS tenant space in 3 simple steps</p>
            </div>
            <div className="text-sm font-semibold text-brand-650 bg-brand-50 dark:bg-brand-950/40 rounded-full px-3 py-1">
              Step {step} of 3
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <Typography variant="h3" className="mb-4">Step 1: Restaurant Details</Typography>

                  <div>
                    <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Restaurant Name</label>
                    <Input
                      placeholder="e.g., Bella Italia Bistro"
                      {...register('restaurant.name', { required: 'Restaurant name is required' })}
                      error={errors.restaurant?.name}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Restaurant Type</label>
                      <Select {...register('restaurant.type')}>
                        <option value="fine_dining">Fine Dining</option>
                        <option value="casual_dining">Casual Dining</option>
                        <option value="quick_service">Quick Service / QSR</option>
                        <option value="cafe">Cafe / Bakery</option>
                        <option value="bar">Bar / Lounge</option>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Currency</label>
                      <Select {...register('restaurant.currency')}>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="CAD">CAD (C$)</option>
                        <option value="AUD">AUD (A$)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="CNY">CNY (元)</option>
                        <option value="AED">AED (د.إ)</option>
                        <option value="SGD">SGD (S$)</option>
                        <option value="CHF">CHF (CHF)</option>
                        <option value="NZD">NZD (NZ$)</option>
                        <option value="ZAR">ZAR (R)</option>
                        <option value="SAR">SAR (SR)</option>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Timezone</label>
                    <Select {...register('restaurant.timezone')}>
                      <option value="UTC">UTC / GMT</option>
                      <option value="America/New_York">EST / America/New_York</option>
                      <option value="Europe/London">GMT / Europe/London</option>
                      <option value="Asia/Kolkata">IST / Asia/Kolkata</option>
                    </Select>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="button" variant="primary" onClick={nextStep} disabled={!restaurantName}>
                      Next: Branch Setup
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <Typography variant="h3" className="mb-4">Step 2: Head Office Branch</Typography>

                  <div>
                    <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Branch Name</label>
                    <Input
                      placeholder="e.g., Downtown Head Office"
                      {...register('branch.name', { required: 'Branch name is required' })}
                      error={errors.branch?.name}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Country</label>
                      <Input
                        placeholder="e.g., USA"
                        {...register('branch.country', { required: 'Required' })}
                        error={errors.branch?.country}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">State</label>
                      <Input
                        placeholder="e.g., NY"
                        {...register('branch.state', { required: 'Required' })}
                        error={errors.branch?.state}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">City</label>
                      <Input
                        placeholder="e.g., New York"
                        {...register('branch.city', { required: 'Required' })}
                        error={errors.branch?.city}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Street Address</label>
                    <Input
                      placeholder="e.g., 123 Broadway Ave"
                      {...register('branch.address', { required: 'Address is required' })}
                      error={errors.branch?.address}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Branch Phone</label>
                      <Input
                        placeholder="+1 555-0199"
                        {...register('branch.phone', { required: 'Phone is required' })}
                        error={errors.branch?.phone}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Branch Email (Optional)</label>
                      <Input
                        type="email"
                        placeholder="downtown@bistro.com"
                        {...register('branch.email')}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="secondary" onClick={prevStep}>
                      Back
                    </Button>
                    <Button type="button" variant="primary" onClick={nextStep}>
                      Next: Review
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <Typography variant="h3" className="mb-4">Step 3: Review & Complete</Typography>

                  <div className="border border-dark-200 dark:border-dark-800 rounded-xl p-6 bg-dark-50/50 dark:bg-dark-900/50 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-dark-400 uppercase">Restaurant Workspace</h4>
                      <p className="text-base font-bold mt-1 text-dark-800 dark:text-white">{watch('restaurant.name')}</p>
                      <p className="text-xs text-dark-500">Scoping currency: {watch('restaurant.currency')} | Timezone: {watch('restaurant.timezone')}</p>
                    </div>
                    <div className="border-t border-dark-200 dark:border-dark-800 pt-4">
                      <h4 className="text-xs font-semibold text-dark-400 uppercase">Initial Launch Branch</h4>
                      <p className="text-base font-bold mt-1 text-dark-800 dark:text-white">{watch('branch.name')}</p>
                      <p className="text-xs text-dark-500">{watch('branch.address')}, {watch('branch.city')}, {watch('branch.state')}</p>
                    </div>
                  </div>

                  <p className="text-xs text-dark-500 dark:text-dark-450 italic leading-relaxed text-center">
                    By clicking Launch, we will register your employee owner card and deploy a 14-day Pro trial subscription workspace.
                  </p>

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="secondary" onClick={prevStep} disabled={loading}>
                      Back
                    </Button>
                    <Button type="submit" variant="accent" className="flex items-center" disabled={loading}>
                      {loading ? <Spinner size="sm" className="mr-2" /> : 'Launch Restaurant OS'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWizard;
