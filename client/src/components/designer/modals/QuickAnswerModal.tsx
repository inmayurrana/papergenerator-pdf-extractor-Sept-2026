import React from 'react';
import { Award, Save } from 'lucide-react';
import { MathRenderer } from '../../common/MathRenderer';

export interface QuickAnswerModalProps {
  quickAnswerModalIdx: number | null;
  question: any;
  quickAnswerVal: string;
  setQuickAnswerVal: (v: string) => void;
  quickExplanationVal: string;
  setQuickExplanationVal: (v: string) => void;
  onClose: () => void;
  onSave: (idx: number, answer: string, explanation: string) => void;
}

export const QuickAnswerModal: React.FC<QuickAnswerModalProps> = ({
  quickAnswerModalIdx,
  question,
  quickAnswerVal,
  setQuickAnswerVal,
  quickExplanationVal,
  setQuickExplanationVal,
  onClose,
  onSave,
}) => {
  if (quickAnswerModalIdx === null || !question) return null;

  const opts = typeof question.optionsJson === 'string'
    ? JSON.parse(question.optionsJson)
    : question.options || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white border border-classic-border rounded-classic w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-classic-border">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-classic bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-classic-navy">
                Set Correct Answer for Q{quickAnswerModalIdx + 1}
              </h2>
              <p className="text-xs text-classic-text-muted">
                Saves to this question paper and updates the Question Bank
              </p>
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

        <div className="bg-classic-surface-muted p-3 rounded-classic border border-classic-border text-xs text-classic-text max-h-24 overflow-y-auto">
          <span className="font-bold text-classic-navy mr-1.5">Q{quickAnswerModalIdx + 1}.</span>
          <MathRenderer content={question.questionText || question.question_text || ''} />
        </div>

        {/* Quick Option Selector Buttons if MCQ options exist */}
        {opts.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-classic-text">Choose Option:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {opts.map((opt: any) => {
                const isSel = quickAnswerVal.trim().toUpperCase() === opt.key.toUpperCase();
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setQuickAnswerVal(opt.key)}
                    className={`p-2 rounded-classic text-xs font-bold font-mono flex items-center justify-center space-x-1.5 border transition-all ${
                      isSel
                        ? 'bg-classic-navy text-white border-classic-navy shadow-classic'
                        : 'bg-white hover:bg-classic-surface-muted text-classic-text-secondary border-classic-border'
                    }`}
                  >
                    <span>({opt.key})</span>
                    {opt.text && <span className="truncate max-w-[80px] font-sans font-normal text-xs">{opt.text}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Answer Input */}
        <div>
          <label className="block text-xs font-semibold text-classic-text mb-1">
            Correct Answer (Option Key or Text Value) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={quickAnswerVal}
            onChange={(e) => setQuickAnswerVal(e.target.value)}
            placeholder="e.g., A or B or 4.5 m/s"
            className="w-full classic-input rounded-classic px-3.5 py-2 text-xs font-mono font-bold"
          />
        </div>

        {/* Explanation / Step-by-Step Solution */}
        <div>
          <label className="block text-xs font-semibold text-classic-text mb-1">
            Step-by-Step Solution / Explanation (Optional)
          </label>
          <textarea
            rows={3}
            value={quickExplanationVal}
            onChange={(e) => setQuickExplanationVal(e.target.value)}
            placeholder="Enter detailed explanation, derivation or solution steps..."
            className="w-full classic-input rounded-classic p-3 text-xs resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="classic-button-secondary rounded-classic px-4 py-2 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(quickAnswerModalIdx, quickAnswerVal, quickExplanationVal)}
            disabled={!quickAnswerVal.trim()}
            className="classic-button-primary rounded-classic px-5 py-2.5 text-xs font-bold shadow-classic flex items-center space-x-1.5 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>💾 Save to Paper &amp; Question Bank</span>
          </button>
        </div>
      </div>
    </div>
  );
};
