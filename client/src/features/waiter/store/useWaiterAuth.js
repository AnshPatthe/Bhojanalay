import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import waiterApi from '../api/waiterApi';

export const useWaiterAuth = create(
  persist(
    (set) => ({
      waiter: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const res = await waiterApi.post('/waiter/login', { email, password });
          const { token, data } = res.data;
          
          waiterApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            waiter: data,
            token,
            isAuthenticated: true,
          });
          return true;
        } catch (error) {
          throw new Error(error.response?.data?.message || 'Login failed');
        }
      },

      updateProfile: (updatedWaiter) => {
        set({ waiter: updatedWaiter });
      },

      logout: () => {
        delete waiterApi.defaults.headers.common['Authorization'];
        set({
          waiter: null,
          token: null,
          isAuthenticated: false,
        });
      }
    }),
    {
      name: 'waiter-auth-storage',
    }
  )
);
