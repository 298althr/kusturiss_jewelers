'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, MoreVertical, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/axios';

export default function AdminProducts() {
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const response = await api.get('/products');
                setProducts(response.data.products);
            } catch (err) {
                console.error('Failed to load products:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadProducts();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to archive this piece?')) return;
        try {
            await api.delete(`/products/${id}`);
            setProducts(products.filter(p => p.id !== id));
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-heading italic">Product Inventory</h2>
                <Link href="/admin/products/new">
                    <button className="bg-secondary text-primary px-8 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center space-x-3 hover:bg-primary hover:text-white transition-all">
                        <Plus size={16} />
                        <span>New Piece</span>
                    </button>
                </Link>
            </div>

            {/* Grid Container */}
            <div className="bg-white shadow-sm border border-gray-100 p-8 min-h-[400px]">
                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="animate-spin text-secondary" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {products.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-4">
                                <Search size={48} className="opacity-10" />
                                <p className="text-sm italic uppercase tracking-widest">No pieces found in inventory</p>
                            </div>
                        ) : products.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center space-x-8">
                                    <div className="relative w-20 h-20 bg-gray-50 overflow-hidden">
                                        <Image src={p.images?.[0]?.imageUrl || '/placeholder-jewelry.jpg'} alt={p.name} fill className="object-cover" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-widest text-primary mb-1">{p.name}</h4>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{p.sku} | {p.status}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-20">
                                    <div className="text-center min-w-[100px]">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">MSRP</p>
                                        <p className="text-sm font-bold text-primary">${Number(p.price).toLocaleString()}</p>
                                    </div>
                                    <div className="text-center min-w-[80px]">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Stamina</p>
                                        <p className={`text-sm font-bold ${p.inventory_count < 5 ? 'text-orange-500' : 'text-primary'}`}>{p.inventory_count || 0}</p>
                                    </div>
                                    <div className="flex space-x-4">
                                        <button className="p-3 text-gray-400 hover:text-secondary transition-colors"><Edit3 size={18} /></button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="p-3 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
