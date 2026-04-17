import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Thermometer, CreditCard,
  Wine, Beer, Receipt, DollarSign, ArrowLeftRight, BarChart3, Settings,
  Menu, X, LogOut, Handshake, Crown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { title: 'Dashboard', path: '/', icon: LayoutDashboard },
  { title: 'Purchase', path: '/purchase', icon: ShoppingCart },
  { title: 'Inventory', path: '/inventory', icon: Package },
  { title: 'Standing Stock', path: '/standing-stock', icon: Thermometer },
  { title: 'POS', path: '/pos', icon: CreditCard },
  { title: 'Whiskey', path: '/whiskey', icon: Wine },
  { title: 'Draft', path: '/draft', icon: Beer },
  { title: 'Expenses', path: '/expenses', icon: Receipt },
  { title: 'Cost', path: '/cost', icon: DollarSign },
  { title: 'Exchange', path: '/exchange', icon: ArrowLeftRight },
  { title: 'Loans', path: '/loans', icon: Handshake },
  { title: 'Reports', path: '/reports', icon: BarChart3 },
  { title: 'Products', path: '/products', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const desktopWidth = isCollapsed ? 'lg:w-[72px]' : 'lg:w-64';

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        no-print
        fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex-shrink-0
        ${desktopWidth}
        bg-sidebar text-sidebar-foreground flex flex-col
        transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className={`relative py-4 flex flex-col items-center justify-center border-b border-sidebar-border transition-all duration-500 overflow-hidden ${isCollapsed ? 'min-h-[64px]' : 'min-h-[140px]'}`}>
          <img 
            src="/logo.jpg" 
            alt="St Mary Bar Logo" 
            onError={(e) => {
              // Fallback if logo isn't placed yet
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/111/f59e0b?text=SMB';
            }}
            className={`transition-all duration-500 ease-out object-contain mix-blend-screen ${isCollapsed ? 'w-10 h-10' : 'w-32 h-32 hover:scale-105 hover:drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]'}`}
          />
          <button onClick={() => setSidebarOpen(false)} className={`lg:hidden absolute top-2 right-2 text-sidebar-muted hover:text-amber-500 transition-colors ${isCollapsed ? 'hidden' : ''}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-4 space-y-1 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? item.title : undefined}
                className={`
                  flex items-center rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group
                  ${isCollapsed ? 'justify-center p-2.5 mx-auto w-10 h-10' : 'px-3 py-2.5 w-full'}
                  ${active
                    ? 'bg-gradient-to-r from-amber-600 to-amber-400 text-white shadow-md shadow-amber-500/30'
                    : 'text-sidebar-foreground hover:bg-amber-500/10 hover:text-amber-500 hover:translate-x-1'
                  }
                `}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-300 ${active ? 'scale-110 drop-shadow-md' : 'opacity-80 group-hover:scale-110 group-hover:text-amber-500'}`} />
                <span className={`truncate transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-full opacity-100 ml-3'}`}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-sidebar-border flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user?.email?.split('@')[0] || 'User'}</p>
            <p className="text-[10px] text-sidebar-muted truncate">{user?.email || 'Logged In'}</p>
          </div>
          <button 
            onClick={() => signOut()}
            className={`text-sidebar-muted hover:text-destructive flex-shrink-0 transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0 m-0 p-0' : 'w-[18px] opacity-100'}`}
            title="Log Out"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="no-print sticky top-0 z-30 h-16 bg-card border-b border-border flex items-center px-4 lg:px-6 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h2 className="text-base font-semibold font-heading">
              {navItems.find(i => i.path === location.pathname)?.title || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto bg-background">
          <div key={location.pathname} className="w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-forwards">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
