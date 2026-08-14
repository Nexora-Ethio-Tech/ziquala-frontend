import api from './api';

export interface Asset {
  id: string;
  name: string;
  description?: string;
  amount: number;
  value: number;
  branch_id: string;
  created_at: string;
  updated_at: string;
}

export const getAssets = async (branchId?: string): Promise<Asset[]> => {
  const params = branchId ? { branchId } : {};
  try {
    const resp = await api.get('/storekeeper/assets', { params });
    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.data?.data)) return resp.data.data;
  } catch {
    try {
      const resp = await api.get('/school-admin/assets', { params });
      if (Array.isArray(resp.data)) return resp.data;
      if (Array.isArray(resp.data?.data)) return resp.data.data;
    } catch (e) {
      console.warn('Failed to fetch assets:', e);
    }
  }
  return [];
};

export const createAsset = async (asset: {
  name: string;
  description?: string;
  amount: number;
  value: number;
  branch_id: string;
}): Promise<Asset> => {
  try {
    const resp = await api.post('/storekeeper/assets', asset);
    return resp.data;
  } catch {
    const resp = await api.post('/school-admin/assets', asset);
    return resp.data;
  }
};

export const updateAsset = async (id: string, asset: {
  name?: string;
  description?: string;
  amount?: number;
  value?: number;
  branch_id?: string;
  reason?: string;
}): Promise<Asset> => {
  try {
    const resp = await api.post(`/storekeeper/assets/${id}`, asset);
    return resp.data;
  } catch {
    const resp = await api.post(`/school-admin/assets/${id}`, asset);
    return resp.data;
  }
};

export const deleteAsset = async (id: string): Promise<void> => {
  try {
    await api.delete(`/storekeeper/assets/${id}`);
  } catch {
    await api.delete(`/school-admin/assets/${id}`);
  }
};
