import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole, AppRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2, GraduationCap, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = authSchema.extend({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const { role, setRole } = useRole();
  const navigate = useNavigate();

  // If user is logged in and has a role, redirect to dashboard
  if (user && role) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!selectedRole) {
          toast.error('Please select whether you are a Teacher or Student');
          setIsLoading(false);
          return;
        }

        const result = signUpSchema.safeParse({ email, password, fullName });
        if (!result.success) {
          toast.error(result.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
          setIsLoading(false);
          return;
        }

        // Wait a moment for auth to complete, then set role
        await new Promise(resolve => setTimeout(resolve, 500));
        await setRole(selectedRole);
        
        toast.success('Account created! Redirecting to your dashboard...');
        navigate('/onboarding');
      } else {
        const result = authSchema.safeParse({ email, password });
        if (!result.success) {
          toast.error(result.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Invalid email or password. Please try again.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Welcome back!');
          navigate('/dashboard');
        }
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
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
            Trace the thinking,<br />
            <span className="gradient-text">unlock the learning.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-md">
            {isSignUp 
              ? 'Join as a Teacher to analyze student work, or as a Student to get Socratic guidance on your solutions.'
              : 'Go beyond right and wrong answers. Analyze cognitive pathways, identify logical gaps, and generate Socratic questions.'
            }
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="glass-card p-4 rounded-xl border-gradient">
              <p className="text-2xl font-bold text-foreground">85%</p>
              <p className="text-sm text-muted-foreground">Time saved on analysis</p>
            </div>
            <div className="glass-card p-4 rounded-xl border-gradient">
              <p className="text-2xl font-bold text-foreground">3x</p>
              <p className="text-sm text-muted-foreground">Better learning outcomes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
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
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isSignUp
                  ? 'Start analyzing cognitive pathways today'
                  : 'Sign in to continue to your dashboard'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignUp && (
                <>
                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label>I am a...</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('teacher')}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all duration-200 text-left',
                          selectedRole === 'teacher'
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 bg-muted/30'
                        )}
                      >
                        <UserCog className={cn(
                          'w-6 h-6 mb-2',
                          selectedRole === 'teacher' ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <p className="font-medium">Teacher</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('student')}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all duration-200 text-left',
                          selectedRole === 'student'
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 bg-muted/30'
                        )}
                      >
                        <GraduationCap className={cn(
                          'w-6 h-6 mb-2',
                          selectedRole === 'student' ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <p className="font-medium">Student</p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder={selectedRole === 'student' ? 'John Doe' : 'Dr. Jane Smith'}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10 h-12 bg-muted/50 border-border"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-border"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-base glow-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setSelectedRole(null);
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
