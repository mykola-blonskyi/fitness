export interface DeleteGuardResult {
  allowed: boolean;
  reason?: string;
}

// referencedByLabel names whatever the usage count was counted against
// (e.g. "program exercise") - kept a caller-supplied string rather than an
// enum since each catalog (Exercise, Food Item, ...) is referenced by a
// different entity.
export function checkDeleteGuard(
  entityLabel: string,
  referencedByLabel: string,
  usageCount: number,
): DeleteGuardResult {
  if (usageCount <= 0) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Can't delete this ${entityLabel} - it's used by ${usageCount} ${referencedByLabel}${usageCount === 1 ? '' : 's'}`,
  };
}
