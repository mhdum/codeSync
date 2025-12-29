"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null; // Avoid hydration mismatch

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 bg-transparent border rounded-full transition-all hover:scale-105"
    >
      <Moon
        className={`h-4 w-4 transition-all ${theme === "dark" ? "opacity-100 scale-100" : "opacity-50 scale-90"
          }`}
      />
      <span className="text-sm font-medium">|</span>
      <Sun
        className={`h-4 w-4 transition-all ${theme === "light" ? "opacity-100 scale-100" : "opacity-50 scale-90"
          }`}
      />
    </Button>
  );
}
