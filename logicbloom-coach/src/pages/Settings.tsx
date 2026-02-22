import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function Settings() {
  const { profile, updateProfile, isUpdating } = useProfile();
  const [schoolName, setSchoolName] = useState(profile?.school_name || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');

  const handleSave = () => {
    updateProfile({ school_name: schoolName, full_name: fullName });
  };

  return (
    <AppLayout title="Settings" subtitle="Manage your account and preferences">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        <Card className="glass-card border-gradient">
          <CardHeader>
            <CardTitle className="font-display">Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>School Name</Label>
              <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>Subjects</Label>
              <div className="flex flex-wrap gap-2">
                {profile?.subjects?.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </div>
            <Button onClick={handleSave} disabled={isUpdating} className="gradient-primary">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-gradient">
          <CardHeader>
            <CardTitle className="font-display">Subscription</CardTitle>
            <CardDescription>Your current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className="bg-primary/20 text-primary border-primary/30">Free Plan</Badge>
            <p className="text-sm text-muted-foreground mt-2">API keys are managed securely server-side.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
