'use client';

import { useEffect, useState } from 'react';
import { Diamond, Shield, Hammer, Loader2, ExternalLink, DollarSign } from 'lucide-react';
import api from '@/lib/axios';

export default function AdminJewelryPurchases() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get('/jewelry-purchases/admin/all');
                setData(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="animate-spin text-secondary" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-heading italic">Acquisitions & Appraisals</h2>
                <div className="flex space-x-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-white border border-gray-100 px-6 py-3">
                        {data.length} Total Submissions
                    </span>
                </div>
            </div>

            <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {['Submission ID', 'Material', 'Type', 'Date', 'Status', 'Valuation', 'Actions'].map((head) => (
                                <th key={head} className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{head}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-6 text-xs font-bold text-primary italic">#{item.id.slice(0, 8)}</td>
                                <td className="px-8 py-6">
                                    <span className="text-[10px] font-bold uppercase text-primary">{item.material}</span>
                                </td>
                                <td className="px-8 py-6 text-xs text-gray-500">{item.item_type}</td>
                                <td className="px-8 py-6 text-xs text-gray-400 font-bold">{new Date(item.created_at).toLocaleDateString()}</td>
                                <td className="px-8 py-6">
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded ${item.status === 'pending_review' ? 'bg-blue-50 text-blue-600' :
                                            item.status === 'accepted' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                                        }`}>
                                        {item.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-xs font-bold text-primary">${Number(item.offered_price || 0).toLocaleString()}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex space-x-3">
                                        <button className="text-secondary hover:text-primary transition-colors">
                                            <DollarSign size={18} />
                                        </button>
                                        <button className="text-gray-300 hover:text-primary transition-colors">
                                            <ExternalLink size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
