import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Flame,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import FloatingAiWidget from '../Ai/FloatingAiWidget';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'AI Assistant', path: '/ai', icon: Sparkles },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Notes', path: '/notes', icon: FileText },
    { name: 'Habits', path: '/habits', icon: Flame },
    { name: 'Kalender', path: '/calendar', icon: Calendar },
    { name: 'Reminders', path: '/reminders', icon: Bell },
    { name: 'Pengaturan', path: '/settings', icon: Settings },
  ];

  const getPageTitle = () => {
    const current = navItems.find((item) => item.path === location.pathname);
    return current ? current.name : 'DailyFlow';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="app-container">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 35 }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <Sparkles className="logo-icon" size={24} />
            <span>DailyFlow</span>
          </div>
          <button
            className="btn-icon-sm mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-compact">
            <div className="avatar-circle">{getInitials(user?.name)}</div>
            <div className="user-info-text">
              <span className="user-name">{user?.name || 'Pengguna'}</span>
              <span className="user-email">{user?.email || ''}</span>
            </div>
          </div>
          <button
            className="btn-logout-icon"
            onClick={handleLogout}
            title="Keluar / Logout"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="top-header">
          <div className="header-left">
            <button
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="page-title">{getPageTitle()}</h1>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Assistant Widget */}
      <FloatingAiWidget />
    </div>
  );
};

export default AppLayout;

