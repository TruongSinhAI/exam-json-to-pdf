"use client"

import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Eye,
  EyeOff,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/lib/store"
import { sanitizeHtml, stripHtmlWrappers, getQuestionTypeBadgeColor, TOPICS, cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ParsedQuestion } from "@/lib/types"

interface StudyModeProps {
  questions: ParsedQuestion[]
}

export default function StudyMode({ questions }: StudyModeProps) {
  const {
    selectedTopic,
    setSelectedTopic,
    studyRecords,
    setStudyStatus,
    getStudyStatus,
    toggleBookmark,
    isBookmarked,
  } = useAppStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  const filteredQuestions = useMemo(() => {
    if (selectedTopic !== null) {
      return questions.filter((q) => q.topic === selectedTopic)
    }
    return questions
  }, [questions, selectedTopic])

  const currentQuestion = filteredQuestions[currentIndex] || null
  const progressPct = filteredQuestions.length > 0 ? ((currentIndex + 1) / filteredQuestions.length) * 100 : 0

  const studiedCount = filteredQuestions.filter((q) =>
    studyRecords.some((s) => s.questionId === q._id)
  ).length

  const understoodCount = filteredQuestions.filter((q) =>
    studyRecords.some((s) => s.questionId === q._id && s.status === "understood")
  ).length

  const needsReviewCount = filteredQuestions.filter((q) =>
    studyRecords.some((s) => s.questionId === q._id && s.status === "needs_review")
  ).length

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const goToQuestion = useCallback((index: number) => {
    setCurrentIndex(index)
    setShowAnswer(false)
    scrollToTop()
  }, [scrollToTop])

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-gray-400">No questions available</p>
      </div>
    )
  }

  const studyStatus = getStudyStatus(currentQuestion._id)
  const bookmarked = isBookmarked(currentQuestion._id)
  const questionHtml = sanitizeHtml(currentQuestion.examQue)
  const answerHtml = currentQuestion.isAnswerLetter
    ? null
    : sanitizeHtml(stripHtmlWrappers(currentQuestion.examAns))

  return (
    <div className="space-y-4">
      {/* Study Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1">
          <Progress value={progressPct} className="flex-1 h-2" />
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {currentIndex + 1} / {filteredQuestions.length}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-600">
            <ThumbsUp className="h-3 w-3" /> {understoodCount}
          </span>
          <span className="flex items-center gap-1 text-amber-600">
            <AlertCircle className="h-3 w-3" /> {needsReviewCount}
          </span>
          <span className="text-gray-400">{studiedCount} studied</span>
        </div>
      </div>

      {/* Topic Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Topic:</span>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setSelectedTopic(null)
              goToQuestion(0)
            }}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              selectedTopic === null
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            All
          </button>
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => {
                setSelectedTopic(topic.id)
                goToQuestion(0)
              }}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                selectedTopic === topic.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {topic.id}
            </button>
          ))}
        </div>
      </div>

      {/* Question Card */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-500">Q{currentQuestion.question}</span>
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", getQuestionTypeBadgeColor(currentQuestion.type))}
              >
                {currentQuestion.type}
              </Badge>
              <Badge variant="outline" className="text-xs font-medium bg-gray-100 text-gray-600 border-gray-200">
                Topic {currentQuestion.topic}
              </Badge>
              {studyStatus && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-medium",
                    studyStatus === "understood"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  )}
                >
                  {studyStatus === "understood" ? "✓ Understood" : "! Needs Review"}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => toggleBookmark(currentQuestion._id, currentQuestion.question)}
            >
              {bookmarked ? (
                <BookmarkCheck className="h-4 w-4 text-amber-500" />
              ) : (
                <Bookmark className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Question Content */}
          <div
            className="prose prose-sm max-w-none text-gray-800 mb-6 question-content"
            dangerouslySetInnerHTML={{ __html: questionHtml }}
          />

          {/* Show/Hide Answer Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnswer(!showAnswer)}
            className="mb-4"
          >
            {showAnswer ? (
              <>
                <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Hide Answer
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5" /> Show Answer
              </>
            )}
          </Button>

          {/* Answer Section - Hidden by default */}
          <AnimatePresence>
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">Answer</span>
                  </div>
                  {currentQuestion.isAnswerLetter ? (
                    <p className="text-sm font-bold text-emerald-900 mb-2">
                      {currentQuestion.answerLetters}
                    </p>
                  ) : answerHtml ? (
                    <div
                      className="answer-content text-sm text-emerald-900 mb-2"
                      dangerouslySetInnerHTML={{ __html: answerHtml }}
                    />
                  ) : null}
                  {currentQuestion.examAnsDesc && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">Explanation</p>
                      <div
                        className="prose prose-sm max-w-none text-emerald-800 answer-desc"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentQuestion.examAnsDesc) }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Study Actions & Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => goToQuestion(currentIndex - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "text-amber-600 border-amber-200 hover:bg-amber-50",
              studyStatus === "needs_review" && "bg-amber-50"
            )}
            onClick={() => {
              setStudyStatus(
                currentQuestion._id,
                currentQuestion.question,
                "needs_review"
              )
              toast.warning("Marked for review", { description: `Q${currentQuestion.question} - Needs review` })
            }}
          >
            <ThumbsDown className="h-3.5 w-3.5 mr-1" />
            Needs Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "text-emerald-600 border-emerald-200 hover:bg-emerald-50",
              studyStatus === "understood" && "bg-emerald-50"
            )}
            onClick={() => {
              setStudyStatus(
                currentQuestion._id,
                currentQuestion.question,
                "understood"
              )
              toast.success("Understood!", { description: `Q${currentQuestion.question} - Marked as understood` })
            }}
          >
            <ThumbsUp className="h-3.5 w-3.5 mr-1" />
            Understood
          </Button>
        </div>

        <Button
          variant="default"
          size="sm"
          disabled={currentIndex >= filteredQuestions.length - 1}
          onClick={() => goToQuestion(currentIndex + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
