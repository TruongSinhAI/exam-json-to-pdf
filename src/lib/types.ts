export type ViewType = "dashboard" | "browse" | "practice" | "study";

export type QuestionType = "MC" | "HOTSPOT" | "DRAG DROP" | "CASE STUDY";

export interface Question {
  _id: string;
  question: number;
  topic: number;
  createdAt: string;
  isVerified: boolean;
  examQue: string;
  examAns: string;
  examAnsDesc: string;
  isDoubt: boolean;
  chatgptVerification: {
    answer: string;
  };
}

export interface ParsedOption {
  letter: string;
  text: string;
}

export interface ParsedQuestion extends Question {
  type: QuestionType;
  options: ParsedOption[];
  cleanText: string;
  isAnswerLetter: boolean;
  answerLetters: string;
}

export interface AnswerRecord {
  questionId: string;
  questionNumber: number;
  selectedAnswer: string;
  isCorrect: boolean;
  timestamp: number;
}

export interface BookmarkRecord {
  questionId: string;
  questionNumber: number;
  timestamp: number;
}

export interface StudyRecord {
  questionId: string;
  questionNumber: number;
  status: "understood" | "needs_review";
  timestamp: number;
}

export interface PracticeSession {
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, string>;
  isComplete: boolean;
  isRandom: boolean;
}

export interface TopicInfo {
  id: number;
  name: string;
  totalQuestions: number;
  color: string;
}
