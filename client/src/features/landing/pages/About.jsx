import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Container, Typography } from '@/components/ui';

export const About = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 bg-grid-pattern">
        <Container>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Typography variant="h1" className="text-gradient mb-6">Our Mission</Typography>
            <Typography variant="lead" className="text-dark-500 dark:text-dark-400">
              We empower restaurant operators by providing a premium, unified operating system that optimizes processes from table ordering to supply chains.
            </Typography>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-850 p-8 rounded-xl shadow-sm">
              <Typography variant="h3" className="mb-4">Engineered for Reliability</Typography>
              <Typography variant="p" className="text-sm leading-relaxed text-dark-550 dark:text-dark-400">
                Modern restaurants operate in high-pressure environments. Downtime is lost revenue. We designed Vyavastha with low-latency WebSockets and database architectures to achieve 99.99% uptime.
              </Typography>
            </div>
            <div className="bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-850 p-8 rounded-xl shadow-sm">
              <Typography variant="h3" className="mb-4">Multi-Tenant Security</Typography>
              <Typography variant="p" className="text-sm leading-relaxed text-dark-550 dark:text-dark-400">
                Whether you manage a single coffee kiosk or a national restaurant chain, your data is strictly partitioned and isolated using enterprise-grade multi-tenant constraints at the database model level.
              </Typography>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
};

export default About;
