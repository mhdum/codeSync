import * as React from "react";
import { Code } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ThemeToggler";

const Navbar = () => {
  return (
    <header className="container mx-auto px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Code className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold">
          <Link href="/" className="text-gray-900 dark:text-gray-100">
            codeSync
          </Link>
        </span>
      </div>
      <nav className="space-x-4">
        <Button asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        <ModeToggle />
      </nav>
    </header>
  );
};

export default Navbar;
