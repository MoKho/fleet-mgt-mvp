import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { busApi, workOrderApi, inventoryApi, Bus, WorkOrder, InventoryItem } from './api';
import { AlertTriangle, Wrench, Package, CheckCircle, Bus as BusIcon, Gauge } from './icons';

function KPICard({ title, value, subtitle, icon: Icon, color }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: 'blue' | 'red' | 'amber' | 'green';
}) {
    const colorClasses = {
        blue: 'bg-blue-500',
        red: 'bg-red-500',
        amber: 'bg-amber-500',
        green: 'bg-green-500',
    };

    return (
        <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                    {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`${colorClasses[color]} p-3 rounded-xl`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );
}

function GarageCard({ title, buses, criticalCount, maintenanceCount }: {
    title: string;
    buses: Bus[];
    criticalCount: number;
    maintenanceCount: number;
}) {
    const readyCount = buses.filter(b => b.status === 'Ready').length;

    return (
        <div className="card">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total Buses</span>
                    <span className="font-semibold">{buses.length}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-green-600 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Ready
                    </span>
                    <span className="font-semibold text-green-600">{readyCount}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Critical
                    </span>
                    <span className="font-semibold text-red-600">{criticalCount}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-amber-600 flex items-center gap-2">
                        <Wrench className="w-4 h-4" /> Needs Maintenance
                    </span>
                    <span className="font-semibold text-amber-600">{maintenanceCount}</span>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const [buses, setBuses] = useState<Bus[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            busApi.getAll(),
            workOrderApi.getAll(),
            inventoryApi.getAll(),
        ]).then(([busData, woData, invData]) => {
            setBuses(busData);
            setWorkOrders(woData);
            setInventory(invData);
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

    const onServiceBuses = buses.filter(b => b.location === 'On Service');
    const overduePM = buses.filter(b => b.due_for_pm && (b.mileage - b.last_service_mileage > 10000));
    const criticalInventory = inventory.filter(i => i.quantity < i.threshold);

    const northBuses = buses.filter(b => b.location === 'North Garage');
    const southBuses = buses.filter(b => b.location === 'South Garage');

    const openWorkOrders = workOrders
        .filter(wo => wo.status === 'Open')
        .sort((a, b) => {
            const sevOrder = { SEV1: 0, SEV2: 1, SEV3: 2 };
            const aSev = a.severity ? sevOrder[a.severity] : 3;
            const bSev = b.severity ? sevOrder[b.severity] : 3;
            if (aSev !== bSev) return aSev - bSev;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

    const activeCount = onServiceBuses.length;
    const totalCount = buses.length;
    const maintenanceCount = totalCount - activeCount;
    const activePercent = totalCount ? ((activeCount / totalCount) * 100) : 0;
    const maintenancePercent = totalCount ? ((maintenanceCount / totalCount) * 100) : 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-slate-500">Welcome back, {user?.email.split('@')[0]}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Active Buses"
                    value={activeCount}
                    subtitle={`${totalCount} total • ${activePercent.toFixed(1)}% of fleet`}
                    icon={BusIcon}
                    color="blue"
                />
                <KPICard
                    title="In Maintenance"
                    value={maintenanceCount}
                    subtitle={`${maintenancePercent.toFixed(1)}% of fleet`}
                    icon={Wrench}
                    color="amber"
                />
                <KPICard
                    title="Overdue for PM"
                    value={overduePM.length}
                    subtitle={`${((overduePM.length / buses.length) * 100).toFixed(1)}% of fleet`}
                    icon={Gauge}
                    color="red"
                />
                <KPICard
                    title="Inventory Alerts"
                    value={criticalInventory.length}
                    subtitle="Items below threshold"
                    icon={Package}
                    color="red"
                />
            </div>

            {/* Garage Split View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GarageCard
                    title="North Garage"
                    buses={northBuses}
                    criticalCount={northBuses.filter(b => b.status === 'Critical').length}
                    maintenanceCount={northBuses.filter(b => b.status === 'Needs Maintenance').length}
                />
                <GarageCard
                    title="South Garage"
                    buses={southBuses}
                    criticalCount={southBuses.filter(b => b.status === 'Critical').length}
                    maintenanceCount={southBuses.filter(b => b.status === 'Needs Maintenance').length}
                />
            </div>

            {/* Maintenance Backlog Table */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">Maintenance Backlog</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Bus ID</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Severity</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Description</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Reported By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {openWorkOrders.slice(0, 10).map((wo) => (
                                <tr key={wo.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4 font-medium">{wo.bus_id}</td>
                                    <td className="py-3 px-4">
                                        <span className={`badge ${wo.severity === 'SEV1' ? 'badge-critical' :
                                                wo.severity === 'SEV2' ? 'badge-warning' : 'badge-info'
                                            }`}>
                                            {wo.is_pm ? 'PM' : wo.severity}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-600">{wo.description}</td>
                                    <td className="py-3 px-4 text-slate-500">{new Date(wo.date).toLocaleDateString()}</td>
                                    <td className="py-3 px-4 text-slate-500">{wo.reported_by || 'System'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">Inventory Control</h2>
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
                            {inventory
                                .sort((a, b) => (a.quantity < a.threshold ? -1 : 1) - (b.quantity < b.threshold ? -1 : 1))
                                .map((item) => {
                                    const isCritical = item.quantity < item.threshold;
                                    const isWarning = !isCritical && item.quantity < item.threshold * 2;
                                    return (
                                        <tr key={item.id} className={`border-b border-slate-100 ${isCritical ? 'bg-red-50' : isWarning ? 'bg-amber-50' : ''}`}>
                                            <td className="py-3 px-4 font-medium">{item.item_name}</td>
                                            <td className="py-3 px-4">{item.garage}</td>
                                            <td className="py-3 px-4">{item.quantity}</td>
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
