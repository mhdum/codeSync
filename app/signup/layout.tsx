"use client";
import Navbar from "@/components/NavBar";
import ParticlesBackground from "@/components/ParticlesBackGround";
import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const layout = ({ children }: LayoutProps) => {
  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900 transition-colors duration-500">
      {/* Particle Background */}
      <div className="fixed inset-0 z-0">
        <ParticlesBackground />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <Navbar />

        <main className="container mx-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
};

export default layout;
