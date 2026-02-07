'use client';

import { useState, useEffect } from 'react';
import { Search, Mail, Phone, Calendar, UserPlus, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

export default function AdminCustomers() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await api.get('/admin/customers');
                setCustomers(response.data.customers);
            } catch (err) {
                console.error('Failed to fetch customers:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-heading italic">Client Directory</h2>
                <button className="bg-primary text-white px-8 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center space-x-3 hover:bg-secondary transition-all">
                    <UserPlus size={16} />
                    <span>New Lead</span>
                </button>
            </div>

            <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search Luxury Clients..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 text-xs font-bold uppercase tracking-widest outline-none"
                        />
                    </div>
                    <div className="flex space-x-4">
                        {['All', 'VIP', 'Gold', 'Recent'].map(f => (
                            <button key={f} className="px-4 py-2 border border-gray-100 text-[9px] font-bold uppercase tracking-widest hover:border-secondary transition-colors">{f}</button>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="animate-spin text-secondary" size={32} />
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <tbody className="divide-y divide-gray-50">
                            {customers.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-8">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-primary text-secondary rounded-full flex items-center justify-center font-heading text-lg">
                                                {c.first_name?.charAt(0) || 'C'}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold uppercase tracking-widest text-primary">{c.first_name} {c.last_name}</h4>
                                                <div className="flex items-center space-x-4 text-gray-400 mt-1">
                                                    <span className="flex items-center space-x-1 text-[9px] font-bold uppercase"><Mail size={10} /> <span>{c.email}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Spent</p>
                                        <p className="text-sm font-bold text-primary">${Number(c.total_spent || 0).toLocaleString()}</p>
                                    </td>
                                    <td className="px-8 py-8">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Segment</p>
                                        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded ${c.total_spent > 10000 ? 'bg-secondary text-primary' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {c.total_spent > 10000 ? 'VIP' : 'Gold'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-8 text-right">
                                        <button className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:underline">View Profile</button>
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
