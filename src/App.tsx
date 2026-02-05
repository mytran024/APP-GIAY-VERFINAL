import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { Ship, ClipboardList, FileText, LogOut } from 'lucide-react';
import LoginView from './components/LoginView';
import { User, Role } from './types';
import { StorageService } from './services/storage';

// Placeholders for Lazily Loaded Modules
const LogisticsEntry = React.lazy(() => import('./modules/logistics/LogisticsEntry'));
const InspectorEntry = React.lazy(() => import('./modules/inspector/InspectorEntry'));
const PaperEntry = React.lazy(() => import('./modules/paper/PaperEntry'));

const Dashboard = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
    const navigate = useNavigate();

    // Auto-redirect based on role
    useEffect(() => {
        // Use 'as any' to avoid strict enum mismatch between UserRole and Role
        const role = user.role as any;
        if (role === 'ADMIN' || role === 'CS') navigate('/logistics');
        if (role === 'INSPECTOR') navigate('/inspector');
        if (role === 'DEPOT' || role === 'CUSTOMS' || role === 'TRANSPORT') navigate('/paper');
    }, [user, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            {/* Fallback Dashboard if needed */}
            <div className="text-center">
                <p>Redirecting...</p>
                <button onClick={onLogout}>Logout</button>
            </div>
        </div>
    );
};

const App = () => {
    // Force cast to User to satisfy the mismatch between SystemUser and User types
    const [user, setUser] = useState<User | null>(() => StorageService.getCurrentUser() as unknown as User);

    const handleLogin = (u: User) => {
        setUser(u);
        StorageService.saveCurrentUser(u as any);
    };

    const handleLogout = () => {
        setUser(null);
        StorageService.saveCurrentUser(null);
        window.location.href = '/'; // Hard reset to clear any module state
    };

    if (!user) {
        return <LoginView onLogin={handleLogin} />;
    }

    return (
        <React.Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
            <Routes>
                <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} />} />
                <Route
                    path="/logistics/*"
                    element={(user.role === Role.ADMIN || user.role === Role.CS) ? <LogisticsEntry user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
                />
                <Route
                    path="/inspector/*"
                    element={user.role === Role.INSPECTOR ? <InspectorEntry user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
                />
                <Route
                    path="/paper/*"
                    element={['DEPOT', 'CUSTOMS', 'TRANSPORT'].includes(user.role) ? <PaperEntry user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
                />
            </Routes>
        </React.Suspense>
    );
};

export default App;
