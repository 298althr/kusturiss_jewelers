import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    withCredentials: true, // Required for cookie-based auth
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Admin Token & Cart Session
api.interceptors.request.use((config) => {
    // Admin Bearer Token
    if (typeof window !== 'undefined') {
        const adminToken = localStorage.getItem('admin_token');
        if (adminToken && config.headers) {
            config.headers.Authorization = `Bearer ${adminToken}`;
        }

        // Persistent Guest Cart Session
        const cartSession = localStorage.getItem('cart_session_id');
        if (cartSession && config.headers) {
            config.headers['x-cart-session'] = cartSession;
        }
    }
    return config;
});

// Response Interceptor: Handle Sessions & Errors
api.interceptors.response.use(
    (response) => {
        // If backend returns a new session ID, persist it
        if (response.data?.session_id) {
            localStorage.setItem('cart_session_id', response.data.session_id);
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // Logic for session expiry
            console.warn('Session expired or unauthorized');
        }
        return Promise.reject(error);
    }
);

export default api;
