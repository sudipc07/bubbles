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

export function useSetupOutputs(projectId: string | undefined) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ['projects', projectId, 'setup'],
    queryFn: () => api<SetupOutputs>(`/api/projects/${projectId}/setup`),
    refetchInterval: (query) => {
      // Light polling — events still flow via SSE for the graph; this picks up
      // newly inserted setup outputs after each agent completes.
      const data = query.state.data;
      const hasAny =
        !!data && (data.audiences.length > 0 || data.personas.length > 0 || data.samples.length > 0);
      return hasAny ? false : 2500;
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
