'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Spinner } from '@/components/ui';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(user ? '/tickets' : '/login');
  }, [user, loading, router]);
  return <Spinner label="Loading…" />;
}
