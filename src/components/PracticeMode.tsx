"use client"

import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Shuffle,
  ListOrdered,
  Eye,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useAppStore } from "@/lib/store"
import { sanitizeHtml, stripHtmlWrappers, getQuestionTypeBadgeColor, shuffleArray, cn } from "@/lib/utils"
import type { ParsedQuestion } from "@/lib/types"

interface PracticeModeProps {
  questions: ParsedQuestion[]
}

export default function PracticeMode({ questions }: PracticeModeProps) {
  const {
    practiceSession,
    setPracticeAnswer,
    nextPracticeQuestion,
    prevPracticeQuestion,
    endPractice,
    startPractice,
    addAnswer,
    setCurrentView,
  } = useAppStore()

  const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(new Set())
  const [showSetup, setShowSetup] = useState(!practiceSession)

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  // Setup screen
  if (showSetup || !practiceSession) {
    return (
      <PracticeSetup
        questions={questions}
        onStart={(ids, isRandom) => {
          startPractice(ids, isRandom)
          setShowSetup(false)
          scrollToTop()
        }}
      />
    )
  }

  // Results screen
  if (practiceSession.isComplete) {
    return (
      <PracticeResults
        questions={questions}
        onRestart={() => {
          setRevealedQuestions(new Set())
          setShowSetup(true)
          scrollToTop()
        }}
      />
    )
  }

  // Active practice
  const currentQId = practiceSession.questionIds[practiceSession.currentIndex]
  const currentQuestion = questions.find((q) => q._id === currentQId)
  if (!currentQuestion) return null

  const selectedAnswer = practiceSession.answers[currentQId] || ""
  const isRevealed = revealedQuestions.has(currentQId)
  const isMC = currentQuestion.type === "MC"
  const correctAnswer = currentQuestion.isAnswerLetter ? currentQuestion.answerLetters : ""
  const progressPct = ((practiceSession.currentIndex + 1) / practiceSession.questionIds.length) * 100

  const handleOptionClick = (letter: string) => {
    if (isRevealed) return
    setPracticeAnswer(currentQId, letter)
  }

  const handleReveal = () => {
    setRevealedQuestions((prev) => new Set([...prev, currentQId]))
    const isCorrect = isMC && selectedAnswer
      ? selectedAnswer === correctAnswer
      : false
    addAnswer({
      questionId: currentQId,
      questionNumber: currentQuestion.question,
      selectedAnswer: selectedAnswer || "revealed",
      isCorrect: isMC ? isCorrect : true,
      timestamp: Date.now(),
    })
  }

  const handleNext = () => {
    if (!isRevealed && isMC && selectedAnswer) {
      handleReveal()
    }
    nextPracticeQuestion()
    scrollToTop()
  }

  const handlePrev = () => {
    prevPracticeQuestion()
    scrollToTop()
  }

  const questionHtml = sanitizeHtml(currentQuestion.examQue)

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progressPct} className="flex-1 h-2" />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {practiceSession.currentIndex + 1} / {practiceSession.questionIds.length}
        </span>
      </div>

      {/* Question */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-500">Q{currentQuestion.question}</span>
            <Badge variant="outline" className={cn("text-xs font-medium", getQuestionTypeBadgeColor(currentQuestion.type))}>
              {currentQuestion.type}
            </Badge>
            <Badge variant="outline" className="text-xs font-medium bg-gray-100 text-gray-600 border-gray-200">
              Topic {currentQuestion.topic}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Question Content - includes MC options in HTML */}
          <div
            className="prose prose-sm max-w-none text-gray-800 mb-4 question-content"
            dangerouslySetInnerHTML={{ __html: questionHtml }}
          />

          {/* Reveal Answer button */}
          {!isRevealed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReveal}
              className="mb-4"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Reveal Answer
            </Button>
          )}

          {/* Answer Reveal */}
          <AnimatePresence>
            {isRevealed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">Answer</span>
                  </div>
                  {currentQuestion.isAnswerLetter ? (
                    <p className="text-sm font-bold text-emerald-900 mb-2">{correctAnswer}</p>
                  ) : (
                    <div
                      className="answer-content text-sm text-emerald-900 mb-2"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripHtmlWrappers(currentQuestion.examAns)) }}
                    />
                  )}
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

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={practiceSession.currentIndex === 0}
          onClick={handlePrev}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleNext}
        >
          {practiceSession.currentIndex >= practiceSession.questionIds.length - 1
            ? "Finish Quiz"
            : "Next Question"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// Setup Screen
function PracticeSetup({
  questions,
  onStart,
}: {
  questions: ParsedQuestion[]
  onStart: (ids: string[], isRandom: boolean) => void
}) {
  const { selectedTopic, setSelectedTopic } = useAppStore()
  const [topicFilter, setTopicFilter] = useState<number | null>(null)
  const [questionCount, setQuestionCount] = useState(10)

  const availableQuestions = topicFilter
    ? questions.filter((q) => q.topic === topicFilter)
    : questions

  const maxCount = availableQuestions.length
  const effectiveCount = Math.min(questionCount, maxCount)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Practice Quiz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Select Topic</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTopicFilter(null)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  topicFilter === null
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                All Topics
              </button>
              {[1, 2, 3].map((t) => (
                <button
                  key={t}
                  onClick={() => setTopicFilter(t)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    topicFilter === t
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  Topic {t} ({questions.filter((q) => q.topic === t).length})
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Number of Questions</p>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 20, 30, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  disabled={n > maxCount}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    n > maxCount && "opacity-30 cursor-not-allowed",
                    questionCount === n
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{maxCount} questions available</p>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const ids = availableQuestions.slice(0, effectiveCount).map((q) => q._id)
                onStart(ids, false)
              }}
            >
              <ListOrdered className="mr-2 h-4 w-4" />
              Sequential
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                const shuffled = shuffleArray(availableQuestions).slice(0, effectiveCount)
                const ids = shuffled.map((q) => q._id)
                onStart(ids, true)
              }}
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Random
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Results Screen
function PracticeResults({
  questions,
  onRestart,
}: {
  questions: ParsedQuestion[]
  onRestart: () => void
}) {
  const { practiceSession, endPractice, addAnswer } = useAppStore()

  if (!practiceSession) return null

  const sessionQuestions = practiceSession.questionIds
    .map((id) => questions.find((q) => q._id === id))
    .filter(Boolean) as ParsedQuestion[]

  const correctCount = sessionQuestions.filter((q) => {
    const answer = practiceSession.answers[q._id]
    if (!answer) return false
    if (q.isAnswerLetter) return answer === q.answerLetters
    return true
  }).length

  const totalAnswered = Object.keys(practiceSession.answers).length
  const scorePct = totalAnswered > 0 ? Math.round((correctCount / sessionQuestions.length) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="border border-gray-200">
        <CardHeader className="text-center">
          <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-2" />
          <CardTitle className="text-2xl font-bold text-gray-900">Quiz Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score */}
          <div className="text-center">
            <p className="text-5xl font-bold text-gray-900 mb-1">{scorePct}%</p>
            <p className="text-sm text-gray-500">
              {correctCount} correct out of {sessionQuestions.length} questions
            </p>
          </div>

          <Progress
            value={scorePct}
            className="h-3"
          />

          {/* Summary by type */}
          <div className="grid grid-cols-2 gap-3">
            {(["MC", "HOTSPOT", "DRAG DROP", "CASE STUDY"] as const).map((type) => {
              const typeQs = sessionQuestions.filter((q) => q.type === type)
              if (typeQs.length === 0) return null
              const typeCorrect = typeQs.filter((q) => {
                const ans = practiceSession.answers[q._id]
                if (!ans) return false
                if (q.isAnswerLetter) return ans === q.answerLetters
                return true
              }).length
              return (
                <div key={type} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs font-medium text-gray-500">{type}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {typeCorrect}/{typeQs.length}
                  </p>
                </div>
              )
            })}
          </div>

          <Separator />

          {/* Question Review */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Question Review</p>
            <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
              {sessionQuestions.map((q, idx) => {
                const answer = practiceSession.answers[q._id]
                const isCorrect = q.isAnswerLetter
                  ? answer === q.answerLetters
                  : !!answer
                return (
                  <div
                    key={q._id}
                    className="flex items-center gap-2 rounded-md p-2 hover:bg-gray-50"
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <span className="text-sm text-gray-600">Q{q.question}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", getQuestionTypeBadgeColor(q.type))}
                    >
                      {q.type}
                    </Badge>
                    <span className="ml-auto text-xs text-gray-400">
                      {answer || "Skipped"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                endPractice()
              }}
            >
              Back to Dashboard
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={onRestart}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
