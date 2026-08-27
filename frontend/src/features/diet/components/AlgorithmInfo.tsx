interface AlgorithmInfoProps {
  name: string;
  code: string;
  description: string;
}

export const AlgorithmInfo = ({
  name,
  code,
  description,
}: AlgorithmInfoProps) => {
  return (
    <div className="flex flex-col gap-1 border-t border-zinc-200 pt-4 text-sm text-zinc-500 dark:border-zinc-800">
      <p>
        Calculated using <strong>{name}</strong> ({code})
      </p>
      <p>{description}</p>
    </div>
  );
};
