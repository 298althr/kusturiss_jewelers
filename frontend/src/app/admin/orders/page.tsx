'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Download, Truck, Gift, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.get('/admin/orders');
                setOrders(response.data.orders);
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const handleGenerateLabel = async (id: string) => {
        try {
            const response = await api.post(`/orders/${id}/shipping-label`);
            alert(`Label generated: ${response.data.trackingNumber}`);
            // Refresh orders
            const updatedResponse = await api.get('/admin/orders');
            setOrders(updatedResponse.data.orders);
        } catch (err) {
            console.error('Label generation failed:', err);
            alert('Failed to generate shipping label.');
        }
    };

    return (
        <div className="space-y-12">
            {/* Header and Filter */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <h2 className="text-3xl font-heading italic">Order Management</h2>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search Orders..."
                            className="pl-10 pr-4 py-3 border border-gray-100 bg-white text-xs font-bold uppercase tracking-widest outline-none focus:border-secondary transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="animate-spin text-secondary" size={32} />
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {['Order ID', 'Customer', 'Date', 'Total', 'Gifting', 'Status', 'Action'].map((head) => (
                                    <th key={head} className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{head}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-6 text-xs font-bold text-primary">#{order.id.slice(0, 8).toUpperCase()}</td>
                                    <td className="px-8 py-6 text-xs text-gray-600">{order.customer_id || 'Guest'}</td>
                                    <td className="px-8 py-6 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="px-8 py-6 text-xs font-bold text-primary">${Number(order.total_amount).toLocaleString()}</td>
                                    <td className="px-8 py-6">
                                        {order.is_gift && (
                                            <div className="flex items-center space-x-2 text-secondary">
                                                <Gift size={14} />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Gift Service</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded ${order.status === 'shipped' ? 'bg-green-50 text-green-600' :
                                            order.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex space-x-3">
                                            <button className="text-secondary hover:text-primary transition-colors">
                                                <Eye size={18} />
                                            </button>
                                            {order.status !== 'shipped' && (
                                                <button
                                                    onClick={() => handleGenerateLabel(order.id)}
                                                    className="text-primary hover:text-secondary transition-colors"
                                                    title="Generate USPS Label"
                                                >
                                                    <Truck size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
