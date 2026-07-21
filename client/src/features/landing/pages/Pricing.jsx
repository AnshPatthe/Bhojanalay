import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PricingSection from '../components/PricingSection';

export const Pricing = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />
      <main className="flex-grow pt-32 bg-grid-pattern">
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
