import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Container, Typography, Input, Textarea, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export const Contact = () => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = (data) => {
    toast.success('Thank you! Our support team will get in touch shortly.');
    reset();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 bg-grid-pattern">
        <Container>
          <div className="max-w-xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">Get in Touch</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Your Name</label>
                    <Input
                      {...register('name', { required: 'Name is required' })}
                      error={errors.name}
                      placeholder="e.g., Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Email Address</label>
                    <Input
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' }
                      })}
                      error={errors.email}
                      placeholder="e.g., jane@restaurant.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-dark-700 dark:text-dark-350 block mb-1">Message</label>
                    <Textarea
                      {...register('message', { required: 'Message content is required' })}
                      error={errors.message}
                      placeholder="Let us know how we can help your kitchens..."
                    />
                  </div>
                  <Button type="submit" variant="primary" className="w-full">
                    Submit Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
