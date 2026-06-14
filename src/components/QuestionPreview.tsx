'use client';

import { ExamQuestion } from '@/app/page';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface QuestionPreviewProps {
  question: ExamQuestion;
  index: number;
  stripHtmlWrappers: (html: string) => string;
  extractQuestionType: (html: string) => string;
}

export default function QuestionPreview({
  question,
  index,
  stripHtmlWrappers,
  extractQuestionType,
}: QuestionPreviewProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  const qType = extractQuestionType(question.examQue || '');
  const cleanQuestion = stripHtmlWrappers(question.examQue || '');
  const cleanAnswer = stripHtmlWrappers(question.examAns || '');
  const cleanExplanation = stripHtmlWrappers(question.examAnsDesc || '');

  const typeColorMap: Record<string, string> = {
    MC: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    HOTSPOT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'DRAG DROP': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'CASE STUDY': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
              Q{question.question || index + 1}
            </span>
            <Badge className={typeColorMap[qType] || 'bg-slate-100 text-slate-700'}>
              {qType}
            </Badge>
            {question.topic !== undefined && (
              <Badge variant="outline">Topic {question.topic}</Badge>
            )}
            {question.isVerified && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                ✓ Verified
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAnswer ? 'Ẩn' : 'Hiện'} đáp án
          </Button>
        </div>

        {/* Question Content */}
        <div
          className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: cleanQuestion }}
        />

        {/* Answer */}
        {showAnswer && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Đáp án:
              </span>
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: cleanAnswer }}
              />
            </div>
            {cleanExplanation && (
              <div className="space-y-1">
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  Giải thích:
                </span>
                <div
                  className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3"
                  dangerouslySetInnerHTML={{ __html: cleanExplanation }}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
