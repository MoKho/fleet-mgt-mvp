import { useState, useEffect } from 'react';
import { busApi, Bus } from './api';
import { AlertTriangle, Wrench, CheckCircle, Gauge, Search, ChevronRight } from './icons';
import { Link } from 'react-router-dom';

type SortField = 'id' | 'status' | 'location' | 'mileage';
type SortOrder = 'asc' | 'desc';

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

export default function FleetView() {
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [pmFilter, setPmFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('id');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

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

    // Location filter
    if (locationFilter !== 'all') {
        filteredBuses = filteredBuses.filter(b => b.location === locationFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
        filteredBuses = filteredBuses.filter(b => b.status === statusFilter);
    }

    // PM filter
    if (pmFilter === 'due') {
        filteredBuses = filteredBuses.filter(b => b.due_for_pm && (b.mileage - b.last_service_mileage <= 10000));
    } else if (pmFilter === 'overdue') {
        filteredBuses = filteredBuses.filter(b => b.due_for_pm && (b.mileage - b.last_service_mileage > 10000));
    }

    // Search filter
    if (search) {
        filteredBuses = filteredBuses.filter(b =>
            b.id.toLowerCase().includes(search.toLowerCase())
        );
    }

    // Sort logic
    filteredBuses = [...filteredBuses].sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
            case 'id':
                comparison = a.id.localeCompare(b.id);
                break;
            case 'status':
                const statusOrder = { Critical: 0, 'Needs Maintenance': 1, Ready: 2 };
                comparison = (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
                break;
            case 'location':
                comparison = a.location.localeCompare(b.location);
                break;
            case 'mileage':
                comparison = a.mileage - b.mileage;
                break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
    });

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
        <th
            className="text-left py-3 px-4 text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-700"
            onClick={() => handleSort(field)}
        >
            {label}
            {sortField === field && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
        </th>
    );

    const totalBuses = buses.length;
    const readyCount = buses.filter(b => b.status === 'Ready').length;
    const criticalCount = buses.filter(b => b.status === 'Critical').length;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Fleet Overview</h1>
                <p className="text-slate-500">
                    {totalBuses} buses total • {readyCount} ready • {criticalCount} critical
                </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-3">
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

                <div className="flex flex-wrap gap-2">
                    <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="input w-auto"
                    >
                        <option value="all">All Locations</option>
                        <option value="North Garage">North Garage</option>
                        <option value="South Garage">South Garage</option>
                        <option value="On Service">On Service</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input w-auto"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Ready">Ready</option>
                        <option value="Critical">Critical</option>
                        <option value="Needs Maintenance">Needs Maintenance</option>
                    </select>

                    <select
                        value={pmFilter}
                        onChange={(e) => setPmFilter(e.target.value)}
                        className="input w-auto"
                    >
                        <option value="all">All PM Status</option>
                        <option value="due">Due for PM</option>
                        <option value="overdue">PM Overdue</option>
                    </select>
                </div>
            </div>

            <p className="text-sm text-slate-500">
                Showing {filteredBuses.length} of {totalBuses} buses
            </p>

            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3">
                {filteredBuses.slice(0, 50).map(bus => (
                    <BusCard key={bus.id} bus={bus} />
                ))}
                {filteredBuses.length > 50 && (
                    <p className="text-center text-slate-500 py-4">
                        Showing first 50 of {filteredBuses.length} buses. Use filters to narrow down.
                    </p>
                )}
                {filteredBuses.length === 0 && (
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
                                <SortHeader field="id" label="Bus ID" />
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Model</th>
                                <SortHeader field="status" label="Status" />
                                <SortHeader field="location" label="Location" />
                                <SortHeader field="mileage" label="Mileage" />
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">PM</th>
                                <th className="text-left py-3 px-4"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBuses.slice(0, 100).map(bus => (
                                <BusTableRow key={bus.id} bus={bus} />
                            ))}
                        </tbody>
                    </table>
                    {filteredBuses.length > 100 && (
                        <p className="text-center text-slate-500 py-4">
                            Showing first 100 of {filteredBuses.length} buses. Use filters to narrow down.
                        </p>
                    )}
                    {filteredBuses.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            No buses found matching your criteria
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
