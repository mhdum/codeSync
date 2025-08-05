"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Users, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import screenShot from "@/public/sc.png";
import Navbar from "@/components/NavBar";
import "@/app/globals.css";
import ParticlesBackground from "@/components/ParticlesBackGround";

function Features() {
  return (
    <section className="container mx-auto px-6 py-20">
      <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
        Why Choose codeSync?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        <Card className="relative transition-all ease-in-out duration-300 hover:scale-105 hover:shadow-lg rotate-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-primary" />
              <span>Real-time Collaboration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Multiple developers can code simultaneously with instant updates
              and cursor tracking.
            </p>
          </CardContent>
        </Card>

        <Card className="relative transition-transform ease-in-out duration-300 hover:scale-105 hover:shadow-lg rotate-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Code className="h-6 w-6 text-primary" />
              <span>Code Execution & Language Support</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Write, compile, and test code in real-time with support for over
              30 programming languages.
            </p>
          </CardContent>
        </Card>

        <Card className="relative transition-transform ease-in-out duration-300 hover:scale-105 hover:shadow-lg rotate-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-primary" />
              <span>Team Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Easy team setup with role-based access and integrated version
              control.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="container mx-auto px-6 py-20 text-center bg-primary/5 dark:bg-primary/20 rounded-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Ready to Collaborate?
      </h2>
      <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
        Join to build better software together.
      </p>
      <Button size="lg" asChild>
        <Link href="/signup">Start Coding Now</Link>
      </Button>
    </section>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900 transition-colors duration-500">
      {/* Particle Background */}
      <div className="fixed inset-0 z-10">
        <ParticlesBackground />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <Navbar />

        {/* Hero Section */}
        <main className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6 text-gray-900 dark:text-gray-100">
            Code Together, Create Better
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Real-time collaborative code editor with modern UI and powerful
            features for teams to build software faster.
          </p>

          <div className="mt-12">
            <Image
              src={screenShot}
              alt="CodeCollab editor screenshot"
              width={1200}
              height={600}
              className="rounded-lg shadow-2xl mx-auto max-w-full"
              priority
            />
          </div>
        </main>

        <Features />
        <CTA />

        <footer className="container mx-auto px-6 py-12 text-center text-gray-500 dark:text-gray-400 transition-colors duration-500">
          <p>&copy; 2025 codeSync. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
