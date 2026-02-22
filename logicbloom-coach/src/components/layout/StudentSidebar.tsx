import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSidebarCollapsed } from '@/contexts/SidebarContext';
import {
  LayoutDashboard,
  FileSearch,
  School,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
  { icon: FileSearch, label: 'Check Solution', path: '/analysis' },
  { icon: Brain, label: 'AI Tutor', path: '/tutor' },
  { icon: School, label: 'My Classes', path: '/classrooms' },
  { icon: TrendingUp, label: 'Progress', path: '/progress' },
];

export function StudentSidebar() {
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside
      className={cn(
        'fixed left-4 top-4 bottom-4 z-40 flex flex-col',
        'glass-panel rounded-2xl',
        'transition-all duration-300 ease-out',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col p-3">
        {/* Logo */}
        <div className={cn(
          'flex items-center h-14 px-2 border-b border-white/10',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_28px_rgba(99,102,241,0.5)] transition-shadow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg gradient-text tracking-tight">
                CogniTrace
              </span>
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.35)]">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </Link>
          )}
        </div>

        {/* Nav — neon active state */}
        <nav className="flex-1 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const linkContent = (
              <Link
                to={item.path}
                className={cn(
                  'relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
                  isActive
                    ? [
                        'bg-gradient-to-r from-indigo-500/90 to-purple-500/90',
                        'text-white',
                        'shadow-[0_0_24px_-4px_rgba(99,102,241,0.5)]',
                        'ring-1 ring-white/20',
                        'scale-[1.02]',
                        item.path === '/tutor' && 'animate-pulse-glow',
                      ]
                    : [
                        'text-slate-400',
                        'hover:text-white',
                        'hover:bg-white/[0.06]',
                        'hover:scale-[1.01]',
                      ]
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl -z-10" />
                )}
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0'
                )} strokeWidth={1.5} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="glass-panel border-white/10">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return <div key={item.path}>{linkContent}</div>;
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 pt-3 space-y-1">
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full text-slate-400 hover:text-white hover:bg-white/5"
                  onClick={signOut}
                >
                  <LogOut className="w-5 h-5" strokeWidth={1.5} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="glass-panel">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5 mr-2" strokeWidth={1.5} />
              Sign Out
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="w-full text-slate-400 hover:text-white hover:bg-white/5"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" strokeWidth={1.5} /> : <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
