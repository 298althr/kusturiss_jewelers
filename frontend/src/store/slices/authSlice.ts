import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/axios';
import { AuthUser, ApiResponse } from '@/types/api';

interface AuthState {
    user: AuthUser | null;
    isAdmin: boolean;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    isAdmin: false,
    isAuthenticated: false,
    loading: false,
    error: null,
};

// Async Thunks
export const login = createAsyncThunk(
    'auth/login',
    async (credentials: any, { rejectWithValue }) => {
        try {
            const response = await api.post('/user/login', credentials);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Login failed');
        }
    }
);

export const adminLogin = createAsyncThunk(
    'auth/adminLogin',
    async (credentials: any, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/admin/login', credentials);
            if (response.data.tokens?.accessToken) {
                localStorage.setItem('admin_token', response.data.tokens.accessToken);
            }
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Admin login failed');
        }
    }
);

export const adminRegister = createAsyncThunk(
    'auth/adminRegister',
    async (adminData: any, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/admin/register', adminData);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Admin registration failed');
        }
    }
);

export const register = createAsyncThunk(
    'auth/register',
    async (userData: any, { rejectWithValue }) => {
        try {
            const response = await api.post('/user/register', userData);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Registration failed');
        }
    }
);

export const fetchProfile = createAsyncThunk(
    'auth/fetchProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/user/profile');
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Failed to fetch profile');
        }
    }
);

export const forgotPassword = createAsyncThunk(
    'auth/forgotPassword',
    async (email: string, { rejectWithValue }) => {
        try {
            const response = await api.post('/user/forgot-password', { email });
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Failed to send reset link');
        }
    }
);

export const resetPassword = createAsyncThunk(
    'auth/resetPassword',
    async (data: any, { rejectWithValue }) => {
        try {
            const response = await api.post('/user/reset-password', data);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Failed to reset password');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isAdmin = false;
            localStorage.removeItem('admin_token');
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // User Login
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.customer;
                state.isAdmin = false;
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Admin Login
            .addCase(adminLogin.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(adminLogin.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.isAdmin = true;
                state.user = action.payload.admin;
            })
            .addCase(adminLogin.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Admin Register
            .addCase(adminRegister.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(adminRegister.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(adminRegister.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch Profile
            .addCase(fetchProfile.fulfilled, (state, action) => {
                state.user = action.payload.customer;
                state.isAuthenticated = true;
                state.loading = false;
            })
            // Forgot Password
            .addCase(forgotPassword.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(forgotPassword.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(forgotPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Reset Password
            .addCase(resetPassword.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(resetPassword.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
