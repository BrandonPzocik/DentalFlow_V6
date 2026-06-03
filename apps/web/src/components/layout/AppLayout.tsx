import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
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
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/patients', icon: Users, label: 'Pacientes' },
      { to: '/appointments', icon: Calendar, label: 'Agenda' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/billing', icon: Receipt, label: 'Facturación' },
      { to: '/social-works', icon: Building2, label: 'Obras sociales' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/notifications', icon: Bell, label: 'Notificaciones' },
      { to: '/settings', icon: Settings, label: 'Configuración' },
    ],
  },
];

const ROUTE_CRUMBS: Record<string, string> = {
  dashboard: 'Inicio',
  patients: 'Pacientes',
  appointments: 'Agenda',
  billing: 'Facturación',
  'social-works': 'Obras sociales',
  notifications: 'Notificaciones',
  settings: 'Configuración',
};

function useBreadcrumb() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; to?: string }[] = [{ label: 'DentaFlow', to: '/dashboard' }];
  let path = '';
  for (const part of parts) {
    path += `/${part}`;
    const label = ROUTE_CRUMBS[part] ?? part;
    crumbs.push({ label, to: path });
  }
  return crumbs;
}

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const crumbs = useBreadcrumb();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside
        className="flex flex-col bg-slate-900 shrink-0 border-r border-slate-800"
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="flex items-center gap-3 px-4 border-b border-slate-800" style={{ height: 'var(--topbar-height)' }}>
          <div className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden>
              <path d="M12 2C9 2 7 4 7 6c0 1.5.5 2.5.5 4C7.5 12 6 13.5 6 16c0 2.5 1.5 4 3 4 .8 0 1.5-.5 2-.5s1.2.5 2 .5c1.5 0 3-1.5 3-4 0-2.5-1.5-4-1.5-6 0-1.5.5-2.5.5-4 0-2-2-4-5-4z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-white text-base font-medium leading-tight truncate">DentaFlow</p>
            <p className="text-slate-500 text-sm truncate">Gestión odontológica</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="nav-section-label px-2 mb-2">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2.5 text-base font-medium transition-colors rounded-lg',
                        isActive
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
                      )
                    }
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-2">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800/60">
            <div className="w-9 h-9 rounded-full bg-teal-800 flex items-center justify-center text-white text-sm font-medium shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-base font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-slate-500 text-sm truncate">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2.5 mt-1 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 text-base font-medium transition-colors rounded-lg"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header
          className="bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0"
          style={{ height: 'var(--topbar-height)' }}
        >
          <nav className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <ChevronRight size={12} className="shrink-0 text-slate-400" />}
                {c.to && i < crumbs.length - 1 ? (
                  <Link to={c.to} className="hover:text-slate-800 truncate font-medium">
                    {c.label}
                  </Link>
                ) : (
                  <span className={cn('truncate', i === crumbs.length - 1 ? 'text-slate-800 font-medium' : '')}>
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/notifications"
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Notificaciones"
            >
              <Bell size={17} strokeWidth={1.75} />
            </Link>
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 text-sm font-medium">
              {user?.firstName?.[0]}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <Toaster position="bottom-right" closeButton />
    </div>
  );
}
