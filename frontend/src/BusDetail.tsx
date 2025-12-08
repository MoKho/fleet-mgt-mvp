import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { busApi, workOrderApi, inventoryApi, Bus, WorkOrder, InventoryItem, UsedPart } from './api';
import { useAuth } from './AuthContext';
import { AlertTriangle, Wrench, CheckCircle, Gauge, Clock, MapPin, ChevronRight, Plus } from './icons';

function StatusBadge({ status }: { status: string }) {
    const config = {
        Ready: { className: 'badge-success', icon: CheckCircle },
        Critical: { className: 'badge-critical', icon: AlertTriangle },
        'Needs Maintenance': { className: 'badge-warning', icon: Wrench },
    }[status] || { className: 'badge-info', icon: CheckCircle };

    const Icon = config.icon;

    return (
        <span className={`badge ${config.className} gap-1 text-sm`}>
            <Icon className="w-4 h-4" />
            {status}
        </span>
    );
}

function WorkOrderCard({ wo, onFix, user, inventory, onAdded }: { wo: WorkOrder; onFix: (id: number) => void; user: any; inventory: InventoryItem[]; onAdded: () => void }) {
    const [usedParts, setUsedParts] = useState<UsedPart[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        workOrderApi.listUsedParts(wo.id).then(setUsedParts).catch(console.error);
    }, [wo.id]);

    

    return (
        <div className={`card ${wo.status === 'Open' ? 'border-l-4 border-l-amber-500' : 'opacity-60'}`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    {wo.severity && (
                        <span className={`badge ${wo.severity === 'SEV1' ? 'badge-critical' :
                                wo.severity === 'SEV2' ? 'badge-warning' : 'badge-info'
                            }`}>
                            {wo.is_pm ? 'PM' : wo.severity}
                        </span>
                    )}
                    {wo.is_pm && <span className="badge badge-info">Preventive Maintenance</span>}
                    <span className={`badge ${wo.status === 'Open' ? 'badge-warning' : 'badge-success'}`}>
                        {wo.status}
                    </span>
                </div>
                <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(wo.date).toLocaleDateString()}
                </span>
            </div>

            <p className="text-slate-700 mb-2">{wo.description}</p>
            <p className="text-sm text-slate-500 mb-3">Reported by: {wo.reported_by || 'System'}</p>

            {/* Used Parts List */}
            {usedParts.length > 0 && (
                <div className="mt-3">
                    <p className="text-sm font-semibold mb-1">Used Parts</p>
                    <ul className="text-sm text-slate-700 list-disc ml-5">
                        {usedParts.map((p) => {
                            const item = inventory.find(i => i.id === p.inventory_id);
                            return (
                                <li key={p.id}>
                                    {item ? item.item_name : `Item #${p.inventory_id}`} — Qty {p.quantity_used}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {wo.status === 'Open' && (
                <button
                    onClick={() => onFix(wo.id)}
                    className="btn btn-primary w-full sm:w-auto"
                >
                    Mark as Fixed
                </button>
            )}

            {/* Add Part (opens modal) for Maintenance */}
            {user?.role === 'Maintenance' && wo.status === 'Open' && (
                <>
                    <div className="mt-3">
                        <button onClick={() => setShowAddModal(true)} className="btn btn-secondary w-full sm:w-auto">
                            Add Part
                        </button>
                    </div>
                    {showAddModal && (
                        <AddPartModal
                            woId={wo.id}
                            inventory={inventory}
                            onClose={() => setShowAddModal(false)}
                            onAdded={async () => {
                                const parts = await workOrderApi.listUsedParts(wo.id);
                                setUsedParts(parts);
                                onAdded();
                            }}
                        />
                    )}
                </>
            )}
        </div>
    );
}

function AddPartModal({ woId, inventory, onClose, onAdded }: { woId: number; inventory: InventoryItem[]; onClose: () => void; onAdded: () => void }) {
    const [invId, setInvId] = useState<number | ''>('');
    const [qty, setQty] = useState<number>(1);
    const [adding, setAdding] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invId || qty <= 0) return;
        setAdding(true);
        try {
            await workOrderApi.addUsedPart(woId, { inventory_id: Number(invId), quantity_used: qty });
            onAdded();
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h2 className="text-lg font-semibold mb-3">Add Part</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <select value={invId} onChange={(e) => setInvId(Number(e.target.value))} className="input" required>
                            <option value="">Select Inventory Item</option>
                            {inventory.map(item => (
                                <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                                    {item.item_name} (Available: {item.quantity})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input" placeholder="Quantity" required />
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={adding} className="btn btn-primary flex-1">{adding ? 'Adding...' : 'Add'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CreateWorkOrderModal({ busId, onClose, onCreated }: {
    busId: string;
    onClose: () => void;
    onCreated: () => void;
}) {
    const { user } = useAuth();
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('SEV3');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await workOrderApi.create({
                bus_id: busId,
                description,
                severity,
                reported_by: user?.email || 'Unknown',
            });
            onCreated();
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold mb-4">Create Work Order</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                        <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            className="input"
                        >
                            <option value="SEV1">SEV1 - Critical</option>
                            <option value="SEV2">SEV2 - Medium</option>
                            <option value="SEV3">SEV3 - Low</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input min-h-[100px]"
                            placeholder="Describe the issue..."
                            required
                        />
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function BusDetail() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [bus, setBus] = useState<Bus | null>(null);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const loadData = async () => {
        if (!id) return;
        const [busData, woData, invData] = await Promise.all([
            busApi.getOne(id),
            workOrderApi.getAll(),
            inventoryApi.getAll(),
        ]);
        setBus(busData);
        setWorkOrders(woData.filter((wo: WorkOrder) => wo.bus_id === id).sort((a: WorkOrder, b: WorkOrder) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
        setInventory(invData);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleFix = async (woId: number) => {
        await workOrderApi.fix(woId);
        loadData();
    };

    if (loading || !bus) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const mileageDiff = bus.mileage - bus.last_service_mileage;
    const isOverdue = bus.due_for_pm && mileageDiff > 10000;
    const isDueForPM = bus.due_for_pm && mileageDiff <= 10000;

    const openWOs = workOrders.filter(wo => wo.status === 'Open');
    const closedWOs = workOrders.filter(wo => wo.status === 'Fixed');

    return (
        <div className="space-y-6">
            {/* Back Link */}
            <Link to="/fleet" className="inline-flex items-center text-blue-600 hover:text-blue-700">
                <ChevronRight className="w-5 h-5 rotate-180" />
                Back to Fleet
            </Link>

            {/* Header */}
            <div className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">{bus.id}</h1>
                            <StatusBadge status={bus.status} />
                        </div>
                        <p className="text-slate-500">{bus.model}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {isDueForPM && (
                            <span className="badge badge-warning gap-1">
                                <Gauge className="w-4 h-4" /> Due for PM
                            </span>
                        )}
                        {isOverdue && (
                            <span className="badge badge-critical gap-1">
                                <Gauge className="w-4 h-4" /> PM Overdue
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                    <div>
                        <p className="text-sm text-slate-500">Location</p>
                        <p className="font-medium flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {bus.location}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Current Mileage</p>
                        <p className="font-medium">{bus.mileage.toLocaleString()} mi</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Last Service</p>
                        <p className="font-medium">{bus.last_service_mileage.toLocaleString()} mi</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Since Last Service</p>
                        <p className={`font-medium ${mileageDiff > 10000 ? 'text-red-600' : mileageDiff > 5000 ? 'text-amber-600' : ''}`}>
                            {mileageDiff.toLocaleString()} mi
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            {user?.role === 'Maintenance' && (
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Create Work Order
                    </button>
                </div>
            )}

            {/* Open Work Orders */}
            {openWOs.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-3">Open Work Orders ({openWOs.length})</h2>
                    <div className="space-y-3">
                        {openWOs.map(wo => (
                            <WorkOrderCard key={wo.id} wo={wo} onFix={handleFix} user={user} inventory={inventory} onAdded={loadData} />
                        ))}
                    </div>
                </div>
            )}

            {/* Work Order History */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Work Order History</h2>
                {closedWOs.length === 0 ? (
                    <p className="text-slate-500">No previous work orders</p>
                ) : (
                    <div className="space-y-3">
                        {closedWOs.map(wo => (
                            <WorkOrderCard key={wo.id} wo={wo} onFix={handleFix} user={user} inventory={inventory} onAdded={loadData} />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateWorkOrderModal
                    busId={bus.id}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={loadData}
                />
            )}
        </div>
    );
}
