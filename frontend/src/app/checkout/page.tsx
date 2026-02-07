'use client';

import { useState, useEffect } from 'react';
import { Container } from '@/components/ui/Container';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Truck, ShieldCheck, Gift, Flower2, Mail, MessageSquare, Loader2, Check, ArrowLeft, SlidersHorizontal, Lock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCart } from '@/store/slices/cartSlice';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Elements } from '@stripe/react-stripe-js';
import stripePromise from '@/lib/stripe';
import StripePayment from '@/components/checkout/StripePayment';

export default function CheckoutPage() {
    const [step, setStep] = useState(1);
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { items, totalAmount } = useAppSelector((state: any) => state.cart);
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    // Gifting State
    const [isGift, setIsGift] = useState(false);
    const [giftOptions, setGiftOptions] = useState({
        flowerPackage: '',
        cardType: '',
        message: '',
        deliveryInstructions: ''
    });

    const flowerPackages = [
        { id: 'bouquet_regal', name: 'Regal Peonies & Roses', price: 85, image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=200' },
        { id: 'bouquet_minimal', name: 'Alabaster Ranunculus', price: 55, image: 'https://images.unsplash.com/photo-1563241527-3004b7be0fab?auto=format&fit=crop&q=80&w=200' }
    ];

    const cardTypes = [
        { id: 'card_gold', name: 'Gold-Embossed "For You"', price: 10 },
        { id: 'card_minimal', name: 'Minimalist Ivory Card', price: 5 }
    ];

    useEffect(() => {
        dispatch(fetchCart());
    }, [dispatch]);

    const calculateAddonsTotal = () => {
        let total = 0;
        if (isGift) {
            const flower = flowerPackages.find(p => p.id === giftOptions.flowerPackage);
            const card = cardTypes.find(c => c.id === giftOptions.cardType);
            if (flower) total += flower.price;
            if (card) total += card.price;
        }
        return total;
    };

    const createCheckoutSession = async () => {
        setIsProcessing(true);
        try {
            const response = await api.post('/checkout/create-session', {
                session_id: localStorage.getItem('cart_session') || '',
                shipping_address: { street: 'Mock Street', city: 'Mock City' },
                shipping_method: 'USPS Priority',
                shipping_cost: 0
            });
            setCheckoutSessionId(response.data.checkout_session.id);
            setStep(3);
        } catch (err) {
            console.error('Session creation failed:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePaymentSuccess = async (paymentIntentId: string) => {
        setIsProcessing(true);
        try {
            await api.post('/checkout/complete', {
                checkout_session_id: checkoutSessionId,
                payment_method: 'stripe',
                payment_intent_id: paymentIntentId
            });
            router.push('/checkout/success');
        } catch (err) {
            console.error('Finalizing order failed:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFB] pt-32 pb-32">
            <Container>
                {/* Simplified Header for Checkout */}
                <div className="mb-12 flex justify-between items-center px-2">
                    <button onClick={() => router.back()} className="p-2 text-primary hover:text-secondary transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl md:text-2xl font-heading tracking-[0.2em] text-primary">CHECKOUT</h1>
                    <div className="w-10" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16">
                    {/* Main Checkout content */}
                    <div className="lg:col-span-12">
                        {/* Elegant Step Bar */}
                        <div className="flex justify-center items-center space-x-4 md:space-x-12 mb-16 overflow-x-auto no-scrollbar py-2 px-4">
                            {[
                                { number: 1, label: 'Delivery' },
                                { number: 2, label: 'Gifting' },
                                { number: 3, label: 'Payment' }
                            ].map((s) => (
                                <div key={s.number} className="flex items-center space-x-3 flex-shrink-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black tracking-tighter transition-all duration-500 ${step >= s.number ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-gray-50 text-gray-300'
                                        }`}>
                                        {step > s.number ? <Check size={16} /> : s.number}
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${step >= s.number ? 'text-primary' : 'text-gray-300'}`}>
                                        {s.label}
                                    </span>
                                    {s.number < 3 && <div className={`w-8 h-px transition-colors duration-500 ${step > s.number ? 'bg-primary' : 'bg-gray-100'}`} />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Left Column: Form Steps */}
                    <div className="lg:col-span-7 space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-50">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="delivery"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="space-y-10"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-1.5 h-6 bg-secondary rounded-full" />
                                            <h3 className="text-2xl font-heading text-primary italic">Heritage Service</h3>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Identity</label>
                                                    <input className="w-full bg-transparent border-b border-gray-100 py-3 text-sm focus:border-secondary transition-all outline-none" placeholder="First Name" />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Surname</label>
                                                    <input className="w-full bg-transparent border-b border-gray-100 py-3 text-sm focus:border-secondary transition-all outline-none" placeholder="Last Name" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Destination</label>
                                                <input className="w-full bg-transparent border-b border-gray-100 py-3 text-sm focus:border-secondary transition-all outline-none" placeholder="Street Address" />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Private Instructions</label>
                                                <textarea
                                                    className="w-full bg-gray-50/50 rounded-3xl p-6 text-sm focus:bg-white focus:ring-1 focus:ring-secondary transition-all outline-none resize-none h-32 border border-transparent focus:border-secondary/20"
                                                    placeholder="Inform our courier of specialized delivery needs..."
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setStep(2)}
                                            className="w-full bg-primary text-white py-6 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-secondary hover:text-primary transition-all shadow-xl shadow-primary/10 transform active:scale-[0.98]"
                                        >
                                            Initialize Gifting
                                        </button>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="gifting"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="space-y-10"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-1.5 h-6 bg-secondary rounded-full" />
                                                <h3 className="text-2xl font-heading text-primary italic">Signature Touches</h3>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={isGift} onChange={() => setIsGift(!isGift)} className="sr-only peer" />
                                                <div className="w-12 h-6 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                                            </label>
                                        </div>

                                        {isGift ? (
                                            <div className="space-y-12 animate-in fade-in zoom-in duration-500">
                                                {/* Flowers */}
                                                <div className="space-y-6">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Boutique Floral Pairing</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {flowerPackages.map((pkg) => (
                                                            <div
                                                                key={pkg.id}
                                                                onClick={() => setGiftOptions({ ...giftOptions, flowerPackage: pkg.id })}
                                                                className={`group relative rounded-[2rem] overflow-hidden border-2 transition-all p-2 ${giftOptions.flowerPackage === pkg.id ? 'border-secondary bg-secondary/5' : 'border-gray-50 hover:border-gray-200'
                                                                    }`}
                                                            >
                                                                <div className="relative aspect-video rounded-3xl overflow-hidden mb-4">
                                                                    <Image src={pkg.image} alt={pkg.name} fill className="object-cover" />
                                                                </div>
                                                                <div className="px-4 pb-2 flex justify-between items-center">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">{pkg.name}</p>
                                                                    <p className="text-[10px] font-black text-secondary">+${pkg.price}</p>
                                                                </div>
                                                                {giftOptions.flowerPackage === pkg.id && (
                                                                    <div className="absolute top-4 right-4 bg-secondary text-white p-1 rounded-full">
                                                                        <Check size={12} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Message */}
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Handwritten Sentiment</p>
                                                    <textarea
                                                        value={giftOptions.message}
                                                        onChange={(e) => setGiftOptions({ ...giftOptions, message: e.target.value })}
                                                        rows={4}
                                                        className="w-full bg-gray-50/50 rounded-3xl p-8 text-sm md:text-md font-heading italic focus:bg-white transition-all outline-none resize-none border border-transparent focus:border-secondary/20"
                                                        placeholder="Share your story..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-24 text-center bg-gray-50/30 rounded-[2.5rem] border border-dashed border-gray-100">
                                                <Gift className="mx-auto text-gray-200 mb-6" size={60} />
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em]">Standard Heritage Packaging Requested</p>
                                            </div>
                                        )}

                                        <div className="flex flex-col space-y-4 pt-4">
                                            <button
                                                onClick={createCheckoutSession}
                                                disabled={isProcessing}
                                                className="w-full bg-primary text-white py-6 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-secondary hover:text-primary transition-all shadow-xl shadow-primary/10 flex items-center justify-center space-x-3"
                                            >
                                                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <span>Formalize Payment</span>}
                                            </button>
                                            <button onClick={() => setStep(1)} className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300 hover:text-primary transition-colors">Return to Destination</button>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && checkoutSessionId && (
                                    <motion.div
                                        key="payment"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="space-y-10"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-1.5 h-6 bg-secondary rounded-full" />
                                                <h3 className="text-2xl font-heading text-primary italic">Secured Vault</h3>
                                            </div>
                                            <div className="flex items-center space-x-1 py-1 px-3 bg-green-50 rounded-full">
                                                <Lock size={10} className="text-green-600" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-green-700">Encrypted</span>
                                            </div>
                                        </div>

                                        <Elements stripe={stripePromise}>
                                            <StripePayment
                                                amount={totalAmount + calculateAddonsTotal()}
                                                checkoutSessionId={checkoutSessionId}
                                                onSuccess={handlePaymentSuccess}
                                                onError={setPaymentError}
                                            />
                                        </Elements>

                                        <div className="flex justify-center pt-8">
                                            <button onClick={() => setStep(2)} className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300 hover:text-primary transition-colors">Revisit Gifting</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Column: Premium Summary */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-50 flex flex-col">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 mb-10 text-center">Your Selection</h4>

                            <div className="space-y-8 mb-12">
                                {items.map((item: any) => (
                                    <div key={item.id} className="flex items-center space-x-6">
                                        <div className="relative w-24 h-24 rounded-[1.5rem] overflow-hidden bg-gray-50 shadow-sm flex-shrink-0">
                                            <Image src={item.image_url || '/placeholder-jewelry.jpg'} alt={item.name} fill className="object-cover" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-primary leading-tight">{item.name}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Qty: {item.quantity}</p>
                                            <p className="text-xs font-bold text-secondary italic mt-2">${(item.unit_price * item.quantity).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {isGift && (
                                <div className="p-6 bg-[#FDFDFB] rounded-[2rem] border border-gray-100 mb-10 space-y-4">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary">Enhancements Included</p>
                                    <div className="space-y-2">
                                        {giftOptions.flowerPackage && (
                                            <div className="flex justify-between text-[10px] font-bold text-primary uppercase tracking-widest">
                                                <span>Flower Curator</span>
                                                <span>+${flowerPackages.find(p => p.id === giftOptions.flowerPackage)?.price}</span>
                                            </div>
                                        )}
                                        {giftOptions.cardType && (
                                            <div className="flex justify-between text-[10px] font-bold text-primary uppercase tracking-widest">
                                                <span>Scripted Card</span>
                                                <span>+${cardTypes.find(c => c.id === giftOptions.cardType)?.price}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 pt-8 border-t border-gray-50 flex flex-col items-center">
                                <div className="flex justify-between w-full text-[9px] uppercase font-black tracking-[0.2em] text-gray-300 px-4">
                                    <span>Vault Value</span>
                                    <span className="text-primary">${totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between w-full text-[9px] uppercase font-black tracking-[0.2em] text-gray-300 px-4">
                                    <span>Courier (Insured)</span>
                                    <span className="text-secondary">Complimentary</span>
                                </div>

                                <div className="pt-10 flex flex-col items-center space-y-2">
                                    <span className="text-[10px] uppercase font-black tracking-[0.4em] text-primary">Total Investment</span>
                                    <span className="text-4xl md:text-5xl font-heading text-primary leading-none">
                                        ${(totalAmount + calculateAddonsTotal()).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-12 space-y-4 pt-8 border-t border-gray-50">
                                <div className="flex items-center space-x-4 px-4">
                                    <div className="p-2 bg-secondary/10 rounded-full text-secondary">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">Insured Delivery</p>
                                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Full value coverage included</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
