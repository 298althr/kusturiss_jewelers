'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';

const products = [
    { id: '1', name: 'The Heirloom Ring', price: 4200, category: 'Rings', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3f41e?auto=format&fit=crop&q=80&w=800' },
    { id: '2', name: 'Golden Solace Pendant', price: 1850, category: 'Necklaces', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800' },
    { id: '3', name: 'Celestial Diamond Studs', price: 2900, category: 'Earrings', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800' },
    { id: '4', name: 'Vantage Chrono Gold', price: 8500, category: 'Watches', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=800' },
];

export function FeaturedProducts() {
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
                            <div className="relative aspect-[4/5] overflow-hidden mb-6 bg-gray-100">
                                <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <span className="bg-white text-primary text-[10px] font-bold uppercase tracking-widest px-6 py-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                        Quick View
                                    </span>
                                </div>
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 block">{product.category}</span>
                                <h3 className="font-heading text-lg text-primary mb-2">{product.name}</h3>
                                <p className="text-secondary font-medium tracking-tighter">${product.price.toLocaleString()}</p>
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
