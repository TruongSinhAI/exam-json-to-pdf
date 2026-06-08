"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Header from "@/components/Header"
import Dashboard from "@/components/Dashboard"
import BrowseView from "@/components/BrowseView"
import PracticeMode from "@/components/PracticeMode"
import StudyMode from "@/components/StudyMode"
import { useAppStore } from "@/lib/store"
import { parseQuestion } from "@/lib/utils"
import type { ParsedQuestion, Question } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"

export default function Home() {
  const { currentView } = useAppStore()
  const [questions, setQuestions] = useState<ParsedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch("/api/questions")
        if (!res.ok) throw new Error("Failed to fetch questions")
        const data = await res.json()
        if (data.status !== "success") throw new Error("Invalid data format")

        const parsed = (data.data as Question[]).map(parseQuestion)
        setQuestions(parsed)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    fetchQuestions()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-600 font-medium">Error loading questions</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {currentView === "dashboard" && <Dashboard questions={questions} />}
            {currentView === "browse" && <BrowseView questions={questions} />}
            {currentView === "practice" && <PracticeMode questions={questions} />}
            {currentView === "study" && <StudyMode questions={questions} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex items-center justify-between text-xs text-gray-400">
          <span>AB-100 Exam Prep</span>
          <span>{questions.length} questions loaded</span>
        </div>
      </footer>
    </div>
  )
}
