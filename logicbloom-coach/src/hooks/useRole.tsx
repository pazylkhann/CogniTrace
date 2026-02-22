import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'teacher' | 'student';

interface RoleContextType {
  role: AppRole | null;
  isLoading: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  setRole: (role: AppRole) => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const ROLE_QUERY_TIMEOUT_MS = 8000;

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async (): Promise<AppRole | null> => {
      if (!user) return null;
      try {
        const result = await Promise.race([
          supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), ROLE_QUERY_TIMEOUT_MS)
          ),
        ]);
        const { data, error } = result;
        if (error) throw error;
        return data?.role as AppRole | null;
      } catch {
        return null;
      }
    },
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const setRoleMutation = useMutation({
    mutationFn: async (newRole: AppRole) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: user.id, role: newRole }, { onConflict: 'user_id,role' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-role', user?.id] });
    },
  });

  const setRole = async (newRole: AppRole) => {
    await setRoleMutation.mutateAsync(newRole);
  };

  const resolvedRole = role ?? null;
  return (
    <RoleContext.Provider
      value={{
        role: resolvedRole,
        isLoading,
        isTeacher: resolvedRole === 'teacher',
        isStudent: resolvedRole === 'student',
        setRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
