import api from '@/api';
import waiterApi from '@/features/waiter/api/waiterApi';
import { useWaiterAuth } from '@/features/waiter/store/useWaiterAuth';

const getApiClient = () => {
  const { isAuthenticated } = useWaiterAuth.getState();
  return isAuthenticated ? waiterApi : api;
};

export const getPayrollByEmployee = async (employeeId) => {
  const client = getApiClient();
  const res = await client.get(`/payroll/${employeeId}`);
  return res.data;
};

export const getPayrollsByMonth = async (month) => {
  const client = getApiClient();
  const res = await client.get(`/payroll/month/${month}`);
  return res.data;
};

export const getAttendanceSummary = async (employeeId, month) => {
  const client = getApiClient();
  const res = await client.get(`/payroll/attendance/${employeeId}?month=${month}`);
  return res.data;
};

export const getIncentivesSummary = async (employeeId, month) => {
  const client = getApiClient();
  const res = await client.get(`/payroll/incentives/${employeeId}?month=${month}`);
  return res.data;
};

export const generatePayroll = async (data) => {
  const client = getApiClient();
  const res = await client.post('/payroll/generate', data);
  return res.data;
};

export default {
  getPayrollByEmployee,
  getPayrollsByMonth,
  getAttendanceSummary,
  getIncentivesSummary,
  generatePayroll
};
