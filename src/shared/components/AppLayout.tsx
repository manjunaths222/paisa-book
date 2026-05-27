import {
  BarChart3,
  BookOpenCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { ToastHost } from './ui';
import { useUiStore } from '../stores/uiStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/instruments', label: 'Instruments', icon: BookOpenCheck },
  { to: '/projections', label: 'Projections', icon: BarChart3 },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export function AppLayout() {
  const { user, signOutUser } = useAuth();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <p className="text-xl font-black text-slate-950">Paisa Book</p>
            <p className="mt-1 text-xs font-medium text-teal-700">Family finance ledger</p>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
          <button
            type="button"
            onClick={signOutUser}
            className="mx-3 mb-4 flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur lg:ml-64">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            {user?.photoURL ? <img src={user.photoURL} alt="" className="h-9 w-9 rounded-full" /> : null}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-950">{user?.displayName}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </header>
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <nav className="h-full w-72 bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <p className="mb-4 px-2 text-xl font-black text-slate-950">Paisa Book</p>
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} onClick={() => setSidebarOpen(false)} />
            ))}
          </nav>
        </div>
      ) : null}
      <main className="pb-24 lg:ml-64 lg:pb-8">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-semibold ${
                  isActive ? 'text-teal-700' : 'text-slate-500'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <ToastHost />
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  onClick
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition ${
          isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-100'
        }`
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}
