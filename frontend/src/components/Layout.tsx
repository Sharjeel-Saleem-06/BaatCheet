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
    <div className="flex h-screen bg-dark-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark-800 border-r border-dark-700 transform transition-transform duration-200 lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-dark-700">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold">B</span>
              </div>
              <span className="text-xl font-semibold text-dark-100">BaatCheet</span>
            </div>
            <button
              className="lg:hidden text-dark-400 hover:text-dark-200"
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
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-dark-400 hover:bg-dark-700 hover:text-dark-200'
                  )
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            
            {/* Additional links */}
            <div className="pt-4 mt-4 border-t border-dark-700 space-y-1">
              <NavLink
                to="/help"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-dark-400 hover:bg-dark-700 hover:text-dark-200 transition-colors"
              >
                <HelpCircle size={20} />
                <span>Help & Support</span>
              </NavLink>
              <NavLink
                to="/privacy"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-dark-400 hover:bg-dark-700 hover:text-dark-200 transition-colors"
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
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400'
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
          <div className="p-4 border-t border-dark-700">
            <div className="flex items-center gap-3 mb-3">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: 'w-10 h-10',
                  },
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-100 truncate">
                  {user?.fullName || user?.username || 'User'}
                </p>
                <p className="text-xs text-dark-500 truncate">
                  {user?.primaryEmailAddress?.emailAddress || ''}
                </p>
              </div>
            </div>
            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 p-4 border-b border-dark-700 bg-dark-800">
          <button
            className="text-dark-400 hover:text-dark-200"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <span className="text-lg font-semibold text-dark-100">BaatCheet</span>
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
