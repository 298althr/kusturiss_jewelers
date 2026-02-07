'use client';

import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, ShieldCheck, CreditCard } from 'lucide-react';
import api from '@/lib/axios';

interface StripePaymentProps {
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
    amount: number;
    checkoutSessionId: string;
}

export default function StripePayment({ onSuccess, onError, amount, checkoutSessionId }: StripePaymentProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        try {
            // 1. Get client secret from backend
            const { data } = await api.post('/payments/checkout-payment-intent', {
                checkout_session_id: checkoutSessionId
            });

            // 2. Confirm payment on client side
            const result = await stripe.confirmCardPayment(data.client_secret, {
                payment_method: {
                    card: elements.getElement(CardElement)!,
                    billing_details: {
                        name: 'Kusturiss Client',
                    },
                },
            });

            if (result.error) {
                onError(result.error.message || 'Payment failed');
                setIsProcessing(false);
            } else {
                if (result.paymentIntent.status === 'succeeded') {
                    onSuccess(result.paymentIntent.id);
                }
            }
        } catch (err: any) {
            onError(err.response?.data?.message || err.message || 'An error occurred during payment');
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
            <div className="p-8 border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center space-x-3 mb-8">
                    <ShieldCheck className="text-secondary" size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Vault Encrypted Transaction</span>
                </div>

                <div className="p-6 border border-gray-50 bg-gray-50/30 rounded">
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: '14px',
                                    color: '#1A1A1A',
                                    fontFamily: '"Outfit", sans-serif',
                                    '::placeholder': {
                                        color: '#A0A0A0',
                                    },
                                },
                            },
                        }}
                    />
                </div>

                <div className="mt-8 flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <CreditCard size={14} />
                        <span>Total Due: ${amount.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full bg-primary text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-secondary transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
            >
                {isProcessing ? (
                    <Loader2 className="animate-spin" size={18} />
                ) : (
                    <span>Authorize Transaction</span>
                )}
            </button>
        </form>
    );
}
