import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/axios';
import { CartItem, CartSummary } from '@/types/api';

interface CartState {
    items: any[];
    totalQuantity: number;
    totalAmount: number;
    isOpen: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: CartState = {
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
    isOpen: false,
    loading: false,
    error: null,
};

// Async Thunks
export const fetchCart = createAsyncThunk(
    'cart/fetchCart',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/cart');
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Failed to fetch cart');
        }
    }
);

export const addToCartServer = createAsyncThunk(
    'cart/addToCartServer',
    async (item: { product_id: string; quantity: number; variant_id?: string }, { dispatch, rejectWithValue }) => {
        try {
            await api.post('/cart/add', item);
            dispatch(fetchCart());
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Failed to add item');
        }
    }
);

export const removeFromCartServer = createAsyncThunk(
    'cart/removeFromCartServer',
    async (itemId: string, { dispatch, rejectWithValue }) => {
        try {
            await api.delete(`/cart/remove/${itemId}`);
            dispatch(fetchCart());
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Failed to remove item');
        }
    }
);

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        toggleCart: (state) => {
            state.isOpen = !state.isOpen;
        },
        setCart: (state, action: PayloadAction<{ items: any[]; summary: any }>) => {
            state.items = action.payload.items;
            state.totalQuantity = action.payload.summary.total_items;
            state.totalAmount = action.payload.summary.subtotal;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCart.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCart.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.items;
                state.totalQuantity = action.payload.summary.total_items;
                state.totalAmount = action.payload.summary.subtotal;
            })
            .addCase(fetchCart.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { toggleCart, setCart } = cartSlice.actions;
export default cartSlice.reducer;
