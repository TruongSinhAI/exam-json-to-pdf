"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import QuestionCard from "@/components/QuestionCard"
import { useAppStore } from "@/lib/store"
import { TOPICS, getQuestionTypeBadgeColor, cn } from "@/lib/utils"
import type { ParsedQuestion, QuestionType } from "@/lib/types"

interface BrowseViewProps {
  questions: ParsedQuestion[]
}

export default function BrowseView({ questions }: BrowseViewProps) {
  const {
    selectedTopic,
    setSelectedTopic,
    browseQuestionIndex,
    setBrowseQuestionIndex,
    answers,
    bookmarks,
  } = useAppStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [typeFilter, setTypeFilter] = useState<QuestionType | null>(null)

  const filteredQuestions = useMemo(() => {
    let filtered = questions
    if (selectedTopic !== null) {
      filtered = filtered.filter((q) => q.topic === selectedTopic)
    }
    if (typeFilter) {
      filtered = filtered.filter((q) => q.type === typeFilter)
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (q) =>
          q.cleanText.toLowerCase().includes(query) ||
          q.question.toString().includes(query)
      )
    }
    return filtered
  }, [questions, selectedTopic, typeFilter, searchQuery])

  const currentQuestion = filteredQuestions[browseQuestionIndex] || null
  const answeredIds = new Set(answers.map((a) => a.questionId))

  const questionTypes: QuestionType[] = ["MC", "HOTSPOT", "DRAG DROP", "CASE STUDY"]

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Sidebar Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute left-2 top-2 z-10 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden hidden md:block"
          >
            <Card className="h-full border border-gray-200 flex flex-col">
              <CardContent className="p-3 flex flex-col h-full">
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Search questions..."
                    className="pl-8 h-8 text-sm"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setBrowseQuestionIndex(0)
                    }}
                  />
                </div>

                {/* Topic Filter */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Topics</p>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setSelectedTopic(null)
                        setBrowseQuestionIndex(0)
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                        selectedTopic === null
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <span>All Topics</span>
                      <span className="text-gray-400">{questions.length}</span>
                    </button>
                    {TOPICS.map((topic) => {
                      const count = questions.filter((q) => q.topic === topic.id).length
                      return (
                        <button
                          key={topic.id}
                          onClick={() => {
                            setSelectedTopic(topic.id)
                            setBrowseQuestionIndex(0)
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                            selectedTopic === topic.id
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <div className={cn("h-2 w-2 rounded-full", topic.color)} />
                            <span>Topic {topic.id}</span>
                          </div>
                          <span className="text-gray-400">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Type Filter */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type</p>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => {
                        setTypeFilter(null)
                        setBrowseQuestionIndex(0)
                      }}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                        typeFilter === null
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      All
                    </button>
                    {questionTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setTypeFilter(type)
                          setBrowseQuestionIndex(0)
                        }}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                          typeFilter === type
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className="my-2" />

                {/* Question List */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-0.5 pr-1">
                    {filteredQuestions.map((q, idx) => {
                      const isAnswered = answeredIds.has(q._id)
                      const isBookmarked = bookmarks.some((b) => b.questionId === q._id)
                      const isCurrent = idx === browseQuestionIndex
                      return (
                        <button
                          key={q._id}
                          onClick={() => setBrowseQuestionIndex(idx)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                            isCurrent
                              ? "bg-emerald-50 border border-emerald-200"
                              : "hover:bg-gray-50"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold",
                              isAnswered
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-500"
                            )}
                          >
                            {q.question}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 truncate">
                              {q.cleanText.substring(0, 50)}...
                            </p>
                          </div>
                          {isBookmarked && (
                            <span className="text-amber-400 text-[10px]">★</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>

                <p className="text-xs text-gray-400 mt-2 text-center">
                  {filteredQuestions.length} questions
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {currentQuestion ? (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="pr-2">
                <QuestionCard question={currentQuestion} />
              </div>
            </ScrollArea>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={browseQuestionIndex === 0}
                onClick={() => setBrowseQuestionIndex(browseQuestionIndex - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-gray-500">
                {browseQuestionIndex + 1} / {filteredQuestions.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={browseQuestionIndex >= filteredQuestions.length - 1}
                onClick={() => setBrowseQuestionIndex(browseQuestionIndex + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 text-sm">No questions found</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
