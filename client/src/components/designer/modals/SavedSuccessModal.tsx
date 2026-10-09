import React from 'react';
import {
  CheckCircle2,
  HardDrive,
  FileText,
  Printer,
  Folder,
  Check,
} from 'lucide-react';

export interface SavedSuccessModalProps {
  savedPopupInfo: {
    isOpen: boolean;
    title: string;
    examCode: string;
    className: string;
    subjectName: string;
    questionCount: number;
    totalMarks: number;
    storagePath: string;
  } | null;
  onClose: () => void;
  onExportWord: () => void;
  onPrintPaper: () => void;
  onOpenPaperBank: () => void;
}

export const SavedSuccessModal: React.FC<SavedSuccessModalProps> = ({
  savedPopupInfo,
  onClose,
  onExportWord,
  onPrintPaper,
  onOpenPaperBank,
}) => {
  if (!savedPopupInfo || !savedPopupInfo.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
      <div className="bg-white border border-[#D1D5DB] rounded-lg w-full max-w-lg p-6 shadow-classic-md space-y-5">
        {/* Header with success check */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-md bg-[#DCFCE7] text-[#166534] flex items-center justify-center border border-[#BBF7D0]">
              <CheckCircle2 className="w-6 h-6 text-[#166534]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827] flex items-center space-x-2">
                <span>Paper Saved Successfully!</span>
                <span className="text-xs px-2 py-0.5 bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] rounded font-mono font-bold">
                  SYNCED
                </span>
              </h2>
              <p className="text-xs text-[#4B5563]">
                Your generated question paper is stored in physical storage &amp; database.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#111827] text-lg font-bold p-1 rounded hover:bg-[#F3F4F6] transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Paper Summary Card */}
        <div className="bg-[#F9FAFB] rounded-md p-4 border border-[#E5E7EB] space-y-3">
          <div>
            <div className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">Paper Title:</div>
            <div className="text-sm font-bold text-[#0B1F3A] leading-snug">
              {savedPopupInfo.title}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
            <div className="bg-white p-2.5 rounded-md border border-[#D1D5DB]">
              <div className="text-xs font-semibold text-[#6B7280]">Exam Code:</div>
              <div className="font-mono font-bold text-[#111827] text-xs">{savedPopupInfo.examCode}</div>
            </div>
            <div className="bg-white p-2.5 rounded-md border border-[#D1D5DB]">
              <div className="text-xs font-semibold text-[#6B7280]">Class &amp; Subject:</div>
              <div className="font-semibold text-[#111827] text-xs truncate">
                {savedPopupInfo.className} &gt; {savedPopupInfo.subjectName}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-md border border-[#D1D5DB]">
              <div className="text-xs font-semibold text-[#6B7280]">Questions:</div>
              <div className="font-bold text-[#166534] text-xs">
                {savedPopupInfo.questionCount} Questions
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-md border border-[#D1D5DB]">
              <div className="text-xs font-semibold text-[#6B7280]">Max Marks:</div>
              <div className="font-mono font-bold text-[#111827] text-xs">
                {savedPopupInfo.totalMarks} Marks
              </div>
            </div>
          </div>

          {/* Physical Storage Destination Card */}
          <div className="pt-2 border-t border-[#E5E7EB] space-y-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#111827]">
              <HardDrive className="w-3.5 h-3.5 text-[#0B1F3A]" />
              <span>Physical Storage Directory:</span>
            </div>
            <div className="font-mono text-xs text-[#0B1F3A] bg-white px-3 py-2 rounded-md border border-[#D1D5DB] break-all select-all font-semibold">
              {savedPopupInfo.storagePath}
            </div>
            <div className="flex items-center space-x-2 pt-0.5 text-xs">
              <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-mono">
                ✓ Word .doc
              </span>
              <span className="px-2 py-0.5 rounded bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] font-mono">
                ✓ Excel .csv
              </span>
              <span className="px-2 py-0.5 rounded bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-mono">
                ✓ Backup .json
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                onExportWord();
                onClose();
              }}
              className="classic-button classic-button-primary !py-1.5 !px-3 !text-xs"
              title="Download editable Microsoft Word document"
            >
              <FileText className="w-3.5 h-3.5 text-white" />
              <span>Download Word (.doc)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onPrintPaper();
                onClose();
              }}
              className="classic-button classic-button-secondary !py-1.5 !px-3 !text-xs"
              title="Print paper or save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#0B1F3A]" />
              <span>Print / PDF</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onOpenPaperBank}
              className="classic-button classic-button-secondary !py-1.5 !px-3 !text-xs"
            >
              <Folder className="w-3.5 h-3.5 text-[#0B1F3A]" />
              <span>Paper Bank</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="classic-button !bg-[#166534] hover:!bg-[#14532D] !text-white !py-1.5 !px-4 !text-xs"
            >
              <Check className="w-4 h-4 text-white" />
              <span>OK, Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
