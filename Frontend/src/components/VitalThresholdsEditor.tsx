import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VITAL_METRICS } from "@/lib/vitalMetrics";
import type { VitalThresholds, VitalMetricKey, VitalThreshold } from "@/lib/types";

interface Props {
  value: VitalThresholds;
  onChange: (value: VitalThresholds) => void;
}

const BOUNDS: { key: keyof VitalThreshold; label: string }[] = [
  { key: "redLow", label: "Red below" },
  { key: "orangeLow", label: "Orange below" },
  { key: "orangeHigh", label: "Orange above" },
  { key: "redHigh", label: "Red above" },
];

export function VitalThresholdsEditor({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  function setBound(metric: VitalMetricKey, bound: keyof VitalThreshold, raw: string) {
    const parsed = raw === "" ? undefined : Number(raw);
    const current: VitalThreshold = { ...value[metric] };

    if (parsed === undefined || Number.isNaN(parsed)) {
      delete current[bound];
    } else {
      current[bound] = parsed;
    }

    const next: VitalThresholds = { ...value };
    if (Object.keys(current).length === 0) {
      delete next[metric];
    } else {
      next[metric] = current;
    }
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Hide" : "Set"} alert thresholds (optional)
      </Button>
      {expanded && (
        <div className="rounded-md border p-3">
          <p className="mb-3 text-xs text-muted-foreground">
            Leave a field blank to leave that side unbounded. A reading below "Red below" or above "Red
            above" shows red; below "Orange below" or above "Orange above" shows orange; otherwise green.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                {BOUNDS.map((b) => (
                  <TableHead key={b.key}>{b.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {VITAL_METRICS.map((metric) => (
                <TableRow key={metric.key}>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {metric.label} <span className="text-muted-foreground">({metric.unit})</span>
                  </TableCell>
                  {BOUNDS.map((b) => (
                    <TableCell key={b.key}>
                      <Input
                        type="number"
                        className="h-8 w-24"
                        value={value[metric.key]?.[b.key] ?? ""}
                        onChange={(e) => setBound(metric.key, b.key, e.target.value)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
