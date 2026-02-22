import { useState } from 'react';
import { GraduationCap, UserCog, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RoleSelectionProps {
  onSelectRole: (role: 'teacher' | 'student') => Promise<void>;
  isLoading: boolean;
}

export function RoleSelection({ onSelectRole, isLoading }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);

  const handleContinue = async () => {
    if (selectedRole) {
      await onSelectRole(selectedRole);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-primary-deep/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary-glow/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="absolute inset-0 rounded-xl gradient-primary blur-xl opacity-50" />
            </div>
            <span className="font-display font-bold text-3xl gradient-text">CogniTrace</span>
          </div>
          
          <h1 className="font-display text-4xl font-bold text-foreground mb-4">
            One platform,<br />
            <span className="gradient-text">two perspectives.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-md">
            Teachers analyze student work and provide guidance.
            Students receive Socratic hints that lead them to deeper understanding.
          </p>
        </div>
      </div>

      {/* Right Panel - Role Selection */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl gradient-text">CogniTrace</span>
          </div>

          <div className="glass-card rounded-2xl p-8 border-gradient">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Who are you?
              </h2>
              <p className="text-muted-foreground mt-2">
                This will customize your experience
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedRole('teacher')}
                className={cn(
                  'w-full p-6 rounded-xl border-2 transition-all duration-200 text-left',
                  selectedRole === 'teacher'
                    ? 'border-primary bg-primary/10 glow-primary'
                    : 'border-border hover:border-primary/50 bg-muted/30'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                    <UserCog className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg text-foreground">
                      I'm a Teacher
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create classrooms, analyze student work, and track learning progress
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className={cn(
                  'w-full p-6 rounded-xl border-2 transition-all duration-200 text-left',
                  selectedRole === 'student'
                    ? 'border-primary bg-primary/10 glow-primary'
                    : 'border-border hover:border-primary/50 bg-muted/30'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                    <GraduationCap className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg text-foreground">
                      I'm a Student
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Join classes, get Socratic hints on your work, and track your progress
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <Button
              onClick={handleContinue}
              disabled={!selectedRole || isLoading}
              className="w-full h-12 mt-6 gradient-primary text-primary-foreground font-semibold text-base glow-primary"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
