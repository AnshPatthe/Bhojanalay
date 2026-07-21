import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modules from '../components/Modules';
import { Container, Typography } from '@/components/ui';

export const Features = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />
      <main className="flex-grow pt-32 bg-grid-pattern">
        <Container className="text-center mb-12">
          <Typography variant="h1" className="text-gradient mb-6">Product Features</Typography>
          <Typography variant="lead" className="max-w-2xl mx-auto text-dark-500 dark:text-dark-400">
            A look under the hood of Vyavastha's modular features designed to run kitchens and checkouts smoothly.
          </Typography>
        </Container>
        <Modules />
      </main>
      <Footer />
    </div>
  );
};

export default Features;
