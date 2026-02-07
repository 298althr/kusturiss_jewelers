'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleCart, fetchCart, removeFromCartServer } from '@/store/slices/cartSlice';
import Image from 'next/image';
import Link from 'next/link';

export function CartDrawer() {
    const { items, totalAmount, totalQuantity, isOpen, loading } = useAppSelector((state) => state.cart);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (isOpen) {
            dispatch(fetchCart());
        }
    }, [isOpen, dispatch]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex justify-end">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => dispatch(toggleCart())}
                    className="absolute inset-0 bg-primary/40 backdrop-blur-sm shadow-2xl"
                />

                {/* Drawer */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="px-8 py-8 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-heading text-primary">Your Collection</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                            </p>
                        </div>
                        <button onClick={() => dispatch(toggleCart())} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="animate-spin text-secondary" size={32} />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-20 h-20 bg-base rounded-full flex items-center justify-center text-gray-300">
                                    <ShoppingBag size={40} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-heading mb-2">Your collection is empty</h3>
                                    <p className="text-sm text-gray-500 underline decoration-secondary underline-offset-4">
                                        <Link href="/products" onClick={() => dispatch(toggleCart())}>Start exploring</Link>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {items.map((item) => (
                                    <div key={item.id} className="flex space-x-6">
                                        <div className="relative w-24 h-32 bg-gray-50 overflow-hidden flex-shrink-0">
                                            <Image
                                                src={item.image_url || '/placeholder-jewelry.jpg'}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-sm font-bold uppercase tracking-widest text-primary leading-snug">{item.name}</h4>
                                                    <button
                                                        onClick={() => dispatch(removeFromCartServer(item.id))}
                                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">SKU: {item.sku}</p>
                                            </div>

                                            <div className="flex justify-between items-center mt-4">
                                                <div className="flex items-center space-x-4 border border-gray-100 px-3 py-1">
                                                    <span className="text-xs font-bold text-primary">{item.quantity}</span>
                                                </div>
                                                <p className="text-sm font-medium tracking-tight">${Number(item.unit_price).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && !loading && (
                        <div className="px-8 py-10 border-t border-gray-100 space-y-6">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estimated Total</span>
                                <span className="text-3xl font-medium tracking-tight text-primary">${totalAmount.toLocaleString()}</span>
                            </div>
                            <p className="text-center text-[10px] text-gray-400 uppercase tracking-[0.2em]">Shipping & Taxes calculated at checkout</p>
                            <Link
                                href="/checkout"
                                onClick={() => dispatch(toggleCart())}
                                className="w-full bg-primary text-white py-5 text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-4 hover:bg-secondary transition-all"
                            >
                                Proceed to Checkout
                            </Link>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
