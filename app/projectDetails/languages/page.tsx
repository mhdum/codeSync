
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";


const projectLanguageData = [
  {
    project: "Website Redesign",
    languages: [
      { name: "JavaScript", percent: 70 },
      { name: "TypeScript", percent: 20 },
      { name: "CSS", percent: 10 },
    ],
  },
  {
    project: "Mobile App UI",
    languages: [
      { name: "Swift", percent: 55 },
      { name: "Kotlin", percent: 40 },
      { name: "Others", percent: 5 },
    ],
  },
  {
    project: "AI Chatbot Integration",
    languages: [
      { name: "Python", percent: 80 },
      { name: "JavaScript", percent: 15 },
      { name: "Others", percent: 5 },
    ],
  },
  {
    project: "Data Analytics Module",
    languages: [
      { name: "Python", percent: 45 },
      { name: "SQL", percent: 30 },
      { name: "R", percent: 20 },
      { name: "Others", percent: 5 },
    ],
  },
];

// Helper to map language → chart color (same as the donut)
const languageColorMap: Record<string, string> = {
  Java: "hsl(var(--chart-1))",
  C: "hsl(var(--chart-2))",
  "C++": "hsl(var(--chart-3))",
  Python: "hsl(var(--chart-4))",
  Others: "hsl(var(--chart-5))",
  JavaScript: "hsl(var(--chart-1))",
  TypeScript: "hsl(var(--chart-1))",
  CSS: "hsl(var(--chart-5))",
  Swift: "hsl(var(--chart-3))",
  Kotlin: "hsl(var(--chart-2))",
  SQL: "hsl(var(--chart-4))",
  R: "hsl(var(--chart-5))",
};

export default function LanguagesUsagePage() {
  return (
    <div className="container mx-auto p-6 space-y-10">
      {/* Page Header */}
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Language Usage by Project
        </h1>
        <p className="text-muted-foreground mt-2">
          Detailed breakdown of programming languages used in each project.
        </p>
      </header>

      <Separator className="my-8" />

      {/* Grid of Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectLanguageData.map((proj) => (
          <Card
            key={proj.project}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="text-lg">{proj.project}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {proj.languages.map((lang) => (
                  <li
                    key={lang.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {/* Colored dot */}
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            languageColorMap[lang.name] ||
                            "hsl(var(--chart-5))",
                        }}
                      />
                      <span className="font-medium">{lang.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {lang.percent}%
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}