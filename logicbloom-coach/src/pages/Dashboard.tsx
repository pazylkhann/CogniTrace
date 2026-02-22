import { AppLayout } from '@/components/layout/AppLayout';
import { useRole } from '@/hooks/useRole';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { role, isLoading, isTeacher, isStudent } = useRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-slate-300 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Fallback to teacher dashboard if no role (shouldn't happen with proper auth)
  const DashboardContent = isStudent ? StudentDashboard : TeacherDashboard;
  const title = isStudent ? 'My Dashboard' : 'Command Center';
  const subtitle = isStudent ? 'Your learning journey at a glance' : 'Your teaching analytics at a glance';

  return (
    <AppLayout title={title} subtitle={subtitle}>
      <DashboardContent />
    </AppLayout>
  );
};

export default Dashboard;
