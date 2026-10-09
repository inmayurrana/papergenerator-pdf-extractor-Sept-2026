import React from 'react';
import {
  FolderTree,
  X,
  Search,
  Plus,
  FileSpreadsheet,
  Edit3,
  Trash2,
} from 'lucide-react';

export interface OpenSavedPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  papers: any[];
  activePaper: any;
  savedPaperSearchQuery: string;
  setSavedPaperSearchQuery: (v: string) => void;
  savedPaperClassFilter: string;
  setSavedPaperClassFilter: (v: string) => void;
  onStartNewPaper: () => void;
  onOpenPaper: (paper: any) => void;
  onDeletePaper: (e: React.MouseEvent, id: string, title: string) => void;
}

export const OpenSavedPaperModal: React.FC<OpenSavedPaperModalProps> = ({
  isOpen,
  onClose,
  papers,
  activePaper,
  savedPaperSearchQuery,
  setSavedPaperSearchQuery,
  savedPaperClassFilter,
  setSavedPaperClassFilter,
  onStartNewPaper,
  onOpenPaper,
  onDeletePaper,
}) => {
  if (!isOpen) return null;

  const filtered = papers.filter((p: any) => {
    let cls = 'Unknown';
    try {
      cls = JSON.parse(p.canvasLayoutJson || '{}').settings?.className || 'Unknown';
    } catch {}
    const q = savedPaperSearchQuery.toLowerCase();
    const matchSearch =
      !q ||
      (p.title || '').toLowerCase().includes(q) ||
      (p.examCode || '').toLowerCase().includes(q) ||
      cls.toLowerCase().includes(q) ||
      (p.subjectName || '').toLowerCase().includes(q);
    const matchClass = savedPaperClassFilter === 'ALL' || cls === savedPaperClassFilter;
    return matchSearch && matchClass;
  });

  const availableClasses = Array.from(
    new Set(
      papers.map((p: any) => {
        try {
          return JSON.parse(p.canvasLayoutJson || '{}').settings?.className || 'Unknown';
        } catch {
          return 'Unknown';
        }
      })
    )
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#D1D5DB] rounded-lg w-full max-w-2xl shadow-classic-md flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-[#EFF6FF] text-[#0B1F3A] flex items-center justify-center border border-[#BFDBFE]">
              <FolderTree className="w-5 h-5 text-[#0B1F3A]" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#111827]">Open Saved Paper</h2>
              <p className="text-xs text-[#6B7280]">Browse and open a previously saved question paper</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center space-x-2 px-6 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={savedPaperSearchQuery}
              onChange={(e) => setSavedPaperSearchQuery(e.target.value)}
              placeholder="Search papers by title, exam code, subject..."
              className="w-full bg-white border border-[#D1D5DB] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#111827] placeholder-[#6B7280] focus:outline-none focus:border-[#0B1F3A] transition-colors"
            />
          </div>
          <select
            value={savedPaperClassFilter}
            onChange={(e) => setSavedPaperClassFilter(e.target.value)}
            className="bg-white border border-[#D1D5DB] rounded-md px-2.5 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
          >
            <option value="ALL">All Classes</option>
            {availableClasses.map((cls: any) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onStartNewPaper}
            className="classic-button classic-button-primary !py-1.5 !px-3 !text-xs"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>New Paper</span>
          </button>
        </div>

        {/* Papers List */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {papers.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280] text-sm">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-40 text-[#6B7280]" />
              <p>No saved papers found.</p>
              <p className="text-xs mt-1">Create your first paper to see it here.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-[#6B7280] text-xs">
              <p>No papers match your search.</p>
            </div>
          ) : (
            filtered.map((p: any) => {
              let settings: any = {};
              let questionCount = 0;
              try {
                const layout = JSON.parse(p.canvasLayoutJson || '{}');
                settings = layout.settings || {};
                questionCount = (layout.questions || []).filter(
                  (q: any) => q.type !== 'section' && q.type !== 'note' && q.type !== 'space'
                ).length;
              } catch {}
              const isActive = activePaper?.id === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => onOpenPaper(p)}
                  className={`cursor-pointer group p-4 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-[#EFF6FF] border-[#93C5FD] ring-1 ring-[#3B82F6]'
                      : 'bg-white border-[#D1D5DB] hover:border-[#9CA3AF] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm truncate text-[#111827]">
                          {p.title}
                        </h4>
                        <span className="font-mono text-xs text-[#0B1F3A] bg-[#F3F4F6] border border-[#D1D5DB] px-1.5 py-0.5 rounded shrink-0 font-semibold">
                          {p.examCode}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                          p.status === 'FINALIZED'
                            ? 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                            : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                        }`}>
                          {p.status === 'FINALIZED' ? '✓ Finalized' : 'Draft'}
                        </span>
                        {isActive && (
                          <span className="text-xs px-1.5 py-0.5 bg-[#DBEAFE] text-[#1D4ED8] border border-[#93C5FD] rounded font-bold">
                            Currently Open
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-[#6B7280]">
                        <span>📁 {settings.className || 'Unknown'} › {settings.subjectName || p.subjectName || 'Unknown'}</span>
                        <span>•</span>
                        <span>{questionCount} Questions</span>
                        <span>•</span>
                        <span>{p.maxMarks || 0} Max Marks</span>
                        {p.updatedAt && (
                          <>
                            <span>•</span>
                            <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPaper(p);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center space-x-1 transition-all ${
                          isActive
                            ? 'classic-button classic-button-primary'
                            : 'classic-button classic-button-secondary'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isActive ? 'Editing' : 'Open'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => onDeletePaper(e, p.id, p.title)}
                        className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                        title="Delete this paper permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between text-xs">
          <span className="text-[#6B7280]">
            {papers.length} paper{papers.length !== 1 ? 's' : ''} in Paper Bank
          </span>
          <button
            type="button"
            onClick={onClose}
            className="classic-button classic-button-secondary !py-1 !px-4 !text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
