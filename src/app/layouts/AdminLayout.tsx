import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router';
import { Toaster, toast } from 'sonner';
import {
  LayoutDashboard,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Inbox,
  Package,
  ShieldCheck,
  Megaphone,
  MapPin,
} from 'lucide-react';
import logoImg from '../../imports/logo-with-shadow.png';
import { AdminAuthProvider, useAdminAuth } from '../admin/auth/AuthProvider';
import { AdminLogin } from '../admin/auth/AdminLogin';

type NavItem = {
  name: string;
  icon: typeof Inbox;
  path?: string;
  end?: boolean;
  external?: string;
};

const navItems: NavItem[] = [
  { name: 'Tableau de bord', path: '/admin', icon: LayoutDashboard, end: true },
  { name: 'Devis en attente', path: '/admin/quotes', icon: Inbox },
  { name: 'Articles Blog', path: '/admin/blog', icon: FileText },
  { name: 'Produits', path: '/admin/products', icon: Package },
  { name: 'Bannière Promo', path: '/admin/promo', icon: Megaphone },
  { name: 'Carte des Pivots', external: '/map/index.html', icon: MapPin },
  { name: 'Paramètres', path: '/admin/settings', icon: SettingsIcon },
];

const AdminShell = () => {
  const { user, signOut } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const initials =
    (user?.email ?? '??')
      .split('@')[0]
      .split(/[._-]/)
      .map((p) => p.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AE';

  return (
    <div
      className="flex h-screen bg-[#0a1c12] text-white overflow-hidden font-sans selection:bg-[#87A922] selection:text-white"
      style={{ position: 'relative' }}
    >
      <aside className="w-72 border-r border-white/5 bg-[#0f2618] flex flex-col">
        <Link to="/admin" className="p-6 flex items-center gap-3 border-b border-white/5">
          <img src={logoImg} alt="AGROESPACE" className="h-9 w-auto object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="text-white font-bold font-serif tracking-tight text-lg">AGROESPACE</span>
            <span className="text-[#87A922] text-[10px] uppercase tracking-[0.25em] font-semibold">
              Admin Console
            </span>
          </div>
        </Link>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            // External link (full page reload) for the standalone map app
            if (item.external) {
              return (
                <a
                  key={item.name}
                  href={item.external}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-white/60 hover:text-white hover:bg-white/5"
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.name}</span>
                </a>
              );
            }
            return (
              <NavLink
                key={item.name}
                to={item.path!}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#87A922] text-white shadow-[0_8px_25px_rgba(135,169,34,0.25)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-4 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#114232] border border-white/10 flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm truncate" title={user?.email ?? ''}>
                {user?.email ?? '—'}
              </div>
              <div className="text-[#87A922] text-[10px] uppercase tracking-[0.2em] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Administrateur
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              toast.success('Déconnecté');
              navigate('/admin', { replace: true });
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#0a1c12]">
        <div key={location.pathname}>
          <Outlet />
        </div>
      </main>
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
};

const AdminGate = () => {
  const { loading, user, isAdmin, adminCheckPending } = useAdminAuth();

  if (loading || adminCheckPending) {
    return (
      <div className="min-h-screen bg-[#0a1c12] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#87A922] animate-spin" />
      </div>
    );
  }
  if (!user) return <AdminLogin />;
  if (!isAdmin) return <AdminLogin reason="forbidden" />;
  return <AdminShell />;
};

export const AdminLayout = () => {
  return (
    <AdminAuthProvider>
      <AdminGate />
    </AdminAuthProvider>
  );
};
