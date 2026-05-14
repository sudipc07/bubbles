import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface Draft {
  id: string;
  projectId: string;
  runId: string | null;
  personaId: string | null;
  themeId: string | null;
  format: 'carousel' | 'single_image';
  topicTitle: string;
  angle: string | null;
  kind: 'utility' | 'promo';
  status: 'pending' | 'approved' | 'rejected' | 'posted';
  empathyVerdict: 'helpful' | 'performative' | 'tone_deaf' | null;
  safetyVerdict: 'pass' | 'fail' | null;
  safetyReasons: string[];
  linkedinCaption: string | null;
  instagramCaption: string | null;
  decidedByUserId: string | null;
  decidedAt: string | null;
  postedAt: string | null;
  postedUrl: string | null;
  createdAt: string;
}

export interface DraftSlide {
  id: string;
  draftId: string;
  slideIndex: number;
  kind: 'cover' | 'bullet-list' | 'quote' | 'stat' | 'cta' | 'body';
  title: string | null;
  body: string;
  imageUrl: string | null;
}

export type DraftFilter = 'all' | 'pending' | 'decided';

export function useDrafts(projectId: string | undefined, filter: DraftFilter = 'all') {
  return useQuery({
    enabled: !!projectId,
    queryKey: ['drafts', projectId, filter],
    queryFn: () =>
      api<{ drafts: Draft[] }>(`/api/projects/${projectId}/drafts?filter=${filter}`).then((r) => r.drafts),
    refetchInterval: 6000,
  });
}

export function useDraft(projectId: string | undefined, draftId: string | undefined) {
  return useQuery({
    enabled: !!projectId && !!draftId,
    queryKey: ['drafts', projectId, draftId],
    queryFn: () => api<{ draft: Draft; slides: DraftSlide[] }>(`/api/projects/${projectId}/drafts/${draftId}`),
  });
}

export function useDecideDraft(projectId: string | undefined, draftId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (decision: 'approved' | 'rejected') =>
      api<{ draft: Draft }>(`/api/projects/${projectId}/drafts/${draftId}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drafts', projectId] });
    },
  });
}

export function useMarkPosted(projectId: string | undefined, draftId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) =>
      api<{ draft: Draft }>(`/api/projects/${projectId}/drafts/${draftId}/posted`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drafts', projectId] });
    },
  });
}
