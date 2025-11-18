// API call utilities

// ===== API CALLS =====
async function apiCall(endpoint, options = {}) {
    try {
        const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : '/api';
        const response = await fetch(`${apiBase}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Có lỗi xảy ra');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        if (typeof showToast === 'function') {
            showToast(`Lỗi: ${error.message}`, 'error');
        }
        throw error;
    }
}

