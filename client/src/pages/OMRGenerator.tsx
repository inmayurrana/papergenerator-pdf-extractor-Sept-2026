import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../lib/api';

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
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

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

  const applyPaperDetails = (paper: any) => {
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

      // Extract existing answers from paper layout
      const keyMap: { [key: string]: string } = {};
      questions.forEach((q, i) => {
        const qNum = String(i + 1);
        if (q.correctAnswer) {
          keyMap[qNum] = q.correctAnswer.toUpperCase();
        }
      });
      setAnswerKey(keyMap);
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
        delete updated[strQ]; // Toggle off if clicked again
      } else {
        updated[strQ] = opt;
      }
      return updated;
    });
  };

  const handleClearAllAnswers = () => {
    setAnswerKey({});
  };

  const handleQuickFillSequential = () => {
    const opts = ['A', 'B', 'C', 'D'];
    const newKey: { [k: string]: string } = {};
    for (let i = 1; i <= totalQuestions; i++) {
      newKey[String(i)] = opts[(i - 1) % 4];
    }
    setAnswerKey(newKey);
  };

  const handleGenerate = async (targetTab: 'blank' | 'master' = 'master') => {
    if (!selectedPaperId) {
      alert('Please select a saved question paper from Paper Bank.');
      return;
    }

    setLoading(true);
    setSaveSuccessMsg('');
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
  const optionList = ['A', 'B', 'C', 'D', 'E'].slice(0, optionsPerQ);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl no-print">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white">OMR Sheet Generator</h1>
            <p className="text-xs text-slate-400">
              High-precision sheets with corner registration fiducials &bull; Interactive Answer Key Marking & Automated CV Evaluation
            </p>
          </div>
        </div>

        {generatedTemplate && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-emerald-500/30 flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {activeSheetTab === 'master' ? 'Master Answer Key' : 'Student OMR'}</span>
            </button>
          </div>
        )}
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fadeIn no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Generator Form & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Left: Configuration & Interactive Answer Key Marking */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span>Question Paper & Config</span>
            <span className="text-[11px] font-normal text-slate-400">Paper Bank Synchronized</span>
          </h2>

          <div className="space-y-3.5">
            {/* Fetch saved question paper dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fetch Saved Question Paper from Paper Bank <span className="text-emerald-400">*</span>
              </label>
              <select
                value={selectedPaperId}
                onChange={(e) => handlePaperChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
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
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-indigo-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span>📁 {selectedPaperMeta.className} &gt; {selectedPaperMeta.subjectName}</span>
                  <span>{selectedPaperMeta.qCount} Questions Loaded</span>
                </div>
              )}
            </div>

            {/* Design Question Paper Redirection Option */}
            <div className="p-3 bg-slate-950/90 rounded-xl border border-dashed border-slate-700/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">Design / Modify Question Paper</div>
                <div className="text-[11px] text-slate-400">Open MS Word Exam Publishing Studio</div>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Sheet Header Title</label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Exam Code</label>
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Total Questions</label>
                <input
                  type="number"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  min={1}
                  max={100}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* INTERACTIVE ANSWER KEY & BUBBLE MARKING EDITOR */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Master Answer Key Bubble Marking</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Click options below to mark ground-truth answers for the Master OMR sheet
                  </p>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  markedCount === totalQuestions
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                }`}>
                  {markedCount} / {totalQuestions} Marked
                </div>
              </div>

              {/* Quick Action Toolbar */}
              <div className="flex items-center justify-between text-[11px] bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400">Quick Tools:</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleQuickFillSequential}
                    title="Quickly fill A, B, C, D cycle for testing"
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] transition-colors"
                  >
                    ⚡ Auto-cycle (A-D)
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllAnswers}
                    className="px-2 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 rounded text-[10px] transition-colors"
                  >
                    🧹 Clear All
                  </button>
                </div>
              </div>

              {/* Scrollable Bubble Marking Grid */}
              <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1 border border-slate-800/80 rounded-xl p-2 bg-slate-950/50">
                {Array.from({ length: totalQuestions }, (_, idx) => {
                  const qNum = idx + 1;
                  const strQ = String(qNum);
                  const selectedOpt = answerKey[strQ] || '';
                  const qObj = paperQuestions[idx];
                  const qSnippet = qObj?.questionText || qObj?.question_text || '';

                  return (
                    <div
                      key={qNum}
                      className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                        selectedOpt
                          ? 'bg-indigo-950/30 border-indigo-500/40'
                          : 'bg-slate-900/50 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <span className="font-mono text-xs font-bold text-indigo-400 w-8">
                          Q{qNum < 10 ? `0${qNum}` : qNum}
                        </span>
                        {qSnippet ? (
                          <span className="text-[10px] text-slate-300 truncate max-w-[140px]" title={qSnippet}>
                            {qSnippet}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Question {qNum}</span>
                        )}
                      </div>

                      {/* Bubble Option Buttons [A] [B] [C] [D] */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {optionList.map((opt) => {
                          const isSelected = selectedOpt === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSetOption(qNum, opt)}
                              className={`w-6 h-6 rounded-full text-[11px] font-bold transition-all flex items-center justify-center ${
                                isSelected
                                  ? 'bg-black text-emerald-400 border-2 border-emerald-400 ring-2 ring-emerald-500/40 scale-105 shadow'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                        {selectedOpt && (
                          <button
                            type="button"
                            onClick={() => handleSetOption(qNum, selectedOpt)}
                            title="Clear answer for this question"
                            className="w-5 h-5 text-[10px] text-slate-500 hover:text-red-400 rounded flex items-center justify-center transition-colors ml-0.5"
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
              onClick={() => handleGenerate('master')}
              disabled={loading || !selectedPaperId}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving & Generating...' : 'Save Answer Key & Generate Master OMR Sheet'}</span>
            </button>
          </div>
        </div>

        {/* Right: OMR Visual Preview & Tabs */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl flex flex-col items-center justify-center min-h-[550px] bg-slate-950/80 space-y-4">
          {generatedTemplate ? (
            <div className="text-center space-y-4 max-w-xl w-full">
              {/* Tab Selector: Blank Student OMR vs Master Answer Key OMR */}
              <div className="flex items-center justify-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveSheetTab('blank')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeSheetTab === 'blank'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📄 Blank Student OMR Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSheetTab('master')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeSheetTab === 'master'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🎯 Master Answer Key (Filled OMR)
                </button>
              </div>

              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl relative">
                <img
                  src={currentPreviewUrl || generatedTemplate.imageUrl}
                  alt="Generated OMR Template"
                  className="w-full rounded-xl"
                />
              </div>

              <div className="text-xs text-slate-300 flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
    </div>
  );
};
