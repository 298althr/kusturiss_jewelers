'use client';

import { useEffect, useState } from 'react';
import { Container } from '@/components/ui/Container';
import Image from 'next/image';
import Link from 'next/link';
import { Search, SlidersHorizontal, Heart, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProducts } from '@/store/slices/productSlice';
import { BottomNav } from '@/components/layout/BottomNav';

export default function CatalogPage() {
    const dispatch = useAppDispatch();
    const { list: products, loading } = useAppSelector((state) => state.product);
    const [activeCategory, setActiveCategory] = useState('All Pieces');
    const [searchQuery, setSearchQuery] = useState('');

    const categories = ['All Pieces', 'Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Watches'];

    useEffect(() => {
        const params = activeCategory === 'All Pieces' ? {} : { category: activeCategory.toLowerCase() };
        dispatch(fetchProducts(params));
    }, [dispatch, activeCategory]);

    return (
        <div className="min-h-screen bg-[#FDFDFB] pt-32 pb-32">
            <Container>
                {/* Search & Filter - Image Style */}
                <div className="mb-12 space-y-8">
                    <div className="flex items-center space-x-4 max-w-xl mx-auto">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-secondary transition-colors" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="FIND YOUR RADIANCE"
                                className="w-full bg-transparent border-b border-gray-100 pl-8 py-4 text-xs font-bold tracking-[0.2em] outline-none focus:border-secondary transition-all placeholder:text-gray-300"
                            />
                        </div>
                        <button className="p-2 text-primary hover:text-secondary transition-colors">
                            <SlidersHorizontal size={20} />
                        </button>
                    </div>

                    {/* Category Scroll - Image Style */}
                    <div className="flex items-center space-x-8 overflow-x-auto no-scrollbar pb-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap pb-2 border-b-2 ${activeCategory === cat
                                        ? 'text-primary border-primary'
                                        : 'text-gray-300 border-transparent hover:text-gray-500'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-secondary" size={40} />
                    </div>
                )}

                {/* Product Grid - Image Style */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
                        {products.map((product) => {
                            const primaryImage = product.images.find(img => img.isPrimary)?.imageUrl || '/placeholder-jewelry.jpg';

                            return (
                                <div key={product.id} className="group flex flex-col">
                                    <Link href={`/products/${product.id}`} className="block relative">
                                        <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden mb-5 bg-[#F5F5F0] shadow-sm transform transition-transform duration-500 group-hover:scale-[1.02]">
                                            <Image
                                                src={primaryImage}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                            />
                                            {/* Heart Overlay */}
                                            <button className="absolute top-4 right-4 p-2.5 bg-white/80 backdrop-blur-md rounded-full text-primary hover:text-secondary transition-colors shadow-sm z-10">
                                                <Heart size={16} />
                                            </button>
                                        </div>
                                    </Link>

                                    <div className="px-2 space-y-1">
                                        <h3 className="text-sm md:text-md font-heading text-primary leading-tight line-clamp-2">
                                            {product.name}
                                        </h3>
                                        <p className="text-[11px] font-bold tracking-tight text-secondary">
                                            ${Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty State */}
                {!loading && products.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-300 font-heading italic text-xl">No pieces found in this collection.</p>
                    </div>
                )}
            </Container>

            {/* Bottom Nav for Mobile */}
            <BottomNav />
        </div>
    );
}
