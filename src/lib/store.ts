"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ViewType, AnswerRecord, BookmarkRecord, StudyRecord, PracticeSession } from "./types"

interface AppState {
  // Navigation
  currentView: ViewType
  setCurrentView: (view: ViewType) => void

  // Topic filter
  selectedTopic: number | null
  setSelectedTopic: (topic: number | null) => void

  // Browse state
  browseQuestionIndex: number
  setBrowseQuestionIndex: (index: number) => void

  // Answers (persisted)
  answers: AnswerRecord[]
  addAnswer: (record: AnswerRecord) => void
  getAnswer: (questionId: string) => AnswerRecord | undefined

  // Bookmarks (persisted)
  bookmarks: BookmarkRecord[]
  toggleBookmark: (questionId: string, questionNumber: number) => void
  isBookmarked: (questionId: string) => boolean

  // Study records (persisted)
  studyRecords: StudyRecord[]
  setStudyStatus: (questionId: string, questionNumber: number, status: "understood" | "needs_review") => void
  getStudyStatus: (questionId: string) => "understood" | "needs_review" | undefined

  // Practice session
  practiceSession: PracticeSession | null
  startPractice: (questionIds: string[], isRandom: boolean) => void
  setPracticeAnswer: (questionId: string, answer: string) => void
  nextPracticeQuestion: () => void
  prevPracticeQuestion: () => void
  endPractice: () => void

  // UI state
  showAnswer: boolean
  setShowAnswer: (show: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentView: "dashboard",
      setCurrentView: (view) => set({ currentView: view, showAnswer: false }),

      // Topic filter
      selectedTopic: null,
      setSelectedTopic: (topic) => set({ selectedTopic: topic, browseQuestionIndex: 0 }),

      // Browse state
      browseQuestionIndex: 0,
      setBrowseQuestionIndex: (index) => set({ browseQuestionIndex: index, showAnswer: false }),

      // Answers
      answers: [],
      addAnswer: (record) =>
        set((state) => {
          const existing = state.answers.findIndex((a) => a.questionId === record.questionId)
          const newAnswers = [...state.answers]
          if (existing >= 0) {
            newAnswers[existing] = record
          } else {
            newAnswers.push(record)
          }
          return { answers: newAnswers }
        }),
      getAnswer: (questionId) => get().answers.find((a) => a.questionId === questionId),

      // Bookmarks
      bookmarks: [],
      toggleBookmark: (questionId, questionNumber) =>
        set((state) => {
          const existing = state.bookmarks.findIndex((b) => b.questionId === questionId)
          if (existing >= 0) {
            return { bookmarks: state.bookmarks.filter((b) => b.questionId !== questionId) }
          }
          return { bookmarks: [...state.bookmarks, { questionId, questionNumber, timestamp: Date.now() }] }
        }),
      isBookmarked: (questionId) => get().bookmarks.some((b) => b.questionId === questionId),

      // Study records
      studyRecords: [],
      setStudyStatus: (questionId, questionNumber, status) =>
        set((state) => {
          const existing = state.studyRecords.findIndex((s) => s.questionId === questionId)
          const newRecords = [...state.studyRecords]
          if (existing >= 0) {
            newRecords[existing] = { questionId, questionNumber, status, timestamp: Date.now() }
          } else {
            newRecords.push({ questionId, questionNumber, status, timestamp: Date.now() })
          }
          return { studyRecords: newRecords }
        }),
      getStudyStatus: (questionId) => get().studyRecords.find((s) => s.questionId === questionId)?.status,

      // Practice session
      practiceSession: null,
      startPractice: (questionIds, isRandom) =>
        set({
          practiceSession: {
            questionIds,
            currentIndex: 0,
            answers: {},
            isComplete: false,
            isRandom,
          },
          currentView: "practice",
        }),
      setPracticeAnswer: (questionId, answer) =>
        set((state) => {
          if (!state.practiceSession) return {}
          return {
            practiceSession: {
              ...state.practiceSession,
              answers: { ...state.practiceSession.answers, [questionId]: answer },
            },
          }
        }),
      nextPracticeQuestion: () =>
        set((state) => {
          if (!state.practiceSession) return {}
          const next = state.practiceSession.currentIndex + 1
          if (next >= state.practiceSession.questionIds.length) {
            return {
              practiceSession: { ...state.practiceSession, isComplete: true },
            }
          }
          return {
            practiceSession: { ...state.practiceSession, currentIndex: next },
          }
        }),
      prevPracticeQuestion: () =>
        set((state) => {
          if (!state.practiceSession) return {}
          const prev = Math.max(0, state.practiceSession.currentIndex - 1)
          return {
            practiceSession: { ...state.practiceSession, currentIndex: prev },
          }
        }),
      endPractice: () => set({ practiceSession: null, currentView: "dashboard" }),

      // UI state
      showAnswer: false,
      setShowAnswer: (show) => set({ showAnswer: show }),
    }),
    {
      name: "ab100-exam-store",
      partialize: (state) => ({
        answers: state.answers,
        bookmarks: state.bookmarks,
        studyRecords: state.studyRecords,
      }),
    }
  )
)
