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
  height?: number;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} action={action} />
      <CardBody>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children as any}
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
