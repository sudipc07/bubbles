import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface Audience {
  id: string;
  name: string;
  summary: string;
  traits: string[];
  isSelected: boolean;
}
export interface Voice {
  id: string;
  name: string;
  description: string;
  examples: string[];
  isSelected: boolean;
}
export interface Persona {
  id: string;
  name: string;
  description: string;
  formatMixCarouselPct: number;
  formatMixSinglePct: number;
  isActive: boolean;
}
export interface Theme {
  id: string;
  label: string;
  description: string;
  exampleAngles: string[];
  isActive: boolean;
}
export interface BrandKit {
  id: string;
  palette: { primary: string; secondary: string; accent: string; background: string; text: string };
  fonts: { heading: string; body: string };
  logoUrl: string | null;
}
export interface Sample {
  id: string;
  personaId: string;
  format: 'carousel' | 'single_image';
  title: string;
  body: string;
}

export interface SetupOutputs {
  audiences: Audience[];
  voices: Voice[];
  personas: Persona[];
  themes: Theme[];
  brandKit: BrandKit | null;
  samples: Sample[];
}

export function useSetupOutputs(projectId: string | undefined, isRunning = false) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ['projects', projectId, 'setup'],
    queryFn: () => api<SetupOutputs>(`/api/projects/${projectId}/setup`),
    // Poll every 2s while a setup run is in progress so each agent's output
    // surfaces as it lands. Stop polling once nothing is running.
    refetchInterval: isRunning ? 2000 : false,
  });
}

export type SetupKind = 'audiences' | 'voices' | 'personas' | 'themes';

export function useDeleteSetupItem(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id }: { kind: SetupKind; id: string }) =>
      api(`/api/projects/${projectId}/setup/${kind}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'setup'] });
    },
  });
}

export function useRunSetup(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ runId: string; remaining: number }>(`/api/projects/${projectId}/setup`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'setup'] });
      qc.invalidateQueries({ queryKey: ['pipeline', 'runs', projectId] });
    },
  });
}

export function useUpdateBrandKit(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      palette?: BrandKit['palette'];
      fonts?: BrandKit['fonts'];
    }) =>
      api<{ brandKit: BrandKit }>(`/api/projects/${projectId}/brand-kit`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'setup'] }),
  });
}
