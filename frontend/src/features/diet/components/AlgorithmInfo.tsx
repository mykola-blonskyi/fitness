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
    <div className="flex flex-col gap-1 border-t border-zinc-200 pt-4 text-sm text-zinc-500 dark:border-zinc-800">
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
