import React, { useRef } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { MathRenderer } from '../../common/MathRenderer';

export interface EditQuestionCanvasModalProps {
  editingQuestionIndex: number | null;
  editQForm: any;
  setEditQForm: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  onSave: () => void;
  onUploadDiagram: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EditQuestionCanvasModal: React.FC<EditQuestionCanvasModalProps> = ({
  editingQuestionIndex,
  editQForm,
  setEditQForm,
  onClose,
  onSave,
  onUploadDiagram,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (editingQuestionIndex === null || !editQForm) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white border border-classic-border rounded-classic w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-classic-border shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-classic bg-classic-navy text-white flex items-center justify-center font-mono font-bold text-sm shadow-classic">
              Q{editingQuestionIndex + 1}
            </div>
            <div>
              <h2 className="text-base font-bold text-classic-navy">Edit Question Details &amp; Images</h2>
              <p className="text-xs text-classic-text-muted">Modify question text, formula/LaTeX, options, marks &amp; diagrams</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-classic-text-muted hover:text-classic-navy text-lg font-bold p-1 rounded-classic hover:bg-classic-surface-muted transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Question Text */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-classic-text-secondary">
              Question Text / Statement (Supports LaTeX math)
            </label>
            <textarea
              rows={4}
              value={editQForm.questionText}
              onChange={(e) => setEditQForm({ ...editQForm, questionText: e.target.value })}
              placeholder="Enter question text or mathematical equation e.g. Calculate the value of $\int_0^\pi \sin(x) dx$"
              className="w-full classic-input rounded-classic p-3 text-xs font-mono leading-relaxed"
            />
            {/* Live Math Preview */}
            {editQForm.questionText && (
              <div className="p-3 bg-classic-surface-muted rounded-classic border border-classic-border text-xs text-classic-text">
                <span className="text-xs uppercase font-bold text-classic-navy block mb-1">Live Equation Preview:</span>
                <MathRenderer content={editQForm.questionText} />
              </div>
            )}
          </div>

          {/* Marks, Negative Marks & Difficulty Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-classic-text mb-1">
                Marks <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={editQForm.marks}
                onChange={(e) => setEditQForm({ ...editQForm, marks: Number(e.target.value) })}
                className="w-full classic-input rounded-classic px-3 py-2 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-classic-text mb-1">Negative Marks</label>
              <input
                type="number"
                step="0.25"
                value={editQForm.negativeMarks}
                onChange={(e) => setEditQForm({ ...editQForm, negativeMarks: Number(e.target.value) })}
                className="w-full classic-input rounded-classic px-3 py-2 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-classic-text mb-1">Difficulty</label>
              <select
                value={editQForm.difficulty}
                onChange={(e) => setEditQForm({ ...editQForm, difficulty: e.target.value })}
                className="w-full classic-input rounded-classic px-3 py-2 text-xs font-medium"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
          </div>

          {/* Attached Diagrams Section with Delete & Add */}
          <div className="space-y-2 pt-2 border-t border-classic-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-classic-text-secondary">
                Attached Question Figures / Diagrams ({editQForm.diagrams?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="classic-button-secondary rounded-classic px-2.5 py-1 text-xs font-medium flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Attach Image</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onUploadDiagram}
                accept="image/*"
                className="hidden"
              />
            </div>

            {(!editQForm.diagrams || editQForm.diagrams.length === 0) ? (
              <p className="text-xs text-classic-text-muted italic">No diagrams attached to this question.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {editQForm.diagrams.map((diag: any, dIdx: number) => (
                  <div key={dIdx} className="relative group bg-classic-surface-muted p-2 rounded-classic border border-classic-border flex flex-col items-center">
                    <img
                      src={diag.relative_url}
                      alt={`Diagram ${dIdx + 1}`}
                      className="h-20 object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditQForm({
                          ...editQForm,
                          diagrams: editQForm.diagrams.filter((_: any, i: number) => i !== dIdx),
                        });
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-classic shadow"
                      title="Delete this diagram image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MCQ Options */}
          <div className="space-y-3 pt-2 border-t border-classic-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-classic-text-secondary">
                Options ({editQForm.options?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => {
                  const opts = editQForm.options || [];
                  const nextKey = String.fromCharCode(65 + opts.length);
                  setEditQForm({
                    ...editQForm,
                    options: [...opts, { key: nextKey, text: '' }],
                  });
                }}
                className="text-xs text-classic-navy hover:underline font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Option</span>
              </button>
            </div>

            <div className="space-y-2">
              {(editQForm.options || []).map((opt: any, oIdx: number) => (
                <div key={oIdx} className="flex items-center space-x-2 bg-classic-surface-muted p-2 rounded-classic border border-classic-border">
                  <span className="w-6 h-6 rounded-classic bg-classic-navy text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {opt.key}
                  </span>
                  <input
                    type="text"
                    value={opt.text || ''}
                    onChange={(e) => {
                      const updatedOpts = [...editQForm.options];
                      updatedOpts[oIdx] = { ...updatedOpts[oIdx], text: e.target.value };
                      setEditQForm({ ...editQForm, options: updatedOpts });
                    }}
                    placeholder={`Option ${opt.key} text`}
                    className="flex-1 bg-transparent border-0 text-xs text-classic-text placeholder-classic-text-muted focus:outline-none"
                  />
                  {opt.imageUrl && (
                    <div className="relative inline-flex items-center bg-white px-2 py-1 rounded-classic border border-classic-border">
                      <img src={opt.imageUrl} alt={`Opt ${opt.key}`} className="h-6 object-contain mr-1" />
                      <button
                        type="button"
                        onClick={() => {
                          const updatedOpts = [...editQForm.options];
                          updatedOpts[oIdx] = { ...updatedOpts[oIdx], imageUrl: null };
                          setEditQForm({ ...editQForm, options: updatedOpts });
                        }}
                        className="text-rose-600 hover:text-rose-800"
                        title="Delete option image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditQForm({
                        ...editQForm,
                        options: editQForm.options.filter((_: any, i: number) => i !== oIdx),
                      });
                    }}
                    className="p-1 text-classic-text-muted hover:text-rose-600"
                    title="Remove this option"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Correct Answer & Explanation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-classic-border">
            <div>
              <label className="block text-xs font-semibold text-classic-text mb-1">Correct Answer</label>
              <select
                value={editQForm.correctAnswer || ''}
                onChange={(e) => setEditQForm({ ...editQForm, correctAnswer: e.target.value })}
                className="w-full classic-input rounded-classic px-3 py-2 text-xs font-medium"
              >
                <option value="">None / Not Specified</option>
                {(editQForm.options || []).map((o: any) => (
                  <option key={o.key} value={o.key}>
                    Option ({o.key})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-classic-text mb-1">Explanation / Solution</label>
              <input
                type="text"
                value={editQForm.explanation || ''}
                onChange={(e) => setEditQForm({ ...editQForm, explanation: e.target.value })}
                placeholder="Brief explanation for the answer"
                className="w-full classic-input rounded-classic px-3 py-2 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-classic-border shrink-0 bg-classic-surface-muted">
          <button
            type="button"
            onClick={onClose}
            className="classic-button-secondary rounded-classic px-4 py-2 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="classic-button-primary rounded-classic px-5 py-2.5 text-xs font-bold shadow-classic flex items-center space-x-1.5 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>💾 Save &amp; Update Question on Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
