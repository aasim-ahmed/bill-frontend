import client from './client';
import { DEFAULT_PAGINATION_LIMIT } from '../constants/config';

export const getRecentBills = (limit = DEFAULT_PAGINATION_LIMIT) => {
  return client.get(`/api/bills?limit=${limit}`);
};

export const getBillById = (id) => {
  return client.get(`/api/bills/${id}`);
};

export const createBill = (billData) => {
  return client.post('/api/bills', billData);
};

export const updateBill = (id, billData) => {
  return client.put(`/api/bills/${id}`, billData);
};
