export interface ProductImage {
    id: string;
    imageUrl: string;
    altText: string;
    sortOrder: number;
    isPrimary: boolean;
}

export interface ProductCategory {
    id: string;
    name: string;
    slug: string;
}

export interface ProductVariant {
    id: string;
    sku: string;
    name: string;
    price: number;
    weight: number | null;
    inventoryCount: number;
    imageUrl: string | null;
    position: number;
}

export interface Product {
    id: string;
    sku: string;
    name: string;
    description: string;
    short_description: string;
    price: number;
    compare_at_price: number | null;
    cost_price: number | null;
    weight: number | null;
    dimensions: any;
    inventory_count: number;
    track_inventory: boolean;
    allow_backorder: boolean;
    requires_shipping: boolean;
    is_taxable: boolean;
    status: 'active' | 'draft' | 'archived';
    seo_title: string | null;
    seo_description: string | null;
    created_at: string;
    updated_at: string;
    images: ProductImage[];
    categories: ProductCategory[];
    variants: ProductVariant[];
}

export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
    role?: 'admin' | 'manager' | 'customer';
}

export interface CartItem {
    id: string;
    product_id: string;
    variant_id: string | null;
    quantity: number;
    unit_price: number;
    name: string;
    sku: string;
    price: number;
    stock: number;
    image_url: string;
}

export interface CartSummary {
    total_items: number;
    subtotal: number;
    estimated_tax?: number;
    estimated_shipping?: number;
    total?: number;
}

export interface ApiResponse<T> {
    success?: boolean;
    data?: T;
    message?: string;
    error?: string;
    code?: string;
}
