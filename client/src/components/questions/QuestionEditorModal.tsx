import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Sparkles, AlertTriangle, Image as ImageIcon, UploadCloud, Check, Clipboard } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-3xl rounded-3xl p-6 space-y-6 shadow-2xl border border-slate-700 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">
              {question ? `Edit Question Q${qNumber}` : 'Create New Structured Question'}
            </h2>
            <p className="text-xs text-slate-400">
              KaTeX LaTeX formulas, chemistry notation, option images, and diagram figures
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Folder Taxonomy</label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Question Number</label>
              <input
                type="text"
                value={qNumber}
                onChange={(e) => setQNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Marks</label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                min={1}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
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
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
              placeholder="Enter question text. Use $...$ for inline math or $$...$$ for block equations."
            />

            {/* Attached Question Diagrams List */}
            {diagrams.length > 0 && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400">Attached Question Diagrams ({diagrams.length}):</div>
                <div className="flex flex-wrap gap-3">
                  {diagrams.map((d: any, dIdx) => {
                    const diagUrl = typeof d === 'string' ? d : d.relative_url || d.url || '';
                    return (
                      <div key={dIdx} className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 space-y-1.5">
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
                        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-400 font-mono px-1 border-t border-slate-800 pt-1">
                          <span className="font-semibold text-slate-300">Figure {dIdx + 1}</span>

                          {/* Destination Selector: Move to Question Body or Option */}
                          <div className="flex items-center space-x-1">
                            <span className="text-[9px] text-slate-500 font-mono">Dest:</span>
                            <select
                              value="BODY"
                              onChange={(e) => handleMoveImageInEditor('BODY', dIdx, e.target.value)}
                              className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                            className="text-rose-400 hover:text-rose-200 hover:underline flex items-center space-x-0.5 ml-2 font-sans font-semibold"
                            title={`Delete Figure ${dIdx + 1}`}
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
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
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Live Formula Render:</div>
                <MathRenderer content={qText} />
              </div>
            )}
          </div>

          {/* MCQ Options Builder with Option Image Attachments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                MCQ Options (With Image & Formula Support)
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
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
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {opt.key}
                    </span>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option (${opt.key}) text or formula e.g. $\\sqrt{2}$`}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
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
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg text-xs flex items-center space-x-1"
                      title={`Paste clipboard text into Option (${opt.key}) verbatim`}
                    >
                      <Clipboard className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] hidden sm:inline">Paste</span>
                    </button>

                    {/* Attach image to option button */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetOptionIdx(idx);
                        optionFileInputRef.current?.click();
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 rounded-lg text-xs flex items-center space-x-1"
                      title={`Attach image to Option (${opt.key})`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span className="text-[11px] hidden sm:inline">Image</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCorrectAnswer(opt.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                        correctAnswer === opt.key
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {correctAnswer === opt.key ? 'Correct' : 'Mark Correct'}
                    </button>

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400"
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
                        <span className="text-[11px] text-slate-400 font-mono">
                          Attached to Option ({opt.key})
                        </span>

                        {/* Destination Selector: Move from Option to Body or another Option */}
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] text-slate-500 font-mono">Dest:</span>
                          <select
                            value={opt.key}
                            onChange={(e) => handleMoveImageInEditor(opt.key, 0, e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                          className="px-2 py-0.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[11px] rounded flex items-center space-x-1 transition-colors"
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
              <label className="block text-xs font-semibold text-slate-300">Explanation / Solution</label>
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
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
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
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              placeholder="Step-by-step solution..."
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isRestricted"
              checked={isRestricted}
              onChange={(e) => setIsRestricted(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isRestricted" className="text-xs text-slate-300 font-medium">
              Restrict Access (Confidential question - only permitted users can view)
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div>
            {(question || onDeleteQuestion) && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Question</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{question ? 'Update Question' : 'Save Question'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
