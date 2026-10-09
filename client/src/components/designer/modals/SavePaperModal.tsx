import React from 'react';
import { HardDrive, Folder, Save } from 'lucide-react';

export interface SavePaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  saveModalTitle: string;
  setSaveModalTitle: (v: string) => void;
  saveModalExamCode: string;
  setSaveModalExamCode: (v: string) => void;
  saveModalClass: string;
  setSaveModalClass: (v: string) => void;
  saveModalSubject: string;
  setSaveModalSubject: (v: string) => void;
}

export const SavePaperModal: React.FC<SavePaperModalProps> = ({
  isOpen,
  onClose,
  onSave,
  saveModalTitle,
  setSaveModalTitle,
  saveModalExamCode,
  setSaveModalExamCode,
  saveModalClass,
  setSaveModalClass,
  saveModalSubject,
  setSaveModalSubject,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white border border-classic-border rounded-classic w-full max-w-xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-classic-border">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-classic bg-classic-surface-muted text-classic-navy border border-classic-border flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-classic-navy">Save Question Paper &amp; Storage Location</h2>
              <p className="text-xs text-classic-text-muted">Give your paper a title and assign physical storage folder</p>
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

        <form onSubmit={onSave} className="space-y-4">
          {/* Paper Title / Name */}
          <div>
            <label className="block text-xs font-semibold text-classic-text mb-1">
              Question Paper Title / Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={saveModalTitle}
              onChange={(e) => setSaveModalTitle(e.target.value)}
              placeholder="e.g., Class 12 Physics Pre-Board Examination 2026"
              className="w-full classic-input rounded-classic px-3.5 py-2 text-xs font-medium"
            />
          </div>

          {/* Exam Code */}
          <div>
            <label className="block text-xs font-semibold text-classic-text mb-1">
              Exam Code / Paper Identifier <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={saveModalExamCode}
              onChange={(e) => setSaveModalExamCode(e.target.value)}
              placeholder="e.g., PHY-12-2026"
              className="w-full classic-input rounded-classic px-3.5 py-2 text-xs font-mono font-medium"
            />
          </div>

          {/* Class & Subject Folders Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-classic-text mb-1">
                Class / Grade Folder <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={saveModalClass}
                onChange={(e) => setSaveModalClass(e.target.value)}
                placeholder="e.g., Class 12"
                className="w-full classic-input rounded-classic px-3 py-2 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-classic-text mb-1">
                Subject Subfolder <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={saveModalSubject}
                onChange={(e) => setSaveModalSubject(e.target.value)}
                placeholder="e.g., Physics"
                className="w-full classic-input rounded-classic px-3 py-2 text-xs font-medium"
              />
            </div>
          </div>

          {/* Physical Storage Preview Card */}
          <div className="bg-classic-surface-muted border border-classic-border rounded-classic p-3.5 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-classic-navy">
              <Folder className="w-3.5 h-3.5 text-classic-navy" />
              <span>Physical Storage Destination Preview:</span>
            </div>
            <div className="font-mono text-xs text-emerald-800 bg-white px-3 py-2 rounded-classic border border-classic-border break-all select-all font-semibold">
              data/Bank/Qpapers/{saveModalClass || '<Class>'}/{saveModalSubject || '<Subject>'}/
            </div>
            <div className="text-xs text-classic-text-secondary space-y-0.5 pl-1">
              <div>📄 <span className="text-classic-text font-mono font-medium">{(saveModalTitle || 'Paper').replace(/[^a-zA-Z0-9_-]/g, '_')}_{saveModalExamCode || 'CODE'}.json</span> (Database Snapshot)</div>
              <div>📝 <span className="text-classic-text font-mono font-medium">{(saveModalTitle || 'Paper').replace(/[^a-zA-Z0-9_-]/g, '_')}_{saveModalExamCode || 'CODE'}.doc</span> (Microsoft Word Document)</div>
              <div>📊 <span className="text-classic-text font-mono font-medium">{(saveModalTitle || 'Paper').replace(/[^a-zA-Z0-9_-]/g, '_')}_{saveModalExamCode || 'CODE'}.csv</span> (Excel Spreadsheet)</div>
            </div>
          </div>

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
              className="classic-button-primary rounded-classic px-5 py-2 text-xs font-bold shadow-classic flex items-center space-x-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>💾 Save Paper &amp; Store to Disk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
