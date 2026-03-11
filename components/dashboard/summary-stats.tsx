import { Card } from "@/components/ui/card";

export function SummaryStats({
  stats
}: {
  stats: Array<{ label: string; value: string; hint: string }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card className="p-5" key={stat.label}>
          <p className="text-sm uppercase tracking-[0.16em] text-primary/65">{stat.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            {stat.value}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{stat.hint}</p>
        </Card>
      ))}
    </div>
  );
}
