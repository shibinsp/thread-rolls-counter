// Use environment variable for API URL (production-ready)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:1212';

// Token management - always read fresh from localStorage
const getHeaders = () => {
    const headers = {};
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const setToken = (token) => {
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
};

export const getToken = () => localStorage.getItem('token');

export const api = {
    // Auth
    async login(username, password) {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }
        const data = await response.json();
        setToken(data.token);
        return data;
    },

    async logout() {
        setToken(null);
        localStorage.removeItem('user');
    },

    async getMe() {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Not authenticated');
        return response.json();
    },

    async changePassword(currentPassword, newPassword) {
        const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
            method: 'POST',
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                current_password: currentPassword, 
                new_password: newPassword 
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to change password');
        }
        return response.json();
    },

    // Admin
    async getUsers() {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('401 Unauthorized');
            throw new Error('Failed to fetch users');
        }
        return response.json();
    },

    async createUser(userData) {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
            method: 'POST',
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create user');
        }
        return response.json();
    },

    async updateUser(userId, userData) {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!response.ok) throw new Error('Failed to update user');
        return response.json();
    },

    async deleteUser(userId) {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete user');
        return response.json();
    },

    async getActivityLogs(limit = 100) {
        const response = await fetch(`${API_BASE_URL}/api/admin/activity?limit=${limit}`, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('401 Unauthorized');
            throw new Error('Failed to fetch activity');
        }
        return response.json();
    },

    async getAdminDashboard() {
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('401 Unauthorized');
            throw new Error('Failed to fetch dashboard');
        }
        return response.json();
    },

    async getUserDashboard() {
        const response = await fetch(`${API_BASE_URL}/api/user/dashboard`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard');
        return response.json();
    },

    async getModelFeedback() {
        const response = await fetch(`${API_BASE_URL}/api/admin/model-feedback`, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('401 Unauthorized');
            throw new Error('Failed to fetch model feedback');
        }
        return response.json();
    },

    // Manager endpoints
    async getManagerDashboard() {
        const response = await fetch(`${API_BASE_URL}/api/manager/dashboard`, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('401 Unauthorized');
            if (response.status === 403) throw new Error('403 Forbidden');
            throw new Error('Failed to fetch manager dashboard');
        }
        return response.json();
    },

    async getManagerUsers() {
        const response = await fetch(`${API_BASE_URL}/api/manager/users`, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('401 Unauthorized');
            if (response.status === 403) throw new Error('403 Forbidden');
            throw new Error('Failed to fetch users');
        }
        return response.json();
    },

    async getUserSlotsForManager(userId) {
        const response = await fetch(`${API_BASE_URL}/api/manager/users/${userId}/slots`, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('401 Unauthorized');
            if (response.status === 403) throw new Error('403 Forbidden');
            throw new Error('Failed to fetch user slots');
        }
        return response.json();
    },

    async getAllSlotsForManager() {
        const response = await fetch(`${API_BASE_URL}/api/manager/all-slots`, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('401 Unauthorized');
            if (response.status === 403) throw new Error('403 Forbidden');
            throw new Error('Failed to fetch all slots');
        }
        return response.json();
    },

    // Slots
    async getSlots() {
        const response = await fetch(`${API_BASE_URL}/api/slots`, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('401 Unauthorized');
            throw new Error('Failed to fetch slots');
        }
        return response.json();
    },

    async createSlot(name, description) {
        const response = await fetch(`${API_BASE_URL}/api/slots`, {
            method: 'POST',
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create slot');
        }
        return response.json();
    },

    async getSlot(slotId) {
        const response = await fetch(`${API_BASE_URL}/api/slots/${slotId}`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch slot');
        return response.json();
    },

    async deleteSlot(slotId) {
        const response = await fetch(`${API_BASE_URL}/api/slots/${slotId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete slot');
        return response.json();
    },

    // Entries
    async uploadEntry(slotId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE_URL}/api/slots/${slotId}/entries`, {
            method: 'POST',
            headers: getHeaders(),
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to upload');
        }
        return response.json();
    },

    async updateEntry(entryId, data) {
        const response = await fetch(`${API_BASE_URL}/api/entries/${entryId}`, {
            method: 'PUT',
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update entry');
        return response.json();
    },

    async submitEntry(entryId) {
        const response = await fetch(`${API_BASE_URL}/api/entries/${entryId}/submit`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to submit entry');
        return response.json();
    },

    async deleteEntry(entryId) {
        const response = await fetch(`${API_BASE_URL}/api/entries/${entryId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete entry');
        return response.json();
    },

    async getSlotEditHistory(slotId) {
        const response = await fetch(`${API_BASE_URL}/api/slots/${slotId}/edit-history`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch edit history');
        return response.json();
    },

    async getEntryEditHistory(entryId) {
        const response = await fetch(`${API_BASE_URL}/api/entries/${entryId}/edit-history`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch edit history');
        return response.json();
    },

    // Bounding Box / Detection APIs
    async getEntryDetections(entryId) {
        const response = await fetch(`${API_BASE_URL}/api/entries/${entryId}/detections`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch detections');
        return response.json();
    },

    async saveCorrections(entryId, correctedBoxes) {
        const response = await fetch(`${API_BASE_URL}/api/save-corrections`, {
            method: 'POST',
            headers: { ...getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entry_id: entryId,
                corrected_boxes: correctedBoxes
            }),
        });
        if (!response.ok) throw new Error('Failed to save corrections');
        return response.json();
    },

    async initDetections(entryId) {
        const response = await fetch(`${API_BASE_URL}/api/entries/${entryId}/init-detections`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to initialize detections');
        return response.json();
    },

    getSlotCsvUrl(slotId) {
        return `${API_BASE_URL}/api/slots/${slotId}/csv`;
    },

    async downloadSlotCsv(slotId) {
        const response = await fetch(`${API_BASE_URL}/api/slots/${slotId}/csv`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to download CSV');
        
        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `slot_${slotId}_export.csv`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename=(.+)/);
            if (match) filename = match[1];
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    },

    // Legacy
    async analyzeImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to analyze image');
        }
        return response.json();
    },

    async getHistory(limit = 50, offset = 0) {
        const response = await fetch(`${API_BASE_URL}/api/history?limit=${limit}&offset=${offset}`);
        if (!response.ok) throw new Error('Failed to fetch history');
        return response.json();
    },

    async getAnalysis(id) {
        const response = await fetch(`${API_BASE_URL}/api/analysis/${id}`);
        if (!response.ok) throw new Error('Failed to fetch analysis');
        return response.json();
    },

    getImageUrl(path) {
        // Images are served by nginx from the same origin
        // No need to prefix with API_BASE_URL since nginx handles routing
        if (!path) return '';
        // If path already starts with http/https, return as-is
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        // For relative paths like /uploads/image.jpg, return as-is
        // The browser will request from the same origin
        return path;
    },
};
