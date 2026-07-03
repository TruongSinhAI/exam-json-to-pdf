'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileJson,
  FileUp,
  Eye,
  Download,
  Settings2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  FileText,
  BookOpen,
  HelpCircle,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import QuestionPreview from '@/components/QuestionPreview';
import PdfGenerator from '@/components/PdfGenerator';

// Types
export interface ExamQuestion {
  _id?: string;
  question?: number;
  topic?: number | string;
  examQue?: string;
  examAns?: string;
  examAnsDesc?: string;
  isVerified?: boolean;
  isDoubt?: boolean;
  chatgptVerification?: { answer: string };
  createdAt?: string;
  [key: string]: unknown;
}

export interface ParsedExamData {
  questions: ExamQuestion[];
  topics: (number | string)[];
  questionTypes: Record<string, number>;
  totalQuestions: number;
  source: string;
}

export interface PdfOptions {
  includeAnswers: boolean;
  includeExplanations: boolean;
  includeQuestionType: boolean;
  groupByTopic: boolean;
  includeTableOfContents: boolean;
  fontSize: 'small' | 'medium' | 'large';
  title: string;
  selectedTopics: (number | string)[];
}

export type AppStep = 'input' | 'preview' | 'export';

// Utility: strip HTML wrappers
function stripHtmlWrappers(html: string): string {
  if (!html) return '';
  return html
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '');
}

// Utility: extract question type from HTML content
function extractQuestionType(html: string): string {
  if (!html) return 'Unknown';
  const text = html.replace(/<[^>]*>/g, ' ').trim();
  if (text.includes('HOTSPOT')) return 'HOTSPOT';
  if (text.includes('DRAG DROP')) return 'DRAG DROP';
  if (text.includes('CASE STUDY')) return 'CASE STUDY';
  if (html.includes('multi-choice-item')) return 'MC';
  return 'MC';
}

// Utility: parse JSON data
function parseExamJson(jsonStr: string): ParsedExamData {
  const parsed = JSON.parse(jsonStr);

  let questions: ExamQuestion[] = [];
  let source = 'Unknown';

  if (Array.isArray(parsed)) {
    questions = parsed;
    source = 'JSON Array';
  } else if (parsed.data && Array.isArray(parsed.data)) {
    questions = parsed.data;
    source = parsed.message || 'Exam Data';
  } else if (parsed.questions && Array.isArray(parsed.questions)) {
    questions = parsed.questions;
    source = parsed.title || 'Exam Questions';
  } else if (parsed.items && Array.isArray(parsed.items)) {
    questions = parsed.items;
    source = 'Exam Items';
  } else {
    // Try to find any array in the object
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key]) && parsed[key].length > 0 && typeof parsed[key][0] === 'object') {
        questions = parsed[key];
        source = key;
        break;
      }
    }
  }

  if (questions.length === 0) {
    throw new Error('No question array found in JSON. Expected format: { data: [...] } or array of objects.');
  }

  // Extract topics
  const topics = [...new Set(questions.map(q => q.topic ?? 'General'))].sort((a, b) => {
    const numA = typeof a === 'number' ? a : parseInt(String(a)) || 0;
    const numB = typeof b === 'number' ? b : parseInt(String(b)) || 0;
    return numA - numB;
  });

  // Count question types
  const questionTypes: Record<string, number> = {};
  questions.forEach(q => {
    const type = extractQuestionType(q.examQue || '');
    questionTypes[type] = (questionTypes[type] || 0) + 1;
  });

  return {
    questions,
    topics,
    questionTypes,
    totalQuestions: questions.length,
    source,
  };
}

export default function Home() {
  const [step, setStep] = useState<AppStep>('input');
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<ParsedExamData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<PdfOptions>({
    includeAnswers: true,
    includeExplanations: true,
    includeQuestionType: true,
    groupByTopic: true,
    includeTableOfContents: true,
    fontSize: 'medium',
    title: 'Exam Study Guide',
    selectedTopics: [],
  });

  const handleParse = useCallback(() => {
    if (!jsonInput.trim()) {
      toast.error('Vui lòng nhập JSON data');
      return;
    }
    try {
      const data = parseExamJson(jsonInput.trim());
      setParsedData(data);
      setParseError(null);
      setPdfOptions(prev => ({
        ...prev,
        selectedTopics: data.topics,
      }));
      setStep('preview');
      toast.success(`Đã parse ${data.totalQuestions} câu hỏi thành công!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi parse JSON không xác định';
      setParseError(message);
      toast.error(message);
    }
  }, [jsonInput]);

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Chỉ hỗ trợ file .json');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
      toast.success(`Đã load file ${file.name}`);
    };
    reader.onerror = () => toast.error('Lỗi đọc file');
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleReset = useCallback(() => {
    setJsonInput('');
    setParsedData(null);
    setParseError(null);
    setStep('input');
  }, []);

  const steps: { key: AppStep; label: string; icon: React.ReactNode }[] = [
    { key: 'input', label: 'Nhập JSON', icon: <FileJson className="w-4 h-4" /> },
    { key: 'preview', label: 'Xem trước', icon: <Eye className="w-4 h-4" /> },
    { key: 'export', label: 'Xuất PDF', icon: <Download className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  Exam JSON → PDF
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chuyển đổi JSON đề thi sang PDF chuyên nghiệp
                </p>
              </div>
            </div>

            {parsedData && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <Trash2 className="w-3 h-3 mr-1" />
                Bắt đầu lại
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Step Progress */}
      <div className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (i === 0 || (i <= currentStepIndex && parsedData)) {
                      setStep(s.key);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    i === currentStepIndex
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : i < currentStepIndex
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700'
                      : 'bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Input */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Area */}
                <div className="lg:col-span-2 space-y-4">
                  <Card className="border-2 border-dashed hover:border-emerald-300 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileJson className="w-5 h-5 text-emerald-600" />
                        Nhập dữ liệu JSON
                      </CardTitle>
                      <CardDescription>
                        Dán JSON hoặc kéo thả file .json vào đây
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        className={`relative transition-all ${
                          isDragOver ? 'ring-2 ring-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : ''
                        }`}
                      >
                        <Textarea
                          value={jsonInput}
                          onChange={(e) => setJsonInput(e.target.value)}
                          placeholder={`Dán JSON vào đây, ví dụ:\n{\n  "status": "success",\n  "data": [\n    {\n      "question": 1,\n      "topic": 1,\n      "examQue": "<html>...</html>",\n      "examAns": "A",\n      "examAnsDesc": "<p>Explanation...</p>"\n    }\n  ]\n}`}
                          className="min-h-[400px] font-mono text-sm resize-y"
                        />
                        {isDragOver && (
                          <div className="absolute inset-0 flex items-center justify-center bg-emerald-50/90 dark:bg-emerald-900/30 rounded-lg border-2 border-dashed border-emerald-400">
                            <div className="text-center">
                              <FileUp className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                              <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                                Thả file .json vào đây
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* File Upload Button */}
                      <div className="flex items-center gap-3">
                        <label htmlFor="json-file-upload">
                          <Button variant="outline" asChild>
                            <span>
                              <FileUp className="w-4 h-4 mr-2" />
                              Upload file .json
                            </span>
                          </Button>
                          <input
                            id="json-file-upload"
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file);
                            }}
                          />
                        </label>
                        {jsonInput && (
                          <Button variant="ghost" onClick={() => setJsonInput('')}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Xóa
                          </Button>
                        )}
                      </div>

                      {parseError && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">Lỗi parse JSON</p>
                            <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Help & Info */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-blue-500" />
                        Định dạng hỗ trợ
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="space-y-2">
                        <p className="font-medium text-slate-700 dark:text-slate-300">Format 1: Exam JSON</p>
                        <code className="block p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs">
                          {`{ "data": [{ "question": 1, "examQue": "...", "examAns": "...", "examAnsDesc": "..." }] }`}
                        </code>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <p className="font-medium text-slate-700 dark:text-slate-300">Format 2: Mảng JSON</p>
                        <code className="block p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs">
                          {`[{ "question": "...", "answer": "...", "explanation": "..." }]`}
                        </code>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <p className="font-medium text-slate-700 dark:text-slate-300">Format 3: Bất kì JSON</p>
                        <p className="text-slate-500 dark:text-slate-400">
                          Tool sẽ tự động tìm mảng object trong JSON và nhận diện các trường.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Tính năng
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {[
                        'Tự động nhận diện format JSON',
                        'Hiển thị preview câu hỏi',
                        'Tùy chỉnh nội dung PDF',
                        'Ẩn/hiện đáp án & giải thích',
                        'Nhóm theo Topic',
                        'Mục lục tự động',
                        'Hỗ trợ HTML trong câu hỏi',
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                    size="lg"
                    onClick={handleParse}
                    disabled={!jsonInput.trim()}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Parse & Xem trước
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && parsedData && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{parsedData.totalQuestions}</p>
                        <p className="text-xs text-slate-500">Tổng câu hỏi</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <ListChecks className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{parsedData.topics.length}</p>
                        <p className="text-xs text-slate-500">Topics</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {parsedData.questions.filter(q => q.isVerified).length}
                        </p>
                        <p className="text-xs text-slate-500">Đã verify</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {Object.keys(parsedData.questionTypes).length}
                        </p>
                        <p className="text-xs text-slate-500">Loại câu hỏi</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Question Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Phân bố loại câu hỏi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(parsedData.questionTypes).map(([type, count]) => (
                      <Badge key={type} variant="secondary" className="text-sm px-3 py-1">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Questions Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Xem trước câu hỏi</span>
                    <Badge variant="outline">{parsedData.totalQuestions} câu</Badge>
                  </CardTitle>
                  <CardDescription>
                    Hiển thị 10 câu đầu tiên. Tất cả sẽ có trong PDF.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-4 pr-4">
                      {parsedData.questions.slice(0, 10).map((q, i) => (
                        <QuestionPreview
                          key={q._id || i}
                          question={q}
                          index={i}
                          stripHtmlWrappers={stripHtmlWrappers}
                          extractQuestionType={extractQuestionType}
                        />
                      ))}
                      {parsedData.questions.length > 10 && (
                        <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                          <p>... và {parsedData.questions.length - 10} câu hỏi khác</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('input')}>
                  Quay lại
                </Button>
                <Button
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                  onClick={() => setStep('export')}
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Cấu hình & Xuất PDF
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Export */}
          {step === 'export' && parsedData && (
            <motion.div
              key="export"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Options Panel */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-emerald-600" />
                        Tùy chỉnh PDF
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Title */}
                      <div className="space-y-2">
                        <Label htmlFor="pdf-title">Tiêu đề PDF</Label>
                        <input
                          id="pdf-title"
                          type="text"
                          value={pdfOptions.title}
                          onChange={(e) => setPdfOptions(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                          placeholder="Exam Study Guide"
                        />
                      </div>

                      <Separator />

                      {/* Content Toggles */}
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Nội dung PDF
                        </p>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-answers" className="cursor-pointer">
                            Hiện đáp án
                          </Label>
                          <Switch
                            id="include-answers"
                            checked={pdfOptions.includeAnswers}
                            onCheckedChange={(checked) =>
                              setPdfOptions(prev => ({ ...prev, includeAnswers: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-explanations" className="cursor-pointer">
                            Hiện giải thích
                          </Label>
                          <Switch
                            id="include-explanations"
                            checked={pdfOptions.includeExplanations}
                            onCheckedChange={(checked) =>
                              setPdfOptions(prev => ({ ...prev, includeExplanations: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-qtype" className="cursor-pointer">
                            Hiện loại câu hỏi
                          </Label>
                          <Switch
                            id="include-qtype"
                            checked={pdfOptions.includeQuestionType}
                            onCheckedChange={(checked) =>
                              setPdfOptions(prev => ({ ...prev, includeQuestionType: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="group-by-topic" className="cursor-pointer">
                            Nhóm theo Topic
                          </Label>
                          <Switch
                            id="group-by-topic"
                            checked={pdfOptions.groupByTopic}
                            onCheckedChange={(checked) =>
                              setPdfOptions(prev => ({ ...prev, groupByTopic: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="include-toc" className="cursor-pointer">
                            Mục lục
                          </Label>
                          <Switch
                            id="include-toc"
                            checked={pdfOptions.includeTableOfContents}
                            onCheckedChange={(checked) =>
                              setPdfOptions(prev => ({ ...prev, includeTableOfContents: checked }))
                            }
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Font Size */}
                      <div className="space-y-2">
                        <Label>Cỡ chữ</Label>
                        <div className="flex gap-2">
                          {(['small', 'medium', 'large'] as const).map((size) => (
                            <Button
                              key={size}
                              variant={pdfOptions.fontSize === size ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setPdfOptions(prev => ({ ...prev, fontSize: size }))}
                            >
                              {size === 'small' ? 'Nhỏ' : size === 'medium' ? 'Vừa' : 'Lớn'}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Topic Filter */}
                      {parsedData.topics.length >= 1 && (
                        <div className="space-y-2">
                          <Label>Chọn Topics</Label>
                          <div className="space-y-2">
                            {parsedData.topics.map((topic) => (
                              <div key={String(topic)} className="flex items-center gap-2">
                                <Checkbox
                                  id={`topic-${topic}`}
                                  checked={pdfOptions.selectedTopics.includes(topic)}
                                  onCheckedChange={(checked) => {
                                    setPdfOptions(prev => ({
                                      ...prev,
                                      selectedTopics: checked
                                        ? [...prev.selectedTopics, topic]
                                        : prev.selectedTopics.filter(t => t !== topic),
                                    }));
                                  }}
                                />
                                <Label htmlFor={`topic-${topic}`} className="cursor-pointer text-sm">
                                  Topic {topic}
                                  <span className="text-slate-400 ml-1">
                                    ({parsedData.questions.filter(q => q.topic === topic).length} câu)
                                  </span>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* PDF Preview & Export */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Summary */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-emerald-600" />
                          <span className="font-medium">Tóm tắt PDF</span>
                        </div>
                        <Badge variant="secondary">
                          {parsedData.questions.filter(q =>
                            pdfOptions.selectedTopics.includes(q.topic ?? 'General')
                          ).length} câu hỏi
                        </Badge>
                        {pdfOptions.includeAnswers && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Có đáp án
                          </Badge>
                        )}
                        {pdfOptions.includeExplanations && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            Có giải thích
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* PDF Generator Component */}
                  <PdfGenerator
                    parsedData={parsedData}
                    pdfOptions={pdfOptions}
                    stripHtmlWrappers={stripHtmlWrappers}
                    extractQuestionType={extractQuestionType}
                  />

                  {/* Navigation */}
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep('preview')}>
                      Quay lại
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          Exam JSON → PDF Converter • Chuyển đổi JSON đề thi sang PDF chuyên nghiệp
        </div>
      </footer>
    </div>
  );
}
