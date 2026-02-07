'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';

interface Product {
    id: string;
    name: string;
    price: number;
    images: { imageUrl: string }[];
    status: string;
    short_description?: string;
}

export function FeaturedProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.get('/products?limit=4');
                setProducts(response.data.products);
            } catch (error) {
                console.error('Failed to fetch featured products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) {
        return (
            <div className="py-24 bg-base flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Loading Collection...</p>
            </div>
        );
    }

    return (
        <section className="py-24 bg-base">
            <Container>
                <div className="flex justify-between items-end mb-16">
                    <div>
                        <span className="text-secondary font-bold uppercase tracking-[0.2em] text-[10px] mb-2 block">Our Favorites</span>
                        <h2 className="text-4xl md:text-5xl font-heading text-primary">The Curated Collection</h2>
                    </div>
                    <Link href="/products" className="text-xs font-bold uppercase tracking-widest border-b border-primary hover:text-secondary hover:border-secondary transition-all pb-1 hidden sm:block">
                        View All Pieces
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.map((product, idx) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="group cursor-pointer"
                        >
                            <div className="relative aspect-[4/5] overflow-hidden mb-6 bg-gray-50 border border-gray-100">
                                <Image
                                    src={product.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&q=80&w=800'}
                                    alt={product.name}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                />
                                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <span className="bg-white text-primary text-[10px] font-bold uppercase tracking-widest px-6 py-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                        View Details
                                    </span>
                                </div>
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 block">Exquisite Piece</span>
                                <h3 className="font-heading text-lg text-primary mb-2 line-clamp-1">{product.name}</h3>
                                <p className="text-secondary font-medium tracking-tighter">${Number(product.price).toLocaleString()}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <Link href="/products" className="sm:hidden block text-center mt-12 text-xs font-bold uppercase tracking-widest border-b border-primary max-w-max mx-auto pb-1">
                    View All Pieces
                </Link>
            </Container>
        </section>
    );
}
