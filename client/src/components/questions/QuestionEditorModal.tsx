import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Sparkles, AlertTriangle, Image as ImageIcon, UploadCloud, Check, Clipboard, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api';
import { MathRenderer } from '../common/MathRenderer';
import { ResizableImage } from '../common/ResizableImage';

export interface QuestionOptionItem {
  key: string;
  text: string;
  imageUrl?: string;
}

export interface QuestionDiagramItem {
  relative_url: string;
  label?: string;
  width?: number;
  height?: number;
}

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onUpdateInMemory?: (updatedQuestion: any) => void;
  onDeleteQuestion?: (questionIdOrNumber: any) => void;
  question?: any | null;
  folderId?: string | null;
  folders: any[];
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onUpdateInMemory,
  onDeleteQuestion,
  question,
  folderId,
  folders,
}) => {
  const [qText, setQText] = useState('');
  const [qNumber, setQNumber] = useState('1');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState<QuestionOptionItem[]>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ]);
  const [diagrams, setDiagrams] = useState<QuestionDiagramItem[]>([]);
  const [isRestricted, setIsRestricted] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRef = useRef<HTMLInputElement>(null);
  const [targetOptionIdx, setTargetOptionIdx] = useState<number | null>(null);

  useEffect(() => {
    if (question) {
      setQText(question.questionText || question.question_text || '');
      setQNumber(String(question.questionNumber || question.question_number || '1'));
      setSelectedFolder(question.folderId || folderId || '');
      setMarks(question.marks || 1);
      setNegativeMarks(question.negativeMarks || question.negative_marks || 0);
      setDifficulty(question.difficulty || 'MEDIUM');
      setCorrectAnswer(question.correctAnswer || question.correct_answer || '');
      setExplanation(question.explanation || '');
      setIsRestricted(question.isRestricted || false);

      try {
        const parsedOpts =
          typeof question.optionsJson === 'string'
            ? JSON.parse(question.optionsJson)
            : question.options || [];
        setOptions(
          parsedOpts.length > 0
            ? parsedOpts
            : [
                { key: 'A', text: '' },
                { key: 'B', text: '' },
                { key: 'C', text: '' },
                { key: 'D', text: '' },
              ]
        );
      } catch {
        setOptions([
          { key: 'A', text: '' },
          { key: 'B', text: '' },
          { key: 'C', text: '' },
          { key: 'D', text: '' },
        ]);
      }

      try {
        const parsedDiags =
          typeof question.diagramsJson === 'string'
            ? JSON.parse(question.diagramsJson)
            : question.diagrams || [];
        setDiagrams(parsedDiags);
      } catch {
        setDiagrams([]);
      }
    } else {
      setQText('');
      setQNumber('1');
      setSelectedFolder(folderId || '');
      setMarks(1);
      setNegativeMarks(0);
      setDifficulty('MEDIUM');
      setCorrectAnswer('');
      setExplanation('');
      setIsRestricted(false);
      setOptions([
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' },
      ]);
      setDiagrams([]);
    }
  }, [question, folderId, isOpen]);

  // Live duplicate question detection
  useEffect(() => {
    if (!isOpen || qText.length < 15) {
      setDuplicateWarning([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const res = await api.post('/questions/check-duplicate', { questionText: qText });
        const filtered = (res.data.duplicates || []).filter((d: any) => d.id !== question?.id);
        setDuplicateWarning(filtered);
      } catch {
        // Ignore duplicate check error
      } finally {
        setCheckingDuplicates(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [qText, isOpen, question]);

  if (!isOpen) return null;

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index].text = val;
    setOptions(updated);
  };

  const handleAddOption = () => {
    const nextKey = String.fromCharCode(65 + options.length); // E, F...
    setOptions([...options, { key: nextKey, text: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  // Question Image Upload Handler
  const handleUploadQuestionImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      const res = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDiagrams((prev) => [...prev, { relative_url: res.data.url, label: file.name }]);
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Option Image Upload Handler
  const handleUploadOptionImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || targetOptionIdx === null) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      const res = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = [...options];
      updated[targetOptionIdx].imageUrl = res.data.url;
      setOptions(updated);
    } catch (err: any) {
      alert(`Option image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
      setTargetOptionIdx(null);
      if (optionFileInputRef.current) optionFileInputRef.current.value = '';
    }
  };

  const handleRemoveOptionImage = (idx: number) => {
    const updated = [...options];
    delete updated[idx].imageUrl;
    setOptions(updated);
  };

  const handleRemoveDiagram = (idx: number) => {
    setDiagrams(diagrams.filter((_, i) => i !== idx));
  };

  // Move image between Question Body and Options (or between Options)
  const handleMoveImageInEditor = (fromLocation: string, fromIndex: number, toLocation: string) => {
    if (fromLocation === toLocation) return;
    let imgUrl = '';
    let updatedDiags = [...diagrams];
    let updatedOpts = [...options];

    if (fromLocation === 'BODY') {
      if (fromIndex >= 0 && fromIndex < updatedDiags.length) {
        const item = updatedDiags[fromIndex];
        imgUrl = typeof item === 'string' ? item : item.relative_url || '';
        updatedDiags.splice(fromIndex, 1);
      }
    } else {
      const optIdx = updatedOpts.findIndex((o) => o.key === fromLocation);
      if (optIdx !== -1) {
        imgUrl = updatedOpts[optIdx].imageUrl || '';
        delete updatedOpts[optIdx].imageUrl;
      }
    }

    if (!imgUrl) return;

    if (toLocation === 'BODY') {
      updatedDiags.push({ relative_url: imgUrl, label: 'Moved Figure' });
    } else {
      const targetOptIdx = updatedOpts.findIndex((o) => o.key === toLocation);
      if (targetOptIdx !== -1) {
        updatedOpts[targetOptIdx].imageUrl = imgUrl;
      }
    }

    setDiagrams(updatedDiags);
    setOptions(updatedOpts);
  };

  const handleInsertFormula = (latexSample: string) => {
    setQText((prev) => `${prev} $${latexSample}$`);
  };

  const handleSave = async () => {
    if (!qText.trim()) {
      alert('Question text cannot be empty');
      return;
    }

    const payload = {
      folderId: selectedFolder || null,
      questionNumber: qNumber,
      question_number: qNumber,
      questionText: qText,
      question_text: qText,
      options: options.filter((o) => o.text.trim().length > 0 || o.imageUrl),
      diagrams,
      correctAnswer,
      correct_answer: correctAnswer,
      explanation,
      marks: parseInt(marks.toString(), 10) || 1,
      negativeMarks: parseFloat(negativeMarks.toString()) || 0,
      negative_marks: parseFloat(negativeMarks.toString()) || 0,
      difficulty,
      isRestricted,
    };

    // If caller provided in-memory update handler (e.g. from Review page)
    if (onUpdateInMemory) {
      onUpdateInMemory({ ...question, ...payload });
      onClose();
      return;
    }

    try {
      if (question?.id) {
        await api.put(`/questions/${question.id}`, payload);
      } else {
        await api.post('/questions', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    if (onDeleteQuestion) {
      onDeleteQuestion(question?.id || question?.question_number || question?.questionNumber);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-6 shadow-2xl border border-[#D1D5DB] my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              {question ? `Edit Question Q${qNumber}` : 'Create New Structured Question'}
            </h2>
            <p className="text-xs text-[#6B7280]">
              KaTeX LaTeX formulas, chemistry notation, option images, and diagram figures
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#6B7280] hover:text-[#111827] rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Warning Alert if detected */}
        {duplicateWarning.length > 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Potential Duplicate Question Detected ({duplicateWarning[0].similarity}% match)</span>
            </div>
            <div className="text-xs text-slate-300 pl-6">
              {duplicateWarning[0].questionText}
            </div>
          </div>
        )}

        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-2">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Folder Taxonomy</label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
              >
                <option value="">Root / Unassigned</option>
                {folders.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Question Number</label>
              <input
                type="text"
                value={qNumber}
                onChange={(e) => setQNumber(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Marks</label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(parseInt(e.target.value, 10))}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                min={1}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          {/* Quick LaTeX Formula Inserter */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
            <span className="text-[11px] text-slate-400 mr-2 font-medium">Quick Formula:</span>
            <button
              type="button"
              onClick={() => handleInsertFormula('\\frac{a}{b}')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-indigo-300 font-mono text-[11px]"
            >
              \frac&#123;a&#125;&#123;b&#125;
            </button>
            <button
              type="button"
              onClick={() => handleInsertFormula('\\sqrt{x}')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-indigo-300 font-mono text-[11px]"
            >
              \sqrt&#123;x&#125;
            </button>
            <button
              type="button"
              onClick={() => handleInsertFormula('x^{2}')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-indigo-300 font-mono text-[11px]"
            >
              x^2
            </button>
            <button
              type="button"
              onClick={() => handleInsertFormula('\\int_{a}^{b} f(x)dx')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-indigo-300 font-mono text-[11px]"
            >
              \int
            </button>
            <button
              type="button"
              onClick={() => handleInsertFormula('\\rightarrow')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-emerald-300 font-mono text-[11px]"
            >
              \rightarrow
            </button>
            <button
              type="button"
              onClick={() => handleInsertFormula('1.6 \\times 10^{-19}')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-mono text-[11px]"
            >
              1.6\times10^-19
            </button>
          </div>

          {/* Question Text Editor & Live Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">Question Body</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const clip = await navigator.clipboard.readText();
                      if (clip) {
                        setQText((prev) => (prev ? `${prev}\n${clip}` : clip));
                      }
                    } catch {
                      alert('Could not access clipboard. Please use Ctrl+V / Cmd+V directly.');
                    }
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-medium bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-colors"
                  title="Paste text from clipboard verbatim"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{uploadingImage ? 'Uploading...' : 'Attach Diagram'}</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadQuestionImage}
                className="hidden"
              />
            </div>

            <textarea
              rows={4}
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="w-full bg-white border border-[#D1D5DB] rounded-xl p-3 text-xs text-[#111827] placeholder-[#6B7280] font-mono focus:outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]/20"
              placeholder="Enter question text. Use $...$ for inline math or $$...$$ for block equations."
            />

            {/* Attached Question Diagrams List */}
            {diagrams.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-[#E5E7EB] space-y-2">
                <div className="text-[11px] font-semibold text-[#6B7280]">Attached Question Diagrams ({diagrams.length}):</div>
                <div className="flex flex-wrap gap-3">
                  {diagrams.map((d: any, dIdx) => {
                    const diagUrl = typeof d === 'string' ? d : d.relative_url || d.url || '';
                    return (
                      <div key={dIdx} className="p-2 rounded-xl bg-white border border-[#D1D5DB] space-y-1.5 shadow-xs">
                        <ResizableImage
                          src={diagUrl}
                          alt={`Question Diagram ${dIdx + 1}`}
                          initialWidth={d.width}
                          initialHeight={d.height || 90}
                          removable={true}
                          onRemove={() => handleRemoveDiagram(dIdx)}
                          onResizeEnd={(w, h) => {
                            const updated = [...diagrams];
                            updated[dIdx] = { ...updated[dIdx], width: w, height: h };
                            setDiagrams(updated);
                          }}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-[#6B7280] font-mono px-1 border-t border-[#E5E7EB] pt-1">
                          <span className="font-semibold text-[#111827]">Figure {dIdx + 1}</span>

                          {/* Destination Selector: Move to Question Body or Option */}
                          <div className="flex items-center space-x-1">
                            <span className="text-[9px] text-[#6B7280] font-mono">Dest:</span>
                            <select
                              value="BODY"
                              onChange={(e) => handleMoveImageInEditor('BODY', dIdx, e.target.value)}
                              className="bg-white border border-[#D1D5DB] text-[#111827] text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-[#0B1F3A] cursor-pointer"
                              title="Move this figure to an Option or keep in Question Body"
                            >
                              <option value="BODY">📌 Question Body</option>
                              {options.map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                  ➔ Option ({opt.key})
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveDiagram(dIdx)}
                            className="text-rose-600 hover:text-rose-800 hover:underline flex items-center space-x-0.5 ml-2 font-sans font-semibold"
                            title={`Delete Figure ${dIdx + 1}`}
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live KaTeX Preview Box */}
            {qText && (
              <div className="p-3 bg-slate-50 rounded-xl border border-[#E5E7EB] text-xs text-[#111827]">
                <div className="text-[10px] uppercase font-bold text-[#6B7280] mb-1">Live Formula Render:</div>
                <MathRenderer content={qText} />
              </div>
            )}
          </div>

          {/* MCQ Options Builder with Option Image Attachments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="block text-xs font-semibold text-[#374151]">
                  MCQ Options (With Image & Formula Support)
                </label>
                {correctAnswer && (
                  <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md text-[11px] font-bold">
                    <span>Key: Option {correctAnswer}</span>
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer('')}
                      className="text-rose-600 hover:text-rose-800 hover:underline flex items-center space-x-0.5 cursor-pointer ml-1"
                      title="Undo / Clear correct answer selection"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Undo</span>
                    </button>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddOption}
                className="text-xs text-[#0B1F3A] hover:underline flex items-center space-x-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            </div>

            {/* Hidden option file input */}
            <input
              ref={optionFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadOptionImage}
              className="hidden"
            />

            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-[#E5E7EB] space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-200 text-[#0B1F3A] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {opt.key}
                    </span>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option (${opt.key}) text or formula e.g. $\\sqrt{2}$`}
                      className="flex-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]/20"
                    />

                    {/* Paste clipboard text into option */}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const clip = await navigator.clipboard.readText();
                          if (clip) {
                            handleOptionChange(idx, clip);
                          }
                        } catch {}
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-[#111827] border border-[#D1D5DB] rounded-lg text-xs flex items-center space-x-1"
                      title={`Paste clipboard text into Option (${opt.key}) verbatim`}
                    >
                      <Clipboard className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] hidden sm:inline">Paste</span>
                    </button>

                    {/* Attach image to option button */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetOptionIdx(idx);
                        optionFileInputRef.current?.click();
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-[#111827] border border-[#D1D5DB] rounded-lg text-xs flex items-center space-x-1"
                      title={`Attach image to Option (${opt.key})`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#0B1F3A]" />
                      <span className="text-[11px] hidden sm:inline">Image</span>
                    </button>

                    {correctAnswer === opt.key ? (
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCorrectAnswer('')}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1 shadow-sm"
                          title="Currently marked as correct answer. Click to undo / unmark."
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCorrectAnswer('')}
                          className="px-2 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-colors flex items-center space-x-1"
                          title="Undo / Deselect this answer"
                        >
                          <RotateCcw className="w-3 h-3 text-rose-600" />
                          <span className="text-[11px]">Undo</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(opt.key)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 bg-slate-100 text-[#4B5563] hover:text-[#111827] hover:bg-slate-200 border border-[#D1D5DB]"
                        title={`Mark Option (${opt.key}) as correct`}
                      >
                        Mark Correct
                      </button>
                    )}

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1.5 text-[#6B7280] hover:text-rose-600"
                        title="Delete option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Attached Option Image with Mouse Resize Handle & Auto Save */}
                  {opt.imageUrl && (
                    <div className="flex items-center space-x-3 pl-9 pt-1">
                      <ResizableImage
                        src={opt.imageUrl}
                        alt={`Option (${opt.key}) Image`}
                        initialWidth={(opt as any).imageWidth}
                        initialHeight={(opt as any).imageHeight || 60}
                        minHeight={30}
                        maxHeight={250}
                        removable={true}
                        onRemove={() => handleRemoveOptionImage(idx)}
                        onResizeEnd={(w, h) => {
                          const updated = [...options];
                          (updated[idx] as any).imageWidth = w;
                          (updated[idx] as any).imageHeight = h;
                          setOptions(updated);
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-[#6B7280] font-mono">
                          Attached to Option ({opt.key})
                        </span>

                        {/* Destination Selector: Move from Option to Body or another Option */}
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] text-[#6B7280] font-mono">Dest:</span>
                          <select
                            value={opt.key}
                            onChange={(e) => handleMoveImageInEditor(opt.key, 0, e.target.value)}
                            className="bg-white border border-[#D1D5DB] text-[#111827] text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-[#0B1F3A] cursor-pointer"
                            title="Move this image to Question Body or another Option"
                          >
                            <option value={opt.key}>Option ({opt.key})</option>
                            <option value="BODY">➔ 📌 Question Body</option>
                            {options.filter((o) => o.key !== opt.key).map((o) => (
                              <option key={o.key} value={o.key}>
                                ➔ Option ({o.key})
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveOptionImage(idx)}
                          className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] rounded flex items-center space-x-1 transition-colors"
                          title={`Delete image from Option (${opt.key})`}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Explanation & Access Restriction */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#374151]">Explanation / Solution</label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const clip = await navigator.clipboard.readText();
                    if (clip) {
                      setExplanation((prev) => (prev ? `${prev}\n${clip}` : clip));
                    }
                  } catch {}
                }}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 font-medium"
                title="Paste clipboard text into explanation verbatim"
              >
                <Clipboard className="w-3 h-3" />
                <span>Paste Text</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full bg-white border border-[#D1D5DB] rounded-lg p-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
              placeholder="Step-by-step solution..."
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isRestricted"
              checked={isRestricted}
              onChange={(e) => setIsRestricted(e.target.checked)}
              className="rounded bg-white border-[#D1D5DB] text-[#0B1F3A] focus:ring-[#0B1F3A]"
            />
            <label htmlFor="isRestricted" className="text-xs text-[#374151] font-medium">
              Restrict Access (Confidential question - only permitted users can view)
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
          <div>
            {(question || onDeleteQuestion) && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Delete Question</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#F3F4F6] text-[#374151] border border-[#D1D5DB] rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-[#0B1F3A] hover:bg-[#16365F] text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4 text-white" />
              <span>{question ? 'Update Question' : 'Save Question'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
