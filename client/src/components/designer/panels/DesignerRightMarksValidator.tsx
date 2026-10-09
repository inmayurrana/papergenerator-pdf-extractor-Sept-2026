import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Maximize2,
  Stamp,
  Trash2,
  School,
  Type,
  Image,
  Check,
  Upload,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  FileSpreadsheet,
  Folder,
  Lock,
} from 'lucide-react';

export interface DesignerRightMarksValidatorProps {
  showExamConfigPanel: boolean;
  setShowExamConfigPanel: (v: boolean) => void;
  viewMode: 'split' | 'editor' | 'preview';
  maxMarks: number | '' | undefined;
  setMaxMarks: (val: any) => void;
  classNameVal: string;
  setClassNameVal: (val: string) => void;
  subjectName: string;
  setSubjectName: (val: string) => void;
  examCode: string;
  setExamCode: (val: string) => void;
  duration: number | '' | undefined;
  setDuration: (val: any) => void;
  examDate: string;
  setExamDate: (val: string) => void;
  examTime: string;
  setExamTime: (val: string) => void;
  instructions: string;
  setInstructions: (val: string) => void;
  savePaperLayout: (updatedQuestions?: any, patch?: any) => void;
  setIsCustomMarginModalOpen: (open: boolean) => void;
  pageMargin: string;
  setPageMargin: (m: any) => void;
  handleSelectPresetMargin: (preset: any) => void;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  handleApplyCustomMargins: (top: number, bottom: number, left: number, right: number) => void;
  showMarginGuide: boolean;
  setShowMarginGuide: (show: boolean) => void;
  setIsWatermarkModalOpen: (open: boolean) => void;
  showWatermark: boolean;
  setShowWatermark: (show: boolean) => void;
  showToast: (msg: string) => void;
  watermarkType: 'school' | 'custom_text' | 'image';
  setWatermarkType: (type: any) => void;
  schoolName: string;
  watermarkText: string;
  setWatermarkText: (text: string) => void;
  watermarkFileInputRef: React.RefObject<HTMLInputElement>;
  handleWatermarkImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  watermarkImageUrl: string | null;
  setWatermarkImageUrl: (url: string | null) => void;
  watermarkSize: number;
  setWatermarkSize: (size: number) => void;
  watermarkOpacity: number;
  setWatermarkOpacity: (opacity: number) => void;
  watermarkRotation: number;
  setWatermarkRotation: (deg: number) => void;
  selectedPaperQuestions: any[];
  numericMaxMarks: number;
  currentTotalMarks: number;
  marksDiff: number;
  marksMismatch: boolean;
  adminOverride: boolean;
  setAdminOverride: (v: boolean) => void;
  activePaper: any;
  handleExportWord: () => void;
  handleExportPdf: (flag: boolean) => void;
  handleExportExcel: () => void;
  handleExportJson: () => void;
  handleFinalizeSnapshot: () => void;
  loading: boolean;
}

export const DesignerRightMarksValidator: React.FC<DesignerRightMarksValidatorProps> = ({
  showExamConfigPanel,
  setShowExamConfigPanel,
  viewMode,
  maxMarks,
  setMaxMarks,
  classNameVal,
  setClassNameVal,
  subjectName,
  setSubjectName,
  examCode,
  setExamCode,
  duration,
  setDuration,
  examDate,
  setExamDate,
  examTime,
  setExamTime,
  instructions,
  setInstructions,
  savePaperLayout,
  setIsCustomMarginModalOpen,
  pageMargin,
  setPageMargin,
  handleSelectPresetMargin,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  handleApplyCustomMargins,
  showMarginGuide,
  setShowMarginGuide,
  setIsWatermarkModalOpen,
  showWatermark,
  setShowWatermark,
  showToast,
  watermarkType,
  setWatermarkType,
  schoolName,
  watermarkText,
  setWatermarkText,
  watermarkFileInputRef,
  handleWatermarkImageUpload,
  watermarkImageUrl,
  setWatermarkImageUrl,
  watermarkSize,
  setWatermarkSize,
  watermarkOpacity,
  setWatermarkOpacity,
  watermarkRotation,
  setWatermarkRotation,
  selectedPaperQuestions,
  numericMaxMarks,
  currentTotalMarks,
  marksDiff,
  marksMismatch,
  adminOverride,
  setAdminOverride,
  activePaper,
  handleExportWord,
  handleExportPdf,
  handleExportExcel,
  handleExportJson,
  handleFinalizeSnapshot,
  loading,
}) => {
  return (
    <div
      className={`${
        !showExamConfigPanel
          ? 'lg:col-span-1'
          : viewMode === 'split'
          ? 'lg:col-span-2'
          : 'lg:col-span-3'
      } bg-white border border-classic-border rounded-classic shadow-classic flex flex-col max-h-[820px] overflow-y-auto transition-all duration-300`}
    >
      {/* Collapsed strip — shown when minimised */}
      <div className={!showExamConfigPanel ? 'flex flex-col items-center justify-start py-4 space-y-4 h-full' : 'hidden'}>
        <button
          type="button"
          onClick={() => setShowExamConfigPanel(true)}
          className="p-2 rounded-classic bg-classic-surface-muted text-classic-navy hover:bg-slate-200 transition-all border border-classic-border"
          title="Expand Exam Configuration"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div
          className="text-xs font-bold text-classic-text-muted tracking-widest select-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          EXAM CONFIG
        </div>
      </div>

      {/* Expanded content — shown when not minimised */}
      <div className={!showExamConfigPanel ? 'hidden' : 'space-y-4 p-4 flex-1'}>
        <div className="flex items-center justify-between pb-2 border-b border-classic-border">
          <span className="text-xs font-bold uppercase tracking-wider text-classic-navy">
            Exam Configuration
          </span>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-classic-navy" />
            {/* Minimize / collapse button */}
            <button
              type="button"
              onClick={() => setShowExamConfigPanel(false)}
              className="p-1 rounded-classic text-classic-text-muted hover:text-classic-navy hover:bg-classic-surface-muted transition-colors border border-transparent hover:border-classic-border"
              title="Minimise Exam Configuration panel"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-classic-text-secondary mb-1">Target Max Marks</label>
            <input
              type="number"
              value={maxMarks === undefined || maxMarks === null || Number.isNaN(Number(maxMarks)) ? '' : maxMarks}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                setMaxMarks(val as any);
              }}
              onBlur={() => savePaperLayout()}
              className="w-full classic-input rounded-classic px-3 py-1.5 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-classic-text-secondary mb-1">Class Folder</label>
              <input
                type="text"
                value={classNameVal}
                onChange={(e) => setClassNameVal(e.target.value)}
                onBlur={() => savePaperLayout()}
                placeholder="e.g. Class 12"
                className="w-full classic-input rounded-classic px-3 py-1.5 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-classic-text-secondary mb-1">Subject</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                onBlur={() => savePaperLayout()}
                placeholder="e.g. Physics"
                className="w-full classic-input rounded-classic px-3 py-1.5 text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-classic-text-secondary mb-1">Exam Code</label>
              <input
                type="text"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                onBlur={() => savePaperLayout()}
                className="w-full classic-input rounded-classic px-3 py-1.5 text-xs font-mono font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-classic-text-secondary mb-1">Duration (Mins)</label>
              <input
                type="number"
                value={duration === undefined || duration === null || Number.isNaN(Number(duration)) ? '' : duration}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setDuration(val as any);
                }}
                onBlur={() => savePaperLayout()}
                className="w-full classic-input rounded-classic px-3 py-1.5 text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-classic-text-secondary mb-1">Exam Date & Time</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                onBlur={() => savePaperLayout()}
                className="w-full classic-input rounded-classic px-2 py-1.5 text-xs font-medium"
              />
              <input
                type="text"
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
                onBlur={() => savePaperLayout()}
                className="w-full classic-input rounded-classic px-2 py-1.5 text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-classic-text-secondary mb-1">General Instructions</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onBlur={() => savePaperLayout()}
              className="w-full classic-input rounded-classic p-2.5 text-xs font-sans"
            />
          </div>

          <div className="space-y-2 bg-classic-surface-muted p-2.5 rounded-classic border border-classic-border">
            <label className="block text-xs font-semibold text-classic-navy flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-classic-navy" />
                <span>Page Margins (Print & PDF)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCustomMarginModalOpen(true)}
                className="text-xs text-classic-navy hover:underline font-mono"
              >
                Setup Modal
              </button>
            </label>

            {/* 5 Preset Buttons */}
            <div className="grid grid-cols-5 gap-1">
              {[
                { id: 'zero', label: 'Zero', desc: '4mm' },
                { id: 'narrow', label: 'Narrow', desc: '8mm' },
                { id: 'normal', label: 'Normal', desc: '15mm' },
                { id: 'wide', label: 'Wide', desc: '25mm' },
                { id: 'custom', label: 'Custom', desc: `${marginLeft}mm` },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (m.id === 'custom') {
                      setPageMargin('custom');
                      setIsCustomMarginModalOpen(true);
                    } else {
                      handleSelectPresetMargin(m.id as any);
                    }
                  }}
                  className={`py-1.5 px-0.5 rounded-classic text-center border text-xs font-bold transition-all ${
                    pageMargin === m.id
                      ? 'bg-classic-navy border-classic-navy text-white shadow-classic'
                      : 'bg-white border-classic-border text-classic-text-secondary hover:text-classic-text hover:bg-slate-50'
                  }`}
                >
                  <div className="leading-none">{m.label}</div>
                  <div className="text-[8.5px] opacity-70 font-mono mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Direct 4-Way Margin Numeric Inputs & Steppers */}
            <div className="pt-2 border-t border-classic-border space-y-1.5">
              <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold px-0.5">
                <span>Precision Margins:</span>
                <span className="font-mono text-classic-navy">{marginLeft}L &bull; {marginRight}R &bull; {marginTop}T &bull; {marginBottom}B mm</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Left Margin (Crucial for binding/stapling) */}
                <div className="bg-white p-1.5 rounded-classic border border-classic-border space-y-1">
                  <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                    <span>Left (Binding):</span>
                    <span className="font-mono font-bold text-classic-navy">{marginLeft}mm</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, marginBottom, Math.max(0, marginLeft - 2), marginRight)}
                      className="w-5 h-5 bg-classic-surface-muted hover:bg-slate-200 text-classic-navy border border-classic-border rounded-classic text-xs font-bold flex items-center justify-center"
                    >-</button>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={marginLeft}
                      onChange={(e) => handleApplyCustomMargins(marginTop, marginBottom, parseInt(e.target.value, 10) || 0, marginRight)}
                      className="w-full bg-white border border-classic-border text-classic-text text-xs font-mono font-bold text-center rounded-classic py-0.5 focus:outline-none focus:border-classic-navy"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, marginBottom, Math.min(60, marginLeft + 2), marginRight)}
                      className="w-5 h-5 bg-classic-surface-muted hover:bg-slate-200 text-classic-navy border border-classic-border rounded-classic text-xs font-bold flex items-center justify-center"
                    >+</button>
                  </div>
                </div>

                {/* Right Margin */}
                <div className="bg-white p-1.5 rounded-classic border border-classic-border space-y-1">
                  <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                    <span>Right:</span>
                    <span className="font-mono font-bold text-classic-navy">{marginRight}mm</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, marginBottom, marginLeft, Math.max(0, marginRight - 2))}
                      className="w-5 h-5 bg-classic-surface-muted hover:bg-slate-200 text-classic-navy border border-classic-border rounded-classic text-xs font-bold flex items-center justify-center"
                    >-</button>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={marginRight}
                      onChange={(e) => handleApplyCustomMargins(marginTop, marginBottom, marginLeft, parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-white border border-classic-border text-classic-text text-xs font-mono font-bold text-center rounded-classic py-0.5 focus:outline-none focus:border-classic-navy"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, marginBottom, marginLeft, Math.min(60, marginRight + 2))}
                      className="w-5 h-5 bg-classic-surface-muted hover:bg-slate-200 text-classic-navy border border-classic-border rounded-classic text-xs font-bold flex items-center justify-center"
                    >+</button>
                  </div>
                </div>

                {/* Top Margin */}
                <div className="bg-white p-1.5 rounded-classic border border-classic-border space-y-1">
                  <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                    <span>Top:</span>
                    <span className="font-mono font-bold text-classic-navy">{marginTop}mm</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(Math.max(0, marginTop - 2), marginBottom, marginLeft, marginRight)}
                      className="w-5 h-5 bg-classic-surface-muted hover:bg-slate-200 text-classic-navy border border-classic-border rounded-classic text-xs font-bold flex items-center justify-center"
                    >-</button>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={marginTop}
                      onChange={(e) => handleApplyCustomMargins(parseInt(e.target.value, 10) || 0, marginBottom, marginLeft, marginRight)}
                      className="w-full bg-white border border-classic-border text-classic-text text-xs font-mono font-bold text-center rounded-classic py-0.5 focus:outline-none focus:border-classic-navy"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(Math.min(60, marginTop + 2), marginBottom, marginLeft, marginRight)}
                      className="w-5 h-5 bg-classic-surface-muted hover:bg-slate-200 text-classic-navy border border-classic-border rounded-classic text-xs font-bold flex items-center justify-center"
                    >+</button>
                  </div>
                </div>

                {/* Bottom Margin */}
                <div className="bg-white p-1.5 rounded-classic border border-classic-border space-y-1">
                  <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                    <span>Bottom:</span>
                    <span className="font-mono font-bold text-classic-navy">{marginBottom}mm</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, Math.max(0, marginBottom - 2), marginLeft, marginRight)}
                      className="w-5 h-5 bg-classic-surface-muted hover:bg-slate-200 text-classic-navy border border-classic-border rounded-classic text-xs font-bold flex items-center justify-center"
                    >-</button>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={marginBottom}
                      onChange={(e) => handleApplyCustomMargins(marginTop, parseInt(e.target.value, 10) || 0, marginLeft, marginRight)}
                      className="w-full bg-white border border-classic-border text-classic-text text-xs font-mono font-bold text-center rounded-classic py-0.5 focus:outline-none focus:border-classic-navy"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, Math.min(60, marginBottom + 2), marginLeft, marginRight)}
                      className="w-5 h-5 bg-classic-surface-muted hover:bg-slate-200 text-classic-navy border border-classic-border rounded-classic text-xs font-bold flex items-center justify-center"
                    >+</button>
                  </div>
                </div>
              </div>

              {/* Toggle Margin Guidelines */}
              <div className="pt-2 border-t border-classic-border flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-classic-text font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={showMarginGuide}
                    onChange={(e) => setShowMarginGuide(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-classic border-classic-border text-classic-navy focus:ring-0"
                  />
                  <span>Show On-Screen Margin Guides</span>
                </label>
                <span className="text-xs text-classic-navy font-mono font-bold">
                  {showMarginGuide ? 'Visible' : 'Hidden'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE WATERMARK CONFIGURATION */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Stamp className="w-3.5 h-3.5 text-classic-navy" />
              <label className="text-xs font-bold text-classic-text-primary uppercase tracking-wide">
                Page Watermark
              </label>
              <button
                type="button"
                onClick={() => setIsWatermarkModalOpen(true)}
                className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold underline ml-1 cursor-pointer"
                title="Open full watermark configuration dialog"
              >
                Options
              </button>
            </div>
            <div className="flex items-center space-x-2">
              {showWatermark && (
                <button
                  type="button"
                  onClick={() => {
                    setShowWatermark(false);
                    savePaperLayout(selectedPaperQuestions, { showWatermark: false });
                    showToast('✓ Watermark removed');
                  }}
                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline flex items-center space-x-0.5"
                  title="Remove watermark immediately"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span>Remove</span>
                </button>
              )}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setShowWatermark(next);
                    savePaperLayout(selectedPaperQuestions, { showWatermark: next });
                    showToast(next ? '✓ Watermark Enabled' : '✓ Watermark Removed / Disabled');
                  }}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-classic-navy"></div>
              </label>
            </div>
          </div>

          {showWatermark ? (
            <div className="p-3 bg-classic-surface-muted rounded-classic border border-classic-border space-y-3">
              {/* Watermark Type Selector Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-classic border border-classic-border">
                <button
                  type="button"
                  onClick={() => {
                    setWatermarkType('school');
                    savePaperLayout(selectedPaperQuestions, { watermarkType: 'school' });
                  }}
                  className={`py-1 text-xs font-bold rounded-classic flex flex-col items-center justify-center transition-all ${
                    watermarkType === 'school'
                      ? 'bg-classic-navy text-white shadow-sm'
                      : 'text-classic-text-secondary hover:text-classic-navy hover:bg-slate-50'
                  }`}
                  title="Default School Name"
                >
                  <School className="w-3 h-3 mb-0.5" />
                  <span className="text-[10px]">School</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWatermarkType('custom_text');
                    savePaperLayout(selectedPaperQuestions, { watermarkType: 'custom_text' });
                  }}
                  className={`py-1 text-xs font-bold rounded-classic flex flex-col items-center justify-center transition-all ${
                    watermarkType === 'custom_text'
                      ? 'bg-classic-navy text-white shadow-sm'
                      : 'text-classic-text-secondary hover:text-classic-navy hover:bg-slate-50'
                  }`}
                  title="Custom Text Watermark"
                >
                  <Type className="w-3 h-3 mb-0.5" />
                  <span className="text-[10px]">Custom</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWatermarkType('image');
                    if (watermarkSize < 80) setWatermarkSize(280);
                    savePaperLayout(selectedPaperQuestions, { watermarkType: 'image' });
                  }}
                  className={`py-1 text-xs font-bold rounded-classic flex flex-col items-center justify-center transition-all ${
                    watermarkType === 'image'
                      ? 'bg-classic-navy text-white shadow-sm'
                      : 'text-classic-text-secondary hover:text-classic-navy hover:bg-slate-50'
                  }`}
                  title="Custom Image or Logo Watermark"
                >
                  <Image className="w-3 h-3 mb-0.5" />
                  <span className="text-[10px]">Image</span>
                </button>
              </div>

              {/* School Mode Info */}
              {watermarkType === 'school' && (
                <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-classic text-xs text-classic-navy space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-[11px]">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Default School Name Watermark</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono line-clamp-1 italic">
                    "{schoolName || 'CAMBRIDGE INTERNATIONAL SCHOOL MANDI'}"
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Automatically updates whenever the school name is edited at the top of the canvas.
                  </p>
                </div>
              )}

              {/* Custom Text Mode */}
              {watermarkType === 'custom_text' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                    <span>Watermark Text:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setWatermarkText('CAMBRIDGE INTERNATIONAL SCHOOL MANDI');
                        savePaperLayout(selectedPaperQuestions, { watermarkText: 'CAMBRIDGE INTERNATIONAL SCHOOL MANDI' });
                      }}
                      className="text-[10px] text-classic-navy hover:underline"
                    >
                      Reset School
                    </button>
                  </div>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => {
                      setWatermarkText(e.target.value);
                      savePaperLayout(selectedPaperQuestions, { watermarkText: e.target.value });
                    }}
                    placeholder="e.g. CONFIDENTIAL, SAMPLE PAPER"
                    className="w-full bg-white border border-classic-border text-classic-text text-xs rounded-classic px-2.5 py-1.5 focus:outline-none focus:border-classic-navy font-semibold"
                  />
                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {['CONFIDENTIAL', 'SAMPLE PAPER', 'PRE-BOARD 2026', 'DO NOT COPY'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setWatermarkText(preset);
                          savePaperLayout(selectedPaperQuestions, { watermarkText: preset });
                        }}
                        className="text-[10px] bg-white hover:bg-slate-100 text-classic-text-secondary hover:text-classic-navy border border-classic-border px-1.5 py-0.5 rounded font-mono transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Mode */}
              {watermarkType === 'image' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={watermarkFileInputRef}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleWatermarkImageUpload}
                    className="hidden"
                  />
                  {watermarkImageUrl ? (
                    <div className="flex items-center space-x-2.5 bg-white p-2 rounded-classic border border-classic-border">
                      <div className="w-12 h-12 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={watermarkImageUrl}
                          alt="Watermark preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-classic-navy block truncate">Custom Logo / Image</span>
                        <span className="text-[10px] text-emerald-600 block">✓ Active as watermark</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <button
                            type="button"
                            onClick={() => watermarkFileInputRef.current?.click()}
                            className="text-[10px] text-classic-navy hover:underline font-bold"
                          >
                            Change
                          </button>
                          <span className="text-[10px] text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setWatermarkImageUrl(null);
                              setWatermarkType('school');
                              savePaperLayout(selectedPaperQuestions, { watermarkImageUrl: null, watermarkType: 'school' });
                            }}
                            className="text-[10px] text-rose-600 hover:underline font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => watermarkFileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 bg-white hover:bg-blue-50/60 text-classic-navy border border-dashed border-classic-navy/40 hover:border-classic-navy rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5 text-classic-navy" />
                      <span>Upload Watermark Image / Logo</span>
                    </button>
                  )}
                </div>
              )}

              {/* Size Control Slider */}
              <div className="space-y-1 pt-1 border-t border-classic-border/60">
                <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                  <span>Watermark Size:</span>
                  <span className="font-mono font-bold text-classic-navy">
                    {watermarkSize}px
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(watermarkType === 'image' ? 80 : 28, watermarkSize - (watermarkType === 'image' ? 20 : 6));
                      setWatermarkSize(next);
                      savePaperLayout(selectedPaperQuestions, { watermarkSize: next });
                    }}
                    className="w-6 h-6 bg-white hover:bg-slate-100 text-classic-navy border border-classic-border rounded text-xs font-bold flex items-center justify-center shrink-0"
                  >-</button>
                  <input
                    type="range"
                    min={watermarkType === 'image' ? 80 : 28}
                    max={watermarkType === 'image' ? 600 : 130}
                    step={watermarkType === 'image' ? 10 : 2}
                    value={watermarkSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setWatermarkSize(val);
                      savePaperLayout(selectedPaperQuestions, { watermarkSize: val });
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-classic-navy"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(watermarkType === 'image' ? 600 : 130, watermarkSize + (watermarkType === 'image' ? 20 : 6));
                      setWatermarkSize(next);
                      savePaperLayout(selectedPaperQuestions, { watermarkSize: next });
                    }}
                    className="w-6 h-6 bg-white hover:bg-slate-100 text-classic-navy border border-classic-border rounded text-xs font-bold flex items-center justify-center shrink-0"
                  >+</button>
                </div>
              </div>

              {/* Transparency / Opacity Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                  <span>Transparency (Opacity):</span>
                  <span className="font-mono font-bold text-classic-navy">
                    {Math.round(watermarkOpacity * 100)}%
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min={2}
                    max={60}
                    step={1}
                    value={Math.round(watermarkOpacity * 100)}
                    onChange={(e) => {
                      const val = (parseInt(e.target.value, 10) || 6) / 100;
                      setWatermarkOpacity(val);
                      savePaperLayout(selectedPaperQuestions, { watermarkOpacity: val });
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-classic-navy"
                  />
                </div>
                {/* Quick Opacity Presets */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                  {[
                    { label: 'Subtle', val: 0.04 },
                    { label: 'Normal', val: 0.06 },
                    { label: 'Medium', val: 0.12 },
                    { label: 'Prominent', val: 0.20 },
                    { label: 'Bold', val: 0.35 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setWatermarkOpacity(p.val);
                        savePaperLayout(selectedPaperQuestions, { watermarkOpacity: p.val });
                      }}
                      className={`hover:text-classic-navy underline decoration-dotted ${
                        Math.abs(watermarkOpacity - p.val) < 0.015 ? 'font-bold text-classic-navy' : ''
                      }`}
                    >
                      {p.label} ({Math.round(p.val * 100)}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* Angle / Rotation Selector */}
              <div className="space-y-1 pt-1 border-t border-classic-border/60">
                <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                  <span>Orientation / Angle:</span>
                  <span className="font-mono font-bold text-classic-navy">{watermarkRotation}°</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '-30°', angle: -30, title: 'Diagonal (Standard)' },
                    { label: '-45°', angle: -45, title: 'Steep Diagonal' },
                    { label: '0°', angle: 0, title: 'Horizontal' },
                    { label: '-90°', angle: -90, title: 'Vertical' },
                  ].map((item) => (
                    <button
                      key={item.angle}
                      type="button"
                      onClick={() => {
                        setWatermarkRotation(item.angle);
                        savePaperLayout(selectedPaperQuestions, { watermarkRotation: item.angle });
                      }}
                      className={`py-1 text-[11px] font-mono font-bold rounded border transition-all ${
                        watermarkRotation === item.angle
                          ? 'bg-classic-navy text-white border-classic-navy shadow-sm'
                          : 'bg-white text-classic-text-secondary border-classic-border hover:bg-slate-50'
                      }`}
                      title={item.title}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Action Footer in Card: Open Detailed Dialog or Remove */}
              <div className="pt-2 border-t border-classic-border/60 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsWatermarkModalOpen(true)}
                  className="text-indigo-700 hover:text-indigo-900 font-bold flex items-center space-x-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Advanced Setup Modal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWatermark(false);
                    savePaperLayout(selectedPaperQuestions, { showWatermark: false });
                    showToast('✓ Watermark removed');
                  }}
                  className="text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span>Remove Watermark</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-classic-surface-muted rounded-classic border border-classic-border text-center space-y-2">
              <div className="text-xs text-classic-text-muted">
                Watermark is currently removed / disabled.
              </div>
              <div className="flex items-center justify-center space-x-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowWatermark(true);
                    savePaperLayout(selectedPaperQuestions, { showWatermark: true });
                    showToast('✓ Watermark Enabled');
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-classic flex items-center space-x-1 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>Add Watermark</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWatermark(true);
                    setIsWatermarkModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-classic flex items-center space-x-1 transition-colors"
                >
                  <Stamp className="w-3 h-3" />
                  <span>Custom Watermark...</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LIVE MARKS MANAGEMENT VALIDATOR */}
        <div className="space-y-2 pt-2">
          <div className="p-3.5 bg-classic-surface-muted rounded-classic border border-classic-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-classic-text-secondary">Target Maximum Marks:</span>
              <span className="font-mono font-bold text-classic-navy text-sm">{numericMaxMarks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-classic-text-secondary">Current Question Total:</span>
              <span className="font-mono font-bold text-classic-navy text-sm">{currentTotalMarks}</span>
            </div>
            <div className="pt-2 border-t border-classic-border flex items-center justify-between">
              <span className="text-classic-text-secondary">Difference:</span>
              <span className={`font-mono font-bold ${marksDiff === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {marksDiff === 0 ? '✓ Exact Match (0)' : `${marksDiff > 0 ? '+' : ''}${marksDiff} Marks`}
              </span>
            </div>
          </div>

          {/* Marks Mismatch Alert */}
          {marksMismatch ? (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-classic text-xs text-rose-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Marks Mismatch!</span>
                <br />
                {marksDiff > 0
                  ? `${marksDiff} marks needed to reach Target (${numericMaxMarks}).`
                  : `Current total exceeds Target (${numericMaxMarks}) by ${Math.abs(marksDiff)} marks.`}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-classic text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Marks perfectly balanced! Ready to finalize snapshot.</span>
            </div>
          )}
        </div>

        {/* Admin Override Checkbox */}
        {marksMismatch && (
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="adminOverride"
              checked={adminOverride}
              onChange={(e) => setAdminOverride(e.target.checked)}
              className="rounded-classic border-classic-border text-classic-navy focus:ring-0"
            />
            <label htmlFor="adminOverride" className="text-xs text-classic-text-secondary font-medium">
              Allow Administrator Override for marks mismatch
            </label>
          </div>
        )}
      </div>

      {/* Action Buttons & Multi-Format Exports */}
      <div className="space-y-2 p-4 pt-4 border-t border-classic-border">
        {/* Multi-Format Export Buttons */}
        {activePaper && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-classic-muted px-0.5">Export Question Paper</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportWord}
                className="py-2 px-2.5 bg-[#185ABD] hover:bg-[#104a9e] text-white rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-classic"
                title="Export styled Word Document (.doc)"
              >
                <FileText className="w-3.5 h-3.5 text-white" />
                <span>Word (.doc)</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPdf(false)}
                className="py-2 px-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-classic"
                title="Export official A4 PDF (.pdf)"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>PDF (.pdf)</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="py-2 px-2.5 bg-[#107C41] hover:bg-[#0c6634] text-white rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-classic"
                title="Export Excel spreadsheet (.csv)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span>Excel (.csv)</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="py-2 px-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-classic"
                title="Export portable JSON schema (.json)"
              >
                <Folder className="w-3.5 h-3.5 text-white" />
                <span>JSON (.json)</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleFinalizeSnapshot}
          disabled={loading || (marksMismatch && !adminOverride)}
          className="w-full classic-button-primary disabled:opacity-40 text-xs font-semibold py-3 px-4 rounded-classic shadow-classic flex items-center justify-center space-x-2 transition-all"
        >
          <Lock className="w-4 h-4" />
          <span>{loading ? 'Finalizing Snapshot...' : 'Finalize & Freeze Snapshot'}</span>
        </button>
      </div>
    </div>
  );
};
