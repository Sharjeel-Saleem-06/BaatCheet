/**
 * Layout Component
 * Main app layout with sidebar and Clerk user button
 */

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { UserButton, useUser, useClerk } from '@clerk/clerk-react';
import {
  MessageSquare,
  FolderOpen,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  HelpCircle,
  Lock,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navItems = [
  { path: '/app/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/app/projects', icon: FolderOpen, label: 'Projects' },
  { path: '/app/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/app/settings', icon: Settings, label: 'Settings' },
];

// Admin emails that can access the Admin Panel
const ADMIN_EMAILS = ['muhammadsharjeelsaleem06@gmail.com', 'onseason10@gmail.com'];

export default function Layout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Check if current user is an admin
  const isAdmin = user?.primaryEmailAddress?.emailAddress && 
    ADMIN_EMAILS.includes(user.primaryEmailAddress.emailAddress);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 lg:transform-none shadow-xl lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 flex items-center justify-center shadow-lg shadow-slate-500/10 overflow-hidden">
                <img src="/logo.png" alt="BaatCheet" className="w-7 h-7 object-contain" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">BaatCheet</span>
            </div>
            <button
              className="lg:hidden text-slate-400 hover:text-slate-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium',
                    isActive
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 border border-emerald-200/80 shadow-sm shadow-emerald-500/10'
                      : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 hover:text-slate-800'
                  )
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            
            {/* Additional links */}
            <div className="pt-4 mt-4 border-t border-slate-200 space-y-1">
              <NavLink
                to="/help"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <HelpCircle size={20} />
                <span>Help & Support</span>
              </NavLink>
              <NavLink
                to="/privacy"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <Lock size={20} />
                <span>Privacy Policy</span>
              </NavLink>
              
              {/* Admin Panel - Only visible to admin users */}
              {isAdmin && (
                <NavLink
                  to="/app/admin"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium',
                      isActive
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                    )
                  }
                >
                  <Shield size={20} />
                  <span>Admin Panel</span>
                </NavLink>
              )}
            </div>
          </nav>

          {/* User section with Clerk UserButton */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3 mb-3">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: 'w-10 h-10',
                  },
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {user?.fullName || user?.username || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.primaryEmailAddress?.emailAddress || ''}
                </p>
              </div>
            </div>
            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 p-4 border-b border-slate-200 bg-white">
          <button
            className="text-slate-500 hover:text-slate-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <span className="text-lg font-semibold text-slate-800">BaatCheet</span>
          <div className="ml-auto">
            <UserButton />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
