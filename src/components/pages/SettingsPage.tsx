import { Bell, LogOut, Shield, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/shadcn/card';
import { Label, Input } from '@/components/ui/shadcn/field';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { useProfile } from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const profile = useProfile();
  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <h1 className="text-lg font-bold text-foreground">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold flex items-center gap-2">
            <User size={14} /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback className="text-sm">{initials || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>First name</Label>
              <Input defaultValue={profile.first_name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Last name</Label>
              <Input defaultValue={profile.last_name} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input defaultValue={profile.email} disabled />
          </div>

          <button className="h-10 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Save changes
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold flex items-center gap-2">
            <Bell size={14} /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-3">
          {['Client check-in submissions', 'New messages', 'Form check uploads', 'Weekly summary email'].map((label) => (
            <label key={label} className="flex items-center justify-between text-sm text-foreground">
              {label}
              <input type="checkbox" defaultChecked className="accent-primary" />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold flex items-center gap-2">
            <Shield size={14} /> Security
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-3">
          <button
            onClick={() => void supabase.auth.signOut()}
            className="flex items-center gap-2 h-10 px-4 w-fit rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
