"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Map file extensions → language names
const extensionToLanguage: Record<string, string> = {
  js: "JavaScript",
  jsx: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  css: "CSS",
  java: "Java",
  c: "C",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  py: "Python",
  sql: "SQL",
  r: "R",
};

// Color mapping for the UI
const languageColorMap: Record<string, string> = {
  Java: "hsl(var(--chart-1))",
  C: "hsl(var(--chart-2))",
  "C++": "hsl(var(--chart-3))",
  Python: "hsl(var(--chart-4))",
  JavaScript: "hsl(var(--chart-1))",
  TypeScript: "hsl(var(--chart-1))",
  CSS: "hsl(var(--chart-5))",
  Swift: "hsl(var(--chart-3))",
  Kotlin: "hsl(var(--chart-2))",
  SQL: "hsl(var(--chart-4))",
  R: "hsl(var(--chart-5))",
  Others: "hsl(var(--chart-5))",
};
interface LanguageStat {
  name: string;
  percent: number;
}

interface ProjectLanguages {
  project: string;
  languages: LanguageStat[];
}


export default function LanguagesUsagePage() {
  const [projectLanguageData, setProjectLanguageData] = useState<ProjectLanguages[]>([]);

  const [userEmail, setUserEmail] = useState<string>("");
  
  // replace with session/email

   useEffect(() => {
    const loadStats = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;
      setUserEmail(userEmail);
      fetchLanguages(userEmail);
    };

    loadStats();
  }, []);

  useEffect(() => {
    fetchLanguages(userEmail);
  }, []);

  // Fetch & transform data
  const fetchLanguages = async (email: string) => {
    const res = await fetch(`/api/project/files/get?ownerid=${email}`);
    const data = await res.json();

    const formattedProjects: any[] = [];

    data?.projects?.forEach((project: any) => {
      const languageCount: Record<string, number> = {};
      let totalFiles = 0;

      project?.files?.forEach((file: any) => {
        const ext = file.file_extension?.toLowerCase();
        const lang = extensionToLanguage[ext] || "Others";

        languageCount[lang] = (languageCount[lang] || 0) + 1;
        totalFiles++;
      });

      const languagesArray = Object.entries(languageCount).map(
        ([name, count]) => ({
          name,
          percent: Math.round((Number(count) / totalFiles) * 100),
        })
      );

      formattedProjects.push({
        project: project.name,
        languages: languagesArray,
      });
    });

    setProjectLanguageData(formattedProjects);
  };

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
        {projectLanguageData.length === 0 && (
          <p className="text-center col-span-full text-muted-foreground">
            No projects found.
          </p>
        )}

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
                {proj.languages.map((lang: LanguageStat) => (
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
