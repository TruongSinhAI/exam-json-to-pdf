'use client';

import { useState } from 'react';
import { ParsedExamData, PdfOptions, ExamQuestion } from '@/app/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PdfGeneratorProps {
  parsedData: ParsedExamData;
  pdfOptions: PdfOptions;
  stripHtmlWrappers: (html: string) => string;
  extractQuestionType: (html: string) => string;
}

export default function PdfGenerator({
  parsedData,
  pdfOptions,
  stripHtmlWrappers,
  extractQuestionType,
}: PdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter questions by selected topics
  const filteredQuestions = parsedData.questions.filter(q =>
    pdfOptions.selectedTopics.includes(q.topic ?? 'General')
  );

  // Group questions by topic
  const groupedQuestions = pdfOptions.groupByTopic
    ? parsedData.topics
        .filter(t => pdfOptions.selectedTopics.includes(t))
        .map(topic => ({
          topic,
          questions: filteredQuestions.filter(q => q.topic === topic),
        }))
    : [{ topic: 'All', questions: filteredQuestions }];

  const fontSizeMap = {
    small: { base: '12px', heading: '16px', title: '22px' },
    medium: { base: '14px', heading: '18px', title: '26px' },
    large: { base: '16px', heading: '22px', title: '30px' },
  };

  const fontSizes = fontSizeMap[pdfOptions.fontSize];

  const generatePdf = async () => {
    if (filteredQuestions.length === 0) {
      toast.error('Không có câu hỏi nào được chọn');
      return;
    }

    setIsGenerating(true);

    try {
      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;

      // Build PDF HTML content as a complete standalone HTML document
      // This avoids inheriting Tailwind v4 oklch() colors from the parent page
      const htmlContent = buildPdfHtml();

      // Create an iframe to isolate the PDF content from main page CSS
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:100vh;border:none;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Cannot access iframe document');
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = iframeDoc.body;

      // Generate PDF with onclone to strip problematic CSS
      const opt = {
        margin: [10, 0, 10, 0],
        filename: `${pdfOptions.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u4e00-\u9fff]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
          onclone: (clonedDoc: Document) => {
            // Remove all stylesheets and style tags to prevent oklch() color parsing errors
            const allStyles = clonedDoc.querySelectorAll('link[rel="stylesheet"], style');
            allStyles.forEach((el: Element) => el.remove());
            // Add basic reset CSS
            const basicStyle = clonedDoc.createElement('style');
            basicStyle.textContent = `
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, 'Noto Sans', sans-serif; font-size: ${fontSizes.base}; line-height: 1.6; color: #1a1a1a; background: white; }
              ul, ol { padding-left: 20px; margin: 8px 0; }
              li { margin: 4px 0; }
              p { margin: 4px 0; }
              img { max-width: 100%; height: auto; }
              strong, b { font-weight: 700; }
              a { color: #2563eb; }
            `;
            clonedDoc.head.appendChild(basicStyle);
          },
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(element).save();

      toast.success('PDF đã được tạo và tải xuống thành công!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Lỗi tạo PDF. Vui lòng thử lại.');
    } finally {
      // Always clean up orphaned DOM elements
      const orphans = document.querySelectorAll('#pdf-temp-container');
      orphans.forEach(el => el.remove());
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        if (iframe.style.left === '-9999px') {
          iframe.remove();
        }
      });
      setIsGenerating(false);
    }
  };

  function buildPdfHtml(): string {
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>`;

    // Title Page
    html += `
      <div style="text-align: center; padding: 80px 40px 40px; page-break-after: always;">
        <h1 style="font-size: ${fontSizes.title}; font-weight: 800; color: #059669; margin-bottom: 16px;">
          ${escapeHtml(pdfOptions.title)}
        </h1>
        <p style="font-size: 16px; color: #64748b; margin-bottom: 24px;">
          ${escapeHtml(parsedData.source)}
        </p>
        <div style="display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; margin-bottom: 32px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 20px;">
            <div style="font-size: 24px; font-weight: 700; color: #059669;">${filteredQuestions.length}</div>
            <div style="font-size: 12px; color: #64748b;">Câu hỏi</div>
          </div>
          <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 12px 20px;">
            <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${parsedData.topics.filter(t => pdfOptions.selectedTopics.includes(t)).length}</div>
            <div style="font-size: 12px; color: #64748b;">Topics</div>
          </div>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 20px;">
            <div style="font-size: 24px; font-weight: 700; color: #2563eb;">${Object.keys(parsedData.questionTypes).length}</div>
            <div style="font-size: 12px; color: #64748b;">Loại câu hỏi</div>
          </div>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">
          Tạo bởi Exam JSON to PDF Converter &bull; ${new Date().toLocaleDateString('vi-VN')}
        </p>
        ${pdfOptions.includeAnswers ? '<p style="font-size: 13px; color: #059669; margin-top: 8px;">&#10003; Bao gồm đáp án</p>' : '<p style="font-size: 13px; color: #dc2626; margin-top: 8px;">&#10007; Không có đáp án</p>'}
        ${pdfOptions.includeExplanations ? '<p style="font-size: 13px; color: #7c3aed; margin-top: 4px;">&#10003; Bao gồm giải thích</p>' : ''}
      </div>
    `;

    // Table of Contents
    if (pdfOptions.includeTableOfContents && groupedQuestions.length > 1) {
      html += `
        <div style="padding: 20px 40px; page-break-after: always;">
          <h2 style="font-size: ${fontSizes.heading}; font-weight: 700; color: #1e293b; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
            Mục lục
          </h2>
          <div style="padding-left: 8px;">
            ${groupedQuestions.map(g => `
              <div style="padding: 6px 0; border-bottom: 1px dotted #e2e8f0; display: flex; justify-content: space-between;">
                <span style="color: #334155;">Topic ${g.topic}</span>
                <span style="color: #64748b;">${g.questions.length} câu</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Questions by group
    groupedQuestions.forEach((group) => {
      html += `
        <div style="padding: 0 40px;">
          ${
            pdfOptions.groupByTopic
              ? `<div style="margin-bottom: 20px; page-break-before: always;">
                  <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 16px;">
                    <h2 style="font-size: ${fontSizes.heading}; font-weight: 700; margin: 0;">Topic ${group.topic}</h2>
                    <p style="font-size: 12px; opacity: 0.9; margin: 4px 0 0;">${group.questions.length} câu hỏi</p>
                  </div>
                </div>`
              : ''
          }
          ${group.questions.map((q, i) => renderQuestionHtml(q, i, parsedData.questions.indexOf(q), fontSizes)).join('')}
        </div>
      `;
    });

    html += `</body></html>`;
    return html;
  }

  // Render a single question as HTML string for PDF
  function renderQuestionHtml(q: ExamQuestion, localIndex: number, globalIndex: number, fs: typeof fontSizes): string {
    const qType = extractQuestionType(q.examQue || '');
    const cleanQuestion = stripHtmlWrappers(q.examQue || '');
    const cleanAnswer = stripHtmlWrappers(q.examAns || '');
    const cleanExplanation = stripHtmlWrappers(q.examAnsDesc || '');

    const typeColorMap: Record<string, string> = {
      MC: '#2563eb',
      HOTSPOT: '#d97706',
      'DRAG DROP': '#7c3aed',
      'CASE STUDY': '#e11d48',
    };
    const typeColor = typeColorMap[qType] || '#64748b';

    // Convert hex color to rgba for background (typeColor + 15 opacity)
    const typeBgColor = typeColor + '15';

    return `
      <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
          <span style="font-weight: 700; color: #059669; font-size: ${fs.heading};">
            Q${q.question || globalIndex + 1}
          </span>
          ${pdfOptions.includeQuestionType ? `<span style="background: ${typeBgColor}; color: ${typeColor}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${qType}</span>` : ''}
          ${q.topic !== undefined ? `<span style="background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Topic ${q.topic}</span>` : ''}
        </div>

        <div style="margin-bottom: 12px; line-height: 1.6;">
          ${cleanQuestion}
        </div>

        ${
          pdfOptions.includeAnswers && cleanAnswer
            ? `<div style="margin-top: 12px; padding: 10px; background: #f0fdf4; border-left: 3px solid #059669; border-radius: 0 6px 6px 0;">
                <div style="font-weight: 700; color: #059669; margin-bottom: 4px; font-size: 12px;">ĐÁP ÁN</div>
                <div>${cleanAnswer}</div>
              </div>`
            : ''
        }

        ${
          pdfOptions.includeExplanations && cleanExplanation
            ? `<div style="margin-top: 8px; padding: 10px; background: #faf5ff; border-left: 3px solid #7c3aed; border-radius: 0 6px 6px 0;">
                <div style="font-weight: 700; color: #7c3aed; margin-bottom: 4px; font-size: 12px;">GIẢI THÍCH</div>
                <div style="line-height: 1.6;">${cleanExplanation}</div>
              </div>`
            : ''
        }
      </div>
    `;
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          Xuất PDF
        </CardTitle>
        <CardDescription>
          Tạo file PDF chứa {filteredQuestions.length} câu hỏi đã chọn
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500">Câu hỏi</p>
            <p className="text-lg font-bold">{filteredQuestions.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500">Topics</p>
            <p className="text-lg font-bold">
              {pdfOptions.selectedTopics.length}/{parsedData.topics.length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500">Đáp án</p>
            <p className={`text-lg font-bold ${pdfOptions.includeAnswers ? 'text-emerald-600' : 'text-slate-400'}`}>
              {pdfOptions.includeAnswers ? '✓ Có' : '✗ Không'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500">Giải thích</p>
            <p className={`text-lg font-bold ${pdfOptions.includeExplanations ? 'text-purple-600' : 'text-slate-400'}`}>
              {pdfOptions.includeExplanations ? '✓ Có' : '✗ Không'}
            </p>
          </div>
        </div>

        {/* Warning if no answers */}
        {!pdfOptions.includeAnswers && !pdfOptions.includeExplanations && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              PDF sẽ chỉ chứa câu hỏi, không có đáp án hay giải thích. Phù hợp cho việc tự test.
            </p>
          </div>
        )}

        {/* Generate Button */}
        <Button
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
          size="lg"
          onClick={generatePdf}
          disabled={isGenerating || filteredQuestions.length === 0}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang tạo PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Tạo & Tải PDF ({filteredQuestions.length} câu)
            </>
          )}
        </Button>

        {/* Info */}
        <p className="text-xs text-center text-slate-400">
          PDF sẽ được tạo trên trình duyệt và tải xuống tự động
        </p>
      </CardContent>
    </Card>
  );
}
