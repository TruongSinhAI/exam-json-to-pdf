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

// Chunk rendering approach: render each "page block" into its own canvas,
// then assemble into a PDF. Avoids browser canvas size limits.
// Each block = a logical chunk (title, TOC, topic header, or batch of questions).

interface RenderBlock {
  type: 'title' | 'toc' | 'topic-header' | 'questions';
  html: string;
  topic?: number | string;
}

export default function PdfGenerator({
  parsedData,
  pdfOptions,
  stripHtmlWrappers,
  extractQuestionType,
}: PdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

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

  // Build list of render blocks (each block fits in one canvas)
  function buildRenderBlocks(): RenderBlock[] {
    const blocks: RenderBlock[] = [];

    // Title page block
    blocks.push({
      type: 'title',
      html: `
        <div style="text-align: center; padding: 60px 40px; min-height: 240mm; display: flex; flex-direction: column; justify-content: center;">
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
      `,
    });

    // TOC block (only if more than 1 group AND toggle is on)
    if (pdfOptions.includeTableOfContents && groupedQuestions.length > 1) {
      blocks.push({
        type: 'toc',
        html: `
          <div style="padding: 20px 40px; min-height: 240mm;">
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
        `,
      });
    }

    // Question blocks — chunk questions into batches (e.g., 5 per block)
    // to keep each canvas small enough for html2canvas
    const CHUNK_SIZE = 5;

    groupedQuestions.forEach((group) => {
      // Topic header block (only when grouping by topic)
      if (pdfOptions.groupByTopic) {
        blocks.push({
          type: 'topic-header',
          topic: group.topic,
          html: `
            <div style="padding: 20px 40px;">
              <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 16px;">
                <h2 style="font-size: ${fontSizes.heading}; font-weight: 700; margin: 0;">Topic ${group.topic}</h2>
                <p style="font-size: 12px; opacity: 0.9; margin: 4px 0 0;">${group.questions.length} câu hỏi</p>
              </div>
            </div>
          `,
        });
      }

      // Split questions into chunks
      for (let i = 0; i < group.questions.length; i += CHUNK_SIZE) {
        const chunk = group.questions.slice(i, i + CHUNK_SIZE);
        const chunkHtml = chunk.map((q, j) => {
          const globalIdx = parsedData.questions.indexOf(q);
          return renderQuestionHtml(q, j, globalIdx, fontSizes);
        }).join('');

        blocks.push({
          type: 'questions',
          topic: group.topic,
          html: `<div style="padding: 0 40px;">${chunkHtml}</div>`,
        });
      }
    });

    return blocks;
  }

  const generatePdf = async () => {
    if (filteredQuestions.length === 0) {
      toast.error('Không có câu hỏi nào được chọn');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Dynamically import libraries
      const html2pdf = (await import('html2pdf.js')).default;
      // jsPDF is bundled with html2pdf
      // We'll use html2pdf's underlying jsPDF instance via the worker API

      const blocks = buildRenderBlocks();

      // Create iframe to isolate from main page CSS (prevents oklch() errors)
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:none;background:white;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Cannot access iframe document');
      }

      // Initialize iframe with basic reset CSS
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, 'Noto Sans', sans-serif; font-size: ${fontSizes.base}; line-height: 1.6; color: #1a1a1a; background: white; width: 210mm; }
          ul, ol { padding-left: 20px; margin: 8px 0; }
          li { margin: 4px 0; }
          p { margin: 4px 0; }
          img { max-width: 100%; height: auto; }
          strong, b { font-weight: 700; }
          a { color: #2563eb; }
          .multi-choice-item { list-style: none; margin: 6px 0; padding: 4px 0; }
          .multi-choice-letter { font-weight: 700; color: #475569; margin-right: 4px; }
          table { border-collapse: collapse; width: 100%; margin: 8px 0; }
          td, th { border: 1px solid #e2e8f0; padding: 6px 8px; }
          code { background: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
          pre { background: #f1f5f9; padding: 8px; border-radius: 6px; overflow-x: auto; }
        </style>
        </head><body></body></html>
      `);
      iframeDoc.close();

      // Wait for iframe to be ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use html2pdf's worker to create a jsPDF instance, then add images manually
      // Strategy: render each block to canvas, slice into page-sized chunks, add to PDF

      // Initialize jsPDF via html2pdf's worker
      const worker = html2pdf();
      const jsPDFOpt = {
        unit: 'mm' as const,
        format: 'a4',
        orientation: 'portrait' as const,
      };

      // Get jsPDF constructor from html2pdf
      // html2pdf bundles jsPDF — we access it via the worker
      // Alternative: just use html2pdf for each block separately and merge

      // Approach: Use html2canvas directly per block, then addImage to a single jsPDF
      const html2canvas = (await import('html2pdf.js' as any)).default.html2canvas ||
                          // Fallback: import html2canvas directly from window after html2pdf loads
                          (window as any).html2canvas;

      // Create jsPDF instance
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF(jsPDFOpt);

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;
      const contentHeight = pageHeight - 2 * margin;

      // Scale for rendering: 2 for small doc, 1.5 for large
      const scale = filteredQuestions.length > 50 ? 1.5 : 2;

      let isFirstPage = true;

      for (let b = 0; b < blocks.length; b++) {
        const block = blocks[b];
        setProgress(Math.round(((b + 1) / blocks.length) * 90));

        // Inject block HTML into iframe body
        iframeDoc.body.innerHTML = block.html;

        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 50));

        // Render block to canvas
        const canvas = await renderToCanvas(iframeDoc.body, scale);

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          console.warn(`Block ${b} (${block.type}) produced empty canvas, skipping`);
          continue;
        }

        // Convert canvas to image
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // Calculate dimensions in mm
        const imgWidthMm = contentWidth;
        const imgHeightMm = (canvas.height / canvas.width) * imgWidthMm;

        // Slice the image into page-sized chunks
        // Each page shows contentHeight mm of the image
        let remainingHeight = imgHeightMm;
        let yOffset = 0; // mm from top of image
        const pxPerMm = canvas.width / imgWidthMm;

        while (remainingHeight > 0) {
          const chunkHeightMm = Math.min(contentHeight, remainingHeight);

          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          if (chunkHeightMm === contentHeight) {
            // Full page slice — add image directly, sourcing only the visible portion
            const srcY = yOffset * pxPerMm;
            const srcHeight = chunkHeightMm * pxPerMm;

            // Create a sub-canvas for this slice
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = srcHeight;
            const sliceCtx = sliceCanvas.getContext('2d');
            if (sliceCtx) {
              sliceCtx.fillStyle = 'white';
              sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
              sliceCtx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);
              const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
              pdf.addImage(sliceData, 'JPEG', margin, margin, imgWidthMm, chunkHeightMm);
            }
          } else {
            // Last partial slice — center vertically on the page
            const srcY = yOffset * pxPerMm;
            const srcHeight = chunkHeightMm * pxPerMm;

            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = srcHeight;
            const sliceCtx = sliceCanvas.getContext('2d');
            if (sliceCtx) {
              sliceCtx.fillStyle = 'white';
              sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
              sliceCtx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);
              const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
              pdf.addImage(sliceData, 'JPEG', margin, margin, imgWidthMm, chunkHeightMm);
            }
          }

          yOffset += chunkHeightMm;
          remainingHeight -= chunkHeightMm;
        }
      }

      setProgress(100);

      // Save PDF
      const filename = `${pdfOptions.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u4e00-\u9fff]/g, '_')}.pdf`;
      pdf.save(filename);

      // Cleanup iframe
      iframe.remove();

      toast.success(`PDF đã được tạo thành công! (${blocks.length} block, ${filteredQuestions.length} câu)`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(`Lỗi tạo PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up any orphaned iframes
      document.querySelectorAll('iframe').forEach(iframe => {
        if (iframe.style.left === '-9999px') {
          iframe.remove();
        }
      });
      setIsGenerating(false);
      setProgress(0);
    }
  };

  // Render a DOM element to canvas using html2canvas
  // We use the html2canvas that's bundled inside html2pdf.js
  async function renderToCanvas(element: HTMLElement, scale: number): Promise<HTMLCanvasElement | null> {
    // Access html2canvas from window (html2pdf.js exposes it)
    const html2canvasFn = (window as any).html2canvas;
    if (!html2canvasFn) {
      // Try dynamic import
      try {
        const h2c = await import('html2canvas');
        const fn = (h2c as any).default || h2c;
        return await fn(element, {
          scale,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
        });
      } catch (e) {
        console.error('Failed to load html2canvas:', e);
        return null;
      }
    }

    return await html2canvasFn(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });
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

        {/* Progress bar */}
        {isGenerating && progress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Đang tạo PDF...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
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
              Đang tạo PDF... {progress}%
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
          PDF được tạo theo từng block để tránh lỗi canvas giới hạn kích thước
        </p>
      </CardContent>
    </Card>
  );
}
