'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ShieldCheck, Zap, DollarSign, Loader2, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '@/lib/axios';

export default function SellJewelryPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        item_type: '',
        material: '',
        description: '',
        images: [] as string[]
    });

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/jewelry-purchases/submit', formData);
            setSuccess(true);
        } catch (err) {
            console.error('Submission failed:', err);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="pt-40 pb-24 min-h-screen flex items-center justify-center bg-base">
                <Container>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xl mx-auto text-center bg-white p-16 shadow-lg border border-gray-100"
                    >
                        <CheckCircle2 className="mx-auto text-secondary mb-8" size={64} />
                        <h1 className="text-4xl font-heading mb-6">Submission Received</h1>
                        <p className="text-gray-600 mb-10 leading-relaxed italic">
                            "Your legacy pieces are in expert hands. Our master appraisers will review your submission and provide a preliminary valuation within 48 hours."
                        </p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="bg-primary text-white px-12 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary transition-all"
                        >
                            Back to Collection
                        </button>
                    </motion.div>
                </Container>
            </div>
        );
    }

    return (
        <div className="pt-40 pb-24 bg-base min-h-screen">
            <Container>
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-20">
                        <span className="text-secondary font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">Legacy Acquisitions</span>
                        <h1 className="text-5xl font-heading mb-6">Sell Your Fine Jewelry</h1>
                        <p className="text-gray-500 max-w-2xl mx-auto italic leading-relaxed">
                            We offer competitive invitations for exceptional pieces and heirloom collections. Receive a professional appraisal and immediate liquidity for your treasures.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                        <div className="bg-white p-8 text-center border border-gray-100">
                            <ShieldCheck className="mx-auto text-secondary mb-4" size={32} />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2">Secure Appraisal</h3>
                            <p className="text-[10px] text-gray-400 leading-relaxed">Expert valuation based on current market prestige and material purity.</p>
                        </div>
                        <div className="bg-white p-8 text-center border border-gray-100">
                            <Zap className="mx-auto text-secondary mb-4" size={32} />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2">Fast Liquidity</h3>
                            <p className="text-[10px] text-gray-400 leading-relaxed">Receive a formal offer within 2 business days of digital submission.</p>
                        </div>
                        <div className="bg-white p-8 text-center border border-gray-100">
                            <DollarSign className="mx-auto text-secondary mb-4" size={32} />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2">Premium Rates</h3>
                            <p className="text-[10px] text-gray-400 leading-relaxed">Top-tier payouts for high-quality diamonds, gold, and brand-name pieces.</p>
                        </div>
                    </div>

                    <div className="bg-white p-12 shadow-sm border border-gray-100">
                        {/* Step Indicators */}
                        <div className="flex justify-between mb-12 relative overflow-hidden">
                            <div className="absolute top-4 left-0 w-full h-px bg-gray-100 z-0" />
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="relative z-10 flex flex-col items-center bg-white px-4">
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all ${step >= s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-300 border-gray-200'
                                        }`}>
                                        {s}
                                    </div>
                                    <span className={`text-[8px] font-bold uppercase tracking-widest mt-2 ${step >= s ? 'text-primary' : 'text-gray-300'}`}>
                                        {s === 1 ? 'Details' : s === 2 ? 'Description' : 'Imagery'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Item Category</label>
                                            <select
                                                value={formData.item_type}
                                                onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                                                className="w-full border-b border-gray-200 py-3 text-sm focus:border-secondary transition-colors outline-none bg-transparent"
                                            >
                                                <option value="">Select Category</option>
                                                <option value="Ring">Engagement or Fashion Ring</option>
                                                <option value="Necklace">Fine Necklace or Pendant</option>
                                                <option value="Watch">Luxury Timepiece</option>
                                                <option value="Bracelet">Bracelet or Bangle</option>
                                                <option value="Other">Other Treasure</option>
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Primary Material</label>
                                            <select
                                                value={formData.material}
                                                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                                                className="w-full border-b border-gray-200 py-3 text-sm focus:border-secondary transition-colors outline-none bg-transparent"
                                            >
                                                <option value="">Select Material</option>
                                                <option value="14k Gold">14k Yellow or White Gold</option>
                                                <option value="18k Gold">18k Yellow or Rose Gold</option>
                                                <option value="Platinum">Platinum</option>
                                                <option value="Sterling Silver">Sterling Silver</option>
                                                <option value="Multiple">Multiple Materials</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setStep(2)}
                                        disabled={!formData.item_type || !formData.material}
                                        className="w-full bg-primary text-white py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary transition-all flex items-center justify-center space-x-2 disabled:opacity-30"
                                    >
                                        <span>Describe Your Piece</span>
                                        <ChevronRight size={14} />
                                    </button>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Full Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={6}
                                            className="w-full border border-gray-100 p-6 text-sm focus:border-secondary transition-colors outline-none resize-none"
                                            placeholder="Include details on any hallmarks, stone weight, condition, and original brand if known..."
                                        />
                                    </div>
                                    <div className="flex space-x-4">
                                        <button
                                            onClick={() => setStep(1)}
                                            className="flex-1 border border-gray-200 text-gray-400 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
                                        >
                                            <ChevronLeft size={14} />
                                            <span>Previous</span>
                                        </button>
                                        <button
                                            onClick={() => setStep(3)}
                                            disabled={formData.description.length < 20}
                                            className="flex-[2] bg-primary text-white py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary transition-all flex items-center justify-center space-x-2 disabled:opacity-30"
                                        >
                                            <span>Upload Imagery</span>
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    <div className="border-2 border-dashed border-gray-100 rounded-lg p-12 text-center">
                                        <Camera className="mx-auto text-gray-300 mb-6" size={48} />
                                        <p className="text-xs text-gray-500 mb-8 italic">Attach high-resolution photos of the piece, including hallmarked areas and any certificates.</p>
                                        <button className="bg-gray-50 border border-gray-200 px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-100 transition-colors">
                                            Select Files (Coming Soon)
                                        </button>
                                    </div>

                                    <div className="flex space-x-4">
                                        <button
                                            onClick={() => setStep(2)}
                                            className="flex-1 border border-gray-200 text-gray-400 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
                                        >
                                            <ChevronLeft size={14} />
                                            <span>Return To Text</span>
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="flex-[2] bg-secondary text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary transition-all flex items-center justify-center space-x-4 disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                                <>
                                                    <span>Submit for Appraisal</span>
                                                    <CheckCircle2 size={16} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </Container>
        </div>
    );
}
