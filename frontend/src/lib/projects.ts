import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface Project {
  id: string;
  slug: string;
  name: string;
  ownerUserId: string;
  status: 'active' | 'paused' | 'archived';
  monthlyCostCeilingUsd: number;
  createdAt: string;
  updatedAt: string;
  role: 'owner' | 'member';
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api<{ projects: Project[] }>('/api/projects').then((r) => r.projects),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api<{ project: Project }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
