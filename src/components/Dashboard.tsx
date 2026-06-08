"use client"

import { motion } from "framer-motion"
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Bookmark,
  PenTool,
  GraduationCap,
  TrendingUp,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAppStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { TOPICS, cn, formatTimestamp } from "@/lib/utils"
import type { ParsedQuestion } from "@/lib/types"

interface DashboardProps {
  questions: ParsedQuestion[]
}

export default function Dashboard({ questions }: DashboardProps) {
  const { answers, bookmarks, studyRecords, setCurrentView, startPractice } = useAppStore()

  const totalQuestions = questions.length
  const studiedCount = new Set([
    ...answers.map((a) => a.questionId),
    ...studyRecords.map((s) => s.questionId),
  ]).size
  const correctCount = answers.filter((a) => a.isCorrect).length
  const attemptedCount = answers.length
  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0
  const bookmarkedCount = bookmarks.length

  const topicStats = TOPICS.map((topic) => {
    const topicQuestions = questions.filter((q) => q.topic === topic.id)
    const topicStudied = topicQuestions.filter(
      (q) =>
        answers.some((a) => a.questionId === q._id) ||
        studyRecords.some((s) => s.questionId === q._id)
    ).length
    const topicCorrect = answers.filter(
      (a) => a.isCorrect && topicQuestions.some((q) => q._id === a.questionId)
    ).length
    const topicAttempted = answers.filter((a) =>
      topicQuestions.some((q) => q._id === a.questionId)
    ).length
    const topicAccuracy = topicAttempted > 0 ? Math.round((topicCorrect / topicAttempted) * 100) : 0
    const progressPct = Math.round((topicStudied / topic.totalQuestions) * 100)

    return {
      ...topic,
      studied: topicStudied,
      correct: topicCorrect,
      attempted: topicAttempted,
      accuracy: topicAccuracy,
      progressPct,
    }
  })

  const recentAnswers = [...answers]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)

  const recentActivity = recentAnswers.map((a) => {
    const q = questions.find((q) => q._id === a.questionId)
    return {
      ...a,
      question: q,
    }
  })

  const handleStartPractice = (isRandom: boolean) => {
    const ids = questions.map((q) => q._id)
    startPractice(isRandom ? ids.sort(() => Math.random() - 0.5) : ids, isRandom)
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "Total Questions", value: totalQuestions, icon: <BookOpen className="h-4 w-4" />, color: "text-gray-600" },
          { label: "Studied", value: studiedCount, icon: <TrendingUp className="h-4 w-4" />, color: "text-emerald-600" },
          { label: "Correct", value: `${accuracy}%`, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600" },
          { label: "Bookmarked", value: bookmarkedCount, icon: <Bookmark className="h-4 w-4" />, color: "text-amber-600" },
        ].map((stat) => (
          <motion.div key={stat.label} variants={item}>
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={stat.color}>{stat.icon}</span>
                  <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Overall Progress */}
      <motion.div variants={item}>
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{studiedCount} of {totalQuestions} questions studied</span>
              <span className="text-sm font-semibold text-gray-900">{Math.round((studiedCount / totalQuestions) * 100)}%</span>
            </div>
            <Progress value={(studiedCount / totalQuestions) * 100} className="h-3" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Topic Progress */}
      <motion.div variants={item}>
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Progress by Topic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topicStats.map((topic) => (
                <div key={topic.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2.5 w-2.5 rounded-full", topic.color)} />
                      <span className="text-sm font-medium text-gray-700">{topic.name}</span>
                      <span className="text-xs text-gray-400">({topic.totalQuestions} questions)</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{topic.studied}/{topic.totalQuestions} studied</span>
                      <span>{topic.accuracy}% accuracy</span>
                    </div>
                  </div>
                  <Progress value={topic.progressPct} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                onClick={() => setCurrentView("browse")}
              >
                <BookOpen className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium">Browse Questions</span>
                <span className="text-xs text-gray-400">Review all {totalQuestions} questions</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                onClick={() => handleStartPractice(false)}
              >
                <PenTool className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium">Practice Quiz</span>
                <span className="text-xs text-gray-400">Test your knowledge</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 border-gray-200 hover:border-violet-300 hover:bg-violet-50"
                onClick={() => setCurrentView("study")}
              >
                <GraduationCap className="h-5 w-5 text-violet-600" />
                <span className="text-sm font-medium">Study Mode</span>
                <span className="text-xs text-gray-400">Learn with explanations</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <motion.div variants={item}>
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">Recent Activity</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-500"
                  onClick={() => setCurrentView("browse")}
                >
                  View all <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivity.map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {activity.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-700">
                        Q{activity.questionNumber}
                      </span>
                      {activity.question && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {activity.question.type}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
