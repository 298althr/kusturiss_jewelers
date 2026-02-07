'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, Users, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

export default function AdminDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/admin/analytics/dashboard');
                setData(response.data.data);
            } catch (err) {
                console.error('Failed to fetch admin stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="animate-spin text-secondary" size={48} />
            </div>
        );
    }

    const stats = [
        { name: 'Total Revenue', value: `$${data?.metrics?.totalRevenue?.toLocaleString()}`, change: '+12.5%', icon: DollarSign, color: 'text-green-600' },
        { name: 'Active Orders', value: data?.metrics?.totalOrders || '0', change: '+5', icon: ShoppingBag, color: 'text-blue-600' },
        { name: 'New Customers', value: data?.metrics?.totalCustomers || '0', change: '+18%', icon: Users, color: 'text-purple-600' },
        { name: 'Fraud Alerts', value: '2', change: '-1', icon: AlertTriangle, color: 'text-red-600' },
    ];

    return (
        <div className="space-y-12">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.name} className="bg-white p-8 shadow-sm border border-gray-100 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className={`p-3 bg-gray-50 rounded-lg ${stat.color}`}>
                                    <Icon size={24} />
                                </div>
                                <span className={`text-[10px] font-bold ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{stat.name}</p>
                                <h3 className="text-3xl font-medium tracking-tight text-primary">{stat.value}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Stats Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders Table */}
                <div className="lg:col-span-2 bg-white p-8 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-heading italic">Priority Actions Required</h3>
                        <button className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:underline">View All</button>
                    </div>
                    <div className="space-y-6">
                        {data?.recentOrders?.map((order: any) => (
                            <div key={order.id} className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center text-primary font-bold text-xs uppercase">
                                        #{order.id.slice(0, 4)}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{order.first_name} {order.last_name}</p>
                                        <p className="text-[10px] text-gray-400">{order.customer_email} • {new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-primary">${order.total.toLocaleString()}</p>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded ${order.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Health */}
                <div className="bg-white p-8 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-heading italic mb-8">Business Health</h3>
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Inventory Levels</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">82%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-[82%]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fraud Protection</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Active</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-[100%]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Order Fulfillment</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">94%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-secondary w-[94%]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
