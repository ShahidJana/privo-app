/**
 * Audit log hooks. {@link useAuditLog} reads the recent feed; {@link recordAudit}
 * writes an event from anywhere (including non-React code like the lock context)
 * and refreshes any mounted feed via cache invalidation — that's what makes the
 * dashboard log update in real time.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getAuditRepo } from '@core/repositories';
import { queryClient } from '@lib/queryClient';
import { logger } from '@lib/logger';
import type { AuditEvent, AuditEventType } from './audit.types';

export const auditKeys = {
  all: ['audit'] as const,
  list: (limit: number) => [...auditKeys.all, 'list', limit] as const,
};

/** Recent security events, newest first. */
export function useAuditLog(limit = 20): UseQueryResult<AuditEvent[]> {
  return useQuery({
    queryKey: auditKeys.list(limit),
    queryFn: async () => {
      const repo = await getAuditRepo();
      return repo.list(limit);
    },
  });
}

/**
 * Records a security event and refreshes any mounted audit view. Fire-and-forget
 * and fully self-contained: it never throws into the caller, because a failed
 * audit write must not break the action that triggered it.
 */
export async function recordAudit(
  type: AuditEventType,
  detail?: string | null,
): Promise<void> {
  try {
    const repo = await getAuditRepo();
    await repo.record(type, detail);
    await queryClient.invalidateQueries({ queryKey: auditKeys.all });
  } catch (error) {
    logger.error('Failed to record audit event', { type, error });
  }
}
