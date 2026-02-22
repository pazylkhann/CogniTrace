import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, School, BookOpen, ArrowRight, Check, Loader2, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const subjects = [
  { id: 'mathematics', label: 'Mathematics', icon: '📐' },
  { id: 'physics', label: 'Physics', icon: '⚛️' },
  { id: 'chemistry', label: 'Chemistry', icon: '🧪' },
  { id: 'biology', label: 'Biology', icon: '🧬' },
  { id: 'english', label: 'English', icon: '📚' },
  { id: 'history', label: 'History', icon: '🏛️' },
  { id: 'computer_science', label: 'Computer Science', icon: '💻' },
  { id: 'economics', label: 'Economics', icon: '📊' },
];

const gradeLevels = [
  { id: 'middle_school', label: 'Middle School', icon: '🏫' },
  { id: 'high_school_freshman', label: 'High School - Freshman', icon: '📗' },
  { id: 'high_school_sophomore', label: 'High School - Sophomore', icon: '📘' },
  { id: 'high_school_junior', label: 'High School - Junior', icon: '📙' },
  { id: 'high_school_senior', label: 'High School - Senior', icon: '📕' },
  { id: 'college', label: 'College/University', icon: '🎓' },
];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const { profile, updateProfile, isLoading: profileLoading, isUpdating } = useProfile();
  const { role, isTeacher, isStudent } = useRole();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [schoolName, setSchoolName] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile?.onboarding_completed) {
    return <Navigate to="/dashboard" replace />;
  }

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((s) => s !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleComplete = async () => {
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    // Different data for teachers vs students
    const profileData: any = {
      onboarding_completed: true,
    };

    if (isTeacher) {
      profileData.school_name = schoolName || null;
      profileData.subjects = selectedSubjects;
    } else if (isStudent) {
      profileData.grade_level = selectedGrade || null;
      profileData.focus_subjects = selectedSubjects;
    }

    updateProfile(profileData);

    toast.success('Welcome to CogniTrace! 🎉');
    navigate('/dashboard');
  };

  // Dynamic step count and titles based on role
  const totalSteps = 2;
  const step1Title = isStudent ? 'Your Grade Level' : 'Your School';
  const step2Title = isStudent ? 'What are you studying?' : 'What do you teach?';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl gradient-text">CogniTrace</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Let's personalize your experience
          </h1>
          <p className="text-muted-foreground">
            {isStudent 
              ? "Tell us about your learning journey"
              : "Tell us a bit about yourself so we can customize your dashboard"
            }
          </p>
          {role && (
            <Badge className="mt-3 capitalize" variant="secondary">
              {role} Mode
            </Badge>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
            step >= 1 ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={cn('w-16 h-0.5', step > 1 ? 'bg-primary' : 'bg-muted')} />
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
            step >= 2 ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            2
          </div>
        </div>

        {/* Step Content */}
        <div className="glass-card rounded-2xl p-8 border-gradient">
          {step === 1 && (
            <div className="animate-fade-in">
              {isStudent ? (
                // Student Step 1: Grade Level
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        What grade are you in?
                      </h2>
                      <p className="text-sm text-muted-foreground">This helps us adjust the difficulty</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {gradeLevels.map((grade) => (
                      <button
                        key={grade.id}
                        onClick={() => setSelectedGrade(grade.id)}
                        className={cn(
                          'p-4 rounded-xl border transition-all duration-200 text-left',
                          selectedGrade === grade.id
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
                        )}
                      >
                        <span className="text-2xl mb-2 block">{grade.icon}</span>
                        <span className="text-sm font-medium text-foreground">{grade.label}</span>
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    className="w-full h-12 gradient-primary text-primary-foreground font-semibold glow-primary"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </>
              ) : (
                // Teacher Step 1: School Name
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <School className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        Your School
                      </h2>
                      <p className="text-sm text-muted-foreground">Optional but helps us personalize</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-8">
                    <Label htmlFor="school">School or Institution Name</Label>
                    <Input
                      id="school"
                      placeholder="e.g., Lincoln High School"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="h-12 bg-muted/50"
                    />
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    className="w-full h-12 gradient-primary text-primary-foreground font-semibold glow-primary"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    {isStudent ? "What subjects are you focusing on?" : "What do you teach?"}
                  </h2>
                  <p className="text-sm text-muted-foreground">Select all that apply</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => toggleSubject(subject.id)}
                    className={cn(
                      'p-4 rounded-xl border transition-all duration-200 text-left',
                      selectedSubjects.includes(subject.id)
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <span className="text-2xl mb-2 block">{subject.icon}</span>
                    <span className="text-sm font-medium text-foreground">{subject.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-12"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={isUpdating || selectedSubjects.length === 0}
                  className="flex-1 h-12 gradient-primary text-primary-foreground font-semibold glow-primary"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Badge component for role display
function Badge({ children, className, variant = 'default' }: { children: React.ReactNode; className?: string; variant?: 'default' | 'secondary' }) {
  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
      variant === 'secondary' ? 'bg-muted text-muted-foreground' : 'bg-primary/20 text-primary',
      className
    )}>
      {children}
    </span>
  );
}
