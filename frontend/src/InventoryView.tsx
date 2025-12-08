import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { inventoryApi, InventoryItem } from './api';

function InventoryCard({ item }: { item: InventoryItem }) {
    const isCritical = item.quantity < item.threshold;
    const isWarning = !isCritical && item.quantity < item.threshold * 2;

    return (
        <div className={`card ${isCritical ? 'border-l-4 border-l-red-500' : isWarning ? 'border-l-4 border-l-amber-500' : ''}`}>
            <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{item.item_name}</h3>
                <span className={`badge ${isCritical ? 'badge-critical' : isWarning ? 'badge-warning' : 'badge-success'}`}>
                    {isCritical ? 'Critical' : isWarning ? 'Low' : 'OK'}
                </span>
            </div>

            <div className="flex justify-between text-sm">
                <span className="text-slate-500">{item.garage} Garage</span>
                <span className={`font-medium ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : ''}`}>
                    {item.quantity} / {item.threshold} threshold
                </span>
            </div>

            <div className="mt-3 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                    className={`h-full ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((item.quantity / (item.threshold * 2)) * 100, 100)}%` }}
                />
            </div>
        </div>
    );
}

export default function InventoryView() {
    const { user } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [garageFilter, setGarageFilter] = useState<string>('all');

    useEffect(() => {
        inventoryApi.getAll().then((data) => {
            setInventory(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    let filteredInventory = inventory;

    // Default filter based on user role
    if (user?.role === 'Maintenance' && user.assigned_garage && garageFilter === 'all') {
        filteredInventory = inventory.filter(i => i.garage === user.assigned_garage);
    } else if (garageFilter !== 'all') {
        filteredInventory = inventory.filter(i => i.garage === garageFilter);
    }

    // Sort: Critical first
    filteredInventory = [...filteredInventory].sort((a, b) => {
        const aStatus = a.quantity < a.threshold ? 0 : a.quantity < a.threshold * 2 ? 1 : 2;
        const bStatus = b.quantity < b.threshold ? 0 : b.quantity < b.threshold * 2 ? 1 : 2;
        return aStatus - bStatus;
    });

    const criticalCount = filteredInventory.filter(i => i.quantity < i.threshold).length;
    const lowCount = filteredInventory.filter(i => i.quantity >= i.threshold && i.quantity < i.threshold * 2).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Inventory</h1>
                <p className="text-slate-500">
                    {criticalCount > 0 && <span className="text-red-600 font-medium">{criticalCount} critical</span>}
                    {criticalCount > 0 && lowCount > 0 && ' • '}
                    {lowCount > 0 && <span className="text-amber-600 font-medium">{lowCount} low</span>}
                    {criticalCount === 0 && lowCount === 0 && 'All items stocked'}
                </p>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <button
                    onClick={() => setGarageFilter('all')}
                    className={`btn ${garageFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    {user?.role === 'Maintenance' ? 'My Garage' : 'All'}
                </button>
                <button
                    onClick={() => setGarageFilter('North')}
                    className={`btn ${garageFilter === 'North' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    North
                </button>
                <button
                    onClick={() => setGarageFilter('South')}
                    className={`btn ${garageFilter === 'South' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    South
                </button>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {filteredInventory.map(item => (
                    <InventoryCard key={item.id} item={item} />
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Item</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Garage</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Quantity</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Threshold</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map((item) => {
                                const isCritical = item.quantity < item.threshold;
                                const isWarning = !isCritical && item.quantity < item.threshold * 2;
                                return (
                                    <tr
                                        key={item.id}
                                        className={`border-b border-slate-100 ${isCritical ? 'bg-red-50' : isWarning ? 'bg-amber-50' : ''}`}
                                    >
                                        <td className="py-3 px-4 font-medium">{item.item_name}</td>
                                        <td className="py-3 px-4">{item.garage}</td>
                                        <td className="py-3 px-4">
                                            <span className={isCritical ? 'text-red-600 font-medium' : isWarning ? 'text-amber-600 font-medium' : ''}>
                                                {item.quantity}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500">{item.threshold}</td>
                                        <td className="py-3 px-4">
                                            <span className={`badge ${isCritical ? 'badge-critical' : isWarning ? 'badge-warning' : 'badge-success'}`}>
                                                {isCritical ? 'Critical' : isWarning ? 'Low' : 'OK'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
