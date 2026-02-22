import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { RoleSelection } from '@/components/auth/RoleSelection';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, isLoading: roleLoading, setRole } = useRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-slate-300 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user is logged in but has no role, show role selection
  if (!role) {
    const handleSelectRole = async (selectedRole: 'teacher' | 'student') => {
      try {
        await setRole(selectedRole);
        toast.success(`Welcome! You're now set up as a ${selectedRole}.`);
      } catch (error) {
        toast.error('Failed to set role. Please try again.');
      }
    };

    return <RoleSelection onSelectRole={handleSelectRole} isLoading={false} />;
  }

  return <>{children}</>;
}
