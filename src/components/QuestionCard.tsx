"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Bookmark, BookmarkCheck, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/lib/store"
import { sanitizeHtml, stripHtmlWrappers, getQuestionTypeBadgeColor, cn } from "@/lib/utils"
import type { ParsedQuestion } from "@/lib/types"

interface QuestionCardProps {
  question: ParsedQuestion
  showAnswerByDefault?: boolean
  selectedAnswer?: string
  onAnswerSelect?: (letter: string) => void
  answerRevealed?: boolean
  compact?: boolean
}

export default function QuestionCard({
  question,
  showAnswerByDefault = false,
  selectedAnswer,
  onAnswerSelect,
  answerRevealed = false,
  compact = false,
}: QuestionCardProps) {
  const [internalShowAnswer, setInternalShowAnswer] = useState(showAnswerByDefault)
  const { toggleBookmark, isBookmarked, addAnswer } = useAppStore()

  const showAnswer = answerRevealed || internalShowAnswer
  const bookmarked = isBookmarked(question._id)
  const isMC = question.type === "MC"
  const correctAnswer = question.isAnswerLetter ? question.answerLetters : ""

  const handleOptionClick = (letter: string) => {
    if (!onAnswerSelect) return
    onAnswerSelect(letter)
  }

  const handleRevealAnswer = () => {
    setInternalShowAnswer(!showAnswer)
    if (!showAnswer && !answerRevealed) {
      const isCorrect = selectedAnswer
        ? selectedAnswer === correctAnswer
        : false
      addAnswer({
        questionId: question._id,
        questionNumber: question.question,
        selectedAnswer: selectedAnswer || "",
        isCorrect,
        timestamp: Date.now(),
      })
    }
  }

  const questionHtml = sanitizeHtml(question.examQue)

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-500">Q{question.question}</span>
            <Badge variant="outline" className={cn("text-xs font-medium", getQuestionTypeBadgeColor(question.type))}>
              {question.type}
            </Badge>
            <Badge variant="outline" className="text-xs font-medium bg-gray-100 text-gray-600 border-gray-200">
              Topic {question.topic}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => toggleBookmark(question._id, question.question)}
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
          className="prose prose-sm max-w-none text-gray-800 mb-4 question-content"
          dangerouslySetInnerHTML={{ __html: questionHtml }}
        />

        {/* MC Options */}
        {isMC && question.options.length > 0 && (
          <div className="space-y-2 mb-4">
            {question.options.map((opt) => {
              const isSelected = selectedAnswer === opt.letter
              const isCorrectOption = showAnswer && correctAnswer.includes(opt.letter)
              const isWrongSelection = showAnswer && isSelected && !correctAnswer.includes(opt.letter)

              return (
                <button
                  key={opt.letter}
                  onClick={() => handleOptionClick(opt.letter)}
                  disabled={answerRevealed}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-all",
                    !showAnswer && !answerRevealed && "hover:border-gray-300 hover:bg-gray-50 cursor-pointer",
                    !showAnswer && isSelected && "border-gray-400 bg-gray-100",
                    isCorrectOption && "border-emerald-400 bg-emerald-50",
                    isWrongSelection && "border-red-400 bg-red-50",
                    answerRevealed && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      !showAnswer && isSelected && "border-gray-500 bg-gray-500 text-white",
                      isCorrectOption && "border-emerald-500 bg-emerald-500 text-white",
                      isWrongSelection && "border-red-500 bg-red-500 text-white",
                      !showAnswer && !isSelected && "border-gray-300 text-gray-500"
                    )}
                  >
                    {opt.letter}
                  </span>
                  <span
                    className={cn(
                      "flex-1 pt-0.5",
                      isCorrectOption && "text-emerald-800 font-medium",
                      isWrongSelection && "text-red-800 line-through"
                    )}
                  >
                    {opt.text}
                  </span>
                  {isCorrectOption && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />}
                  {isWrongSelection && <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-1" />}
                </button>
              )
            })}
          </div>
        )}

        {/* Show/Reveal Answer Button */}
        {!showAnswerByDefault && !answerRevealed && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevealAnswer}
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
        )}

        {/* Answer Section */}
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
                {question.isAnswerLetter ? (
                  <p className="text-sm font-bold text-emerald-900 mb-2">
                    {correctAnswer}
                  </p>
                ) : (
                  <div
                    className="answer-content text-sm text-emerald-900 mb-2"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripHtmlWrappers(question.examAns)) }}
                  />
                )}
                {question.examAnsDesc && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">Explanation</p>
                    <div
                      className="prose prose-sm max-w-none text-emerald-800 answer-desc"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.examAnsDesc) }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
