// src/app/dashboard/page.tsx
'use client';

import AppLayout from '@/components/layout/app-layout';
import { DashboardClient } from '@/components/dashboard-client';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, employees, absences, medicalFollowUps, emos, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  if (loading || !user) {
     return (
        <div className="flex h-screen items-center justify-center">
             <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <AppLayout pageTitle="Dashboard">
        <DashboardClient
            employees={employees}
            absences={absences}
            medicalFollowUps={medicalFollowUps}
            emos={emos}
        />
    </AppLayout>
  );
}
