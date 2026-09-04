export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-danger" role="alert">
      {message}
    </p>
  );
}
