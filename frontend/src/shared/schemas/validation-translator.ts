// Structurally matches both useTranslations('Validation') (client) and
// getTranslations('Validation') (server) - schema factories below accept
// either so the same schema shape works in a Client Component's
// useZodForm and a Server Action's safeParse.
export type ValidationTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;
