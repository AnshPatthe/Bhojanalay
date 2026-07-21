import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { useWaiterAuth } from '@/features/waiter/store/useWaiterAuth';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const navigate = useNavigate();
  const { isAuthenticated, logout, currentRestaurant } = useAuthStore();
  const { isAuthenticated: isWaiterAuthenticated, waiter } = useWaiterAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Initial theme setup
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'glass shadow-md py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="font-heading text-lg font-bold text-white">
                {currentRestaurant?.name ? currentRestaurant.name.charAt(0).toUpperCase() : (waiter?.restaurantName ? waiter.restaurantName.charAt(0).toUpperCase() : 'V')}
              </span>
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-dark-900 dark:text-white">
              {currentRestaurant?.name || waiter?.restaurantName || 'Vyavastha'}
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-medium text-dark-600 hover:text-brand-600 dark:text-dark-350 dark:hover:text-white transition-colors">Home</Link>
            <Link to="/about" className="text-sm font-medium text-dark-600 hover:text-brand-600 dark:text-dark-350 dark:hover:text-white transition-colors">About</Link>
            <Link to="/features" className="text-sm font-medium text-dark-600 hover:text-brand-600 dark:text-dark-350 dark:hover:text-white transition-colors">Features</Link>
            <Link to="/pricing" className="text-sm font-medium text-dark-600 hover:text-brand-600 dark:text-dark-350 dark:hover:text-white transition-colors">Pricing</Link>
            <Link to="/contact" className="text-sm font-medium text-dark-600 hover:text-brand-600 dark:text-dark-350 dark:hover:text-white transition-colors">Contact</Link>
          </div>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500 hover:text-dark-900 dark:text-dark-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {isAuthenticated ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
                  Console
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Log In
                </Button>
                <Button variant="primary" size="sm" className="group" onClick={() => navigate('/register')}>
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-dark-500 dark:text-dark-400"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-350"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-dark-100 dark:border-dark-800 mt-2 p-4 flex flex-col space-y-4">
          <Link to="/" onClick={() => setIsOpen(false)} className="text-base font-medium text-dark-700 dark:text-dark-300">Home</Link>
          <Link to="/about" onClick={() => setIsOpen(false)} className="text-base font-medium text-dark-700 dark:text-dark-300">About</Link>
          <Link to="/features" onClick={() => setIsOpen(false)} className="text-base font-medium text-dark-700 dark:text-dark-300">Features</Link>
          <Link to="/pricing" onClick={() => setIsOpen(false)} className="text-base font-medium text-dark-700 dark:text-dark-300">Pricing</Link>
          <Link to="/contact" onClick={() => setIsOpen(false)} className="text-base font-medium text-dark-700 dark:text-dark-300">Contact</Link>
          <div className="border-t border-dark-150 dark:border-dark-800 pt-4 flex flex-col space-y-2">
            {isAuthenticated ? (
              <>
                <Button variant="primary" onClick={() => { setIsOpen(false); navigate('/dashboard'); }}>Console</Button>
                <Button variant="secondary" onClick={() => { setIsOpen(false); logout(); }}>Log Out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => { setIsOpen(false); navigate('/login'); }}>Log In</Button>
                <Button variant="primary" onClick={() => { setIsOpen(false); navigate('/register'); }}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
