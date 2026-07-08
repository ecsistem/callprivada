import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Phone, Video, CreditCard,
  Shield, LogOut, Menu, X, Zap, LayoutTemplate, BarChart2, TrendingDown, TrendingUp, GitBranch,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../services/authService';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Painel' },
  { to: '/funnels', icon: <GitBranch size={18} />, label: 'Funis' },
  { to: '/calls', icon: <Phone size={18} />, label: 'Chamadas' },
  { to: '/presell', icon: <LayoutTemplate size={18} />, label: 'Presell' },
  { to: '/upsell', icon: <TrendingUp size={18} />, label: 'Upsell' },
  { to: '/downsell', icon: <TrendingDown size={18} />, label: 'Downsell' },
  { to: '/videos', icon: <Video size={18} />, label: 'Vídeos' },
  { to: '/subscription', icon: <CreditCard size={18} />, label: 'Plano' },
  { to: '/settings/payment', icon: <Zap size={18} />, label: 'Configurações' },
  { to: '/settings/tracking', icon: <BarChart2 size={18} />, label: 'Rastreamento' },
  { to: '/admin', icon: <Shield size={18} />, label: 'Admin', adminOnly: true },
];

function getInitials(name?: string, email?: string) {
  const str = name || email || '?';
  return str.slice(0, 2).toUpperCase();
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-green-500/15 text-green-400 border border-green-500/20'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={active ? 'text-green-400' : 'text-gray-500'}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshToken, clearAuth } = useAuthStore();

  const handleLogout = useCallback(async () => {
    try { if (refreshToken) await logout(refreshToken); } finally {
      clearAuth();
      navigate('/login');
    }
  }, [refreshToken, clearAuth, navigate]);

  const visibleNav = NAV.filter(n => !n.adminOnly || user?.role === 'admin');

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
        <Link to="/dashboard" onClick={onClose} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/40">
            <Phone size={15} className="text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">HotCall</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map(item => (
          <NavLink
            key={item.to}
            item={item}
            active={location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to))}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(user?.name, user?.email)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || user?.email}</p>
            {user?.name && <p className="text-xs text-gray-500 truncate">{user?.email}</p>}
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-red-400 transition-colors p-1 shrink-0"
            title="Sair"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-[#111115] border-r border-white/5 fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-56 bg-[#111115] border-r border-white/5 h-full z-10">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#111115] border-b border-white/5 sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white p-1">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Phone size={12} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">HotCall</span>
          </div>
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
