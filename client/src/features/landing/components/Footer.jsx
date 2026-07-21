import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-white dark:bg-dark-950 border-t border-dark-200 dark:border-dark-850 py-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-brand-600 flex items-center justify-center">
                <span className="font-heading text-sm font-bold text-white">V</span>
              </div>
              <span className="font-heading text-lg font-bold tracking-tight text-dark-900 dark:text-white">
                Vyavastha
              </span>
            </Link>
            <p className="text-xs text-dark-500 dark:text-dark-400 leading-relaxed">
              Vyavastha is a Restaurant Operating System (Restaurant OS) engineered to manage table orders, checkout payments, live kitchen screens, and branch warehouses.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="font-heading text-sm font-semibold mb-4 text-dark-800 dark:text-dark-200">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/features" className="text-dark-500 hover:text-brand-600 dark:text-dark-400 transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="text-dark-500 hover:text-brand-600 dark:text-dark-400 transition-colors">Pricing</Link></li>
              <li><span className="text-dark-400 cursor-not-allowed">Changelog</span></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="font-heading text-sm font-semibold mb-4 text-dark-800 dark:text-dark-200">Company</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/about" className="text-dark-500 hover:text-brand-600 dark:text-dark-400 transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-dark-500 hover:text-brand-600 dark:text-dark-400 transition-colors">Contact</Link></li>
              <li><span className="text-dark-400 cursor-not-allowed">Careers</span></li>
            </ul>
          </div>

          {/* Links 3 */}
          <div>
            <h4 className="font-heading text-sm font-semibold mb-4 text-dark-800 dark:text-dark-200">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-dark-400 cursor-not-allowed">Privacy Policy</span></li>
              <li><span className="text-dark-400 cursor-not-allowed">Terms of Service</span></li>
              <li><span className="text-dark-400 cursor-not-allowed">DPA Agreement</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-dark-100 dark:border-dark-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-dark-455 text-dark-400">
          <span>&copy; {new Date().getFullYear()} Vyavastha Inc. All rights reserved.</span>
          <span className="mt-4 md:mt-0">Handcrafted for SaaS Startup Operations.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
