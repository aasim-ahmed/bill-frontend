import client from './client';

export const getProductByBarcode = (barcode) => {
  return client.get(`/api/products/${barcode}`);
};

export const createProduct = (productData) => {
  return client.post('/api/products', productData);
};
