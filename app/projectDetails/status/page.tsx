// ── app/projects/completion/page.tsx  (Next.js App Router) ─────────────────
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const completedProjects = [
  "Website Redesign",
  "Mobile App UI",
  "Marketing Dashboard",
  "E-Commerce Checkout Flow",
  "Internal Admin Panel",
];

const nonCompletedProjects = [
  "AI Chatbot Integration",
  "Data Analytics Module",
  "Real-time Notification Service",
  "Payment Gateway Upgrade",
];

export default function ProjectsCompletionPage() {
  return (
    <div className="bg-gray-50 dark:bg-gray-950 container mx-auto p-6 space-y-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Project Completion Overview
        </h1>
        <p className="text-muted-foreground mt-2">
          Click any project to open its detail page.
        </p>
      </header>

      <Separator className="my-8" />

      <div className="bg-gray-50 dark:bg-gray-950 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ── Completed ── */}
        <Card className="border-l-4 border-l-green-500 dark:border-l-green-400">
          <CardHeader className="flex flex-row items-center gap-3">
            <Badge
              variant="outline"
              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            >
              Completed
            </Badge>
            <CardTitle className="text-xl">Completed Projects</CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="space-y-3">
              {completedProjects.map((proj) => (
                <li
                  key={proj}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <span className="font-medium">{proj}</span>
                  <Badge variant="secondary" className="text-xs">
                    Done
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* ── Non-Completed ── */}
        <Card className="border-l-4 border-l-orange-500 dark:border-l-orange-400">
          <CardHeader className="flex flex-row items-center gap-3">
            <Badge
              variant="outline"
              className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
            >
              Pending
            </Badge>
            <CardTitle className="text-xl">Non-Completed Projects</CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="space-y-3">
              {nonCompletedProjects.map((proj) => (
                <li
                  key={proj}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <span className="font-medium">{proj}</span>
                  <Badge variant="secondary" className="text-xs">
                    In Progress
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
