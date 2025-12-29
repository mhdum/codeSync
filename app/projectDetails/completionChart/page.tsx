"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ---- SAMPLE PROJECT DATA ----
const sampleProjects = [
  {
    id: 1,
    name: "Authentication Module",
    startDate: "2024-01-10",
    endDate: "2024-01-28",
  },
  {
    id: 2,
    name: "Realtime Chat System",
    startDate: "2024-02-02",
    endDate: "2024-02-20",
  },
  {
    id: 3,
    name: "Project Dashboard UI",
    startDate: "2024-02-12",
    endDate: "2024-02-26",
  },
  {
    id: 4,
    name: "File Collaboration Engine",
    startDate: "2024-03-05",
    endDate: "2024-03-30",
  },
  {
    id: 5,
    name: "Notification Microservice",
    startDate: "2024-03-01",
    endDate: "2024-03-15",
  },
];

// ---- UTILS ----
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

const getDurationDays = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
};

export default function ProjectsCompletedPage() {
  const groupedData = useMemo(() => {
    const groups: Record<string, typeof sampleProjects> = {};

    sampleProjects.forEach((project) => {
      const month = new Date(project.endDate).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      });

      if (!groups[month]) groups[month] = [];
      groups[month].push(project);
    });

    return groups;
  }, []);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Projects Completed (Month-wise)</h1>
      <p className="text-gray-600">List of all completed projects grouped by completion month.</p>

      {Object.entries(groupedData).map(([month, projects]) => (
        <Card key={month} className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{month}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="border p-4 rounded-lg flex flex-col gap-2 bg-muted/40"
              >
                <div className="flex justify-between">
                  <span className="font-semibold text-lg">{proj.name}</span>
                  <span className="text-sm text-gray-500">
                    {getDurationDays(proj.startDate, proj.endDate)} days
                  </span>
                </div>

                <div className="text-sm text-gray-700">
                  <p>
                    <strong>Start:</strong> {formatDate(proj.startDate)}
                  </p>
                  <p>
                    <strong>End:</strong> {formatDate(proj.endDate)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
