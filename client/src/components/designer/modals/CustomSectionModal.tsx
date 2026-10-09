import React from 'react';
import { Type, FileText, User, Hash } from 'lucide-react';

export interface CustomSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldModalType: 'section' | 'note' | 'candidate' | 'header';
  fieldModalLabel: string;
  setFieldModalLabel: (v: string) => void;
  fieldModalValue: string;
  setFieldModalValue: (v: string) => void;
  fieldModalInsertIdx: number | null;
  subjectName?: string;
  className?: string;
  examDate?: string;
  onAddSection: (title: string, subtitle: string, idx?: number) => void;
  onAddNote: (text: string, idx?: number) => void;
  onAddCandidateField: (label: string, value: string) => void;
  onAddHeaderField: (label: string, value: string) => void;
}

export const CustomSectionModal: React.FC<CustomSectionModalProps> = ({
  isOpen,
  onClose,
  fieldModalType,
  fieldModalLabel,
  setFieldModalLabel,
  fieldModalValue,
  setFieldModalValue,
  fieldModalInsertIdx,
  subjectName,
  className,
  examDate,
  onAddSection,
  onAddNote,
  onAddCandidateField,
  onAddHeaderField,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white border border-classic-border rounded-classic w-full max-w-lg p-6 shadow-2xl space-y-4 animate-fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-classic-border">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-classic bg-classic-surface-muted text-classic-navy flex items-center justify-center border border-classic-border">
              {fieldModalType === 'section' ? (
                <Type className="w-5 h-5 text-classic-navy" />
              ) : fieldModalType === 'note' ? (
                <FileText className="w-5 h-5 text-classic-navy" />
              ) : fieldModalType === 'candidate' ? (
                <User className="w-5 h-5 text-classic-navy" />
              ) : (
                <Hash className="w-5 h-5 text-classic-navy" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-classic-navy">
                {fieldModalType === 'section'
                  ? 'Add Section Heading'
                  : fieldModalType === 'note'
                  ? 'Add Note or Notice Block'
                  : fieldModalType === 'candidate'
                  ? 'Add Candidate Detail Field'
                  : 'Add Header Metadata Field'}
              </h2>
              <p className="text-xs text-classic-text-muted">
                {fieldModalType === 'section'
                  ? 'Create section banners like SECTION A, SECTION B'
                  : fieldModalType === 'note'
                  ? 'Add general instructions or exam rules'
                  : fieldModalType === 'candidate'
                  ? "Add fields like Father's Name, Center Code, Signature"
                  : 'Add metadata badges like Subject, Class, Date, Room No'}
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

        {/* Quick Presets Bar */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-classic-text-secondary uppercase tracking-wider">
            Quick Presets (Click to Auto-Fill):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {fieldModalType === 'header' && (
              <>
                {[
                  { l: 'SUBJECT', v: subjectName || 'Physics' },
                  { l: 'CLASS', v: className || 'Class 12' },
                  { l: 'DATE', v: examDate || '2026-09-18' },
                  { l: 'ROOM NO', v: 'Hall 4' },
                  { l: 'SET', v: 'Set A' },
                  { l: 'STREAM', v: 'Science' },
                ].map((p) => (
                  <button
                    key={p.l}
                    type="button"
                    onClick={() => {
                      setFieldModalLabel(p.l);
                      setFieldModalValue(p.v);
                    }}
                    className="px-2 py-1 bg-white hover:bg-classic-surface-muted text-classic-navy text-xs font-mono rounded-classic transition-colors border border-classic-border shadow-sm"
                  >
                    {p.l}: {p.v}
                  </button>
                ))}
              </>
            )}

            {fieldModalType === 'section' && (
              <>
                {[
                  { l: 'SECTION A', v: 'MULTIPLE CHOICE QUESTIONS (1 Mark Each)' },
                  { l: 'SECTION B', v: 'SHORT ANSWER QUESTIONS (2 Marks Each)' },
                  { l: 'SECTION C', v: 'LONG ANSWER QUESTIONS (3 Marks Each)' },
                  { l: 'SECTION D', v: 'CASE STUDY & NUMERICALS (5 Marks Each)' },
                ].map((p) => (
                  <button
                    key={p.l}
                    type="button"
                    onClick={() => {
                      setFieldModalLabel(p.l);
                      setFieldModalValue(p.v);
                    }}
                    className="px-2 py-1 bg-white hover:bg-classic-surface-muted text-classic-navy text-xs rounded-classic transition-colors border border-classic-border shadow-sm font-medium"
                  >
                    {p.l}
                  </button>
                ))}
              </>
            )}

            {fieldModalType === 'candidate' && (
              <>
                {[
                  { l: "Father's Name", v: '________________________' },
                  { l: 'Center Code', v: '__________' },
                  { l: 'Invigilator Signature', v: '________________' },
                  { l: 'Student ID', v: '____________' },
                  { l: 'Date of Birth', v: 'DD / MM / YYYY' },
                ].map((p) => (
                  <button
                    key={p.l}
                    type="button"
                    onClick={() => {
                      setFieldModalLabel(p.l);
                      setFieldModalValue(p.v);
                    }}
                    className="px-2 py-1 bg-white hover:bg-classic-surface-muted text-classic-navy text-xs rounded-classic transition-colors border border-classic-border shadow-sm font-medium"
                  >
                    {p.l}
                  </button>
                ))}
              </>
            )}

            {fieldModalType === 'note' && (
              <>
                {[
                  'Use of logarithm tables is permitted.',
                  'Electronic calculators are strictly prohibited.',
                  'All rough work must be shown clearly in the margin.',
                  'Draw neat and labeled diagrams wherever necessary.',
                ].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setFieldModalValue(p);
                    }}
                    className="px-2 py-1 bg-white hover:bg-classic-surface-muted text-classic-text text-xs rounded-classic transition-colors border border-classic-border shadow-sm text-left truncate max-w-full font-medium"
                  >
                    {p}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Form Inputs */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (fieldModalType === 'section') {
              onAddSection(fieldModalLabel, fieldModalValue, fieldModalInsertIdx ?? undefined);
            } else if (fieldModalType === 'note') {
              onAddNote(fieldModalValue || fieldModalLabel, fieldModalInsertIdx ?? undefined);
            } else if (fieldModalType === 'candidate') {
              onAddCandidateField(fieldModalLabel, fieldModalValue || '________________________');
            } else {
              onAddHeaderField(fieldModalLabel, fieldModalValue);
            }
            onClose();
          }}
          className="space-y-4 pt-1"
        >
          {fieldModalType !== 'note' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-classic-text mb-1">
                  {fieldModalType === 'section' ? 'Section Title' : 'Field Label / Name'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fieldModalLabel}
                  onChange={(e) => setFieldModalLabel(e.target.value)}
                  placeholder={
                    fieldModalType === 'section'
                      ? 'e.g., SECTION A'
                      : fieldModalType === 'candidate'
                      ? "e.g., Father's Name"
                      : 'e.g., SUBJECT'
                  }
                  className="w-full classic-input rounded-classic px-3.5 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-classic-text mb-1">
                  {fieldModalType === 'section'
                    ? 'Section Subtitle / Description (Optional)'
                    : fieldModalType === 'candidate'
                    ? 'Underline / Blank Space'
                    : 'Field Value'}
                </label>
                <input
                  type="text"
                  value={fieldModalValue}
                  onChange={(e) => setFieldModalValue(e.target.value)}
                  placeholder={
                    fieldModalType === 'section'
                      ? 'e.g., Multiple Choice Questions (1 Mark Each)'
                      : fieldModalType === 'candidate'
                      ? '________________________'
                      : 'e.g., Physics'
                  }
                  className="w-full classic-input rounded-classic px-3.5 py-2 text-xs font-medium"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-classic-text mb-1">
                Instructions / Note Text <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={fieldModalValue}
                onChange={(e) => setFieldModalValue(e.target.value)}
                placeholder="Enter instructions, notice, or note text for the exam paper..."
                className="w-full classic-input rounded-classic p-3 text-xs leading-relaxed"
              />
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="classic-button-secondary rounded-classic px-4 py-2 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="classic-button-primary rounded-classic px-5 py-2.5 text-xs font-bold shadow-classic flex items-center space-x-1.5"
            >
              <span>
                {fieldModalType === 'section'
                  ? 'Add Section'
                  : fieldModalType === 'note'
                  ? 'Add Note'
                  : fieldModalType === 'candidate'
                  ? 'Add Candidate Field'
                  : 'Add Header Field'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
