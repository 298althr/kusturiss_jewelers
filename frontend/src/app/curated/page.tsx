'use client';

import { Container } from '@/components/ui/Container';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import api from '@/lib/axios';

interface Product {
    id: string;
    name: string;
    price: number;
    images: { imageUrl: string }[];
    status: string;
}

export default function CuratedCollectionPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCurated = async () => {
            try {
                // Fetch top 8 pieces for the curated collection
                const response = await api.get('/products?limit=8');
                setProducts(response.data.products);
            } catch (error) {
                console.error('Failed to fetch curated collection:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCurated();
    }, []);

    return (
        <div className="min-h-screen bg-base pt-32 pb-24">
            <Container>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-20 space-y-4"
                >
                    <span className="text-secondary font-bold uppercase tracking-[0.4em] text-[10px] block">Exclusive Editorial</span>
                    <h1 className="text-5xl md:text-7xl font-heading text-primary leading-tight">The Curated <br /><span className="italic">Collection</span></h1>
                    <p className="max-w-xl mx-auto text-gray-400 text-xs uppercase tracking-widest leading-loose pt-4">
                        A hand-selected gallery of our most profound pieces, <br /> defining the intersection of heritage and modern elegance.
                    </p>
                </motion.div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-6">
                        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] uppercase tracking-widest text-[#6b6b6b] font-bold">Assembling Gallery...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {products.map((product, idx) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="group"
                            >
                                <Link href={`/products/${product.id}`} className="block relative aspect-[3/4] overflow-hidden mb-6 bg-white border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
                                    <Image
                                        src={product.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&q=80&w=800'}
                                        alt={product.name}
                                        fill
                                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                                        <div className="flex flex-col items-center space-y-4 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-700">
                                            <span className="bg-white text-primary text-[10px] font-bold uppercase tracking-widest px-8 py-4">View Masterpiece</span>
                                        </div>
                                    </div>
                                </Link>
                                <div className="text-center space-y-2">
                                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Master Artisan Series</p>
                                    <h3 className="font-heading text-xl text-primary">{product.name}</h3>
                                    <p className="text-secondary font-medium tracking-tighter text-lg">${Number(product.price).toLocaleString()}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </Container>
        </div>
    );
}
