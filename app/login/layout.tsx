import Navbar from "@/components/NavBar";
import ParticlesBackground from "@/components/ParticlesBackGround";
import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const layout = ({ children }: LayoutProps) => {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <ParticlesBackground />

      <div className="absolute inset-0 flex flex-col z-10">
        <Navbar />

        <div className="flex-grow flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
};

export default layout;
