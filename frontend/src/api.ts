import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface User {
    id: number;
    email: string;
    role: 'Operation Manager' | 'Maintenance';
    assigned_garage: 'North' | 'South' | null;
}

export interface Bus {
    id: string;
    model: string;
    location: 'North Garage' | 'South Garage' | 'On Service';
    mileage: number;
    last_service_mileage: number;
    due_for_pm: boolean;
    status: 'Ready' | 'Critical' | 'Needs Maintenance';
}

export interface WorkOrder {
    id: number;
    bus_id: string;
    date: string;
    reported_by: string;
    severity: 'SEV1' | 'SEV2' | 'SEV3' | null;
    description: string;
    status: 'Open' | 'Fixed';
    is_pm: boolean;
}

export interface InventoryItem {
    id: number;
    item_name: string;
    quantity: number;
    threshold: number;
    garage: 'North' | 'South';
}

export interface UsedPart {
    id: number;
    inventory_id: number;
    work_order_id: number;
    quantity_used: number;
}

export const authApi = {
    login: async (email: string, password: string) => {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
        const response = await api.post('/auth/token', formData);
        return response.data;
    },
    getMe: async () => {
        const response = await api.get<User>('/users/me');
        return response.data;
    },
};

export const busApi = {
    getAll: async (garage?: string) => {
        const params = garage ? { garage } : {};
        const response = await api.get<Bus[]>('/buses', { params });
        return response.data;
    },
    getOne: async (id: string) => {
        const response = await api.get<Bus>(`/buses/${id}`);
        return response.data;
    },
};

export const workOrderApi = {
    getAll: async () => {
        const response = await api.get<WorkOrder[]>('/work-orders');
        return response.data;
    },
    create: async (data: { bus_id: string; description: string; severity?: string | null; reported_by: string; is_pm?: boolean }) => {
        const response = await api.post<WorkOrder>('/work-orders', data);
        return response.data;
    },
    fix: async (id: number) => {
        const response = await api.put(`/work-orders/${id}/fix`);
        return response.data;
    },
    listUsedParts: async (id: number) => {
        const response = await api.get<UsedPart[]>(`/work-orders/${id}/used-parts`);
        return response.data;
    },
    addUsedPart: async (id: number, data: { inventory_id: number; quantity_used: number }) => {
        const response = await api.post<UsedPart>(`/work-orders/${id}/used-parts`, {
            inventory_id: data.inventory_id,
            work_order_id: id,
            quantity_used: data.quantity_used,
        });
        return response.data;
    },
};

export const inventoryApi = {
    getAll: async (garage?: string) => {
        const params = garage && garage !== 'all' ? { garage } : {};
        const response = await api.get<InventoryItem[]>('/inventory', { params });
        return response.data;
    },
};

export default api;
