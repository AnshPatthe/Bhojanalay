import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('accessToken') || null,
  currentRestaurant: JSON.parse(localStorage.getItem('currentRestaurant')) || null,
  currentBranch: JSON.parse(localStorage.getItem('currentBranch')) || null,
  role: localStorage.getItem('employeeRole') || null,
  permissions: JSON.parse(localStorage.getItem('employeePermissions')) || [],
  isAuthenticated: !!localStorage.getItem('accessToken'),

  login: (userData, accessToken) => {
    localStorage.setItem('accessToken', accessToken);
    set({
      user: userData,
      token: accessToken,
      isAuthenticated: true
    });
  },

  updateUser: (userData, employeeData) => {
    if (employeeData && employeeData.branchId) {
      localStorage.setItem('currentBranch', JSON.stringify(employeeData.branchId));
    }
    set((state) => ({
      user: { ...state.user, ...userData },
      currentBranch: employeeData && employeeData.branchId ? employeeData.branchId : state.currentBranch
    }));
  },

  refreshTokens: (accessToken) => {
    localStorage.setItem('accessToken', accessToken);
    set({ token: accessToken, isAuthenticated: true });
  },

  setRestaurantContext: (restaurant, branch, role, permissions) => {
    localStorage.setItem('currentRestaurant', JSON.stringify(restaurant));
    localStorage.setItem('currentBranch', JSON.stringify(branch));
    localStorage.setItem('employeeRole', role);
    localStorage.setItem('employeePermissions', JSON.stringify(permissions));

    set({
      currentRestaurant: restaurant,
      currentBranch: branch,
      role,
      permissions
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentRestaurant');
    localStorage.removeItem('currentBranch');
    localStorage.removeItem('employeeRole');
    localStorage.removeItem('employeePermissions');

    set({
      user: null,
      token: null,
      currentRestaurant: null,
      currentBranch: null,
      role: null,
      permissions: [],
      isAuthenticated: false
    });
  }
}));

export default useAuthStore;
