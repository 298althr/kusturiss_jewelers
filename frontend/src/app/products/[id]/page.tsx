'use client';

import { useEffect, useState } from 'react';
import { Container } from '@/components/ui/Container';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, ShieldCheck, Truck, RefreshCw, Loader2, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProductById } from '@/store/slices/productSlice';
import { addToCartServer } from '@/store/slices/cartSlice';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
    const dispatch = useAppDispatch();
    const { currentProduct: product, loading } = useAppSelector((state) => state.product);

    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState('');

    useEffect(() => {
        dispatch(fetchProductById(params.id));
    }, [dispatch, params.id]);

    useEffect(() => {
        if (product?.images?.length) {
            const primary = product.images.find((img: any) => img.isPrimary) || product.images[0];
            setActiveImage(primary.imageUrl);
        }
        if (product?.variants?.length) {
            setSelectedVariantId(product.variants[0].id);
        }
    }, [product]);

    const handleAddToCart = () => {
        if (product) {
            dispatch(addToCartServer({
                product_id: product.id,
                quantity: 1,
                variant_id: selectedVariantId || undefined
            }));
        }
    };

    if (loading || !product) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-secondary" size={48} />
            </div>
        );
    }

    const selectedVariant = product.variants?.find((v: any) => v.id === selectedVariantId) || product;

    return (
        <div className="pt-40 pb-24 bg-base min-h-screen">
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
                    {/* Gallery */}
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative aspect-square bg-white shadow-lg border border-gray-100 overflow-hidden group"
                        >
                            <Image
                                src={activeImage || '/placeholder-jewelry.jpg'}
                                alt={product.name}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        </motion.div>
                        <div className="grid grid-cols-4 gap-4">
                            {product.images.map((img: any, idx: number) => (
                                <button
                                    key={idx}
                                    className={`relative aspect-square border transition-all ${activeImage === img.imageUrl ? 'border-secondary' : 'border-gray-100 hover:border-secondary/50'} overflow-hidden bg-white`}
                                    onClick={() => setActiveImage(img.imageUrl)}
                                >
                                    <Image src={img.imageUrl} alt={`${product.name} view ${idx}`} fill className="object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col">
                        <div className="mb-10 pb-10 border-b border-gray-100">
                            <span className="text-secondary font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">
                                {product.categories?.[0]?.name || 'Heritage Collection'}
                            </span>
                            <h1 className="text-5xl font-heading text-primary mb-6">{product.name}</h1>
                            <div className="flex items-center space-x-6 mb-6">
                                <div className="flex items-center text-secondary">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                                </div>
                                <div className="w-px h-4 bg-gray-200" />
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">GIA Certified & Appraised</span>
                            </div>
                            <p className="text-4xl font-medium tracking-tighter text-primary">${Number(selectedVariant.price).toLocaleString()}</p>
                        </div>

                        <div className="space-y-10 mb-12">
                            {/* Variant Selection */}
                            {product.variants && product.variants.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 block">Configure Selection</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {product.variants.map((variant: any) => (
                                            <button
                                                key={variant.id}
                                                onClick={() => setSelectedVariantId(variant.id)}
                                                className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest border transition-all text-left flex justify-between items-center ${selectedVariantId === variant.id ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span>{variant.name}</span>
                                                {selectedVariantId === variant.id && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Detailed Description */}
                            <div className="bg-white p-8 border border-gray-50 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                    <ShieldCheck size={48} className="text-primary" />
                                </div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-4 block">Provenence & Details</label>
                                <p className="text-gray-500 text-sm leading-relaxed italic">{product.description}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4 mb-16">
                            <button
                                className="w-full bg-primary text-white py-5 text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-4 hover:bg-secondary transition-all transform active:scale-95"
                                onClick={handleAddToCart}
                            >
                                <ShoppingBag size={18} />
                                <span>Add to Collection</span>
                            </button>
                            <button className="w-full border border-primary text-primary py-5 text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all transform active:scale-95">
                                Book a Private Viewing
                            </button>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-2 gap-y-8 border-t border-gray-100 pt-10">
                            <div className="flex items-center space-x-4">
                                <ShieldCheck size={20} className="text-secondary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Lifetime Warranty</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <Truck size={20} className="text-secondary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Insured Shipping</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <RefreshCw size={20} className="text-secondary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">30-Day Returns</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <Star size={20} className="text-secondary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Conflict Free</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
