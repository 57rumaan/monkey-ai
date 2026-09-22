import { useQuery } from '@tanstack/react-query';

async function fetchChats() {
  const response = await fetch('/api/chat/chats', { credentials: 'include' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch chats');
  return data.data;
}

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats,
    staleTime: 30 * 1000,
  });
}