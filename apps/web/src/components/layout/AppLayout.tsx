import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, LogOut,
  Receipt, Building2, Bell, Settings, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/patients',     icon: Users,           label: 'Pacientes' },
      { to: '/appointments', icon: Calendar,        label: 'Agenda' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/billing',      icon: Receipt,    label: 'Facturación' },
      { to: '/social-works', icon: Building2,  label: 'Obras Sociales' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/notifications', icon: Bell,     label: 'Notificaciones' },
      { to: '/settings',      icon: Settings, label: 'Configuración' },
    ],
  },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="flex flex-col w-60 bg-slate-900 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M12 2C9 2 7 4 7 6c0 1.5.5 2.5.5 4C7.5 12 6 13.5 6 16c0 2.5 1.5 4 3 4 .8 0 1.5-.5 2-.5s1.2.5 2 .5c1.5 0 3-1.5 3-4 0-2.5-1.5-4-1.5-6 0-1.5.5-2.5.5-4 0-2-2-4-5-4z"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">DentaFlow</p>
            <p className="text-slate-400 text-xs">Gestión Odontológica</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-2 mb-2">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                      )
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-slate-700/50 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-slate-400 text-xs truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 mt-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg text-sm transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-slate-600 font-medium">DentaFlow</span>
            <ChevronRight size={14} />
            <span>Inicio</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-bold">
              {user?.firstName?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }} />
    </div>
  );
}
