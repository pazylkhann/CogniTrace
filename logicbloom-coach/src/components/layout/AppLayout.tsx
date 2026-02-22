import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { StudentSidebar } from './StudentSidebar';
import { AppHeader } from './AppHeader';
import { RightSidebar } from './RightSidebar';
import { useRole } from '@/hooks/useRole';
import { useSidebarCollapsed } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { isStudent } = useRole();
  const { collapsed } = useSidebarCollapsed();
  const Sidebar = isStudent ? StudentSidebar : AppSidebar;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-300 ease-out min-h-screen',
          collapsed ? 'pl-[104px]' : 'pl-[288px]',
          isStudent ? 'pr-[336px]' : 'pr-6'
        )}
      >
        <AppHeader title={title} subtitle={subtitle} />
        <div className="p-6 pb-12">{children}</div>
      </main>
      {isStudent && <RightSidebar />}
    </div>
  );
}
