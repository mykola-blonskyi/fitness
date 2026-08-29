// Kept in its own file so the module and the service can both import the
// token without forming a circular import (module -> service -> module),
// which resolved REDIS_CLIENT to undefined at runtime and broke DI.
export const REDIS_CLIENT = 'REDIS_CLIENT';

// Plain Redis list, not BullMQ - the Python worker has no maintained
// BullMQ client (ADR-003).
export const PHOTO_ANALYSIS_QUEUE_KEY = 'photo_analysis_jobs';
