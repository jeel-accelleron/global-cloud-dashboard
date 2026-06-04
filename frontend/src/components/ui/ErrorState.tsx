import { AlertTriangle } from '../icons';
import { Button } from './Button';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="rounded-full bg-danger/10 p-3 text-danger">
        <AlertTriangle size={22} />
      </div>
      <div>
        <div className="text-sm font-semibold">Something went wrong</div>
        <div className="mt-1 max-w-md text-xs text-subtle">{message}</div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
