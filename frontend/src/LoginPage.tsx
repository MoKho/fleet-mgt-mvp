import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Bus } from './icons';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const quickLogin = async (userEmail: string, userPass: string) => {
        // Prefill inputs for visibility and then attempt login
        setError('');
        setEmail(userEmail);
        setPassword(userPass);
        setIsLoading(true);
        try {
            await login(userEmail, userPass);
        } catch (err) {
            setError('Quick login failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="w-full max-w-md px-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
                    <div className="flex justify-center mb-6">
                        <div className="bg-blue-600 p-4 rounded-2xl">
                            <Bus className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white text-center mb-2">Transitland</h1>
                    <p className="text-slate-400 text-center mb-8">Fleet Management Platform</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="you@transitland.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-slate-400 text-sm text-center mb-3">Login as:</p>

                        <div className="flex justify-center gap-6">
                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    onClick={() => quickLogin('jeff@transitland.com', 'jeff')}
                                    disabled={isLoading}
                                    title="Jeff — Role: Maintenance, Garage: North"
                                    className="text-sm px-3 py-1 bg-white/10 border border-white/20 text-slate-100 rounded-md hover:bg-white/20 disabled:opacity-50"
                                >
                                    Jeff
                                </button>
                                <span className="text-xs text-slate-300 mt-2">Maintenance — North</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    onClick={() => quickLogin('tiff@transitland.com', 'tiff')}
                                    disabled={isLoading}
                                    title="Tiff — Role: Maintenance, Garage: South"
                                    className="text-sm px-3 py-1 bg-white/10 border border-white/20 text-slate-100 rounded-md hover:bg-white/20 disabled:opacity-50"
                                >
                                    Tiff
                                </button>
                                <span className="text-xs text-slate-300 mt-2">Maintenance — South</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    onClick={() => quickLogin('mike@transitland.com', 'mike')}
                                    disabled={isLoading}
                                    title="Mike — Role: Operation Manager, Garage: Null"
                                    className="text-sm px-3 py-1 bg-white/10 border border-white/20 text-slate-100 rounded-md hover:bg-white/20 disabled:opacity-50"
                                >
                                    Mike
                                </button>
                                <span className="text-xs text-slate-300 mt-2">Operation Manager</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
