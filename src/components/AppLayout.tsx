import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Thermometer, CreditCard,
  Wine, Beer, Receipt, DollarSign, ArrowLeftRight, BarChart3, Settings,
  Menu, X, LogOut, Handshake, Moon, Sun, Search, Bell
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

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
  const { theme, setTheme } = useTheme();

  const desktopWidth = isCollapsed ? 'lg:w-[88px]' : 'lg:w-[280px]';

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar Island Wrapper */}
      <aside className={`
        no-print
        fixed lg:sticky top-0 left-0 z-50 h-[100dvh] flex-shrink-0
        ${desktopWidth}
        bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border
        transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] whitespace-nowrap overflow-hidden
        lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${sidebarOpen ? 'translate-x-0 w-[280px] shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className={`relative py-6 flex flex-col items-center justify-center border-b border-sidebar-border/50 transition-all duration-300 overflow-hidden ${isCollapsed ? 'min-h-[80px]' : 'min-h-[140px]'}`}>
          <img 
            src="/logo.jpg" 
            alt="Brand Logo" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/111/f59e0b?text=SMB';
            }}
            className={`transition-all duration-500 ease-out object-contain mix-blend-screen rounded-xl ${isCollapsed ? 'w-10 h-10' : 'w-24 h-24 hover:scale-105 hover:drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]'}`}
          />
          <button onClick={() => setSidebarOpen(false)} className={`lg:hidden absolute top-3 right-3 text-sidebar-muted hover:text-white transition-colors p-1 bg-white/5 rounded-full ${isCollapsed ? 'hidden' : ''}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Map */}
        <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
          <nav className="space-y-1.5 flex flex-col">
            <span className={`text-[10px] font-bold text-sidebar-muted uppercase tracking-wider mb-2 ml-3 transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
              Main Menu
            </span>
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  title={isCollapsed ? item.title : undefined}
                  className={`
                    flex items-center rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden group relative
                    ${isCollapsed ? 'justify-center p-3 w-12 h-12 mx-auto' : 'px-4 py-3.5 w-full'}
                    ${active
                      ? 'bg-amber-500 text-white shadow-[0_4px_12px_rgba(245,158,11,0.25)]'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-1'
                    }
                  `}
                >
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-300 ${active ? 'scale-110 drop-shadow-md' : 'opacity-70 group-hover:scale-110 group-hover:opacity-100'}`} />
                  <span className={`truncate transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-full opacity-100 ml-3.5'}`}>
                    {item.title}
                  </span>
                  
                  {/* Active Indicator Line Segment */}
                  {active && !isCollapsed && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Profile Segment */}
        <div className={`p-4 mt-auto border-t border-sidebar-border/50 flex flex-col gap-4 bg-sidebar-accent/30 transition-all duration-300 ${isCollapsed ? 'items-center px-2' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-inner flex items-center justify-center text-sm font-bold text-white uppercase ring-2 ring-sidebar-background">
              {user?.email?.charAt(0) || 'U'}
            </div>
            <div className={`flex flex-col flex-1 overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-full opacity-100'}`}>
              <p className="text-[13px] font-bold text-sidebar-foreground truncate tracking-wide">{user?.email?.split('@')[0] || 'Administrator'}</p>
              <p className="text-[10px] text-sidebar-muted truncate font-medium">Premium Access</p>
            </div>
          </div>
          
          <button 
            onClick={() => signOut()}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-bold transition-all overflow-hidden border border-transparent
              ${isCollapsed 
                ? 'w-10 text-sidebar-muted hover:text-destructive hover:bg-destructive/10' 
                : 'text-sidebar-muted bg-sidebar-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20'
              }`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            <span className={`${isCollapsed ? 'hidden' : 'inline'}`}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-x-hidden">
        
        {/* Premium Top Header */}
        <header className="no-print sticky top-0 z-30 h-20 bg-background/80 backdrop-blur-xl border-b border-border/40 flex items-center px-4 lg:px-8 gap-4 shadow-sm transition-all duration-300">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center flex-1 gap-6">
            <h2 className="text-xl font-bold font-heading text-foreground tracking-tight hidden sm:block">
              {navItems.find(i => i.path === location.pathname)?.title || 'Dashboard'}
            </h2>

            {/* Premium Global Search Bar */}
            <div className="flex-1 max-w-md hidden md:flex items-center relative ml-4">
              <Search className="w-4 h-4 absolute left-3.5 text-muted-foreground/70" />
              <input 
                type="text" 
                placeholder="Search everywhere..." 
                className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-background border border-transparent focus:border-ring transition-all placeholder:text-muted-foreground text-sm rounded-full pl-10 pr-4 py-2.5 outline-none shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative shadow-sm border border-transparent hover:border-border/50"
              title="Toggle Theme"
            >
               {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <button className="p-2.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative shadow-sm border border-transparent hover:border-border/50">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-destructive rounded-full" />
            </button>

            <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block"></div>

            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-xs font-bold text-foreground">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground text-right">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>
            </div>
          </div>
        </header>

        {/* Main Routed Content Injection */}
        <main className="page-container bg-muted/10 relative">
           {children}
        </main>
      </div>
    </div>
  );
}
