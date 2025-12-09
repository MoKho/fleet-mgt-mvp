import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { busApi, Bus } from './api';
import { AlertTriangle, Wrench, CheckCircle, Gauge, Search, ChevronRight } from './icons';
import { Link } from 'react-router-dom';

function StatusBadge({ status }: { status: string }) {
    const config = {
        Ready: { className: 'badge-success', icon: CheckCircle },
        Critical: { className: 'badge-critical', icon: AlertTriangle },
        'Needs Maintenance': { className: 'badge-warning', icon: Wrench },
    }[status] || { className: 'badge-info', icon: CheckCircle };

    const Icon = config.icon;

    return (
        <span className={`badge ${config.className} gap-1`}>
            <Icon className="w-3 h-3" />
            {status}
        </span>
    );
}

function PMBadge({ bus }: { bus: Bus }) {
    if (!bus.due_for_pm) return null;

    const mileageDiff = bus.mileage - bus.last_service_mileage;
    const isOverdue = mileageDiff > 10000;

    return (
        <span className={`badge ${isOverdue ? 'badge-critical' : 'badge-warning'} gap-1`}>
            <Gauge className="w-3 h-3" />
            {isOverdue ? 'PM Overdue' : 'Due for PM'}
        </span>
    );
}

// Mobile Card Component
function BusCard({ bus }: { bus: Bus }) {
    return (
        <Link to={`/bus/${bus.id}`} className="block">
            <div className="card hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="font-bold text-lg">{bus.id}</h3>
                        <p className="text-sm text-slate-500">{bus.model}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                    <StatusBadge status={bus.status} />
                    <PMBadge bus={bus} />
                </div>

                <div className="flex justify-between text-sm text-slate-500">
                    <span>{bus.location}</span>
                    <span>{bus.mileage.toLocaleString()} mi</span>
                </div>
            </div>
        </Link>
    );
}

// Desktop Table Row
function BusTableRow({ bus }: { bus: Bus }) {
    return (
        <Link to={`/bus/${bus.id}`} className="contents">
            <tr className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                <td className="py-3 px-4 font-medium">{bus.id}</td>
                <td className="py-3 px-4">{bus.model}</td>
                <td className="py-3 px-4">
                    <StatusBadge status={bus.status} />
                </td>
                <td className="py-3 px-4">{bus.location}</td>
                <td className="py-3 px-4">{bus.mileage.toLocaleString()} mi</td>
                <td className="py-3 px-4">
                    <PMBadge bus={bus} />
                </td>
                <td className="py-3 px-4">
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                </td>
            </tr>
        </Link>
    );
}

export default function MaintenanceView() {
    const { user } = useAuth();
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'critical'>('all');
    const [showAllGarages, setShowAllGarages] = useState(false);
    const [sortBy, setSortBy] = useState<'status' | null>('status');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        busApi.getAll().then((data) => {
            setBuses(data);
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

    // Filter logic
    let filteredBuses = buses;

    // Garage filter for Maintenance users
    if (user?.role === 'Maintenance' && !showAllGarages && user.assigned_garage) {
        const garageLocation = user.assigned_garage === 'North' ? 'North Garage' : 'South Garage';
        filteredBuses = filteredBuses.filter(b => b.location === garageLocation);
    }

    // Only show buses that need attention (not Ready) by default for Maintenance
    if (user?.role === 'Maintenance') {
        filteredBuses = filteredBuses.filter(b => b.status !== 'Ready');
    }

    // Status filter
    if (filter === 'critical') {
        filteredBuses = filteredBuses.filter(b => b.status === 'Critical');
    }

    // Search filter
    if (search) {
        filteredBuses = filteredBuses.filter(b =>
            b.id.toLowerCase().includes(search.toLowerCase())
        );
    }

    // Sorting: default by `status` (Critical, Needs Maintenance, Ready).
    const statusOrder: Record<string, number> = { Critical: 0, 'Needs Maintenance': 1, Ready: 2 };

    function toggleSort(field: 'status') {
        if (sortBy === field) {
            setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortDirection('asc');
        }
    }

    const sortedBuses = [...filteredBuses].sort((a, b) => {
        if (sortBy === 'status') {
            const oa = statusOrder[a.status] ?? 2;
            const ob = statusOrder[b.status] ?? 2;
            return (oa - ob) * (sortDirection === 'asc' ? 1 : -1);
        }
        return 0;
    });

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Work Orders</h1>
                <p className="text-slate-500">
                    {user?.role === 'Maintenance'
                        ? `${user.assigned_garage} Garage • Showing buses needing attention`
                        : 'All buses'}
                </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Bus ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input pl-10"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('critical')}
                        className={`btn ${filter === 'critical' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        Critical
                    </button>
                    {/* 'Due for PM' button removed */}
                </div>
            </div>

            {user?.role === 'Maintenance' && (
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={showAllGarages}
                        onChange={(e) => setShowAllGarages(e.target.checked)}
                        className="rounded border-slate-300"
                    />
                    Show all garages
                </label>
            )}

            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3">
                {sortedBuses.map(bus => (
                    <BusCard key={bus.id} bus={bus} />
                ))}
                {sortedBuses.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                        No buses found matching your criteria
                    </div>
                )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Bus ID</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Model</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                                    <button
                                        onClick={() => toggleSort('status')}
                                        className="flex items-center gap-2"
                                    >
                                        <span>Status</span>
                                        <span className="text-slate-400 text-xs">
                                            {sortBy === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </button>
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Location</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Mileage</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">PM</th>
                                <th className="text-left py-3 px-4"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedBuses.map(bus => (
                                <BusTableRow key={bus.id} bus={bus} />
                            ))}
                        </tbody>
                    </table>
                    {sortedBuses.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            No buses found matching your criteria
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
