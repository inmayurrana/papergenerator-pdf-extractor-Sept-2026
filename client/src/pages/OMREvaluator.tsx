import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Award,
  Check,
  X,
  Sparkles,
  Layers,
  ZoomIn,
  Search,
  UserCheck,
  Info,
} from 'lucide-react';
import { api } from '../lib/api';

export const OMREvaluator: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [positiveMarks, setPositiveMarks] = useState(1.0);
  const [negativeMarks, setNegativeMarks] = useState(0.0);
  const [omrFile, setOmrFile] = useState<File | null>(null);

  // Candidate OCR Auto-Detection States
  const [detectingCandidate, setDetectingCandidate] = useState(false);
  const [candidateDetectStatus, setCandidateDetectStatus] = useState<'AUTO_DETECTED' | 'NOT_FOUND' | ''>('');

  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [evaluationsList, setEvaluationsList] = useState<any[]>([]);

  // Manual Review Edit Mode
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [reviewScore, setReviewScore] = useState(0);

  const fetchInitialData = async () => {
    try {
      const [templatesRes, evalsRes] = await Promise.all([
        api.get('/omr/templates'),
        api.get('/omr/evaluations'),
      ]);

      const tmpls = templatesRes.data.templates || [];
      setTemplates(tmpls);
      if (tmpls.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(tmpls[0].id);
      }
      setEvaluationsList(evalsRes.data.evaluations || []);
    } catch (err) {
      console.error('Fetch initial data error in OMREvaluator:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const runCandidateDetection = async (file: File) => {
    setDetectingCandidate(true);
    setCandidateDetectStatus('');
    try {
      const formData = new FormData();
      formData.append('omrImage', file);
      const res = await api.post('/omr/detect-candidate-info', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const info = res.data?.candidateInfo;
      if (info && info.found) {
        if (info.student_name) setStudentName(info.student_name);
        if (info.roll_number) setRollNumber(info.roll_number);
        setCandidateDetectStatus('AUTO_DETECTED');
      } else {
        setCandidateDetectStatus('NOT_FOUND');
      }
    } catch (err) {
      console.warn('Candidate detection error:', err);
      setCandidateDetectStatus('NOT_FOUND');
    } finally {
      setDetectingCandidate(false);
    }
  };

  const handleFileChange = (file: File) => {
    setOmrFile(file);
    setEvaluationResult(null);
    runCandidateDetection(file);
  };

  const handleEvaluate = async () => {
    if (!omrFile || !selectedTemplateId) {
      alert('Please select an OMR template and upload a student scanned sheet.');
      return;
    }

    setEvaluating(true);
    setEvaluationResult(null);

    const formData = new FormData();
    formData.append('omrImage', omrFile);
    formData.append('templateId', selectedTemplateId);
    formData.append('studentName', studentName.trim() || 'Candidate');
    formData.append('rollNumber', rollNumber.trim() || 'N/A');
    formData.append('positiveMarks', positiveMarks.toString());
    formData.append('negativeMarks', negativeMarks.toString());

    try {
      const res = await api.post('/omr/evaluate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setEvaluationResult(res.data);
      setReviewScore(res.data.results?.final_score || 0);
      fetchInitialData();
    } catch (err: any) {
      alert(`OMR evaluation failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveManualReview = async () => {
    if (!evaluationResult?.evaluation?.id) return;
    try {
      await api.put(`/omr/evaluations/${evaluationResult.evaluation.id}/review`, {
        finalScore: reviewScore,
      });
      alert('Manual score update saved to audit records!');
      setIsEditingReview(false);
      fetchInitialData();
    } catch (err: any) {
      alert(`Review save failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-4 sm:p-5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#0B1F3A]/5 text-[#0B1F3A] border border-[#0B1F3A]/15 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[#0B1F3A]" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-[#111827]">OpenCV High-Precision OMR Evaluation</h1>
            <p className="text-xs text-[#4B5563]">
              Handwriting & candidate OCR, perspective fiducial alignment, and ground-truth answer key scoring
            </p>
          </div>
        </div>
      </div>

      {/* Main Evaluator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[750px]">
        {/* Left Column: Upload & Configuration Form */}
        <div className="lg:col-span-4 bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Candidate & Exam Details</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[#374151] mb-1.5">Target OMR Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                >
                  {templates.length === 0 ? (
                    <option value="">No OMR templates generated yet</option>
                  ) : (
                    templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.examCode}) &bull; {t.totalQuestions} Questions
                      </option>
                    ))
                  )}
                </select>

                {(() => {
                  const t = templates.find((item) => item.id === selectedTemplateId);
                  if (!t) return null;
                  let meta: any = {};
                  try {
                    meta = typeof t.templateMetadataJson === 'string' ? JSON.parse(t.templateMetadataJson) : t.templateMetadataJson || {};
                  } catch {}
                  const masterUrl = meta.master_key_url || t.imageUrl;
                  const answerKeyCount = meta.answer_key ? Object.keys(meta.answer_key).length : 0;

                  return (
                    <div className="mt-2 p-2.5 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-green-800">🎯 Master Answer Key Linked</span>
                        <span className="font-mono text-[#6B7280]">{answerKeyCount} / {t.totalQuestions} Keys</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        {masterUrl && (
                          <a href={masterUrl} target="_blank" rel="noreferrer" title="Click to view full Master Filled Answer Key OMR">
                            <img src={masterUrl} alt="Master OMR" className="w-12 h-16 object-cover rounded border border-emerald-500/40 hover:opacity-80 transition-opacity" />
                          </a>
                        )}
                        <div className="text-xs text-slate-300 space-y-0.5 leading-tight">
                          <div className="font-semibold text-[#111827] truncate max-w-[200px]">{t.title}</div>
                          <div className="font-mono text-indigo-300 text-xs">Code: {t.examCode}</div>
                          <div className="text-xs text-[#6B7280]">Used as ground truth for computer vision scoring</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] mb-1.5">
                  Upload Student OMR Scan / Photo <span className="text-green-800">*</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    omrFile
                      ? 'border-emerald-600 bg-emerald-50/50'
                      : 'border-[#D1D5DB] hover:border-[#0B1F3A] bg-[#F9FAFB]'
                  }`}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*,.pdf';
                    input.onchange = (e: any) => {
                      if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                    };
                    input.click();
                  }}
                >
                  <UploadCloud className="w-8 h-8 text-[#0B1F3A] mx-auto mb-2" />
                  {omrFile ? (
                    <div className="space-y-1">
                      <div className="text-xs text-[#111827] font-semibold">{omrFile.name}</div>
                      <div className="text-xs text-green-800">Click to change candidate sheet</div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#6B7280]">Click to select mobile photo or scanner image</div>
                  )}
                </div>
              </div>

              {/* OCR Candidate Auto-Detection Status Alert */}
              {detectingCandidate && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium flex items-center space-x-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 text-[#0B1F3A] animate-spin shrink-0" />
                  <span>Scanning candidate handwriting & roll number via OCR...</span>
                </div>
              )}

              {!detectingCandidate && candidateDetectStatus === 'AUTO_DETECTED' && (
                <div className="p-3 bg-green-50 border border-green-300 rounded-lg text-xs text-green-900 font-medium flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-green-800 shrink-0" />
                    <span>✨ Auto-detected from handwriting! (Review / edit below)</span>
                  </div>
                  {omrFile && (
                    <button
                      type="button"
                      onClick={() => runCandidateDetection(omrFile)}
                      className="text-xs text-green-800 underline hover:text-emerald-300 ml-2"
                    >
                      Re-run
                    </button>
                  )}
                </div>
              )}

              {!detectingCandidate && candidateDetectStatus === 'NOT_FOUND' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 font-medium flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>No handwriting detected in header. Please enter details below.</span>
                  </div>
                  {omrFile && (
                    <button
                      type="button"
                      onClick={() => runCandidateDetection(omrFile)}
                      className="text-xs text-[#0B1F3A] underline hover:text-indigo-300 ml-2"
                    >
                      Retry OCR
                    </button>
                  )}
                </div>
              )}

              {/* Student Name & Roll Number Input Fields (Editable by User) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#374151]">Student Name</label>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Student Name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] focus:border-[#0B1F3A] focus:outline-none rounded-lg px-3 py-1.5 text-xs text-[#111827]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#374151]">Roll Number</label>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Roll Number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] focus:border-[#0B1F3A] focus:outline-none rounded-lg px-3 py-1.5 text-xs text-[#111827] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-semibold text-[#374151] mb-1.5">+ Marks / Correct</label>
                  <input
                    type="number"
                    step="0.25"
                    value={positiveMarks}
                    onChange={(e) => setPositiveMarks(parseFloat(e.target.value) || 1.0)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-1.5 text-xs text-[#111827] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] mb-1.5">- Marks / Negative</label>
                  <input
                    type="number"
                    step="0.25"
                    value={negativeMarks}
                    onChange={(e) => setNegativeMarks(parseFloat(e.target.value) || 0.0)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-1.5 text-xs text-[#111827] font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleEvaluate}
            disabled={evaluating || !omrFile || !selectedTemplateId}
            className="w-full bg-[#0B1F3A] hover:bg-[#16365F] disabled:opacity-50 text-white text-xs font-semibold py-3 px-4 rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{evaluating ? 'Evaluating OMR with Computer Vision...' : 'Run Computer Vision Evaluation'}</span>
          </button>
        </div>

        {/* Right Column: Visual Result & Evaluation Breakdown */}
        <div className="lg:col-span-8 bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-6 flex flex-col items-center justify-center">
          {evaluationResult ? (
            <div className="w-full space-y-6">
              {/* Score Header Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] shadow-sm">
                <div>
                  <div className="text-xs text-[#6B7280] font-medium">Candidate Result</div>
                  <div className="text-lg font-bold text-[#111827] flex items-center space-x-2">
                    <span>{evaluationResult.evaluation.studentName}</span>
                    <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 font-semibold">
                      Roll: {evaluationResult.evaluation.rollNumber}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xs text-[#6B7280]">Score Achieved</div>
                    <div className="text-2xl font-black text-green-800">
                      {isEditingReview ? (
                        <input
                          type="number"
                          step="0.25"
                          value={reviewScore}
                          onChange={(e) => setReviewScore(parseFloat(e.target.value))}
                          className="w-20 bg-slate-950 border border-emerald-500 rounded px-2 py-0.5 text-green-800 text-lg font-bold"
                        />
                      ) : (
                        `${evaluationResult.results.final_score} / ${evaluationResult.results.max_marks}`
                      )}
                    </div>
                  </div>

                  <div className="text-right pl-4 border-l border-slate-800">
                    <div className="text-xs text-[#6B7280]">Percentage</div>
                    <div className="text-2xl font-black text-[#0B1F3A]">{evaluationResult.results.percentage}%</div>
                  </div>
                </div>
              </div>

              {/* Stats Counters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-[#6B7280]">Attempted</div>
                  <div className="text-lg font-bold text-white">{evaluationResult.results.attempted}</div>
                </div>
                <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-center">
                  <div className="text-xs text-green-800">Correct</div>
                  <div className="text-lg font-bold text-emerald-300">{evaluationResult.results.correct}</div>
                </div>
                <div className="p-3 bg-red-950/40 rounded-xl border border-red-500/30 text-center">
                  <div className="text-xs text-red-400">Incorrect</div>
                  <div className="text-lg font-bold text-red-300">{evaluationResult.results.incorrect}</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-[#6B7280]">Unattempted</div>
                  <div className="text-lg font-bold text-slate-300">{evaluationResult.results.unattempted}</div>
                </div>
                <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-500/30 text-center">
                  <div className="text-xs text-amber-400">Uncertain</div>
                  <div className="text-lg font-bold text-amber-300">{evaluationResult.results.uncertain}</div>
                </div>
              </div>

              {/* Visual Annotated Result Image */}
              <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span className="font-semibold text-slate-200">Perspective-Aligned Annotated OMR Scan</span>
                  <span>Green = Correct &bull; Red = Incorrect &bull; Hollow Green = Expected Answer</span>
                </div>
                <div className="max-h-[450px] overflow-auto rounded-xl border border-slate-800 bg-black flex justify-center">
                  <img
                    src={evaluationResult.results.annotated_image_url}
                    alt="Annotated OMR"
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </div>

              {/* Detailed Question-by-Question Matrix */}
              <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">Question-by-Question CV Detection Breakdown</span>
                  {isEditingReview ? (
                    <button
                      onClick={handleSaveManualReview}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Score Adjustment</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingReview(true)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold flex items-center space-x-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Adjust Score</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-48 overflow-y-auto pr-1">
                  {evaluationResult.results.question_results.map((q: any) => (
                    <div
                      key={q.question_number}
                      className={`p-2 rounded-lg border text-center text-xs font-mono ${
                        q.is_correct
                          ? 'bg-green-50 border-green-300 text-green-900 font-bold'
                          : q.student_answer
                          ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                          : 'bg-[#F9FAFB] border-[#D1D5DB] text-[#6B7280]'
                      }`}
                    >
                      <div className="font-bold text-xs text-[#6B7280]">Q{q.question_number}</div>
                      <div className="text-sm font-black my-0.5">
                        {q.student_answer || '—'}
                      </div>
                      <div className="text-xs text-[#6B7280]">Key: {q.correct_answer || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-[#6B7280] space-y-2">
              <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto" />
              <p>Upload a candidate OMR scan on the left and click "Run Computer Vision Evaluation".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
