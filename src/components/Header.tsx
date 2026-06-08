"use client"

import { BookOpen, LayoutDashboard, List, PenTool, GraduationCap } from "lucide-react"
import { useAppStore } from "@/lib/store"
import type { ViewType } from "@/lib/types"
import { cn } from "@/lib/utils"

const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { view: "browse", label: "Browse", icon: <List className="h-4 w-4" /> },
  { view: "practice", label: "Practice", icon: <PenTool className="h-4 w-4" /> },
  { view: "study", label: "Study", icon: <GraduationCap className="h-4 w-4" /> },
]

export default function Header() {
  const { currentView, setCurrentView, practiceSession } = useAppStore()

  return (
    <header className="sticky top-0 z-50 border-b border-gray-700 bg-[#24292f] text-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
        <div className="flex items-center gap-2 mr-6">
          <BookOpen className="h-6 w-6 text-emerald-400" />
          <h1 className="text-base font-semibold tracking-tight hidden sm:block">AB-100 Exam Prep</h1>
          <h1 className="text-base font-semibold tracking-tight sm:hidden">AB-100</h1>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = currentView === item.view || (item.view === "practice" && practiceSession !== null && currentView === "practice")
            return (
              <button
                key={item.view}
                onClick={() => {
                  setCurrentView(item.view)
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                )}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden md:block">Microsoft Dynamics 365</span>
        </div>
      </div>
    </header>
  )
}
