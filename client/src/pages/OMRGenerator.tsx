import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Printer,
  Download,
  Sparkles,
  Layers,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  FolderTree,
  Check,
  RotateCcw,
  Edit3,
  HelpCircle,
  Save,
  AlertTriangle,
  Eye,
  Keyboard,
  Zap,
  X,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { api } from '../lib/api';
import { MathRenderer } from '../components/common/MathRenderer';

// Helper to extract correct answer from question object
const extractCorrectAnswer = (q: any): string => {
  if (!q) return '';
  // 1. Direct fields on question
  const direct = q.correctAnswer || q.correct_answer || q.correctOption || q.correct_option || q.answer;
  if (typeof direct === 'string' && direct.trim()) {
    const val = direct.trim().toUpperCase();
    if (/^[A-E]$/.test(val)) return val;
    const m = val.match(/[A-E]/);
    if (m) return m[0];
  }
  // 2. Options array check (isCorrect, is_correct, correct)
  let opts = q.options;
  if (typeof opts === 'string') {
    try { opts = JSON.parse(opts); } catch {}
  }
  if (Array.isArray(opts)) {
    const foundIdx = opts.findIndex((o: any) => o?.isCorrect || o?.is_correct || o?.correct);
    if (foundIdx !== -1) {
      const opt = opts[foundIdx];
      if (opt?.key && /^[A-E]$/i.test(opt.key)) return opt.key.toUpperCase();
      return ['A', 'B', 'C', 'D', 'E'][foundIdx] || 'A';
    }
  }
  // 3. Metadata check
  if (q.metadata?.correctAnswer) {
    const val = String(q.metadata.correctAnswer).trim().toUpperCase();
    if (/^[A-E]$/.test(val)) return val;
  }
  return '';
};

export const OMRGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<any[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [examTitle, setExamTitle] = useState('OFFLINE EXAMINATION OMR SHEET');
  const [examCode, setExamCode] = useState('EXAM-101');
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [optionsPerQ, setOptionsPerQ] = useState(4);
  const [generatedTemplate, setGeneratedTemplate] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPaperMeta, setSelectedPaperMeta] = useState<{ className: string; subjectName: string; qCount: number } | null>(null);
  const [paperQuestions, setPaperQuestions] = useState<any[]>([]);

  // Answer Key State: { "1": "A", "2": "C", ... }
  const [answerKey, setAnswerKey] = useState<{ [qNum: string]: string }>({});
  const [autoDetectedKeys, setAutoDetectedKeys] = useState<{ [qNum: string]: boolean }>({});
  const [detectedCount, setDetectedCount] = useState<number>(0);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Modals & Inspection State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchKeyInput, setBatchKeyInput] = useState('');
  const [inspectingQIndex, setInspectingQIndex] = useState<number | null>(null);
  const [showUnassignedWarning, setShowUnassignedWarning] = useState(false);

  // Keyboard navigation refs
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const res = await api.get('/papers');
        const list = res.data.papers || [];
        setPapers(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedPaperId(first.id);
          applyPaperDetails(first);
        }
      } catch (err) {
        console.error('Fetch papers error in OMR Generator:', err);
      }
    };

    fetchPapers();
  }, []);

  const applyPaperDetails = async (paper: any) => {
    if (!paper) return;
    try {
      const layout = JSON.parse(paper.canvasLayoutJson || '{}');
      const settings = layout.settings || {};
      const questions: any[] = layout.questions || [];
      const qCount = questions.length > 0 ? questions.length : 30;

      setExamTitle(paper.schoolName ? `${paper.schoolName} - ${paper.title}` : paper.title || 'OFFLINE EXAMINATION OMR SHEET');
      setExamCode(paper.examCode || 'EXAM-101');
      setTotalQuestions(qCount);
      setPaperQuestions(questions);
      setSelectedPaperMeta({
        className: settings.className || 'Class 12',
        subjectName: settings.subjectName || 'Physics',
        qCount: questions.length,
      });

      // 1. First pass: extract answers directly from paper layout questions
      const keyMap: { [key: string]: string } = {};
      const detectedMap: { [key: string]: boolean } = {};
      const missingIdxs: number[] = [];

      questions.forEach((q, i) => {
        const qNum = String(i + 1);
        const ans = extractCorrectAnswer(q);
        if (ans) {
          keyMap[qNum] = ans;
          detectedMap[qNum] = true;
        } else {
          missingIdxs.push(i);
        }
      });

      // 2. Second pass: if some questions lack answers, cross-reference Question Bank DB
      if (missingIdxs.length > 0) {
        try {
          const res = await api.get('/questions');
          const allDbQs: any[] = res.data.questions || [];
          const dbMap = new Map<string, any>();
          allDbQs.forEach((dq) => {
            if (dq.id) dbMap.set(dq.id, dq);
          });

          missingIdxs.forEach((idx) => {
            const q = questions[idx];
            if (q?.id && dbMap.has(q.id)) {
              const dbQ = dbMap.get(q.id);
              const dbAns = extractCorrectAnswer(dbQ);
              if (dbAns) {
                const qNum = String(idx + 1);
                keyMap[qNum] = dbAns;
                detectedMap[qNum] = true;
              }
            }
          });
        } catch (e) {
          console.warn('Could not query Question Bank for missing answers:', e);
        }
      }

      setAnswerKey(keyMap);
      setAutoDetectedKeys(detectedMap);
      setDetectedCount(Object.keys(detectedMap).length);
    } catch {
      setExamTitle(paper.title || 'OFFLINE EXAMINATION OMR SHEET');
      setExamCode(paper.examCode || 'EXAM-101');
    }
  };

  const handlePaperChange = (paperId: string) => {
    setSelectedPaperId(paperId);
    const found = papers.find((p) => p.id === paperId);
    if (found) {
      applyPaperDetails(found);
    }
  };

  const handleSetOption = (qNum: number, opt: string) => {
    const strQ = String(qNum);
    setAnswerKey((prev) => {
      const updated = { ...prev };
      if (updated[strQ] === opt) {
        delete updated[strQ]; // Toggle off if clicked again (undo)
      } else {
        updated[strQ] = opt;
      }
      return updated;
    });
  };

  const handleClearAllAnswers = () => {
    setAnswerKey({});
    setAutoDetectedKeys({});
  };

  const handleQuickFillSequential = () => {
    const opts = ['A', 'B', 'C', 'D'];
    const newKey: { [k: string]: string } = {};
    for (let i = 1; i <= totalQuestions; i++) {
      newKey[String(i)] = opts[(i - 1) % 4];
    }
    setAnswerKey(newKey);
  };

  // Re-scan and auto-detect answers from Question Bank
  const handleAutoDetectAnswers = async () => {
    try {
      const res = await api.get('/questions');
      const allDbQs: any[] = res.data.questions || [];
      const dbMap = new Map<string, any>();
      allDbQs.forEach((dq) => {
        if (dq.id) dbMap.set(dq.id, dq);
      });

      const updatedKey = { ...answerKey };
      const updatedDetected = { ...autoDetectedKeys };
      let newFound = 0;

      paperQuestions.forEach((q, i) => {
        const qNum = String(i + 1);
        let ans = extractCorrectAnswer(q);
        if (!ans && q?.id && dbMap.has(q.id)) {
          ans = extractCorrectAnswer(dbMap.get(q.id));
        }
        if (ans) {
          if (!updatedKey[qNum]) newFound++;
          updatedKey[qNum] = ans;
          updatedDetected[qNum] = true;
        }
      });

      setAnswerKey(updatedKey);
      setAutoDetectedKeys(updatedDetected);
      const totalDet = Object.keys(updatedDetected).length;
      setDetectedCount(totalDet);
      setSaveSuccessMsg(`✓ Answer detection complete: ${totalDet} / ${totalQuestions} answers detected (${newFound} newly found)!`);
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (err: any) {
      alert(`Auto-detection failed: ${err.message}`);
    }
  };

  // Rapid keyboard input on question row
  const handleKeyInput = (qNum: number, rawChar: string) => {
    const char = rawChar.trim().toUpperCase();
    let opt = '';
    if (['A', 'B', 'C', 'D', 'E'].includes(char)) {
      opt = char;
    } else if (char === '1') opt = 'A';
    else if (char === '2') opt = 'B';
    else if (char === '3') opt = 'C';
    else if (char === '4') opt = 'D';
    else if (char === '5') opt = 'E';

    if (opt) {
      handleSetOption(qNum, opt);
      // Auto-focus next question input
      const nextQ = qNum + 1;
      if (nextQ <= totalQuestions && inputRefs.current[nextQ]) {
        inputRefs.current[nextQ]?.focus();
      }
    }
  };

  // Jump to the next question that doesn't have an answer
  const handleJumpToNextMissing = () => {
    for (let i = 1; i <= totalQuestions; i++) {
      if (!answerKey[String(i)]) {
        const el = document.getElementById(`omr-q-row-${i}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          inputRefs.current[i]?.focus();
        }
        return;
      }
    }
    setSaveSuccessMsg('✓ All questions already have answers assigned!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Apply batch answer key string (e.g. "ABCDABCD" or "A, B, C, D")
  const handleApplyBatchSequence = (mode: 'missing' | 'all') => {
    if (!batchKeyInput.trim()) return;
    const letters = batchKeyInput.toUpperCase().replace(/[^A-E]/g, '').split('');
    if (letters.length === 0) {
      alert('No valid answer options (A, B, C, D, E) found in the text.');
      return;
    }

    const updated = { ...answerKey };
    let letterIdx = 0;
    let appliedCount = 0;

    for (let i = 1; i <= totalQuestions; i++) {
      const qNum = String(i);
      if (mode === 'missing' && updated[qNum]) {
        continue; // Keep existing answer
      }
      if (letterIdx < letters.length) {
        updated[qNum] = letters[letterIdx];
        letterIdx++;
        appliedCount++;
      }
    }

    setAnswerKey(updated);
    setIsBatchModalOpen(false);
    setBatchKeyInput('');
    setSaveSuccessMsg(`✓ Successfully applied ${appliedCount} answers to ${mode === 'missing' ? 'missing' : 'all'} questions!`);
    setTimeout(() => setSaveSuccessMsg(''), 4500);
  };

  // Pre-generate check: warn if any questions are unassigned
  const handleInitiateGenerate = (targetTab: 'blank' | 'master' = 'master') => {
    if (!selectedPaperId) {
      alert('Please select a saved question paper from Paper Bank.');
      return;
    }

    const unassigned: number[] = [];
    for (let i = 1; i <= totalQuestions; i++) {
      if (!answerKey[String(i)]) {
        unassigned.push(i);
      }
    }

    if (unassigned.length > 0 && targetTab === 'master') {
      setShowUnassignedWarning(true);
      return;
    }

    handleGenerate(targetTab);
  };

  const handleGenerate = async (targetTab: 'blank' | 'master' = 'master') => {
    if (!selectedPaperId) {
      alert('Please select a saved question paper from Paper Bank.');
      return;
    }

    setLoading(true);
    setSaveSuccessMsg('');
    setShowUnassignedWarning(false);
    try {
      const res = await api.post('/omr/generate-template', {
        paperId: selectedPaperId,
        examCode,
        title: examTitle,
        totalQuestions: parseInt(totalQuestions.toString(), 10),
        optionsPerQuestion: parseInt(optionsPerQ.toString(), 10),
        customAnswerKey: answerKey,
      });

      setGeneratedTemplate(res.data.template);
      setActiveSheetTab(targetTab);
      setSaveSuccessMsg('✓ Answer key saved & Master OMR Sheet generated with marked bubbles!');
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (err: any) {
      alert(`OMR generation failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [activeSheetTab, setActiveSheetTab] = useState<'blank' | 'master'>('master');

  const getMasterKeyUrl = () => {
    if (!generatedTemplate) return null;
    try {
      const meta = typeof generatedTemplate.templateMetadataJson === 'string'
        ? JSON.parse(generatedTemplate.templateMetadataJson)
        : generatedTemplate.templateMetadataJson || {};
      return meta.master_key_url || null;
    } catch {
      return null;
    }
  };

  const currentPreviewUrl = activeSheetTab === 'master' && getMasterKeyUrl()
    ? getMasterKeyUrl()
    : generatedTemplate?.imageUrl;

  const markedCount = Object.keys(answerKey).length;
  const missingCount = Math.max(0, totalQuestions - markedCount);
  const optionList = ['A', 'B', 'C', 'D', 'E'].slice(0, optionsPerQ);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-4 sm:p-5 no-print">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#0B1F3A]/5 text-[#0B1F3A] border border-[#0B1F3A]/15 flex items-center justify-center">
            <QrCode className="w-4 h-4 text-[#0B1F3A]" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-[#111827]">OMR Sheet Generator</h1>
            <p className="text-xs text-[#4B5563]">
              High-precision sheets with corner registration fiducials &bull; Interactive Answer Key Marking & Automated CV Evaluation
            </p>
          </div>
        </div>

        {generatedTemplate && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="bg-[#0B1F3A] hover:bg-[#16365F] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {activeSheetTab === 'master' ? 'Master Answer Key' : 'Student OMR'}</span>
            </button>
          </div>
        )}
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-green-50 border border-green-300 rounded-lg text-green-900 text-sm font-semibold flex items-center space-x-2 animate-fadeIn no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Generator Form & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Left: Configuration & Interactive Answer Key Marking */}
        <div className="lg:col-span-5 bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-5 space-y-5">
          <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center justify-between">
            <span>Question Paper & Config</span>
            <span className="text-xs font-normal text-[#6B7280]">Paper Bank Synchronized</span>
          </h2>

          <div className="space-y-3.5">
            {/* Fetch saved question paper dropdown */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Fetch Saved Question Paper from Paper Bank <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPaperId}
                onChange={(e) => handlePaperChange(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#111827] focus:border-[#0B1F3A] focus:outline-none"
              >
                {papers.length === 0 ? (
                  <option value="">No question papers found in Paper Bank</option>
                ) : (
                  papers.map((p) => {
                    const layout = JSON.parse(p.canvasLayoutJson || '{}');
                    const qCount = layout.questions?.length || 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.examCode}) &bull; {qCount} Questions
                      </option>
                    );
                  })
                )}
              </select>

              {selectedPaperMeta && (
                <div className="mt-1.5 flex items-center justify-between text-xs font-mono bg-[#F9FAFB] px-2.5 py-1 rounded-lg border border-[#E5E7EB] text-[#0B1F3A]">
                  <span>📁 {selectedPaperMeta.className} &gt; {selectedPaperMeta.subjectName}</span>
                  <span>{selectedPaperMeta.qCount} Questions Loaded</span>
                </div>
              )}
            </div>

            {/* Answer Detection Status Banner */}
            {selectedPaperId && (
              <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                missingCount === 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="flex items-center space-x-2">
                  {missingCount === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {detectedCount > 0 ? `${detectedCount} of ${totalQuestions} Answers Detected` : 'Answer Detection'}
                    </span>
                    <span className="block text-[11px] opacity-80">
                      {missingCount === 0
                        ? 'All questions have ground-truth answers ready.'
                        : `${missingCount} question${missingCount > 1 ? 's' : ''} require correct answer marking.`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoDetectAnswers}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#0B1F3A] border border-slate-300 rounded text-xs font-bold transition-all shadow-xs shrink-0 flex items-center space-x-1"
                  title="Re-scan Paper and Question Bank for answers"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Re-Detect</span>
                </button>
              </div>
            )}

            {/* Design Question Paper Redirection Option */}
            <div className="p-3 bg-[#F9FAFB] rounded-xl border border-dashed border-[#D1D5DB] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#111827]">Design / Modify Question Paper</div>
                <div className="text-xs text-[#6B7280]">Open MS Word Exam Publishing Studio</div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/designer')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shadow"
              >
                <span>Paper Designer</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Sheet Header Title</label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm text-[#111827] focus:border-[#0B1F3A] focus:outline-none focus:ring-1 focus:ring-[#0B1F3A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Exam Code</label>
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm text-[#111827] focus:border-[#0B1F3A] focus:outline-none focus:ring-1 focus:ring-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Total Questions</label>
                <input
                  type="number"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  min={1}
                  max={100}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-sm text-[#111827] focus:border-[#0B1F3A] focus:outline-none focus:ring-1 focus:ring-[#0B1F3A]"
                />
              </div>
            </div>

            {/* INTERACTIVE ANSWER KEY & BUBBLE MARKING EDITOR */}
            <div className="pt-3 border-t border-[#D1D5DB] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] flex items-center space-x-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-[#0B1F3A]" />
                    <span>Master Answer Key Bubble Marking</span>
                  </h3>
                  <p className="text-xs text-[#4B5563]">
                    Click options below or type to set ground-truth answers for the Master OMR sheet
                  </p>
                </div>
                <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                  markedCount === totalQuestions
                    ? 'bg-green-100 text-green-900 border border-green-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {markedCount} / {totalQuestions} Marked
                </div>
              </div>

              {/* Quick Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs bg-[#F9FAFB] p-2.5 rounded-lg border border-[#D1D5DB]">
                <span className="text-[#374151] font-semibold">Quick Tools:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {missingCount > 0 && (
                    <button
                      type="button"
                      onClick={handleJumpToNextMissing}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                      title="Jump straight to the next question requiring an answer"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                      <span>Next Missing ({missingCount})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(true)}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-[#0B1F3A] border border-[#D1D5DB] rounded text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                    title="Paste or type answer sequence like ABCD..."
                  >
                    <Keyboard className="w-3 h-3 text-[#0B1F3A]" />
                    <span>Enter Sequence</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickFillSequential}
                    title="Quickly fill A, B, C, D cycle for testing"
                    className="px-2 py-1 bg-white hover:bg-[#F3F4F6] text-[#111827] border border-[#D1D5DB] rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    ⚡ Auto-cycle
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllAnswers}
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    🧹 Clear All
                  </button>
                </div>
              </div>

              {/* Scrollable Bubble Marking Grid */}
              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 border border-[#D1D5DB] rounded-lg p-2.5 bg-white">
                {Array.from({ length: totalQuestions }, (_, idx) => {
                  const qNum = idx + 1;
                  const strQ = String(qNum);
                  const selectedOpt = answerKey[strQ] || '';
                  const isAuto = autoDetectedKeys[strQ];
                  const qObj = paperQuestions[idx];
                  const qSnippet = qObj?.questionText || qObj?.question_text || '';

                  return (
                    <div
                      key={qNum}
                      id={`omr-q-row-${qNum}`}
                      className={`flex flex-wrap items-center justify-between p-2 rounded-lg border transition-all ${
                        selectedOpt
                          ? isAuto
                            ? 'bg-emerald-50/40 border-emerald-300/80 shadow-xs'
                            : 'bg-blue-50/40 border-[#0B1F3A]/30 shadow-xs'
                          : 'bg-amber-50/70 border-amber-300 shadow-sm'
                      }`}
                    >
                      {/* Left: Question info & inspection button */}
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <span className="font-mono text-xs font-bold text-[#0B1F3A] w-7">
                          Q{qNum < 10 ? `0${qNum}` : qNum}
                        </span>

                        <div className="flex items-center space-x-1.5 min-w-0">
                          {qSnippet ? (
                            <span className="text-xs text-[#111827] truncate max-w-[130px] sm:max-w-[150px]" title={qSnippet}>
                              {qSnippet}
                            </span>
                          ) : (
                            <span className="text-xs text-[#6B7280] italic">Question {qNum}</span>
                          )}

                          <button
                            type="button"
                            onClick={() => setInspectingQIndex(idx)}
                            className="p-1 text-slate-500 hover:text-[#0B1F3A] hover:bg-slate-200 rounded transition-colors"
                            title="Inspect full question, formulas & options"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Status Tag */}
                        <div>
                          {selectedOpt ? (
                            isAuto ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                ✓ Detected: {selectedOpt}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                Marked: {selectedOpt}
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold whitespace-nowrap animate-pulse">
                              ⚠️ Needs Answer
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Bubble Option Buttons & Quick Key Input */}
                      <div className="flex items-center space-x-1 shrink-0 mt-1 sm:mt-0">
                        {/* Quick 1-char keyboard input */}
                        <input
                          ref={(el) => { inputRefs.current[qNum] = el; }}
                          type="text"
                          maxLength={1}
                          value={selectedOpt}
                          onChange={(e) => handleKeyInput(qNum, e.target.value)}
                          placeholder="-"
                          className="w-6 h-7 text-center font-mono font-bold text-xs uppercase bg-white border border-slate-300 rounded focus:border-[#0B1F3A] focus:outline-none focus:ring-1 focus:ring-[#0B1F3A] mr-1"
                          title="Type A, B, C, or D (or 1-4) on keyboard"
                        />

                        {/* Bubble buttons [A] [B] [C] [D] */}
                        {optionList.map((opt) => {
                          const isSelected = selectedOpt === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSetOption(qNum, opt)}
                              className={`w-7 h-7 rounded-full text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0B1F3A] text-white border-2 border-[#0B1F3A] shadow-xs'
                                  : 'bg-white text-[#374151] hover:bg-[#F3F4F6] border border-[#D1D5DB]'
                              }`}
                              title={`Option (${opt})`}
                            >
                              {opt}
                            </button>
                          );
                        })}

                        {/* Clear / Undo option button */}
                        {selectedOpt && (
                          <button
                            type="button"
                            onClick={() => handleSetOption(qNum, selectedOpt)}
                            title="Undo / Clear answer for this question"
                            className="w-5 h-5 text-xs text-[#6B7280] hover:text-red-700 rounded flex items-center justify-center transition-colors ml-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => handleInitiateGenerate('master')}
              disabled={loading || !selectedPaperId}
              className="w-full bg-[#0B1F3A] hover:bg-[#16365F] disabled:opacity-50 text-white text-xs font-semibold py-3 px-4 rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving & Generating...' : 'Save Answer Key & Generate Master OMR Sheet'}</span>
            </button>
          </div>
        </div>

        {/* Right: OMR Visual Preview & Tabs */}
        <div className="lg:col-span-7 bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[550px] space-y-4">
          {generatedTemplate ? (
            <div className="text-center space-y-4 max-w-xl w-full">
              {/* Tab Selector: Blank Student OMR vs Master Answer Key OMR */}
              <div className="flex items-center justify-center bg-[#F3F4F6] p-1.5 rounded-xl border border-[#D1D5DB] space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveSheetTab('blank')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeSheetTab === 'blank'
                      ? 'bg-[#0B1F3A] text-white shadow-sm'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  📄 Blank Student OMR Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSheetTab('master')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeSheetTab === 'master'
                      ? 'bg-[#0B1F3A] text-white shadow-sm'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  🎯 Master Answer Key (Filled OMR)
                </button>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#D1D5DB] shadow-sm relative">
                <img
                  src={currentPreviewUrl || generatedTemplate.imageUrl}
                  alt="Generated OMR Template"
                  className="w-full rounded-xl"
                />
              </div>

              <div className="text-xs text-[#4B5563] flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {activeSheetTab === 'master'
                    ? `Official Master Answer Key OMR sheet with ${markedCount} correct bubbles filled for automated CV evaluation`
                    : 'Standard candidate blank OMR sheet ready for printing & exam distribution'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400 space-y-2">
              <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
              <p>Select a saved question paper on the left, mark your correct answers, and click "Save Answer Key & Generate Master OMR Sheet".</p>
            </div>
          )}
        </div>
      </div>

      {/* Printable View for OMR Sheet */}
      {generatedTemplate && (
        <div className="printable-paper print-only hidden p-0 m-0">
          <img src={currentPreviewUrl || generatedTemplate.imageUrl} alt="OMR Sheet" className="w-full h-auto" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BATCH / SEQUENCE ANSWER KEY INPUT                                */}
      {/* ========================================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn no-print">
          <div className="bg-white rounded-xl border border-slate-300 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <div className="flex items-center space-x-2">
                <Keyboard className="w-4 h-4 text-[#0B1F3A]" />
                <h3 className="font-bold text-sm text-[#111827]">Rapid Answer Key Sequence Entry</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Paste or type answer keys as plain letters (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[#0B1F3A]">ABCDABCD</code> or <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[#0B1F3A]">A, B, C, D, A</code>).
              </p>
              <textarea
                value={batchKeyInput}
                onChange={(e) => setBatchKeyInput(e.target.value)}
                placeholder="Paste answers here: ABCDABCDABCD..."
                rows={4}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-xs uppercase focus:bg-white focus:border-[#0B1F3A] focus:outline-none"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Detected valid options: <strong className="text-[#0B1F3A] font-mono">{batchKeyInput.toUpperCase().replace(/[^A-E]/g, '').length}</strong> / {totalQuestions}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setBatchKeyInput(text);
                    } catch {}
                  }}
                  className="text-indigo-600 hover:underline font-bold"
                >
                  Paste from Clipboard
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApplyBatchSequence('missing')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all"
                title="Only fills questions that currently have no answer marked"
              >
                Fill Missing Only
              </button>
              <button
                type="button"
                onClick={() => handleApplyBatchSequence('all')}
                className="px-3 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#16365F] text-white text-xs font-bold transition-all"
                title="Overwrites all questions sequentially"
              >
                Apply to All ({totalQuestions})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUESTION DETAILS & OPTION ANSWER ASSIGNMENT INSPECTOR             */}
      {/* ========================================================================= */}
      {inspectingQIndex !== null && (() => {
        const qNum = inspectingQIndex + 1;
        const strQ = String(qNum);
        const qObj = paperQuestions[inspectingQIndex] || {};
        const qText = qObj.questionText || qObj.question_text || '';
        const selectedOpt = answerKey[strQ] || '';

        let opts: any[] = [];
        try {
          opts = typeof qObj.options === 'string'
            ? JSON.parse(qObj.options)
            : Array.isArray(qObj.options)
            ? qObj.options
            : [];
        } catch {
          opts = [];
        }

        let diags: any[] = [];
        try {
          diags = typeof qObj.diagrams === 'string'
            ? JSON.parse(qObj.diagrams)
            : Array.isArray(qObj.diagrams)
            ? qObj.diagrams
            : [];
        } catch {
          diags = [];
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn no-print">
            <div className="bg-white rounded-xl border border-slate-300 shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-[#0B1F3A] text-white font-mono font-bold text-xs">
                    Q{qNum < 10 ? `0${qNum}` : qNum}
                  </span>
                  <h3 className="font-bold text-sm text-[#111827]">
                    Question Inspection &amp; Answer Assignment
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 font-mono">
                    [{qObj.marks || 1} Mark{Number(qObj.marks) > 1 ? 's' : ''}]
                  </span>
                  <button
                    type="button"
                    onClick={() => setInspectingQIndex(null)}
                    className="text-slate-400 hover:text-slate-700 font-bold text-base p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Question Text with KaTeX formulas */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-[#111827]">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Question Body:</div>
                <MathRenderer content={qText || 'No question text available.'} />
              </div>

              {/* Diagram / Figures if any */}
              {diags.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Diagram / Figure:</div>
                  <div className="flex flex-wrap gap-2">
                    {diags.map((d, dIdx) => (
                      <div key={dIdx} className="p-1 border border-slate-200 rounded-lg bg-white">
                        <img
                          src={d.relative_url || d}
                          alt="Question diagram"
                          className="max-h-48 object-contain rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Options List with Selection & Undo actions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#111827]">
                    Options &amp; Correct Answer Key:
                  </div>
                  {selectedOpt ? (
                    <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold">
                      <span>Marked Key: Option {selectedOpt}</span>
                      <button
                        type="button"
                        onClick={() => handleSetOption(qNum, selectedOpt)}
                        className="text-rose-600 hover:text-rose-800 hover:underline flex items-center space-x-0.5 ml-1"
                        title="Undo / Clear answer selection"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Undo</span>
                      </button>
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      ⚠️ No answer marked yet — click an option below
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {['A', 'B', 'C', 'D'].map((key) => {
                    const optObj = opts.find((o) => o?.key === key);
                    const optText = optObj?.text || '';
                    const optImage = optObj?.imageUrl || '';
                    const isSelected = selectedOpt === key;

                    return (
                      <div
                        key={key}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                          <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-[#0B1F3A]'
                          }`}>
                            {key}
                          </span>

                          <div className="text-xs text-[#111827] min-w-0">
                            {optText ? (
                              <MathRenderer content={optText} />
                            ) : (
                              <span className="text-slate-400 italic">Option {key}</span>
                            )}
                            {optImage && (
                              <img src={optImage} alt={`Option ${key}`} className="max-h-20 object-contain mt-1 rounded border" />
                            )}
                          </div>
                        </div>

                        {/* Right: Mark / Undo Option Button */}
                        <div className="shrink-0">
                          {isSelected ? (
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleSetOption(qNum, key)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1 shadow-sm"
                                title="Currently marked as correct answer. Click to undo / unmark."
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Correct</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetOption(qNum, key)}
                                className="px-2 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-colors flex items-center space-x-1"
                                title="Undo / Deselect this answer"
                              >
                                <RotateCcw className="w-3 h-3 text-rose-600" />
                                <span>Undo</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetOption(qNum, key)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 hover:text-[#0B1F3A] border border-slate-300 shadow-xs"
                            >
                              Mark Correct
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer navigation */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={inspectingQIndex === 0}
                  onClick={() => setInspectingQIndex(inspectingQIndex - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 flex items-center space-x-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous Q</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectingQIndex(null)}
                  className="px-4 py-1.5 bg-[#0B1F3A] hover:bg-[#16365F] text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Done
                </button>

                <button
                  type="button"
                  disabled={inspectingQIndex >= totalQuestions - 1}
                  onClick={() => setInspectingQIndex(inspectingQIndex + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 flex items-center space-x-1"
                >
                  <span>Next Q</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 3: UNASSIGNED QUESTIONS WARNING MODAL                                */}
      {/* ========================================================================= */}
      {showUnassignedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn no-print">
          <div className="bg-white rounded-xl border border-slate-300 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center space-x-2.5 text-amber-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-[#111827]">
                Unassigned Answer Bubbles Detected
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>{missingCount} of {totalQuestions} questions</strong> do not currently have a ground-truth answer assigned.
              If you proceed now, those questions will produce blank bubbles on the Master OMR Answer Key.
            </p>

            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 font-mono">
              Missing:{' '}
              {Array.from({ length: totalQuestions }, (_, i) => i + 1)
                .filter((n) => !answerKey[String(n)])
                .slice(0, 8)
                .map((n) => `Q${n < 10 ? `0${n}` : n}`)
                .join(', ')}
              {missingCount > 8 ? ` and ${missingCount - 8} more...` : ''}
            </div>

            <div className="flex flex-col space-y-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowUnassignedWarning(false);
                  handleJumpToNextMissing();
                }}
                className="w-full py-2 bg-[#0B1F3A] hover:bg-[#16365F] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                ✏️ Enter Missing Answers Now
              </button>

              <button
                type="button"
                onClick={() => {
                  const updated = { ...answerKey };
                  for (let i = 1; i <= totalQuestions; i++) {
                    if (!updated[String(i)]) updated[String(i)] = 'A';
                  }
                  setAnswerKey(updated);
                  setShowUnassignedWarning(false);
                  handleGenerate('master');
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#0B1F3A] text-xs font-semibold rounded-lg border border-slate-300"
              >
                ⚡ Fill Remaining with 'A' &amp; Generate
              </button>

              <button
                type="button"
                onClick={() => handleGenerate('master')}
                className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-800 underline font-medium"
              >
                Proceed &amp; Generate Master OMR with Blank Bubbles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
