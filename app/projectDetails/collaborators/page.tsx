"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Calendar } from "lucide-react";

type ActivityDay = {
  day: string;
  "Project A": number;
  "Project B": number;
  "Project C": number;
  "Project D": number;
};

const activityHeatmapData: ActivityDay[] = [
  {
    day: "Mon",
    "Project A": 5,
    "Project B": 2,
    "Project C": 0,
    "Project D": 3,
  },
  {
    day: "Tue",
    "Project A": 3,
    "Project B": 1,
    "Project C": 2,
    "Project D": 0,
  },
  {
    day: "Wed",
    "Project A": 4,
    "Project B": 5,
    "Project C": 3,
    "Project D": 2,
  },
  {
    day: "Thu",
    "Project A": 6,
    "Project B": 3,
    "Project C": 1,
    "Project D": 4,
  },
  {
    day: "Fri",
    "Project A": 2,
    "Project B": 0,
    "Project C": 4,
    "Project D": 3,
  },
  {
    day: "Sat",
    "Project A": 1,
    "Project B": 2,
    "Project C": 2,
    "Project D": 1,
  },
  {
    day: "Sun",
    "Project A": 0,
    "Project B": 3,
    "Project C": 1,
    "Project D": 2,
  },
  {
    day: "Mon",
    "Project A": 4,
    "Project B": 4,
    "Project C": 2,
    "Project D": 3,
  },
  {
    day: "Tue",
    "Project A": 2,
    "Project B": 5,
    "Project C": 3,
    "Project D": 4,
  },
  {
    day: "Wed",
    "Project A": 5,
    "Project B": 3,
    "Project C": 4,
    "Project D": 2,
  },
  {
    day: "Thu",
    "Project A": 6,
    "Project B": 4,
    "Project C": 1,
    "Project D": 5,
  },
  {
    day: "Fri",
    "Project A": 3,
    "Project B": 1,
    "Project C": 2,
    "Project D": 0,
  },
  {
    day: "Sat",
    "Project A": 2,
    "Project B": 0,
    "Project C": 3,
    "Project D": 1,
  },
  {
    day: "Sun",
    "Project A": 1,
    "Project B": 3,
    "Project C": 1,
    "Project D": 4,
  },
];

const projectLists = [
  "Project A",
  "Project B",
  "Project C",
  "Project D",
] as const;
type ProjectName = (typeof projectLists)[number];

function getColor(intensity: number) {
  const max = 6;
  const scale = intensity / max;
  if (scale === 0) return "hsl(var(--muted))";
  return `hsl(var(--chart-1) / ${0.3 + scale * 0.7})`;
}

const exportToCSV = () => {
  const headers = ["Day", ...projectLists, "Total"];
  const rows = activityHeatmapData.map((d) => {
    const total = projectLists.reduce((sum, p) => sum + (d[p] || 0), 0);
    return [d.day, ...projectLists.map((p) => d[p] || 0), total].join(",");
  });
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "contribution_heatmap.csv";
  a.click();
};

export default function HeatmapDetailPage() {
  const [hoveredCell, setHoveredCell] = useState<{
    day: string;
    proj: ProjectName;
    value: number;
  } | null>(null);

  const projectTotals = projectLists.reduce((acc, proj) => {
    acc[proj] = activityHeatmapData.reduce((sum, d) => sum + (d[proj] || 0), 0);
    return acc;
  }, {} as Record<ProjectName, number>);

  const dayTotals = activityHeatmapData.map((d) => {
    const total = projectLists.reduce((sum, p) => sum + (d[p] || 0), 0);
    return { day: d.day, total };
  });

  const grandTotal = dayTotals.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="container mx-auto p-6 space-y-10">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
          <Calendar className="w-8 h-8 text-primary" />
          Contribution Heatmap (Last 14 Days)
        </h1>
        <p className="text-muted-foreground mt-2">
          Daily commit frequency • Total:{" "}
          <Badge variant="secondary">{grandTotal} commits</Badge>
        </p>
        <Button onClick={exportToCSV} variant="outline" className="mt-4">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </header>

      <Separator />

      {/* Color Legend */}
      <div className="flex justify-center gap-4 items-center text-sm">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 3, 6].map((v) => (
            <div
              key={v}
              className="w-5 h-5 rounded-sm border"
              style={{ backgroundColor: getColor(v) }}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      {/* Main Heatmap Grid - FIXED SIZE */}
      <Card>
        <CardHeader>
          <CardTitle>14-Day Activity Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Day Labels */}
              <div className="flex gap-1 mb-3 text-xs font-medium text-center text-muted-foreground">
                {activityHeatmapData.map((d, i) => (
                  <div key={i} className="w-6 text-center">
                    {d.day}
                  </div>
                ))}
              </div>

              {/* Project Rows */}
              {projectLists.map((proj) => (
                <div key={proj} className="mb-5 last:mb-0">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span>{proj}</span>
                    <Badge variant="secondary">{projectTotals[proj]}</Badge>
                  </div>
                  <div className="flex gap-1">
                    {activityHeatmapData.map((dayData, dayIdx) => {
                      const value = dayData[proj] || 0;
                      return (
                        <div
                          key={dayIdx}
                          className="relative group"
                          onMouseEnter={() =>
                            setHoveredCell({ day: dayData.day, proj, value })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {/* Fixed-size square */}
                          <div
                            className="w-6 h-6 rounded-sm border border-border/50"
                            style={{
                              backgroundColor: getColor(value),
                            }}
                          />

                          {/* Tooltip */}
                          {hoveredCell?.day === dayData.day &&
                            hoveredCell?.proj === proj && (
                              <div className="absolute z-10 -top-12 left-1/2 -translate-x-1/2 bg-background border rounded-md shadow-lg p-2 text-xs whitespace-nowrap pointer-events-none">
                                <strong>{proj}</strong> on{" "}
                                <strong>{dayData.day}</strong>
                                <br />
                                <Badge variant="secondary">
                                  {value} commits
                                </Badge>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {projectLists.map((proj) => (
          <Card key={proj}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{proj}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{projectTotals[proj]}</p>
              <p className="text-xs text-muted-foreground">total commits</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-sm">
            {dayTotals.map((d, i) => (
              <div
                key={i}
                className="text-center p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="font-medium">{d.day}</div>
                <Badge variant="secondary" className="mt-1">
                  {d.total}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
