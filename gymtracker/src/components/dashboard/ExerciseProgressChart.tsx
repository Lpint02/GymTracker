import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ExerciseProgressPoint } from "../../hooks/useExerciseProgress";
import { formatDateItalian } from "../../lib/utils";

interface ExerciseProgressChartProps {
  dataPoints: ExerciseProgressPoint[];
  /** sessionId of the point holding the current max-weight PR, if any */
  prSessionId?: string | null;
}

interface TooltipPayloadEntry {
  payload: ExerciseProgressPoint;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ExerciseProgressPoint;
}

function makePrAwareDot(prSessionId?: string | null) {
  return function PrAwareDot({ cx, cy, payload }: DotProps) {
    if (cx === undefined || cy === undefined || !payload) return null;
    const isPR = payload.sessionId === prSessionId;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isPR ? 6 : 4}
        fill={isPR ? "var(--color-accent)" : "var(--color-primary)"}
      />
    );
  };
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
        {formatDateItalian(point.date)}
      </p>
      <p className="text-sm font-heading font-black text-foreground">
        {point.maxWeight} kg{" "}
        <span className="text-muted-foreground font-normal">
          × {point.repsAtMax} reps
        </span>
      </p>
    </div>
  );
}

export default function ExerciseProgressChart({
  dataPoints,
  prSessionId,
}: ExerciseProgressChartProps) {
  return (
    <div className="bg-background border border-border rounded-2xl p-5 shadow-md">
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <LineChart
            data={dataPoints}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(date: string) => formatDateItalian(date)}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="maxWeight"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              dot={makePrAwareDot(prSessionId)}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
