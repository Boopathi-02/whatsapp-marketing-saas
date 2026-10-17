import { useQuery } from '@tanstack/react-query';
import { HealthResponse, ApiSuccessResponse } from '@whatsapp-saas/contracts';

export interface ApiHealthState {
  isConnected: boolean;
  isChecking: boolean;
  data?: HealthResponse;
  error?: string;
}

export function useApiHealth(): ApiHealthState {
  const { data, isLoading, error } = useQuery<HealthResponse>({
    queryKey: ['api-health'],
    queryFn: async () => {
      const response = await fetch('/api/v1/health', {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`API health check failed with status ${response.status}`);
      }

      const json: ApiSuccessResponse<HealthResponse> = await response.json();
      return json.data;
    },
    retry: 1,
    refetchInterval: 15000, // Poll every 15s to update liveness status
  });

  return {
    isConnected: !!data && !error,
    isChecking: isLoading,
    data,
    error: error instanceof Error ? error.message : undefined,
  };
}
