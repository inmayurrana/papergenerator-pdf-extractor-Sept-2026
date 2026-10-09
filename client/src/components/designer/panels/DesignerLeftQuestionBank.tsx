import React from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  FolderTree,
  Search,
} from 'lucide-react';
import { MathRenderer } from '../../common/MathRenderer';

export interface DesignerLeftQuestionBankProps {
  showSidebarBank: boolean;
  setShowSidebarBank: (v: boolean) => void;
  viewMode: 'split' | 'editor' | 'preview';
  filteredSidebarQuestions: any[];
  selectedBankQIds: Set<string>;
  setSelectedBankQIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  folders: any[];
  sidebarFolderFilter: string;
  setSidebarFolderFilter: (v: string) => void;
  sidebarSubjectFilter: string;
  setSidebarSubjectFilter: (v: string) => void;
  sidebarChapterFilter: string;
  setSidebarChapterFilter: (v: string) => void;
  sidebarSubTopicFilter: string;
  setSidebarSubTopicFilter: (v: string) => void;
  sidebarSearchQuery: string;
  setSidebarSearchQuery: (v: string) => void;
  selectedPaperQuestions: any[];
  getAvailableChapters: (folderId: string, subject: string) => any[];
  getAvailableSubTopics: (folderId: string, subject: string, chapterId: string) => any[];
  onCreateNewPaper: () => void;
  onOpenQuestionBankExplorer: () => void;
  onAddSelectedQuestionsToCanvas: () => void;
  onToggleSelectBankQuestion: (id: string) => void;
  onAddQuestionToCanvas: (q: any) => void;
}

export const DesignerLeftQuestionBank: React.FC<DesignerLeftQuestionBankProps> = ({
  showSidebarBank,
  setShowSidebarBank,
  viewMode,
  filteredSidebarQuestions,
  selectedBankQIds,
  setSelectedBankQIds,
  folders,
  sidebarFolderFilter,
  setSidebarFolderFilter,
  sidebarSubjectFilter,
  setSidebarSubjectFilter,
  sidebarChapterFilter,
  setSidebarChapterFilter,
  sidebarSubTopicFilter,
  setSidebarSubTopicFilter,
  sidebarSearchQuery,
  setSidebarSearchQuery,
  selectedPaperQuestions,
  getAvailableChapters,
  getAvailableSubTopics,
  onCreateNewPaper,
  onOpenQuestionBankExplorer,
  onAddSelectedQuestionsToCanvas,
  onToggleSelectBankQuestion,
  onAddQuestionToCanvas,
}) => {
  return (
    <div
      className={`${
        !showSidebarBank
          ? 'lg:col-span-1'
          : viewMode === 'split'
          ? 'lg:col-span-2'
          : 'lg:col-span-3'
      } bg-white border border-classic-border rounded-classic shadow-classic flex flex-col max-h-[820px] overflow-hidden transition-all duration-300`}
    >
      {/* Collapsed strip — shown when minimised */}
      <div className={!showSidebarBank ? 'flex flex-col items-center justify-start py-4 space-y-4 h-full' : 'hidden'}>
        <button
          type="button"
          onClick={() => setShowSidebarBank(true)}
          className="p-2 rounded-classic classic-button-secondary transition-all"
          title="Expand Question Bank"
        >
          <ChevronRight className="w-4 h-4 text-classic-navy" />
        </button>
        <div
          className="text-xs font-bold text-classic-text-muted tracking-widest select-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          QUESTION BANK
        </div>
      </div>

      {/* Expanded content — shown when not minimised */}
      <div className={!showSidebarBank ? 'hidden' : 'space-y-2.5 flex-1 flex flex-col min-h-0 p-3.5'}>
        {/* Header & New Paper */}
        <div className="flex items-center justify-between pb-2 border-b border-classic-border">
          <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-classic-text-primary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={
                filteredSidebarQuestions.length > 0 &&
                filteredSidebarQuestions.every((q) => selectedBankQIds.has(q.id))
              }
              onChange={() => {
                const filteredIds = filteredSidebarQuestions.map((q) => q.id);
                const allChecked = filteredIds.length > 0 && filteredIds.every((id) => selectedBankQIds.has(id));
                setSelectedBankQIds((prev) => {
                  const next = new Set(prev);
                  if (allChecked) {
                    filteredIds.forEach((id) => next.delete(id));
                  } else {
                    filteredIds.forEach((id) => next.add(id));
                  }
                  return next;
                });
              }}
              className="w-3.5 h-3.5 rounded text-classic-navy bg-white border-classic-border focus:ring-classic-navy cursor-pointer"
            />
            <span>Question Bank ({filteredSidebarQuestions.length})</span>
          </label>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={onCreateNewPaper}
              className="text-xs text-classic-navy hover:underline flex items-center space-x-1 font-semibold"
            >
              <Plus className="w-3 h-3" />
              <span>New Paper</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSidebarBank(false)}
              className="p-1 rounded-classic text-classic-text-muted hover:text-classic-text-primary hover:bg-classic-surface-muted transition-colors"
              title="Minimise Question Bank panel"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Prominent Question Bank Explorer Open Button */}
        <button
          type="button"
          onClick={onOpenQuestionBankExplorer}
          className="w-full bg-classic-navy hover:bg-classic-navy-hover text-white font-bold py-2 px-3 rounded-classic shadow-classic flex items-center justify-center space-x-2 text-xs transition-all border border-classic-navy"
          title="Open full Question Bank Explorer dialog to select questions by Folder & Subject, and assign marks"
        >
          <FolderTree className="w-4 h-4 text-white" />
          <span>Open Question Bank Explorer</span>
        </button>

        {/* Quick Sidebar Filters (Class Folder, Subject, Search) */}
        <div className="space-y-1.5 bg-classic-surface-muted p-2 rounded-classic border border-classic-border text-xs">
          {/* Folder / Class Dropdown */}
          <select
            value={sidebarFolderFilter}
            onChange={(e) => {
              setSidebarFolderFilter(e.target.value);
              setSidebarSubjectFilter('all');
              setSidebarChapterFilter('all');
              setSidebarSubTopicFilter('all');
            }}
            className="w-full bg-white border border-classic-border rounded-classic text-xs text-classic-text-primary px-2 py-1 focus:outline-none focus:border-classic-navy truncate"
            title="Filter questions by Class Folder"
          >
            <option value="all">📁 All Classes / Folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Subject Dropdown */}
          <select
            value={sidebarSubjectFilter}
            onChange={(e) => {
              setSidebarSubjectFilter(e.target.value);
              setSidebarChapterFilter('all');
              setSidebarSubTopicFilter('all');
            }}
            className="w-full bg-white border border-classic-border rounded-classic text-xs text-classic-text-primary px-2 py-1 focus:outline-none focus:border-classic-navy truncate"
            title="Filter questions by Subject"
          >
            <option value="all">🔬 All Subjects</option>
            {(() => {
              if (sidebarFolderFilter !== 'all') {
                const cls = folders.find((f) => f.id === sidebarFolderFilter);
                return cls?.children?.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ));
              }
              const allSubs: any[] = [];
              const seen = new Set<string>();
              folders.forEach((f) => {
                f.children?.forEach((sub: any) => {
                  if (!seen.has(sub.name.toLowerCase())) {
                    seen.add(sub.name.toLowerCase());
                    allSubs.push(sub);
                  }
                });
              });
              return allSubs.map((sub) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name}
                </option>
              ));
            })()}
          </select>

          {/* Chapter / Topic Dropdown */}
          <select
            value={sidebarChapterFilter}
            onChange={(e) => {
              setSidebarChapterFilter(e.target.value);
              setSidebarSubTopicFilter('all');
            }}
            className="w-full bg-white border border-classic-border rounded-classic text-xs text-classic-text-primary px-2 py-1 focus:outline-none focus:border-classic-navy truncate"
            title="Filter questions by Chapter / Topic"
          >
            <option value="all">📖 All Chapters / Topics</option>
            {getAvailableChapters(sidebarFolderFilter, sidebarSubjectFilter).map((ch: any) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>

          {/* Sub-Topic Dropdown */}
          {getAvailableSubTopics(sidebarFolderFilter, sidebarSubjectFilter, sidebarChapterFilter).length > 0 && (
            <select
              value={sidebarSubTopicFilter}
              onChange={(e) => setSidebarSubTopicFilter(e.target.value)}
              className="w-full bg-white border border-classic-border rounded-classic text-xs text-classic-text-primary px-2 py-1 focus:outline-none focus:border-classic-navy truncate"
              title="Filter questions by Sub-Topic / DPP"
            >
              <option value="all">🔖 All Sub-Topics / DPPs</option>
              {getAvailableSubTopics(sidebarFolderFilter, sidebarSubjectFilter, sidebarChapterFilter).map((st: any) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="w-3 h-3 text-classic-text-muted absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Filter text or Q#..."
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              className="w-full bg-white border border-classic-border rounded-classic text-xs text-classic-text-primary pl-6 pr-2 py-1 focus:outline-none focus:border-classic-navy"
            />
          </div>
        </div>

        {/* Bulk Insert Selected Button */}
        {selectedBankQIds.size > 0 && (
          <button
            type="button"
            onClick={onAddSelectedQuestionsToCanvas}
            className="w-full classic-button-primary text-xs font-bold py-2 px-3 rounded-classic shadow-classic flex items-center justify-center space-x-1.5 transition-all animate-fade-in"
          >
            <Plus className="w-4 h-4" />
            <span>Insert Selected ({selectedBankQIds.size}) to Canvas</span>
          </button>
        )}

        <div className="space-y-2 overflow-y-auto pr-1 flex-1">
          {filteredSidebarQuestions.length === 0 ? (
            <div className="text-center py-6 text-classic-text-muted text-xs space-y-1">
              <p>No questions match filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSidebarFolderFilter('all');
                  setSidebarSubjectFilter('all');
                  setSidebarSearchQuery('');
                }}
                className="text-classic-navy hover:underline text-xs"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredSidebarQuestions.map((q) => {
              const isAdded = selectedPaperQuestions.some((item) => item.id === q.id);
              const isChecked = selectedBankQIds.has(q.id);

              return (
                <div
                  key={q.id}
                  className={`p-2.5 rounded-classic border text-xs space-y-1.5 transition-all ${
                    isChecked
                      ? 'bg-blue-50/70 border-2 border-classic-navy shadow-classic'
                      : isAdded
                      ? 'bg-gray-50 border-classic-border opacity-60'
                      : 'bg-white border-classic-border hover:border-classic-navy/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSelectBankQuestion(q.id)}
                        className="w-3.5 h-3.5 rounded text-classic-navy bg-white border-classic-border focus:ring-classic-navy cursor-pointer"
                      />
                      <span className="font-mono font-bold text-classic-navy">Q{q.questionNumber}</span>
                    </label>
                    <span className="text-xs text-classic-text-muted font-mono">[{q.marks} Mark{q.marks > 1 ? 's' : ''}]</span>
                  </div>
                  <div className="line-clamp-2 text-classic-text-primary text-xs">
                    <MathRenderer content={q.questionText} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddQuestionToCanvas(q)}
                    disabled={isAdded}
                    className="w-full mt-1 classic-button-secondary disabled:opacity-40 text-xs font-semibold py-1 rounded-classic flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isAdded ? '✓ Added' : 'Insert to Canvas'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
