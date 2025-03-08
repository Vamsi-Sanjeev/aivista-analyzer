
import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Colorful gradient top bar */}
      <div className="fixed top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-purple via-brand-blue to-brand-green z-[100]"></div>
      
      {/* Subtle background pattern/gradient */}
      <div className="fixed inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none z-0"></div>
      
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`transition-all duration-300 ${sidebarOpen ? "pl-64" : "pl-0 md:pl-64"}`}>
        <TopNav setSidebarOpen={setSidebarOpen} sidebarOpen={sidebarOpen} />
        <main className="container py-6 animate-fade-in">
          {children}
        </main>
      </div>
      
      {/* Add a subtle gradient overlay at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background/80 to-transparent pointer-events-none z-0"></div>
    </div>
  );
};
