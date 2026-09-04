import { getTranslations } from 'next-intl/server';

interface AlgorithmInfoProps {
  name: string;
  code: string;
  description: string;
}

export const AlgorithmInfo = async ({
  name,
  code,
  description,
}: AlgorithmInfoProps) => {
  const t = await getTranslations('Diet.algorithmInfo');

  return (
    <div className="flex flex-col gap-0.5 border-t border-line-soft pt-3 text-xs text-muted">
      <p>
        {t.rich('calculatedUsing', {
          name,
          code,
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
      <p>{description}</p>
    </div>
  );
};
