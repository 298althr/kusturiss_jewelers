import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/lib/axios';
import { Product } from '@/types/api';

interface ProductState {
    list: Product[];
    currentProduct: Product | null;
    loading: boolean;
    error: string | null;
    pagination: {
        currentPage: number;
        totalPages: number;
    };
}

const initialState: ProductState = {
    list: [],
    currentProduct: null,
    loading: false,
    error: null,
    pagination: {
        currentPage: 1,
        totalPages: 1,
    },
};

export const fetchProducts = createAsyncThunk(
    'products/fetchAll',
    async (params: any, { rejectWithValue }) => {
        try {
            const response = await api.get('/products', { params });
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Failed to fetch products');
        }
    }
);

export const fetchProductById = createAsyncThunk(
    'products/fetchById',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await api.get(`/products/${id}`);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Failed to fetch product details');
        }
    }
);

const productSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload.products;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchProductById.fulfilled, (state, action) => {
                state.currentProduct = action.payload.product;
            });
    },
});

export default productSlice.reducer;
