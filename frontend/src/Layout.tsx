import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Bus, Wrench, Package, LogOut, Menu, X, Gauge } from './icons';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isOpsManager = user?.role === 'Operation Manager';

    const navItems = isOpsManager
        ? [
            { path: '/', label: 'Dashboard', icon: Gauge },
            { path: '/fleet', label: 'Fleet', icon: Bus },
            { path: '/work-orders', label: 'Work Orders', icon: Wrench },
            { path: '/inventory', label: 'Inventory', icon: Package },
        ]
        : [
            { path: '/work-orders', label: 'Work Orders', icon: Wrench },
            { path: '/inventory', label: 'Inventory', icon: Package },
            { path: '/fleet', label: 'Fleet', icon: Bus },
        ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                <div className="flex flex-col flex-grow bg-slate-900 overflow-y-auto">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Bus className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg">Transitland</h1>
                            <p className="text-slate-400 text-xs">Fleet Management</p>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path ||
                                (item.path === '/work-orders' && location.pathname.startsWith('/bus'));
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User */}
                    <div className="px-4 py-4 border-t border-slate-700">
                        <div className="flex items-center gap-3 px-4 py-2">
                            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                                {user?.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{user?.email.split('@')[0]}</p>
                                <p className="text-slate-400 text-xs truncate">{user?.role}</p>
                            </div>
                            <button
                                onClick={logout}
                                className="text-slate-400 hover:text-white p-2"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <Bus className="w-5 h-5" />
                    </div>
                    <span className="font-bold">Transitland</span>
                </div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-14 bg-slate-900 z-30">
                    <nav className="px-4 py-6 space-y-2">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="px-4 py-4 border-t border-slate-700">
                        <button
                            onClick={() => {
                                logout();
                                setMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 text-red-400 w-full"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="md:pl-64">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
