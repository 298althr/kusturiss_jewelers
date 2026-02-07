'use client';

import { Container } from '@/components/ui/Container';
import Link from 'next/link';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-[#FDFDFB] pt-32 pb-32 flex items-center">
            <Container>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-xl mx-auto"
                >
                    <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-50 text-center space-y-10">
                        <div className="flex justify-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                                className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center text-secondary border-4 border-white shadow-xl"
                            >
                                <CheckCircle size={48} strokeWidth={1.5} />
                            </motion.div>
                        </div>

                        <div className="space-y-4">
                            <span className="text-secondary font-black uppercase tracking-[0.4em] text-[10px] block">Formal Confirmation</span>
                            <h1 className="text-4xl md:text-5xl font-heading text-primary italic leading-tight">Your order has been secured.</h1>
                            <p className="text-gray-400 text-xs md:text-sm leading-relaxed max-w-sm mx-auto font-medium">
                                Our master curators are now preparing your heritage pieces for their journey. You will receive an invitation to track your shipment shortly.
                            </p>
                        </div>

                        <div className="bg-[#F9F9F4] rounded-[2.5rem] p-6 md:p-10 border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="text-center md:text-left">
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Vault Reference</p>
                                <p className="text-sm font-black text-primary tracking-widest">#KJ-82749-2024</p>
                            </div>
                            <Link href="/account/orders" className="group flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
                                <span>Track Journey</span>
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="pt-4">
                            <Link
                                href="/"
                                className="inline-flex items-center space-x-3 bg-primary text-white px-10 py-5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-secondary hover:text-primary transition-all shadow-xl shadow-primary/10"
                            >
                                <ArrowLeft size={14} />
                                <span>Return to Maison</span>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </Container>
        </div>
    );
}
