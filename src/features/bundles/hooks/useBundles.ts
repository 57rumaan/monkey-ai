import { useQuery } from '@tanstack/react-query';
import type { Bundle } from '@/types';

async function fetchBundles(): Promise<Bundle[]> {
  const response = await fetch('/api/bundles', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch bundles');
  return data.data;
}

export function useBundles() {
  return useQuery({
    queryKey: ['bundles'],
    queryFn: fetchBundles,
    staleTime: 5 * 60 * 1000,
  });
}
