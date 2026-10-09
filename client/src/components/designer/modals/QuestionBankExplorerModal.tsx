import React from 'react';
import {
  FolderTree,
  ExternalLink,
  X,
  Folder,
  Filter,
  BookOpen,
  Bookmark,
  Award,
  Search,
  Eye,
  ChevronUp,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { MathRenderer } from '../../common/MathRenderer';

export interface QuestionBankExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: any[];
  bankQuestions: any[];
  filteredModalQuestions: any[];
  bankFolderFilter: string;
  setBankFolderFilter: (v: string) => void;
  bankSubjectFilter: string;
  setBankSubjectFilter: (v: string) => void;
  bankChapterFilter: string;
  setBankChapterFilter: (v: string) => void;
  bankSubTopicFilter: string;
  setBankSubTopicFilter: (v: string) => void;
  bankDifficultyFilter: string;
  setBankDifficultyFilter: (v: string) => void;
  bankSearchQuery: string;
  setBankSearchQuery: (v: string) => void;
  modalSelectedQIds: Set<string>;
  setModalSelectedQIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  modalQuestionMarksMap: Record<string, number>;
  modalExpandedOptionIds: Set<string>;
  setModalExpandedOptionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedPaperQuestions: any[];
  getAvailableChapters: (folderId: string, subject: string) => any[];
  getAvailableSubTopics: (folderId: string, subject: string, chapterId: string) => any[];
  onToggleSelectQuestion: (id: string) => void;
  onUpdateQuestionMarks: (id: string, marks: number) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onInsertToCanvas: () => void;
}

export const QuestionBankExplorerModal: React.FC<QuestionBankExplorerModalProps> = ({
  isOpen,
  onClose,
  folders,
  bankQuestions,
  filteredModalQuestions,
  bankFolderFilter,
  setBankFolderFilter,
  bankSubjectFilter,
  setBankSubjectFilter,
  bankChapterFilter,
  setBankChapterFilter,
  bankSubTopicFilter,
  setBankSubTopicFilter,
  bankDifficultyFilter,
  setBankDifficultyFilter,
  bankSearchQuery,
  setBankSearchQuery,
  modalSelectedQIds,
  setModalSelectedQIds,
  modalQuestionMarksMap,
  modalExpandedOptionIds,
  setModalExpandedOptionIds,
  selectedPaperQuestions,
  getAvailableChapters,
  getAvailableSubTopics,
  onToggleSelectQuestion,
  onUpdateQuestionMarks,
  onToggleSelectAll,
  onInsertToCanvas,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 animate-fade-in no-print">
      <div className="bg-white border border-classic-border rounded-classic w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        {/* Top Modal Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-classic-border bg-classic-surface-muted">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-classic bg-blue-50 text-classic-navy flex items-center justify-center border border-classic-border shadow-xs">
              <FolderTree className="w-5 h-5 text-classic-navy" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="font-bold text-base text-classic-text">Question Bank Explorer</h2>
                <span className="text-xs px-2.5 py-0.5 bg-white text-classic-navy rounded-classic font-mono font-semibold border border-classic-border shadow-xs">
                  Showing {filteredModalQuestions.length} of {bankQuestions.length}
                </span>
              </div>
              <p className="text-xs text-classic-muted mt-0.5">
                Select Class Folder &amp; Subject &bull; Select questions using checkboxes &bull; Adjust marks &bull; Insert directly into Canvas
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="/bank"
              target="_blank"
              rel="noreferrer"
              className="classic-button-secondary rounded-classic px-3 py-1.5 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-classic-border shadow-xs"
              title="Open full Question Bank management in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-classic-navy" />
              <span>Full Bank Page ↗</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-classic text-classic-muted hover:text-classic-text hover:bg-slate-100 transition-colors"
              title="Close Explorer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Ribbon */}
        <div className="px-6 py-3 border-b border-classic-border bg-white space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            {/* 1. Folder / Class Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-classic-text-secondary flex items-center space-x-1">
                <Folder className="w-3.5 h-3.5 text-classic-navy" />
                <span>Class Folder:</span>
              </label>
              <select
                value={bankFolderFilter}
                onChange={(e) => {
                  setBankFolderFilter(e.target.value);
                  setBankSubjectFilter('all');
                  setBankChapterFilter('all');
                  setBankSubTopicFilter('all');
                }}
                className="classic-input rounded-classic w-full px-2.5 py-1.5 text-classic-text text-xs font-medium truncate"
              >
                <option value="all">📁 All Classes</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f._count?.questions !== undefined ? `(${f._count.questions} Qs)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Subject Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-classic-text-secondary flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-classic-navy" />
                <span>Subject:</span>
              </label>
              <select
                value={bankSubjectFilter}
                onChange={(e) => {
                  setBankSubjectFilter(e.target.value);
                  setBankChapterFilter('all');
                  setBankSubTopicFilter('all');
                }}
                className="classic-input rounded-classic w-full px-2.5 py-1.5 text-classic-text text-xs font-medium truncate"
              >
                <option value="all">🔬 All Subjects</option>
                {(() => {
                  if (bankFolderFilter !== 'all') {
                    const cls = folders.find((f) => f.id === bankFolderFilter);
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
            </div>

            {/* 3. Chapter / Topic Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-classic-text-secondary flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-classic-navy" />
                <span>Chapter / Topic:</span>
              </label>
              <select
                value={bankChapterFilter}
                onChange={(e) => {
                  setBankChapterFilter(e.target.value);
                  setBankSubTopicFilter('all');
                }}
                className="classic-input rounded-classic w-full px-2.5 py-1.5 text-classic-text text-xs font-medium truncate"
              >
                <option value="all">📖 All Chapters / Topics</option>
                {getAvailableChapters(bankFolderFilter, bankSubjectFilter).map((ch: any) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Sub-Topic / DPP Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-classic-text-secondary flex items-center space-x-1">
                <Bookmark className="w-3.5 h-3.5 text-classic-navy" />
                <span>Sub-Topic / DPP:</span>
              </label>
              <select
                value={bankSubTopicFilter}
                onChange={(e) => setBankSubTopicFilter(e.target.value)}
                disabled={bankChapterFilter === 'all' && getAvailableSubTopics(bankFolderFilter, bankSubjectFilter, bankChapterFilter).length === 0}
                className="classic-input rounded-classic w-full px-2.5 py-1.5 text-classic-text text-xs font-medium truncate disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="all">
                  {bankChapterFilter !== 'all' ? '🔖 All Sub-Topics / DPPs' : '🔖 Sub-Topic (Select Chapter)'}
                </option>
                {getAvailableSubTopics(bankFolderFilter, bankSubjectFilter, bankChapterFilter).map((st: any) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Difficulty Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-classic-text-secondary flex items-center space-x-1">
                <Award className="w-3.5 h-3.5 text-classic-navy" />
                <span>Difficulty:</span>
              </label>
              <select
                value={bankDifficultyFilter}
                onChange={(e) => setBankDifficultyFilter(e.target.value)}
                className="classic-input rounded-classic w-full px-2.5 py-1.5 text-classic-text text-xs font-medium truncate"
              >
                <option value="all">⚡ All Difficulties</option>
                <option value="EASY">🟢 Easy</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="HARD">🔴 Hard</option>
              </select>
            </div>

            {/* 6. Search Bar */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-classic-text-secondary flex items-center space-x-1">
                <Search className="w-3.5 h-3.5 text-classic-navy" />
                <span>Search Questions:</span>
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-classic-muted absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Keywords, formulas..."
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  className="classic-input rounded-classic w-full pl-7 pr-3 py-1.5 text-classic-text text-xs"
                />
                {bankSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBankSearchQuery('')}
                    className="absolute right-2.5 top-2 text-classic-muted hover:text-classic-text text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filter Pills Bar */}
          {(bankFolderFilter !== 'all' ||
            bankSubjectFilter !== 'all' ||
            bankChapterFilter !== 'all' ||
            bankSubTopicFilter !== 'all' ||
            bankDifficultyFilter !== 'all' ||
            bankSearchQuery) && (
            <div className="flex items-center flex-wrap gap-1.5 pt-1 text-xs">
              <span className="text-classic-muted text-xs font-bold uppercase tracking-wider mr-1">Active Filters:</span>
              {bankFolderFilter !== 'all' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-classic bg-blue-50 text-classic-navy border border-blue-200">
                  <span>Class: {folders.find((f) => f.id === bankFolderFilter)?.name || bankFolderFilter}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBankFolderFilter('all');
                      setBankSubjectFilter('all');
                      setBankChapterFilter('all');
                      setBankSubTopicFilter('all');
                    }}
                    className="hover:text-black ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {bankSubjectFilter !== 'all' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-classic bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <span>
                    Subject:{' '}
                    {(() => {
                      for (const f of folders) {
                        const found = f.children?.find((s: any) => s.id === bankSubjectFilter || s.name === bankSubjectFilter);
                        if (found) return found.name;
                      }
                      return bankSubjectFilter;
                    })()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBankSubjectFilter('all');
                      setBankChapterFilter('all');
                      setBankSubTopicFilter('all');
                    }}
                    className="hover:text-black ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {bankChapterFilter !== 'all' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-classic bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span>
                    Chapter:{' '}
                    {getAvailableChapters(bankFolderFilter, bankSubjectFilter).find(
                      (c: any) => c.id === bankChapterFilter || c.name === bankChapterFilter
                    )?.name || bankChapterFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBankChapterFilter('all');
                      setBankSubTopicFilter('all');
                    }}
                    className="hover:text-black ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {bankSubTopicFilter !== 'all' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-classic bg-amber-50 text-amber-800 border border-amber-200">
                  <span>
                    Sub-Topic:{' '}
                    {getAvailableSubTopics(bankFolderFilter, bankSubjectFilter, bankChapterFilter).find(
                      (st: any) => st.id === bankSubTopicFilter || st.name === bankSubTopicFilter
                    )?.name || bankSubTopicFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBankSubTopicFilter('all')}
                    className="hover:text-black ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {bankDifficultyFilter !== 'all' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-classic bg-purple-50 text-purple-800 border border-purple-200">
                  <span>Difficulty: {bankDifficultyFilter}</span>
                  <button type="button" onClick={() => setBankDifficultyFilter('all')} className="hover:text-black ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {bankSearchQuery && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-classic bg-slate-100 text-classic-text border border-classic-border">
                  <span>Search: "{bankSearchQuery}"</span>
                  <button type="button" onClick={() => setBankSearchQuery('')} className="hover:text-black ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setBankFolderFilter('all');
                  setBankSubjectFilter('all');
                  setBankChapterFilter('all');
                  setBankSubTopicFilter('all');
                  setBankDifficultyFilter('all');
                  setBankSearchQuery('');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 underline ml-2 cursor-pointer font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Questions Grid / Main Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-classic-surface-muted">
          {filteredModalQuestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-classic bg-white text-classic-muted flex items-center justify-center border border-classic-border shadow-xs">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-classic-text text-sm">No Questions Found</h3>
              <p className="text-classic-muted text-xs max-w-md">
                No questions in the Question Bank match your current folder, subject, chapter, or search filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBankFolderFilter('all');
                  setBankSubjectFilter('all');
                  setBankChapterFilter('all');
                  setBankSubTopicFilter('all');
                  setBankDifficultyFilter('all');
                  setBankSearchQuery('');
                }}
                className="classic-button-primary rounded-classic px-4 py-2 font-semibold text-xs shadow-classic transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredModalQuestions.map((q) => {
                const isSelected = modalSelectedQIds.has(q.id);
                const isAlreadyOnCanvas = selectedPaperQuestions.some((item) => item.id === q.id);
                const currentMarks = modalQuestionMarksMap[q.id] !== undefined
                  ? modalQuestionMarksMap[q.id]
                  : (Number(q.marks) || 1);
                const options = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson || '[]') : q.options || [];
                const diagrams = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson || '[]') : q.diagrams || [];

                return (
                  <div
                    key={q.id}
                    onClick={() => onToggleSelectQuestion(q.id)}
                    className={`rounded-classic border p-4 space-y-3 transition-all cursor-pointer select-none flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/50 border-classic-navy ring-2 ring-classic-navy/30 shadow-xs'
                        : isAlreadyOnCanvas
                        ? 'bg-slate-50/80 border-classic-border hover:border-classic-navy'
                        : 'bg-white border-classic-border hover:border-classic-navy hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Card Top Row: Checkbox, Question Number & Meta Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <label
                          className="flex items-center space-x-2.5 cursor-pointer select-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelectQuestion(q.id)}
                            className="w-4 h-4 rounded-classic text-classic-navy bg-white border-classic-border focus:ring-classic-navy cursor-pointer"
                          />
                          <span className="font-mono font-extrabold text-xs text-classic-navy">
                            Q{q.questionNumber || q.id.slice(0, 4)}
                          </span>
                        </label>

                        <div className="flex items-center space-x-1.5 flex-wrap">
                          {q.folder?.parent?.name && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setBankChapterFilter(q.folder.parent.name);
                              }}
                              className="text-xs px-2 py-0.5 rounded-classic bg-emerald-50 text-emerald-800 font-medium border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
                              title={`Click to filter by Chapter "${q.folder.parent.name}"`}
                            >
                              {q.folder.parent.name}
                            </span>
                          )}
                          {q.folder?.name && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setBankChapterFilter(q.folder.name);
                              }}
                              className="text-xs px-2 py-0.5 rounded-classic bg-slate-100 hover:bg-slate-200 text-classic-text-secondary font-medium border border-classic-border transition-all cursor-pointer"
                              title={`Click to filter by "${q.folder.name}"`}
                            >
                              {q.folder.name}
                            </span>
                          )}
                          {q.difficulty && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-classic font-mono font-bold ${
                                q.difficulty.toUpperCase() === 'EASY'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : q.difficulty.toUpperCase() === 'HARD'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {q.difficulty.toUpperCase()}
                            </span>
                          )}
                          {isAlreadyOnCanvas && (
                            <span className="text-xs px-2 py-0.5 rounded-classic bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                              ✓ On Canvas
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Stem with Math Renderer */}
                      <div className="text-classic-text text-xs leading-relaxed max-h-32 overflow-y-auto pr-1">
                        <MathRenderer content={q.questionText || ''} />
                      </div>

                      {/* Diagrams Preview if any */}
                      {diagrams.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {diagrams.map((d: any, dIdx: number) => (
                            <div key={dIdx} className="bg-white p-1 rounded-classic border border-classic-border">
                              <img
                                src={d.relative_url}
                                alt="Figure"
                                className="max-h-16 object-contain rounded"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Options Preview if any */}
                      {options.length > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalExpandedOptionIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(q.id)) next.delete(q.id);
                                else next.add(q.id);
                                return next;
                              });
                            }}
                            className="text-xs text-classic-navy hover:underline font-semibold flex items-center space-x-1"
                          >
                            {modalExpandedOptionIds.has(q.id) ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                <span>Hide Options</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>View Options ({options.length})</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {options.length > 0 && modalExpandedOptionIds.has(q.id) && (
                        <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs text-classic-text-secondary animate-fade-in">
                          {options.slice(0, 4).map((opt: any, optIdx: number) => (
                            <div
                              key={optIdx}
                              className="bg-slate-50 p-1.5 rounded-classic border border-classic-border flex items-start space-x-1.5"
                            >
                              <span className="font-bold text-classic-navy">{opt.key || String.fromCharCode(65 + optIdx)}.</span>
                              <div className="truncate text-classic-text">
                                <MathRenderer content={opt.text || ''} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Bottom Row: Assign Marks Stepper & Presets */}
                    <div
                      className="pt-2.5 border-t border-classic-border flex flex-wrap items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-classic border border-classic-border">
                        <span className="text-xs font-semibold text-classic-text-secondary select-none">Marks:</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuestionMarks(q.id, Math.max(0.5, currentMarks - (currentMarks > 1 ? 1 : 0.5)))}
                          className="w-5 h-5 rounded-classic bg-white hover:bg-slate-100 text-classic-text font-bold text-xs flex items-center justify-center border border-classic-border shadow-xs"
                          title="Decrease marks"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={currentMarks}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateQuestionMarks(q.id, isNaN(val) ? 0 : val);
                          }}
                          className="classic-input rounded-classic w-12 text-classic-navy font-mono font-bold text-xs text-center py-0.5 px-1"
                          title="Set marks directly"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateQuestionMarks(q.id, currentMarks + (currentMarks < 1 ? 0.5 : 1))}
                          className="w-5 h-5 rounded-classic bg-white hover:bg-slate-100 text-classic-text font-bold text-xs flex items-center justify-center border border-classic-border shadow-xs"
                          title="Increase marks"
                        >
                          +
                        </button>

                        {/* Quick Marks Presets */}
                        <div className="flex items-center space-x-1 pl-1 border-l border-classic-border">
                          {[1, 2, 3, 5].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => onUpdateQuestionMarks(q.id, m)}
                              className={`px-1.5 py-0.5 rounded-classic text-xs font-mono font-bold transition-all ${
                                currentMarks === m
                                  ? 'bg-classic-navy text-white shadow-xs'
                                  : 'text-classic-muted hover:text-classic-text hover:bg-slate-200'
                              }`}
                              title={`Set ${m} Mark${m > 1 ? 's' : ''}`}
                            >
                              {m}m
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs font-mono">
                        {isSelected ? (
                          <span className="text-classic-navy font-semibold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-classic-navy" />
                            <span>Selected</span>
                          </span>
                        ) : (
                          <span className="text-classic-muted">Click to select</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Sticky Action Footer */}
        <div className="px-6 py-3.5 border-t border-classic-border bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center space-x-2 cursor-pointer select-none font-semibold text-classic-text">
              <input
                type="checkbox"
                checked={
                  filteredModalQuestions.length > 0 &&
                  filteredModalQuestions.every((q) => modalSelectedQIds.has(q.id))
                }
                onChange={() =>
                  onToggleSelectAll(filteredModalQuestions.map((q) => q.id))
                }
                className="w-4 h-4 rounded-classic text-classic-navy bg-white border-classic-border focus:ring-classic-navy cursor-pointer"
              />
              <span>Select All Filtered ({filteredModalQuestions.length})</span>
            </label>

            {modalSelectedQIds.size > 0 && (
              <>
                <span className="text-classic-border">|</span>
                <span className="px-2.5 py-1 rounded-classic bg-blue-50 text-classic-navy font-semibold border border-blue-200">
                  {modalSelectedQIds.size} Question{modalSelectedQIds.size !== 1 ? 's' : ''} Selected
                </span>
                <span className="px-2.5 py-1 rounded-classic bg-emerald-50 text-emerald-800 font-mono font-bold border border-emerald-200">
                  Total: {bankQuestions
                    .filter((q) => modalSelectedQIds.has(q.id))
                    .reduce((sum, q) => sum + (modalQuestionMarksMap[q.id] !== undefined ? modalQuestionMarksMap[q.id] : (Number(q.marks) || 1)), 0)}{' '}
                  Marks
                </span>
                <button
                  type="button"
                  onClick={() => setModalSelectedQIds(new Set())}
                  className="text-classic-muted hover:text-classic-text text-xs underline"
                >
                  Clear Selection
                </button>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="classic-button-secondary rounded-classic px-4 py-2 font-semibold transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onInsertToCanvas}
              disabled={modalSelectedQIds.size === 0}
              className="classic-button-primary rounded-classic px-5 py-2 disabled:opacity-40 font-bold shadow-classic flex items-center space-x-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Insert Selected ({modalSelectedQIds.size}) to Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
