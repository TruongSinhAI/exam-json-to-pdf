import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Question, ParsedQuestion, ParsedOption, QuestionType, TopicInfo } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const TOPICS: TopicInfo[] = [
  { id: 1, name: "Configure Dynamics 365", totalQuestions: 36, color: "bg-emerald-500" },
  { id: 2, name: "Manage Dynamics 365", totalQuestions: 30, color: "bg-orange-500" },
  { id: 3, name: "Implement Dynamics 365", totalQuestions: 45, color: "bg-violet-500" },
]

export function stripHtmlWrappers(html: string): string {
  return html
    .replace(/<html><head><\/head><body>/gi, "")
    .replace(/<\/body><\/html>/gi, "")
    .replace(/<html><head><\/head><body\s*[^>]*>/gi, "")
    .trim()
}

export function stripAllHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<html><head><\/head><body>/gi, "")
    .replace(/<\/body><\/html>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .trim()
}

export function detectQuestionType(examQue: string): QuestionType {
  const upper = examQue.toUpperCase()
  if (upper.includes("DRAG DROP")) return "DRAG DROP"
  if (upper.includes("HOTSPOT")) return "HOTSPOT"
  if (upper.includes("CASE STUDY") || upper.includes("CASE STUDY -")) return "CASE STUDY"
  if (examQue.includes("multi-choice-item")) return "MC"
  return "MC"
}

export function extractOptions(examQue: string): ParsedOption[] {
  const options: ParsedOption[] = []
  const regex = /data-choice-letter="([A-Z])"[^>]*>\s*([A-Z])\.\s*([\s\S]*?)<\/span>/g
  let match
  while ((match = regex.exec(examQue)) !== null) {
    options.push({
      letter: match[1],
      text: match[3].replace(/<[^>]*>/g, "").trim(),
    })
  }

  if (options.length === 0) {
    const altRegex = /data-choice-letter="([A-Z])"[^>]*>([\s\S]*?)<\/div>/g
    while ((match = altRegex.exec(examQue)) !== null) {
      const text = match[2].replace(/<[^>]*>/g, "").replace(/^[A-Z]\.\s*/, "").trim()
      if (text) {
        options.push({ letter: match[1], text })
      }
    }
  }

  if (options.length === 0) {
    const simpleRegex = /([A-Z])\.\s+([^<]*(?:<(?!\/div)[^>]*>[^<]*)*)/g
    while ((match = simpleRegex.exec(examQue)) !== null) {
      const text = match[2].replace(/<[^>]*>/g, "").trim()
      if (text && match[1] <= "D") {
        options.push({ letter: match[1], text })
      }
    }
  }

  return options
}

export function isAnswerLetter(examAns: string): boolean {
  return /^[A-Z]+$/.test(examAns.trim())
}

export function parseQuestion(q: Question): ParsedQuestion {
  const type = detectQuestionType(q.examQue)
  const options = type === "MC" ? extractOptions(q.examQue) : []
  const cleanText = stripAllHtml(q.examQue).substring(0, 200)
  const answerIsLetter = isAnswerLetter(q.examAns)

  return {
    ...q,
    type,
    options,
    cleanText,
    isAnswerLetter: answerIsLetter,
    answerLetters: answerIsLetter ? q.examAns.trim() : "",
  }
}

export function getQuestionTypeBadgeColor(type: QuestionType): string {
  switch (type) {
    case "MC":
      return "bg-emerald-100 text-emerald-800 border-emerald-200"
    case "HOTSPOT":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "DRAG DROP":
      return "bg-sky-100 text-sky-800 border-sky-200"
    case "CASE STUDY":
      return "bg-rose-100 text-rose-800 border-rose-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
