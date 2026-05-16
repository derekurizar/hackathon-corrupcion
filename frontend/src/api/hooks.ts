import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';
import {
  EditionDTOSchema,
  FiltersDTOSchema,
  InvestigationFullSchema,
  InvestigationListResponseSchema,
  StatsDTOSchema,
} from './schemas';

/** TanStack Query v5 hooks for the 5 public endpoints (idea/05 §API). */

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => apiGet('/stats', StatsDTOSchema),
  });
}

export function useInvestigations(search?: string) {
  return useQuery({
    queryKey: ['investigations', search ?? ''],
    queryFn: () =>
      apiGet(
        `/investigations${search ? `?${search}` : ''}`,
        InvestigationListResponseSchema,
      ),
  });
}

export function useInvestigation(caseKey: string | undefined) {
  return useQuery({
    queryKey: ['investigation', caseKey],
    queryFn: () =>
      apiGet(`/investigations/${encodeURIComponent(caseKey as string)}`, InvestigationFullSchema),
    enabled: Boolean(caseKey),
  });
}

export function useCurrentEdition() {
  return useQuery({
    queryKey: ['edition', 'current'],
    queryFn: () => apiGet('/editions/current', EditionDTOSchema),
  });
}

export function useFilters() {
  return useQuery({
    queryKey: ['filters'],
    queryFn: () => apiGet('/filters', FiltersDTOSchema),
  });
}
