import type { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Card, CardBody, CardHeader } from './Card';

export function ChartContainer({
  title,
  description,
  action,
  height = 280,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Minimum chart height. The chart will grow to fill its parent card. */
  height?: number;
  children: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader title={title} description={description} action={action} />
      <CardBody className="flex-1">
        <div
          className="h-full w-full"
          style={{ minHeight: height }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {children as any}
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
