import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Lock,
  Printer,
  CheckCircle2,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Layers,
  Sparkles,
  School,
  Calendar,
  Clock,
  QrCode,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  WrapText,
  Keyboard,
  Columns,
  Square,
  Minus,
  Check,
  Eye,
  EyeOff,
  Sliders,
  Maximize2,
  Minimize2,
  FileText,
  Edit3,
  Save,
  RotateCcw,
  Zap,
  Grid,
  List,
  Sparkle,
  Image,
  Upload,
  HardDrive,
  Folder,
  FolderTree,
  Search,
  Filter,
  ExternalLink,
  CheckSquare,
  Award,
  Copy,
  GripVertical,
  ZoomIn,
  ZoomOut,
  MoreVertical,
  X,
  Hash,
  User,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Bookmark,
  Tag,
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { MathRenderer } from '../components/common/MathRenderer';
import { ResizableImage } from '../components/common/ResizableImage';

export const PaperDesigner: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPaperId = searchParams.get('id');

  const [papers, setPapers] = useState<any[]>([]);
  const [activePaper, setActivePaper] = useState<any | null>(null);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [selectedPaperQuestions, setSelectedPaperQuestions] = useState<any[]>([]);

  // Paper Metadata Settings
  const [title, setTitle] = useState('ANNUAL EXAMINATION - 2026');
  const [examCode, setExamCode] = useState('PHY-101');
  const [schoolName, setSchoolName] = useState('DELHI PUBLIC SCHOOL');
  const [className, setClassName] = useState('Class 12');
  const [subjectName, setSubjectName] = useState('Physics');
  const [maxMarks, setMaxMarks] = useState(70);
  const [duration, setDuration] = useState(180);
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [examTime, setExamTime] = useState('09:00 AM - 12:00 PM');
  const [instructions, setInstructions] = useState(
    '1. All questions are compulsory.\n2. Section A contains 1-mark MCQs.\n3. Section B contains short answer questions.\n4. Use of calculators is not permitted.'
  );

  // MS Word-like Layout & Styling State
  const [fontFamily, setFontFamily] = useState<string>('serif');
  const [fontSize, setFontSize] = useState<string>('10pt');
  const [lineSpacing, setLineSpacing] = useState<'none' | 'compact' | 'tight' | 'normal' | 'relaxed'>('tight');
  const [pageColumns, setPageColumns] = useState<1 | 2>(1);
  const [spacingPreset, setSpacingPreset] = useState<'zero' | 'compact' | 'standard'>('zero');
  const [pageMargin, setPageMargin] = useState<'zero' | 'narrow' | 'normal' | 'wide' | 'custom'>('normal');
  const [marginTop, setMarginTop] = useState<number>(15);
  const [marginBottom, setMarginBottom] = useState<number>(15);
  const [marginLeft, setMarginLeft] = useState<number>(18);
  const [marginRight, setMarginRight] = useState<number>(18);
  const [isCustomMarginModalOpen, setIsCustomMarginModalOpen] = useState<boolean>(false);
  const [showMarginGuide, setShowMarginGuide] = useState<boolean>(false);
  const [borderStyle, setBorderStyle] = useState<'none' | 'divider' | 'dashed' | 'box'>('divider');
  const [optionLayout, setOptionLayout] = useState<'inline' | 'grid2' | 'vertical'>('inline');
  const [wrapOptionsBesideDiagram, setWrapOptionsBesideDiagram] = useState<boolean>(true);
  const [imageAlignment, setImageAlignment] = useState<'inline' | 'left' | 'center' | 'right'>('inline');
  const [imageBorderStyle, setImageBorderStyle] = useState<'none' | 'subtle'>('none');
  const [imageCustomHeight, setImageCustomHeight] = useState<number>(15);
  const [autoMatchText, setAutoMatchText] = useState(true);
  const [showWatermark, setShowWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [showCandidateBox, setShowCandidateBox] = useState(true);

  // Roll Number Style & Logo Customization
  const [rollNoStyle, setRollNoStyle] = useState<'boxes' | 'blank' | 'none'>('boxes');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const [schoolLogoWidth, setSchoolLogoWidth] = useState<number>(75);
  const [schoolLogoHeight, setSchoolLogoHeight] = useState<number>(75);
  const [schoolLogoPosition, setSchoolLogoPosition] = useState<'left' | 'center' | 'right'>('left');
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Question Bank Left Panel Multi-Select State
  const [selectedBankQIds, setSelectedBankQIds] = useState<Set<string>>(new Set());
  const [sidebarFolderFilter, setSidebarFolderFilter] = useState<string>('all');
  const [sidebarSubjectFilter, setSidebarSubjectFilter] = useState<string>('all');
  const [sidebarChapterFilter, setSidebarChapterFilter] = useState<string>('all');
  const [sidebarSubTopicFilter, setSidebarSubTopicFilter] = useState<string>('all');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState<string>('');

  // Dedicated Question Bank Explorer Modal / Page State
  const [isQuestionBankModalOpen, setIsQuestionBankModalOpen] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [bankFolderFilter, setBankFolderFilter] = useState<string>('all');
  const [bankSubjectFilter, setBankSubjectFilter] = useState<string>('all');
  const [bankChapterFilter, setBankChapterFilter] = useState<string>('all');
  const [bankSubTopicFilter, setBankSubTopicFilter] = useState<string>('all');
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState<string>('all');
  const [modalSelectedQIds, setModalSelectedQIds] = useState<Set<string>>(new Set());
  const [modalQuestionMarksMap, setModalQuestionMarksMap] = useState<Record<string, number>>({});

  // Studio UI View Mode: 'split' (Side-by-Side) | 'editor' (Interactive Canvas) | 'a4_preview' (Realistic White Sheet)
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'a4_preview'>('split');

  // Save to Custom Storage Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveModalTitle, setSaveModalTitle] = useState('');
  const [saveModalClass, setSaveModalClass] = useState('Class 12');
  const [saveModalSubject, setSaveModalSubject] = useState('Physics');
  const [saveModalExamCode, setSaveModalExamCode] = useState('PHY-101');

  // Edit Question on Canvas Modal State
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [editQForm, setEditQForm] = useState<{
    questionText: string;
    marks: number;
    negativeMarks: number;
    difficulty: string;
    correctAnswer: string;
    explanation: string;
    options: Array<{ key: string; text: string; imageUrl?: string | null; imageWidth?: number; imageHeight?: number }>;
    diagrams: Array<{ relative_url: string; width?: number; height?: number; title?: string }>;
  } | null>(null);
  const editQDiagramInputRef = useRef<HTMLInputElement>(null);

  // Teacher's Copy (Answer Key & Solutions Edition) State
  const [isTeacherCopy, setIsTeacherCopy] = useState(false);
  const [quickAnswerModalIdx, setQuickAnswerModalIdx] = useState<number | null>(null);
  const [quickAnswerVal, setQuickAnswerVal] = useState<string>('');
  const [quickExplanationVal, setQuickExplanationVal] = useState<string>('');

  // Finalization & Admin Override
  const [adminOverride, setAdminOverride] = useState(false);
  const [snapshotResult, setSnapshotResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Custom Header & Candidate Fields State
  const [customHeaderFields, setCustomHeaderFields] = useState<Array<{ id: string; label: string; value: string }>>([
    { id: 'f_class', label: 'CLASS', value: 'Class 12' },
    { id: 'f_sub', label: 'SUBJECT', value: 'Physics' },
  ]);
  const [customCandidateFields, setCustomCandidateFields] = useState<Array<{ id: string; label: string; placeholder: string }>>([]);

  // Field Visibility Toggles on Canvas
  const [showHeaderMeta, setShowHeaderMeta] = useState(true);
  const [showExamCode, setShowExamCode] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [showMaxMarks, setShowMaxMarks] = useState(true);
  const [showSchoolName, setShowSchoolName] = useState(true);
  const [showExamTitle, setShowExamTitle] = useState(true);
  const [showCandidateName, setShowCandidateName] = useState(true);
  const [showRollNo, setShowRollNo] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showQuestionMarks, setShowQuestionMarks] = useState(true);
  const [hideAllOptions, setHideAllOptions] = useState(false);
  const [hideAllSections, setHideAllSections] = useState(false);
  const [showSidebarBank, setShowSidebarBank] = useState(true);
  const [showExamConfigPanel, setShowExamConfigPanel] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Dynamic Font Sizing & Typography Controls
  const [schoolNameSize, setSchoolNameSize] = useState<number>(18);
  const [examTitleSize, setExamTitleSize] = useState<number>(13);
  const [candidateBoxFontSize, setCandidateBoxFontSize] = useState<number>(11);
  const [baseFontSizePt, setBaseFontSizePt] = useState<number>(10);

  // Custom Field / Section / Note Creator Modal
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [fieldModalType, setFieldModalType] = useState<'header' | 'candidate' | 'section' | 'note'>('header');
  const [fieldModalLabel, setFieldModalLabel] = useState('');
  const [fieldModalValue, setFieldModalValue] = useState('');
  const [fieldModalInsertIdx, setFieldModalInsertIdx] = useState<number | null>(null);

  // Quick Inline Editing
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditingText, setInlineEditingText] = useState<string>('');

  // Safe numeric values to prevent any NaN calculations
  const numericMaxMarks = Number.isFinite(Number(maxMarks)) ? Number(maxMarks) : 70;
  const numericDuration = Number.isFinite(Number(duration)) ? Number(duration) : 180;

  // Calculate live marks (excluding non-question items like section headers, notes, or blank space)
  const currentTotalMarks = selectedPaperQuestions.reduce((sum, q) => sum + (q.type === 'section' || q.type === 'note' || q.type === 'space' ? 0 : (Number(q.marks) || 1)), 0);
  const marksMismatch = numericMaxMarks !== currentTotalMarks;
  const marksDiff = numericMaxMarks - currentTotalMarks;

  // Saved Paper Popup Notification State
  const [savedPopupInfo, setSavedPopupInfo] = useState<{
    isOpen: boolean;
    title: string;
    examCode: string;
    className: string;
    subjectName: string;
    questionCount: number;
    totalMarks: number;
    storagePath: string;
  } | null>(null);

  // Open Saved Paper Modal State
  const [isOpenSavedPaperModalOpen, setIsOpenSavedPaperModalOpen] = useState(false);
  const [savedPaperSearchQuery, setSavedPaperSearchQuery] = useState('');
  const [savedPaperClassFilter, setSavedPaperClassFilter] = useState('ALL');

  const showToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const openSaveModal = () => {
    setSaveModalTitle(title || activePaper?.title || 'ANNUAL EXAMINATION 2026');
    setSaveModalClass(className || 'Class 12');
    setSaveModalSubject(subjectName || 'Physics');
    setSaveModalExamCode(examCode || activePaper?.examCode || 'PHY-101');
    setIsSaveModalOpen(true);
  };

  const handleConfirmSaveToStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTitle(saveModalTitle);
      setClassName(saveModalClass);
      setSubjectName(saveModalSubject);
      setExamCode(saveModalExamCode);

      const totalMarks = selectedPaperQuestions.reduce((sum, q) => sum + (q.type === 'section' || q.type === 'note' || q.type === 'space' ? 0 : (Number(q.marks) || 1)), 0);
      const currentSettings = {
        className: saveModalClass,
        subjectName: saveModalSubject,
        fontFamily,
        fontSize,
        lineSpacing,
        pageColumns,
        spacingPreset,
        pageMargin,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        borderStyle,
        optionLayout,
        imageAlignment,
        imageBorderStyle,
        imageCustomHeight,
        autoMatchText,
        showWatermark,
        watermarkText,
        showCandidateBox,
        rollNoStyle,
        schoolLogoUrl,
        schoolLogoWidth,
        schoolLogoHeight,
        schoolLogoPosition,
        customHeaderFields,
        customCandidateFields,
        showHeaderMeta,
        showExamCode,
        showTime,
        showMaxMarks,
        showSchoolName,
        showExamTitle,
        showCandidateName,
        showRollNo,
        showInstructions,
        schoolNameSize,
        examTitleSize,
        candidateBoxFontSize,
        baseFontSizePt,
        showQuestionMarks,
        hideAllOptions,
        hideAllSections,
      };

      let savedPaper: any = null;
      if (!activePaper) {
        const res = await api.post('/papers', {
          title: saveModalTitle,
          examCode: saveModalExamCode,
          schoolName: schoolName || 'DELHI PUBLIC SCHOOL',
          className: saveModalClass,
          subjectName: saveModalSubject,
          maxMarks: parseInt(maxMarks.toString(), 10) || 70,
          currentMarks: totalMarks,
          durationMinutes: duration || 180,
          examDate,
          examTime,
          instructions,
          canvasLayout: {
            questions: selectedPaperQuestions,
            settings: currentSettings,
          },
        });
        savedPaper = res.data.paper;
      } else {
        const res = await api.put(`/papers/${activePaper.id}`, {
          title: saveModalTitle,
          examCode: saveModalExamCode,
          schoolName,
          className: saveModalClass,
          subjectName: saveModalSubject,
          maxMarks: parseInt(maxMarks.toString(), 10) || 70,
          currentMarks: totalMarks,
          durationMinutes: duration || 180,
          examDate,
          examTime,
          instructions,
          canvasLayout: {
            questions: selectedPaperQuestions,
            settings: currentSettings,
          },
        });
        savedPaper = res.data.paper;
      }

      if (savedPaper) {
        setActivePaper(savedPaper);
        setPapers((prev) => [savedPaper, ...prev.filter((p: any) => p.id !== savedPaper.id)]);
      }

      setIsSaveModalOpen(false);
      const qCount = selectedPaperQuestions.filter((q) => q.type !== 'section' && q.type !== 'note' && q.type !== 'space').length;
      const physicalStoragePath = `D:\\Recovered_school_app\\PAPERGENERATOR\\data\\Bank\\Qpapers\\${saveModalClass}\\${saveModalSubject}\\`;

      showToast(`💾 Saved & Synced: ${saveModalTitle} (${qCount} Questions)`);

      // Trigger high-profile popup notification
      setSavedPopupInfo({
        isOpen: true,
        title: saveModalTitle || 'ANNUAL EXAMINATION 2026',
        examCode: saveModalExamCode || 'PHY-101',
        className: saveModalClass || 'Class 12',
        subjectName: saveModalSubject || 'Physics',
        questionCount: qCount,
        totalMarks,
        storagePath: physicalStoragePath,
      });
    } catch (err: any) {
      alert(`Save to storage failed: ${err.message}`);
    }
  };

  const handleQuickSaveWithPopup = async () => {
    try {
      await savePaperLayout(selectedPaperQuestions);
      const totalMarks = selectedPaperQuestions.reduce((sum, q) => sum + (q.type === 'section' || q.type === 'note' || q.type === 'space' ? 0 : (Number(q.marks) || 1)), 0);
      const qCount = selectedPaperQuestions.filter((q) => q.type !== 'section' && q.type !== 'note' && q.type !== 'space').length;
      const physicalStoragePath = `D:\\Recovered_school_app\\PAPERGENERATOR\\data\\Bank\\Qpapers\\${className || 'Class 12'}\\${subjectName || 'Physics'}\\`;

      setSavedPopupInfo({
        isOpen: true,
        title: title || activePaper?.title || 'ANNUAL EXAMINATION 2026',
        examCode: examCode || activePaper?.examCode || 'EXAM-101',
        className: className || 'Class 12',
        subjectName: subjectName || 'Physics',
        questionCount: qCount,
        totalMarks,
        storagePath: physicalStoragePath,
      });
    } catch (err: any) {
      console.error('Quick save error:', err);
    }
  };

  const handleExportWord = async () => {
    if (!activePaper) return;
    try {
      const res = await api.get(`/papers/${activePaper.id}/export/word`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/msword; charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (title || activePaper.title || 'Question_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}.doc`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast('📄 Exported question paper as Microsoft Word document (.doc)!');
    } catch (err: any) {
      alert(`Word Export failed: ${err.message}`);
    }
  };

  const handleExportExcel = async () => {
    if (!activePaper) return;
    try {
      const res = await api.get(`/papers/${activePaper.id}/export/excel`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv; charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (title || activePaper.title || 'Question_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast('📊 Exported question paper as Excel CSV (.csv)!');
    } catch (err: any) {
      alert(`Excel Export failed: ${err.message}`);
    }
  };

  const loadPaper = (paper: any) => {
    setActivePaper(paper);
    setTitle(paper.title || 'EXAMINATION 2026');
    setExamCode(paper.examCode || 'EXAM-101');
    setSchoolName(paper.schoolName || 'DELHI PUBLIC SCHOOL');
    setMaxMarks(Number.isFinite(Number(paper.maxMarks)) ? Number(paper.maxMarks) : 70);
    setDuration(Number.isFinite(Number(paper.durationMinutes)) ? Number(paper.durationMinutes) : 180);
    setExamDate(paper.examDate || new Date().toISOString().split('T')[0]);
    setExamTime(paper.examTime || '09:00 AM - 12:00 PM');
    setInstructions(paper.instructions || '');

    try {
      const layout = JSON.parse(paper.canvasLayoutJson || '{}');
      setSelectedPaperQuestions(layout.questions || []);
      if (layout.settings) {
        if (layout.settings.fontFamily) setFontFamily(layout.settings.fontFamily);
        if (layout.settings.fontSize) setFontSize(layout.settings.fontSize);
        if (layout.settings.lineSpacing) setLineSpacing(layout.settings.lineSpacing);
        if (layout.settings.pageColumns) setPageColumns(layout.settings.pageColumns);
        if (layout.settings.spacingPreset) setSpacingPreset(layout.settings.spacingPreset);
        if (layout.settings.pageMargin) setPageMargin(layout.settings.pageMargin);
        if (layout.settings.marginTop !== undefined) setMarginTop(layout.settings.marginTop);
        if (layout.settings.marginBottom !== undefined) setMarginBottom(layout.settings.marginBottom);
        if (layout.settings.marginLeft !== undefined) setMarginLeft(layout.settings.marginLeft);
        if (layout.settings.marginRight !== undefined) setMarginRight(layout.settings.marginRight);
        if (layout.settings.borderStyle) setBorderStyle(layout.settings.borderStyle);
        if (layout.settings.optionLayout) setOptionLayout(layout.settings.optionLayout);
        if (layout.settings.wrapOptionsBesideDiagram !== undefined) setWrapOptionsBesideDiagram(layout.settings.wrapOptionsBesideDiagram);
        if (layout.settings.imageAlignment) setImageAlignment(layout.settings.imageAlignment);
        if (layout.settings.imageBorderStyle) setImageBorderStyle(layout.settings.imageBorderStyle);
        if (layout.settings.imageCustomHeight) setImageCustomHeight(layout.settings.imageCustomHeight);
        if (layout.settings.autoMatchText !== undefined) setAutoMatchText(layout.settings.autoMatchText);
        if (layout.settings.showWatermark !== undefined) setShowWatermark(layout.settings.showWatermark);
        if (layout.settings.watermarkText) setWatermarkText(layout.settings.watermarkText);
        if (layout.settings.showCandidateBox !== undefined) setShowCandidateBox(layout.settings.showCandidateBox);
        if (layout.settings.rollNoStyle) setRollNoStyle(layout.settings.rollNoStyle);
        if (layout.settings.schoolLogoUrl !== undefined) setSchoolLogoUrl(layout.settings.schoolLogoUrl);
        if (layout.settings.schoolLogoWidth) setSchoolLogoWidth(layout.settings.schoolLogoWidth);
        if (layout.settings.schoolLogoHeight) setSchoolLogoHeight(layout.settings.schoolLogoHeight);
        if (layout.settings.schoolLogoPosition) setSchoolLogoPosition(layout.settings.schoolLogoPosition);
        if (layout.settings.className) setClassName(layout.settings.className);
        if (layout.settings.subjectName) setSubjectName(layout.settings.subjectName);
        if (layout.settings.customHeaderFields) setCustomHeaderFields(layout.settings.customHeaderFields);
        if (layout.settings.customCandidateFields) setCustomCandidateFields(layout.settings.customCandidateFields);
        if (layout.settings.showHeaderMeta !== undefined) setShowHeaderMeta(layout.settings.showHeaderMeta);
        if (layout.settings.showExamCode !== undefined) setShowExamCode(layout.settings.showExamCode);
        if (layout.settings.showTime !== undefined) setShowTime(layout.settings.showTime);
        if (layout.settings.showMaxMarks !== undefined) setShowMaxMarks(layout.settings.showMaxMarks);
        if (layout.settings.showSchoolName !== undefined) setShowSchoolName(layout.settings.showSchoolName);
        if (layout.settings.showExamTitle !== undefined) setShowExamTitle(layout.settings.showExamTitle);
        if (layout.settings.showCandidateName !== undefined) setShowCandidateName(layout.settings.showCandidateName);
        if (layout.settings.showRollNo !== undefined) setShowRollNo(layout.settings.showRollNo);
        if (layout.settings.showInstructions !== undefined) setShowInstructions(layout.settings.showInstructions);
        if (layout.settings.schoolNameSize) setSchoolNameSize(layout.settings.schoolNameSize);
        if (layout.settings.examTitleSize) setExamTitleSize(layout.settings.examTitleSize);
        if (layout.settings.candidateBoxFontSize) setCandidateBoxFontSize(layout.settings.candidateBoxFontSize);
        if (layout.settings.baseFontSizePt) setBaseFontSizePt(layout.settings.baseFontSizePt);
        if (layout.settings.showQuestionMarks !== undefined) setShowQuestionMarks(layout.settings.showQuestionMarks);
        if (layout.settings.hideAllOptions !== undefined) setHideAllOptions(layout.settings.hideAllOptions);
        if (layout.settings.hideAllSections !== undefined) setHideAllSections(layout.settings.hideAllSections);
      }
    } catch {
      setSelectedPaperQuestions([]);
    }
  };

  // Reset paper canvas to a clean new paper session
  const resetToNewPaperState = () => {
    setActivePaper(null);
    setSelectedPaperQuestions([]);
    setTitle('ANNUAL EXAMINATION - 2026');
    setExamCode(`EXAM-${Math.floor(100 + Math.random() * 900)}`);
    setSchoolName('DELHI PUBLIC SCHOOL');
    setClassName('Class 12');
    setSubjectName('Physics');
    setMaxMarks(70);
    setDuration(180);
    setExamDate(new Date().toISOString().split('T')[0]);
    setExamTime('09:00 AM - 12:00 PM');
    setInstructions(
      '1. All questions are compulsory.\n2. Section A contains 1-mark MCQs.\n3. Section B contains short answer questions.\n4. Use of calculators is not permitted.'
    );
    setSelectedBankQIds(new Set());
    setSearchParams({});
  };

  // Handler: Start a fresh new paper
  const handleStartNewPaper = () => {
    if (selectedPaperQuestions.length > 0) {
      const confirmed = window.confirm(
        'Start a fresh new paper? Any unsaved changes on the current canvas will be cleared.'
      );
      if (!confirmed) return;
    }
    resetToNewPaperState();
    setIsOpenSavedPaperModalOpen(false);
    showToast('✨ Opened fresh new blank paper canvas');
  };

  // Alias for backward compatibility
  const handleCreateNewPaper = handleStartNewPaper;

  // Handler: Close currently open paper
  const handleCloseActivePaper = () => {
    if (selectedPaperQuestions.length > 0) {
      const confirmed = window.confirm(
        'Close the currently open paper? The canvas will be cleared for a new paper.'
      );
      if (!confirmed) return;
    }
    resetToNewPaperState();
    showToast('✕ Paper closed. Canvas is clean and ready.');
  };

  // Handler: Open selected saved paper from modal or dropdown
  const handleOpenSavedPaper = (paper: any) => {
    loadPaper(paper);
    setSearchParams({ id: paper.id });
    setIsOpenSavedPaperModalOpen(false);
    showToast(`📂 Opened paper: "${paper.title || 'Saved Paper'}"`);
  };

  // Handler: Delete saved paper from modal
  const handleDeleteSavedPaperFromModal = async (e: React.MouseEvent, paperId: string, paperTitle: string) => {
    e.stopPropagation();
    if (!window.confirm(`Permanently delete paper "${paperTitle}" from Paper Bank?`)) return;
    try {
      await api.delete(`/papers/${paperId}`);
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
      if (activePaper?.id === paperId) {
        resetToNewPaperState();
      }
      showToast(`Deleted paper "${paperTitle}"`);
    } catch (err: any) {
      alert(`Delete failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const fetchInitialData = async (targetId?: string) => {
    try {
      const [papersRes, questionsRes, foldersRes] = await Promise.all([
        api.get('/papers'),
        api.get('/questions'),
        api.get('/folders').catch(() => ({ data: { folders: [] } })),
      ]);
      const fetchedPapers = papersRes.data.papers || [];
      setPapers(fetchedPapers);
      setBankQuestions(questionsRes.data.questions || []);
      setFolders(foldersRes.data?.folders || []);

      const paperToLoadId = targetId || requestedPaperId;
      if (paperToLoadId) {
        const found = fetchedPapers.find((p: any) => p.id === paperToLoadId);
        if (found) {
          loadPaper(found);
          return;
        }
      }

      // DO NOT auto-load previous paper. Open as a clean, blank NEW PAPER session!
      resetToNewPaperState();
    } catch (err) {
      console.error(err);
    }
  };

  // Dedicated print handler that clears document.title during printing
  // so browser print headers (date, time, title) are NEVER printed on output file/PDF
  const handlePrintPaper = () => {
    const originalTitle = document.title;
    document.title = ' ';
    window.print();
    setTimeout(() => {
      document.title = originalTitle || 'Question Paper Generator with OMR sheets';
    }, 1500);
  };

  useEffect(() => {
    const handleBeforePrint = () => {
      document.title = ' ';
    };
    const handleAfterPrint = () => {
      document.title = 'Question Paper Generator with OMR sheets';
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Global Keyboard Shortcuts for Canvas: Text Size & Line Spacing adjustment
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ctrl + [ or Ctrl + - : Decrease Text Size
      if (e.ctrlKey && (e.key === '-' || e.key === '_' || e.key === '[')) {
        e.preventDefault();
        handleAdjustGlobalFontSize(-1);
      }
      // Ctrl + ] or Ctrl + + / = : Increase Text Size
      else if (e.ctrlKey && (e.key === '=' || e.key === '+' || e.key === ']')) {
        e.preventDefault();
        handleAdjustGlobalFontSize(1);
      }
      // Alt + ArrowUp or Alt + - : Decrease Line Spacing (Tighten lines to save space)
      else if (e.altKey && (e.key === 'ArrowUp' || e.key === '-')) {
        e.preventDefault();
        if (lineSpacing === 'relaxed') {
          setLineSpacing('normal');
          savePaperLayout(selectedPaperQuestions, { lineSpacing: 'normal' });
          showToast('Line Spacing: NORMAL');
        } else if (lineSpacing === 'normal') {
          setLineSpacing('tight');
          savePaperLayout(selectedPaperQuestions, { lineSpacing: 'tight' });
          showToast('Line Spacing: TIGHT');
        } else if (lineSpacing === 'tight') {
          setLineSpacing('compact');
          savePaperLayout(selectedPaperQuestions, { lineSpacing: 'compact' });
          showToast('Line Spacing: COMPACT (Reduced Space)');
        } else if (lineSpacing === 'compact') {
          setLineSpacing('none');
          savePaperLayout(selectedPaperQuestions, { lineSpacing: 'none' });
          showToast('Line Spacing: NONE (Zero Space Between Lines)');
        }
      }
      // Alt + ArrowDown or Alt + + / = : Increase Line Spacing
      else if (e.altKey && (e.key === 'ArrowDown' || e.key === '=' || e.key === '+')) {
        e.preventDefault();
        if (lineSpacing === 'none') {
          setLineSpacing('compact');
          savePaperLayout(selectedPaperQuestions, { lineSpacing: 'compact' });
          showToast('Line Spacing: COMPACT');
        } else if (lineSpacing === 'compact') {
          setLineSpacing('tight');
          savePaperLayout(selectedPaperQuestions, { lineSpacing: 'tight' });
          showToast('Line Spacing: TIGHT');
        } else if (lineSpacing === 'tight') {
          setLineSpacing('normal');
          savePaperLayout(selectedPaperQuestions, { lineSpacing: 'normal' });
          showToast('Line Spacing: NORMAL');
        } else if (lineSpacing === 'normal') {
          setLineSpacing('relaxed');
          savePaperLayout(selectedPaperQuestions, { lineSpacing: 'relaxed' });
          showToast('Line Spacing: RELAXED');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [baseFontSizePt, lineSpacing, selectedPaperQuestions]);

  const savePaperLayout = async (
    updatedQuestions: any[] = selectedPaperQuestions,
    customSettings?: any
  ) => {
    try {
      const totalMarks = updatedQuestions.reduce((sum, q) => sum + (q.type === 'section' || q.type === 'note' || q.type === 'space' ? 0 : (Number(q.marks) || 1)), 0);
      const currentSettings = {
        className,
        subjectName,
        fontFamily,
        fontSize,
        lineSpacing,
        pageColumns,
        spacingPreset,
        pageMargin: customSettings?.pageMargin !== undefined ? customSettings.pageMargin : pageMargin,
        marginTop: customSettings?.marginTop !== undefined ? customSettings.marginTop : marginTop,
        marginBottom: customSettings?.marginBottom !== undefined ? customSettings.marginBottom : marginBottom,
        marginLeft: customSettings?.marginLeft !== undefined ? customSettings.marginLeft : marginLeft,
        marginRight: customSettings?.marginRight !== undefined ? customSettings.marginRight : marginRight,
        borderStyle,
        optionLayout,
        wrapOptionsBesideDiagram: customSettings?.wrapOptionsBesideDiagram !== undefined ? customSettings.wrapOptionsBesideDiagram : wrapOptionsBesideDiagram,
        imageAlignment,
        imageBorderStyle,
        imageCustomHeight,
        autoMatchText,
        showWatermark,
        watermarkText,
        showCandidateBox,
        rollNoStyle,
        schoolLogoUrl,
        schoolLogoWidth,
        schoolLogoHeight,
        schoolLogoPosition,
        customHeaderFields,
        customCandidateFields,
        showHeaderMeta,
        showExamCode,
        showTime,
        showMaxMarks,
        showSchoolName,
        showExamTitle,
        showCandidateName,
        showRollNo,
        showInstructions,
        schoolNameSize,
        examTitleSize,
        candidateBoxFontSize,
        baseFontSizePt,
        showQuestionMarks: customSettings?.showQuestionMarks !== undefined ? customSettings.showQuestionMarks : showQuestionMarks,
        hideAllOptions: customSettings?.hideAllOptions !== undefined ? customSettings.hideAllOptions : hideAllOptions,
        hideAllSections: customSettings?.hideAllSections !== undefined ? customSettings.hideAllSections : hideAllSections,
      };
      const settings = customSettings ? { ...currentSettings, ...customSettings } : currentSettings;

      if (!activePaper) {
        const res = await api.post('/papers', {
          title: title || 'ANNUAL EXAMINATION 2026',
          examCode: examCode || `EXAM-${Math.floor(100 + Math.random() * 900)}`,
          schoolName: schoolName || 'DELHI PUBLIC SCHOOL',
          className: className || 'Class 12',
          subjectName: subjectName || 'Physics',
          maxMarks: Number.isFinite(Number(maxMarks)) ? Number(maxMarks) : 70,
          currentMarks: totalMarks,
          durationMinutes: Number.isFinite(Number(duration)) ? Number(duration) : 180,
          examDate,
          examTime,
          instructions,
          canvasLayout: {
            questions: updatedQuestions,
            settings,
          },
        });
        if (res.data?.paper) {
          setActivePaper(res.data.paper);
          setPapers((prev) => [res.data.paper, ...prev.filter((p: any) => p.id !== res.data.paper.id)]);
        }
      } else {
        const res = await api.put(`/papers/${activePaper.id}`, {
          title,
          examCode,
          schoolName,
          className: className || 'Class 12',
          subjectName: subjectName || 'Physics',
          maxMarks: Number.isFinite(Number(maxMarks)) ? Number(maxMarks) : 70,
          currentMarks: totalMarks,
          durationMinutes: Number.isFinite(Number(duration)) ? Number(duration) : 180,
          examDate,
          examTime,
          instructions,
          canvasLayout: {
            questions: updatedQuestions,
            settings,
          },
        });
        if (res.data?.paper) {
          setActivePaper(res.data.paper);
        }
      }
    } catch (err) {
      console.error('Failed to save paper layout:', err);
    }
  };

  // Batch Auto-Scale: Match All Option Images to Exact Text Font Height
  const handleSetAllImageHeights = (targetHeight: number) => {
    const clamped = Math.max(10, Math.min(60, targetHeight));
    setImageCustomHeight(clamped);
    setAutoMatchText(clamped <= 16);

    const updated = selectedPaperQuestions.map((q) => {
      const opts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
      const updatedOpts = opts.map((o: any) => {
        if (o.imageUrl) {
          return { ...o, imageHeight: clamped };
        }
        return o;
      });
      return {
        ...q,
        options: updatedOpts,
        optionsJson: JSON.stringify(updatedOpts),
      };
    });
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated, { imageCustomHeight: clamped, autoMatchText: clamped <= 16 });
    showToast(clamped <= 16 ? `🎯 Matched exact font size (${clamped}px)` : `Set image height to ${clamped}px`);
  };

  const handleAddQuestionToCanvas = (q: any) => {
    if (selectedPaperQuestions.find((item) => item.id === q.id)) {
      showToast('Question already in question paper');
      return;
    }
    const updated = [...selectedPaperQuestions, { ...q }];
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(`Added Q${q.questionNumber || selectedPaperQuestions.length + 1} to paper!`);
  };

  // --- Canvas Field & Element Management Handlers ---
  const handleAddNewQuestionToCanvas = (insertAtIndex?: number) => {
    const newQ = {
      id: `custom_q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      questionText: 'Write question statement here (supports LaTeX math e.g. $E=mc^2$)',
      marks: 1,
      negativeMarks: 0,
      difficulty: 'MEDIUM',
      correctAnswer: 'A',
      explanation: '',
      options: [
        { key: 'A', text: 'Option A' },
        { key: 'B', text: 'Option B' },
        { key: 'C', text: 'Option C' },
        { key: 'D', text: 'Option D' },
      ],
      optionsJson: JSON.stringify([
        { key: 'A', text: 'Option A' },
        { key: 'B', text: 'Option B' },
        { key: 'C', text: 'Option C' },
        { key: 'D', text: 'Option D' },
      ]),
      diagrams: [],
      diagramsJson: '[]',
    };
    let updated;
    if (insertAtIndex !== undefined && insertAtIndex >= 0) {
      updated = [...selectedPaperQuestions];
      updated.splice(insertAtIndex, 0, newQ);
    } else {
      updated = [...selectedPaperQuestions, newQ];
    }
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    const targetIdx = insertAtIndex !== undefined && insertAtIndex >= 0 ? insertAtIndex : updated.length - 1;
    handleOpenEditQuestion(targetIdx);
    showToast('Created new question! Configure text, options & marks in the editor.');
  };

  const handleAddSectionHeading = (titleText: string, subtitleText: string = '', insertAtIndex?: number) => {
    const newSec = {
      id: `sec_${Date.now()}`,
      type: 'section',
      title: titleText.trim(),
      subtitle: subtitleText.trim(),
      marks: 0,
      fontSize: 14,
      align: 'center',
    };
    let updated;
    if (insertAtIndex !== undefined && insertAtIndex >= 0) {
      updated = [...selectedPaperQuestions];
      updated.splice(insertAtIndex, 0, newSec);
    } else {
      updated = [...selectedPaperQuestions, newSec];
    }
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(`Added section header: "${titleText}"`);
  };

  const handleAddNoteBlock = (noteText: string, insertAtIndex?: number) => {
    const newNote = {
      id: `note_${Date.now()}`,
      type: 'note',
      text: noteText.trim(),
      marks: 0,
      fontSize: 11,
    };
    let updated;
    if (insertAtIndex !== undefined && insertAtIndex >= 0) {
      updated = [...selectedPaperQuestions];
      updated.splice(insertAtIndex, 0, newNote);
    } else {
      updated = [...selectedPaperQuestions, newNote];
    }
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast('Added note block to canvas');
  };

  const handleDuplicateCanvasItem = (index: number) => {
    const item = selectedPaperQuestions[index];
    if (!item) return;
    const clone = {
      ...item,
      id: `${item.id || 'item'}_copy_${Date.now()}`,
    };
    const updated = [...selectedPaperQuestions];
    updated.splice(index + 1, 0, clone);
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast('Duplicated item on canvas');
  };

  const handleAdjustItemFontSize = (index: number, delta: number) => {
    const updated = [...selectedPaperQuestions];
    const item = updated[index];
    if (!item) return;
    const current = item.customFontSize || baseFontSizePt || 10;
    const next = Math.max(7, Math.min(28, current + delta));
    updated[index] = { ...item, customFontSize: next };
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(`Item font size: ${next}pt`);
  };

  const handleAdjustGlobalFontSize = (delta: number) => {
    const next = Math.max(8, Math.min(22, baseFontSizePt + delta));
    setBaseFontSizePt(next);
    const ptString = `${next}pt` as any;
    setFontSize(ptString);
    savePaperLayout(selectedPaperQuestions, { baseFontSizePt: next, fontSize: ptString });
    showToast(`Canvas Font Size: ${next}pt`);
  };

  // Helper to calculate effective numeric margins in mm
  const getEffectiveMarginsMm = () => {
    if (pageMargin === 'zero') return { top: 4, bottom: 4, left: 5, right: 5 };
    if (pageMargin === 'narrow') return { top: 8, bottom: 8, left: 10, right: 10 };
    if (pageMargin === 'wide') return { top: 25, bottom: 25, left: 25, right: 25 };
    if (pageMargin === 'normal') return { top: 15, bottom: 15, left: 18, right: 18 };
    return {
      top: Math.max(0, marginTop || 15),
      bottom: Math.max(0, marginBottom || 15),
      left: Math.max(0, marginLeft || 18),
      right: Math.max(0, marginRight || 18),
    };
  };

  const handleSelectPresetMargin = (presetId: 'zero' | 'narrow' | 'normal' | 'wide') => {
    let t = 15, b = 15, l = 18, r = 18;
    if (presetId === 'zero') { t = 4; b = 4; l = 5; r = 5; }
    else if (presetId === 'narrow') { t = 8; b = 8; l = 10; r = 10; }
    else if (presetId === 'wide') { t = 25; b = 25; l = 25; r = 25; }
    else if (presetId === 'normal') { t = 15; b = 15; l = 18; r = 18; }
    setMarginTop(t);
    setMarginBottom(b);
    setMarginLeft(l);
    setMarginRight(r);
    setPageMargin(presetId);
    savePaperLayout(selectedPaperQuestions, {
      pageMargin: presetId,
      marginTop: t,
      marginBottom: b,
      marginLeft: l,
      marginRight: r,
    });
    showToast(`Applied ${presetId.toUpperCase()} margins (${l}mm Left, ${t}mm Top)`);
  };

  const handleApplyCustomMargins = (t: number, b: number, l: number, r: number) => {
    const cleanT = Math.max(0, Math.min(60, Math.round(t)));
    const cleanB = Math.max(0, Math.min(60, Math.round(b)));
    const cleanL = Math.max(0, Math.min(60, Math.round(l)));
    const cleanR = Math.max(0, Math.min(60, Math.round(r)));
    setMarginTop(cleanT);
    setMarginBottom(cleanB);
    setMarginLeft(cleanL);
    setMarginRight(cleanR);
    setPageMargin('custom');
    savePaperLayout(selectedPaperQuestions, {
      pageMargin: 'custom',
      marginTop: cleanT,
      marginBottom: cleanB,
      marginLeft: cleanL,
      marginRight: cleanR,
    });
    showToast(`Applied custom margins: ${cleanL}mm left, ${cleanT}mm top, ${cleanR}mm right, ${cleanB}mm bottom`);
  };

  const handleAddHeaderField = (label: string, value: string) => {
    if (!label.trim()) return;
    const cleanLabel = label.trim().toUpperCase();
    if (cleanLabel === 'EXAM CODE' || cleanLabel === 'EXAMCODE') {
      if (value.trim()) setExamCode(value.trim());
      setShowExamCode(true);
      savePaperLayout(selectedPaperQuestions, { showExamCode: true });
      showToast('Restored Exam Code header badge');
      return;
    }
    if (cleanLabel === 'TIME' || cleanLabel === 'DURATION') {
      const parsed = parseInt(value.replace(/[^0-9]/g, ''), 10);
      if (parsed) setDuration(parsed);
      setShowTime(true);
      savePaperLayout(selectedPaperQuestions, { showTime: true });
      showToast('Restored Time header badge');
      return;
    }
    if (cleanLabel === 'MAX MARKS' || cleanLabel === 'MAXMARKS' || cleanLabel === 'MAX MARKS:') {
      const parsed = parseInt(value.replace(/[^0-9]/g, ''), 10);
      if (parsed) setMaxMarks(parsed);
      setShowMaxMarks(true);
      savePaperLayout(selectedPaperQuestions, { showMaxMarks: true });
      showToast('Restored Max Marks header badge');
      return;
    }
    if (cleanLabel === 'SCHOOL NAME' || cleanLabel === 'INSTITUTE') {
      if (value.trim()) setSchoolName(value.trim());
      setShowSchoolName(true);
      savePaperLayout(selectedPaperQuestions, { showSchoolName: true });
      showToast('Restored School Name');
      return;
    }
    if (cleanLabel === 'EXAM TITLE' || cleanLabel === 'TITLE') {
      if (value.trim()) setTitle(value.trim());
      setShowExamTitle(true);
      savePaperLayout(selectedPaperQuestions, { showExamTitle: true });
      showToast('Restored Exam Title');
      return;
    }

    const updated = [...customHeaderFields, { id: `hf_${Date.now()}`, label: cleanLabel, value: value.trim() }];
    setCustomHeaderFields(updated);
    savePaperLayout(selectedPaperQuestions, { customHeaderFields: updated });
    showToast(`Added header field: ${label}`);
  };

  const handleDeleteHeaderField = (id: string) => {
    const updated = customHeaderFields.filter((f) => f.id !== id);
    setCustomHeaderFields(updated);
    savePaperLayout(selectedPaperQuestions, { customHeaderFields: updated });
    showToast('Removed header field');
  };

  const handleAddCandidateField = (label: string, placeholder: string = '________________________') => {
    if (!label.trim()) return;
    const cleanLower = label.trim().toLowerCase();
    if (cleanLower === 'candidate name' || cleanLower === 'student name' || cleanLower === 'name') {
      setShowCandidateName(true);
      savePaperLayout(selectedPaperQuestions, { showCandidateName: true });
      showToast('Restored Candidate Name field');
      return;
    }
    if (cleanLower === 'roll no' || cleanLower === 'roll number' || cleanLower === 'rollno') {
      setShowRollNo(true);
      savePaperLayout(selectedPaperQuestions, { showRollNo: true });
      showToast('Restored Roll No field');
      return;
    }
    const updated = [...customCandidateFields, { id: `cf_${Date.now()}`, label: label.trim(), placeholder: placeholder.trim() }];
    setCustomCandidateFields(updated);
    savePaperLayout(selectedPaperQuestions, { customCandidateFields: updated });
    showToast(`Added candidate detail: ${label}`);
  };

  const handleDeleteCandidateField = (id: string) => {
    const updated = customCandidateFields.filter((f) => f.id !== id);
    setCustomCandidateFields(updated);
    savePaperLayout(selectedPaperQuestions, { customCandidateFields: updated });
    showToast('Removed candidate field');
  };

  const handleOpenCreateFieldModal = (type: 'header' | 'candidate' | 'section' | 'note', insertIdx?: number) => {
    setFieldModalType(type);
    setFieldModalInsertIdx(insertIdx !== undefined ? insertIdx : null);
    if (type === 'section') {
      setFieldModalLabel('SECTION A');
      setFieldModalValue('MULTIPLE CHOICE QUESTIONS');
    } else if (type === 'header') {
      setFieldModalLabel('CLASS');
      setFieldModalValue(className || 'Class 12');
    } else if (type === 'candidate') {
      setFieldModalLabel("Father's Name");
      setFieldModalValue('________________________');
    } else if (type === 'note') {
      setFieldModalLabel('General Note');
      setFieldModalValue('All rough work must be shown in the margin.');
    }
    setIsFieldModalOpen(true);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= selectedPaperQuestions.length) return;
    const updated = [...selectedPaperQuestions];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
  };

  // Direct Inline Marks Editor on Canvas
  const handleUpdateMarksOnCanvas = (idx: number, newMarks: number) => {
    const updated = [...selectedPaperQuestions];
    const targetQ = updated[idx];
    if (!targetQ) return;
    const clamped = Math.max(0, Math.round(newMarks * 10) / 10);
    updated[idx] = { ...targetQ, marks: clamped, hideMarks: clamped === 0 };
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
  };

  // Toggle marks visibility on a single question
  const handleToggleQuestionMarks = (idx: number) => {
    const updated = [...selectedPaperQuestions];
    const q = updated[idx];
    if (!q) return;
    const isCurrentlyHidden = q.hideMarks !== undefined ? q.hideMarks : !showQuestionMarks;
    const nextHide = !isCurrentlyHidden;
    updated[idx] = { ...q, hideMarks: nextHide };
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(nextHide ? `Removed marks display from Q${idx + 1}` : `Restored marks display on Q${idx + 1}`);
  };

  // Toggle options on a single MCQ question
  const handleToggleQuestionOptions = (idx: number) => {
    const updated = [...selectedPaperQuestions];
    const q = updated[idx];
    if (!q) return;
    const isCurrentlyHidden = q.hideOptions !== undefined ? q.hideOptions : hideAllOptions;
    const nextHide = !isCurrentlyHidden;
    updated[idx] = { ...q, hideOptions: nextHide };
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(nextHide ? `Hidden choices for Q${idx + 1} (Subjective mode)` : `Restored & showing choices for Q${idx + 1}`);
  };

  // Toggle wrapping MCQ options beside diagram on a single question (eliminating blank space)
  const handleToggleQuestionWrapOptions = (idx: number) => {
    const updated = [...selectedPaperQuestions];
    const q = updated[idx];
    if (!q) return;
    const isCurrentlyWrapped = q.wrapOptionsBesideDiagram !== undefined ? q.wrapOptionsBesideDiagram : wrapOptionsBesideDiagram;
    const nextWrapped = !isCurrentlyWrapped;
    updated[idx] = { ...q, wrapOptionsBesideDiagram: nextWrapped };
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(nextWrapped ? `Choices for Q${idx + 1} wrapped beside diagram (blank spaces removed)` : `Choices for Q${idx + 1} placed below diagram`);
  };

  // Toggle visibility of an individual Section heading on paper
  const handleToggleSectionVisibility = (idx: number) => {
    const updated = [...selectedPaperQuestions];
    const q = updated[idx];
    if (!q) return;
    const isCurrentlyHidden = q.hideSection !== undefined ? q.hideSection : hideAllSections;
    const nextHide = !isCurrentlyHidden;
    updated[idx] = { ...q, hideSection: nextHide };
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(nextHide ? `Hidden section "${q.title || 'Section'}" on paper` : `Restored & showing section "${q.title || 'Section'}" on paper`);
  };

  // Toggle collapsing questions under a section in the Canvas editor
  const handleToggleSectionCollapse = (secId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  // Set / Remove blank lines for a question
  const handleUpdateQuestionBlankLines = (idx: number, lineCount: number, style: string = 'ruled') => {
    const updated = [...selectedPaperQuestions];
    const targetQ = updated[idx];
    if (!targetQ) return;
    const clampedLines = Math.max(0, Math.min(20, lineCount));
    const calculatedHeight = clampedLines * 22;
    updated[idx] = {
      ...targetQ,
      blankLinesCount: clampedLines,
      blankSpaceHeight: calculatedHeight,
      blankSpaceStyle: style,
    };
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(clampedLines > 0 ? `Set ${clampedLines} blank answer lines for Q${idx + 1}` : `Removed blank lines from Q${idx + 1}`);
  };

  // Batch: Add blank lines to all questions
  const handleBatchSetBlankLines = (lineCount: number = 3, style: string = 'ruled') => {
    const updated = selectedPaperQuestions.map((q) => {
      if (q.type === 'section' || q.type === 'note' || q.type === 'space') return q;
      return {
        ...q,
        blankLinesCount: lineCount,
        blankSpaceHeight: lineCount * 22,
        blankSpaceStyle: style,
      };
    });
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(`Added ${lineCount} blank lines to all questions`);
  };

  // Batch: Remove all blank lines from all questions
  const handleBatchRemoveAllBlankLines = () => {
    const updated = selectedPaperQuestions.map((q) => {
      if (q.type === 'section' || q.type === 'note' || q.type === 'space') return q;
      return {
        ...q,
        blankLinesCount: 0,
        blankSpaceHeight: 0,
      };
    });
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast('Removed all blank lines across entire paper (Eco-Compact mode)');
  };

  // Batch: Toggle all question marks
  const handleBatchToggleAllMarks = () => {
    const next = !showQuestionMarks;
    setShowQuestionMarks(next);
    const updated = selectedPaperQuestions.map((q) => {
      if (q.type === 'section' || q.type === 'note' || q.type === 'space') return q;
      const copy = { ...q };
      delete copy.hideMarks;
      return copy;
    });
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated, { showQuestionMarks: next });
    showToast(next ? '✓ Question marks visible on paper' : '🚫 All question marks removed from paper');
  };

  // Batch: Toggle all MCQ options
  const handleBatchToggleAllOptions = () => {
    const next = !hideAllOptions;
    setHideAllOptions(next);
    const updated = selectedPaperQuestions.map((q) => {
      if (q.type === 'section' || q.type === 'note' || q.type === 'space') return q;
      const copy = { ...q };
      delete copy.hideOptions;
      return copy;
    });
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated, { hideAllOptions: next });
    showToast(next ? '🙈 All MCQ choices hidden (Subjective test mode)' : '👁 All MCQ choices are now visible on paper');
  };

  // Batch: Toggle visibility of all Section headings on paper
  const handleBatchToggleAllSections = () => {
    const next = !hideAllSections;
    setHideAllSections(next);
    const updated = selectedPaperQuestions.map((q) => {
      if (q.type === 'section') {
        const copy = { ...q };
        delete copy.hideSection;
        return copy;
      }
      return q;
    });
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated, { hideAllSections: next });
    showToast(next ? '🙈 All section headings hidden from paper' : '👁 All section headings are now visible on paper');
  };

  // Toggle or adjust question blank space height
  const handleUpdateQuestionBlankSpace = (idx: number, height: number, style: string = 'blank') => {
    const updated = [...selectedPaperQuestions];
    const targetQ = updated[idx];
    if (!targetQ) return;
    const lines = Math.max(0, Math.floor(height / 22));
    updated[idx] = { ...targetQ, blankSpaceHeight: height, blankLinesCount: lines, blankSpaceStyle: style };
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(height > 0 ? `Added answer space (${lines} lines) to Q${idx + 1}` : `Removed answer space from Q${idx + 1}`);
  };

  // Add standalone blank space block to canvas
  const handleAddBlankSpace = (height: number = 60, spaceStyle: string = 'blank', insertIdx?: number) => {
    const spaceItem = {
      id: `space_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'space',
      height,
      spaceStyle,
    };
    let updated: any[];
    if (insertIdx !== undefined && insertIdx !== null && insertIdx >= 0) {
      updated = [...selectedPaperQuestions];
      updated.splice(insertIdx, 0, spaceItem);
    } else {
      updated = [...selectedPaperQuestions, spaceItem];
    }
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    showToast(`Added ${spaceStyle === 'rough' ? 'Rough Work Box' : spaceStyle === 'ruled' ? 'Ruled Answer Lines' : 'Blank Space'} (${height}px)!`);
  };

  // Persistent Image Resize Handler for Canvas
  const handleResizeDiagramOnCanvas = (qIdx: number, dIdx: number, w: number, h: number) => {
    const updated = [...selectedPaperQuestions];
    const targetQ = updated[qIdx];
    if (!targetQ) return;
    const diags = typeof targetQ.diagramsJson === 'string' ? JSON.parse(targetQ.diagramsJson) : targetQ.diagrams || [];
    if (diags[dIdx]) {
      const currentDiag = typeof diags[dIdx] === 'string' ? { relative_url: diags[dIdx] } : diags[dIdx];
      diags[dIdx] = { ...currentDiag, width: w, height: h };
      updated[qIdx] = { ...targetQ, diagrams: diags, diagramsJson: JSON.stringify(diags) };
      setSelectedPaperQuestions(updated);
      savePaperLayout(updated);
    }
  };

  // Persistent Image Move / Alignment & Offset Handler for Canvas
  const handleMoveDiagramOnCanvas = (
    qIdx: number,
    dIdx: number,
    alignment: 'left' | 'center' | 'right' | 'inline',
    offsetX: number = 0,
    offsetY: number = 0,
    isLive: boolean = false
  ) => {
    const updated = [...selectedPaperQuestions];
    const targetQ = updated[qIdx];
    if (!targetQ) return;
    const rawDiags = typeof targetQ.diagramsJson === 'string' ? JSON.parse(targetQ.diagramsJson) : targetQ.diagrams || [];
    const diags = [...rawDiags];
    if (diags[dIdx]) {
      const currentDiag = typeof diags[dIdx] === 'string' ? { relative_url: diags[dIdx] } : diags[dIdx];
      diags[dIdx] = {
        ...currentDiag,
        alignment,
        offsetX,
        offsetY,
      };
      updated[qIdx] = { ...targetQ, diagrams: diags, diagramsJson: JSON.stringify(diags) };
      setSelectedPaperQuestions(updated);
      if (!isLive) {
        savePaperLayout(updated);
      }
    }
  };

  const handleResizeOptionImageOnCanvas = (qIdx: number, optIdx: number, w: number, h: number) => {
    const updated = [...selectedPaperQuestions];
    const targetQ = updated[qIdx];
    const opts = typeof targetQ.optionsJson === 'string' ? JSON.parse(targetQ.optionsJson) : targetQ.options || [];
    if (opts[optIdx]) {
      opts[optIdx] = { ...opts[optIdx], imageWidth: w, imageHeight: h };
      updated[qIdx] = { ...targetQ, options: opts, optionsJson: JSON.stringify(opts) };
      setSelectedPaperQuestions(updated);
      savePaperLayout(updated);
    }
  };

  // Delete a specific diagram from a question on the canvas
  const handleDeleteDiagramOnCanvas = (qIdx: number, dIdx: number) => {
    const updated = [...selectedPaperQuestions];
    const targetQ = updated[qIdx];
    if (targetQ) {
      const diagrams = typeof targetQ.diagramsJson === 'string' ? JSON.parse(targetQ.diagramsJson) : targetQ.diagrams || [];
      const newDiagrams = diagrams.filter((_: any, i: number) => i !== dIdx);
      updated[qIdx] = { ...targetQ, diagrams: newDiagrams, diagramsJson: JSON.stringify(newDiagrams) };
      setSelectedPaperQuestions(updated);
      savePaperLayout(updated);
      showToast(`Deleted image figure from Q${qIdx + 1}`);
    }
  };

  // Delete an option image from a question on the canvas
  const handleDeleteOptionImageOnCanvas = (qIdx: number, optIdx: number) => {
    const updated = [...selectedPaperQuestions];
    const targetQ = updated[qIdx];
    if (targetQ) {
      const opts = typeof targetQ.optionsJson === 'string' ? JSON.parse(targetQ.optionsJson) : targetQ.options || [];
      if (opts[optIdx]) {
        opts[optIdx] = { ...opts[optIdx], imageUrl: null, imageWidth: undefined, imageHeight: undefined };
        updated[qIdx] = { ...targetQ, options: opts, optionsJson: JSON.stringify(opts) };
        setSelectedPaperQuestions(updated);
        savePaperLayout(updated);
        showToast(`Deleted image from option (${opts[optIdx].key || optIdx + 1})`);
      }
    }
  };

  // Open Edit Question Modal for a question on the canvas
  const handleOpenEditQuestion = (idx: number) => {
    const q = selectedPaperQuestions[idx];
    if (!q) return;
    const opts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
    const diagrams = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson) : q.diagrams || [];
    setEditingQuestionIndex(idx);
    setEditQForm({
      questionText: q.questionText || q.question_text || '',
      marks: q.marks || 1,
      negativeMarks: q.negativeMarks || 0,
      difficulty: q.difficulty || 'MEDIUM',
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      options: opts.length > 0 ? opts.map((o: any) => ({ ...o })) : [
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' },
      ],
      diagrams: diagrams.map((d: any) => ({ ...d })),
    });
  };

  // Upload Diagram Image inside Edit Question Modal
  const handleUploadEditQDiagram = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editQForm) return;
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.url;
      setEditQForm({
        ...editQForm,
        diagrams: [...editQForm.diagrams, { relative_url: url, title: file.name }],
      });
      showToast('Uploaded diagram figure!');
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    }
  };

  // Save changes from Edit Question Modal
  const handleSaveEditedQuestion = async () => {
    if (editingQuestionIndex === null || !editQForm) return;
    const updated = [...selectedPaperQuestions];
    const targetQ = updated[editingQuestionIndex];
    const newQ = {
      ...targetQ,
      questionText: editQForm.questionText,
      marks: Number(editQForm.marks) || 1,
      negativeMarks: Number(editQForm.negativeMarks) || 0,
      difficulty: editQForm.difficulty,
      correctAnswer: editQForm.correctAnswer,
      explanation: editQForm.explanation,
      options: editQForm.options,
      optionsJson: JSON.stringify(editQForm.options),
      diagrams: editQForm.diagrams,
      diagramsJson: JSON.stringify(editQForm.diagrams),
    };
    updated[editingQuestionIndex] = newQ;
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);

    // If question has an ID in database, also sync to database
    if (targetQ.id) {
      try {
        await api.put(`/questions/${targetQ.id}`, {
          questionText: editQForm.questionText,
          marks: Number(editQForm.marks) || 1,
          negativeMarks: Number(editQForm.negativeMarks) || 0,
          difficulty: editQForm.difficulty,
          correctAnswer: editQForm.correctAnswer,
          explanation: editQForm.explanation,
          options: editQForm.options,
          diagrams: editQForm.diagrams,
        });
      } catch (e: any) {
        console.warn('Could not sync edit to DB question:', e.message);
      }
    }

    setEditingQuestionIndex(null);
    setEditQForm(null);
    showToast(`✓ Updated Q${editingQuestionIndex + 1} successfully!`);
  };

  // Open Quick Answer Key Modal / Popover
  const handleOpenEditAnswerModal = (idx: number) => {
    const q = selectedPaperQuestions[idx];
    if (!q) return;
    setQuickAnswerModalIdx(idx);
    setQuickAnswerVal(q.correctAnswer || '');
    setQuickExplanationVal(q.explanation || '');
  };

  // Save Quick Answer Key to both active Paper and Question Bank Database
  const handleSaveQuickAnswer = async (idx: number, answer: string, explanation: string = '') => {
    const updated = [...selectedPaperQuestions];
    const targetQ = updated[idx];
    if (!targetQ) return;
    const newQ = {
      ...targetQ,
      correctAnswer: answer.trim(),
      explanation: explanation.trim(),
    };
    updated[idx] = newQ;
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);

    // If question has an ID in database, also permanently save to Question Bank
    if (targetQ.id) {
      try {
        await api.put(`/questions/${targetQ.id}`, {
          correctAnswer: answer.trim(),
          explanation: explanation.trim(),
        });
      } catch (e: any) {
        console.warn('Could not sync answer to Question Bank:', e.message);
      }
    }

    setQuickAnswerModalIdx(null);
    showToast(`✓ Correct answer for Q${idx + 1} saved to Question Bank & Paper!`);
  };

  // Batch Auto-Scale: Match All Option Images to Text Font Height (22px)
  const handleMatchAllOptionImagesToText = (targetHeight: number = 22) => {
    const updated = selectedPaperQuestions.map((q) => {
      const opts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
      const updatedOpts = opts.map((o: any) => {
        if (o.imageUrl) {
          return { ...o, imageHeight: targetHeight };
        }
        return o;
      });
      return {
        ...q,
        options: updatedOpts,
        optionsJson: JSON.stringify(updatedOpts),
      };
    });
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated, { imageScale: 'match' });
    showToast(`Matched all option images to text height (${targetHeight}px)!`);
  };

  // Logo Upload & Management Handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.url;
      setSchoolLogoUrl(url);
      savePaperLayout(selectedPaperQuestions, { schoolLogoUrl: url });
      showToast('School logo uploaded & inserted into canvas!');
    } catch (err: any) {
      alert(`Logo upload failed: ${err.message}`);
    }
  };

  // Question Bank Multi-Select Handlers
  const handleToggleSelectBankQuestion = (qId: string) => {
    setSelectedBankQIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleToggleSelectAllBankQuestions = () => {
    if (selectedBankQIds.size >= bankQuestions.length && bankQuestions.length > 0) {
      setSelectedBankQIds(new Set());
    } else {
      setSelectedBankQIds(new Set(bankQuestions.map((q) => q.id)));
    }
  };

  const handleAddSelectedQuestionsToCanvas = () => {
    const questionsToAdd = bankQuestions.filter(
      (q) => selectedBankQIds.has(q.id) && !selectedPaperQuestions.some((item) => item.id === q.id)
    );
    if (questionsToAdd.length === 0) {
      showToast('Selected questions are already on canvas');
      return;
    }
    const updated = [...selectedPaperQuestions, ...questionsToAdd.map((q) => ({ ...q }))];
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    setSelectedBankQIds(new Set());
    showToast(`Added ${questionsToAdd.length} questions to paper!`);
  };

  // Helper: Traverse folder tree and collect all descendant IDs
  const getFolderAndDescendantIds = (folder: any): string[] => {
    if (!folder) return [];
    const ids: string[] = [folder.id];
    if (folder.children && Array.isArray(folder.children)) {
      for (const child of folder.children) {
        ids.push(...getFolderAndDescendantIds(child));
      }
    }
    return ids;
  };

  // Open Question Bank Explorer modal with smart pre-filtering
  const handleOpenQuestionBankExplorer = () => {
    // Pre-populate marks map for all bank questions
    const marksMap: Record<string, number> = {};
    bankQuestions.forEach((q) => {
      marksMap[q.id] = Number(q.marks) || 1;
    });
    setModalQuestionMarksMap(marksMap);

    // If active paper has className or subjectName, attempt smart match
    if (className && folders.length > 0) {
      const matchedClass = folders.find((f) => f.name.toLowerCase().includes(className.toLowerCase()));
      if (matchedClass) {
        setBankFolderFilter(matchedClass.id);
        if (subjectName && matchedClass.children?.length > 0) {
          const matchedSub = matchedClass.children.find((s: any) =>
            s.name.toLowerCase().includes(subjectName.toLowerCase())
          );
          if (matchedSub) {
            setBankSubjectFilter(matchedSub.id);
          }
        }
      }
    }

    setIsQuestionBankModalOpen(true);
  };

  // Modal question selection handlers
  const handleToggleSelectModalQuestion = (qId: string) => {
    setModalSelectedQIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleToggleSelectAllFilteredModal = (filteredIds: string[]) => {
    if (filteredIds.length === 0) return;
    const allSelected = filteredIds.every((id) => modalSelectedQIds.has(id));
    setModalSelectedQIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleUpdateModalQuestionMarks = (qId: string, newMarks: number) => {
    const clamped = Math.max(0.5, Math.round(newMarks * 10) / 10);
    setModalQuestionMarksMap((prev) => ({
      ...prev,
      [qId]: clamped,
    }));
  };

  const handleInsertQuestionsFromModalToCanvas = () => {
    if (modalSelectedQIds.size === 0) {
      alert('Please select at least one question to insert.');
      return;
    }

    const selectedList = bankQuestions.filter((q) => modalSelectedQIds.has(q.id));
    const itemsToAdd = selectedList.map((q) => {
      const assignedMarks = modalQuestionMarksMap[q.id] !== undefined
        ? modalQuestionMarksMap[q.id]
        : (Number(q.marks) || 1);
      return {
        ...q,
        marks: assignedMarks,
      };
    });

    const updated = [...selectedPaperQuestions, ...itemsToAdd];
    setSelectedPaperQuestions(updated);
    savePaperLayout(updated);
    setIsQuestionBankModalOpen(false);
    setModalSelectedQIds(new Set());
    showToast(`✓ Inserted ${itemsToAdd.length} question(s) with assigned marks to Canvas!`);
  };

  // Helper to extract available chapters/topics given folder & subject filters
  const getAvailableChapters = (folderFilter: string, subjectFilter: string) => {
    let candidateSubjects: any[] = [];
    if (folderFilter !== 'all') {
      const cls = folders.find((f) => f.id === folderFilter);
      if (cls && cls.children) {
        if (subjectFilter !== 'all') {
          candidateSubjects = cls.children.filter(
            (s: any) => s.id === subjectFilter || s.name.toLowerCase() === subjectFilter.toLowerCase()
          );
        } else {
          candidateSubjects = cls.children;
        }
      }
    } else {
      if (subjectFilter !== 'all') {
        folders.forEach((f) => {
          f.children?.forEach((s: any) => {
            if (s.id === subjectFilter || s.name.toLowerCase() === subjectFilter.toLowerCase()) {
              candidateSubjects.push(s);
            }
          });
        });
      } else {
        folders.forEach((f) => {
          f.children?.forEach((s: any) => candidateSubjects.push(s));
        });
      }
    }

    const chapters: any[] = [];
    const seen = new Set<string>();
    candidateSubjects.forEach((sub) => {
      sub.children?.forEach((ch: any) => {
        const key = ch.name.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          chapters.push(ch);
        }
      });
    });

    return chapters;
  };

  // Helper to extract available subtopics/units/DPPs given chapter filter
  const getAvailableSubTopics = (folderFilter: string, subjectFilter: string, chapterFilter: string) => {
    if (chapterFilter === 'all') return [];
    const availableChapters = getAvailableChapters(folderFilter, subjectFilter);
    const matchedChapters = availableChapters.filter(
      (c) => c.id === chapterFilter || c.name.trim().toLowerCase() === chapterFilter.trim().toLowerCase()
    );

    const subTopics: any[] = [];
    const seen = new Set<string>();
    matchedChapters.forEach((ch) => {
      ch.children?.forEach((st: any) => {
        const key = st.name.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          subTopics.push(st);
        }
      });
    });
    return subTopics;
  };

  // Filtered bank questions for the dedicated Question Bank Explorer modal
  const filteredModalQuestions = bankQuestions.filter((q) => {
    // 1. Folder / Class filter
    if (bankFolderFilter !== 'all') {
      const classFolder = folders.find((f) => f.id === bankFolderFilter);
      if (classFolder) {
        const allowedIds = getFolderAndDescendantIds(classFolder);
        const matchId = q.folderId && allowedIds.includes(q.folderId);
        const matchName =
          q.folder?.name?.toLowerCase().includes(classFolder.name.toLowerCase()) ||
          q.folder?.parent?.name?.toLowerCase().includes(classFolder.name.toLowerCase()) ||
          q.folder?.parent?.parent?.name?.toLowerCase().includes(classFolder.name.toLowerCase());
        if (!matchId && !matchName) return false;
      }
    }

    // 2. Subject filter
    if (bankSubjectFilter !== 'all') {
      const matchedSubjects: any[] = [];
      for (const f of folders) {
        if (f.children) {
          f.children.forEach((s: any) => {
            if (s.id === bankSubjectFilter || s.name.toLowerCase() === bankSubjectFilter.toLowerCase()) {
              matchedSubjects.push(s);
            }
          });
        }
      }
      if (matchedSubjects.length > 0) {
        const allowedSubjectIds = matchedSubjects.flatMap((s) => getFolderAndDescendantIds(s));
        const matchId = q.folderId && allowedSubjectIds.includes(q.folderId);
        const matchName = matchedSubjects.some((s) =>
          q.folder?.name?.toLowerCase().includes(s.name.toLowerCase()) ||
          q.folder?.parent?.name?.toLowerCase().includes(s.name.toLowerCase()) ||
          q.folder?.parent?.parent?.name?.toLowerCase().includes(s.name.toLowerCase())
        );
        if (!matchId && !matchName) return false;
      } else {
        const matchName =
          q.folder?.name?.toLowerCase() === bankSubjectFilter.toLowerCase() ||
          q.folder?.parent?.name?.toLowerCase() === bankSubjectFilter.toLowerCase();
        if (!matchName) return false;
      }
    }

    // 3. Chapter / Topic filter (Sub-filter 1)
    if (bankChapterFilter !== 'all') {
      const availableChapters = getAvailableChapters(bankFolderFilter, bankSubjectFilter);
      const matchedChapters = availableChapters.filter(
        (c) => c.id === bankChapterFilter || c.name.trim().toLowerCase() === bankChapterFilter.trim().toLowerCase()
      );
      if (matchedChapters.length > 0) {
        const allowedChapterIds = matchedChapters.flatMap((c) => getFolderAndDescendantIds(c));
        const matchId = q.folderId && allowedChapterIds.includes(q.folderId);
        const matchName = matchedChapters.some((c) =>
          q.folder?.name?.toLowerCase().includes(c.name.toLowerCase()) ||
          q.folder?.parent?.name?.toLowerCase().includes(c.name.toLowerCase())
        );
        if (!matchId && !matchName) return false;
      } else {
        const matchName =
          q.folder?.name?.toLowerCase().includes(bankChapterFilter.toLowerCase()) ||
          q.folder?.parent?.name?.toLowerCase().includes(bankChapterFilter.toLowerCase());
        if (!matchName) return false;
      }
    }

    // 4. Sub-Topic / DPP / Section filter (Sub-filter 2)
    if (bankSubTopicFilter !== 'all') {
      const availableSubTopics = getAvailableSubTopics(bankFolderFilter, bankSubjectFilter, bankChapterFilter);
      const matchedSubTopics = availableSubTopics.filter(
        (st) => st.id === bankSubTopicFilter || st.name.trim().toLowerCase() === bankSubTopicFilter.trim().toLowerCase()
      );
      if (matchedSubTopics.length > 0) {
        const allowedSubTopicIds = matchedSubTopics.flatMap((st) => getFolderAndDescendantIds(st));
        const matchId = q.folderId && allowedSubTopicIds.includes(q.folderId);
        const matchName = matchedSubTopics.some((st) =>
          q.folder?.name?.toLowerCase().includes(st.name.toLowerCase())
        );
        if (!matchId && !matchName) return false;
      } else {
        const matchName = q.folder?.name?.toLowerCase().includes(bankSubTopicFilter.toLowerCase());
        if (!matchName) return false;
      }
    }

    // 5. Search filter
    if (bankSearchQuery.trim()) {
      const query = bankSearchQuery.toLowerCase();
      const matchText = q.questionText?.toLowerCase().includes(query);
      const matchNum = String(q.questionNumber).includes(query);
      const matchSub = q.folder?.name?.toLowerCase().includes(query);
      if (!matchText && !matchNum && !matchSub) return false;
    }

    // 6. Difficulty filter
    if (bankDifficultyFilter !== 'all') {
      if ((q.difficulty || 'MEDIUM').toUpperCase() !== bankDifficultyFilter.toUpperCase()) {
        return false;
      }
    }

    return true;
  });

  // Filtered questions for the Left Panel sidebar
  const filteredSidebarQuestions = bankQuestions.filter((q) => {
    if (sidebarFolderFilter !== 'all') {
      const classFolder = folders.find((f) => f.id === sidebarFolderFilter);
      if (classFolder) {
        const allowedIds = getFolderAndDescendantIds(classFolder);
        const matchId = q.folderId && allowedIds.includes(q.folderId);
        const matchName =
          q.folder?.name?.toLowerCase().includes(classFolder.name.toLowerCase()) ||
          q.folder?.parent?.name?.toLowerCase().includes(classFolder.name.toLowerCase());
        if (!matchId && !matchName) return false;
      }
    }
    if (sidebarSubjectFilter !== 'all') {
      const matchedSubjects: any[] = [];
      for (const f of folders) {
        if (f.children) {
          f.children.forEach((s: any) => {
            if (s.id === sidebarSubjectFilter || s.name.toLowerCase() === sidebarSubjectFilter.toLowerCase()) {
              matchedSubjects.push(s);
            }
          });
        }
      }
      if (matchedSubjects.length > 0) {
        const allowedSubjectIds = matchedSubjects.flatMap((s) => getFolderAndDescendantIds(s));
        const matchId = q.folderId && allowedSubjectIds.includes(q.folderId);
        const matchName = matchedSubjects.some((s) =>
          q.folder?.name?.toLowerCase().includes(s.name.toLowerCase()) ||
          q.folder?.parent?.name?.toLowerCase().includes(s.name.toLowerCase())
        );
        if (!matchId && !matchName) return false;
      } else {
        const matchName = q.folder?.name?.toLowerCase() === sidebarSubjectFilter.toLowerCase();
        if (!matchName) return false;
      }
    }
    if (sidebarChapterFilter !== 'all') {
      const availableChapters = getAvailableChapters(sidebarFolderFilter, sidebarSubjectFilter);
      const matchedChapters = availableChapters.filter(
        (c) => c.id === sidebarChapterFilter || c.name.trim().toLowerCase() === sidebarChapterFilter.trim().toLowerCase()
      );
      if (matchedChapters.length > 0) {
        const allowedChapterIds = matchedChapters.flatMap((c) => getFolderAndDescendantIds(c));
        const matchId = q.folderId && allowedChapterIds.includes(q.folderId);
        const matchName = matchedChapters.some((c) =>
          q.folder?.name?.toLowerCase().includes(c.name.toLowerCase())
        );
        if (!matchId && !matchName) return false;
      } else {
        const matchName = q.folder?.name?.toLowerCase().includes(sidebarChapterFilter.toLowerCase());
        if (!matchName) return false;
      }
    }
    if (sidebarSubTopicFilter !== 'all') {
      const availableSubTopics = getAvailableSubTopics(sidebarFolderFilter, sidebarSubjectFilter, sidebarChapterFilter);
      const matchedSubTopics = availableSubTopics.filter(
        (st) => st.id === sidebarSubTopicFilter || st.name.trim().toLowerCase() === sidebarSubTopicFilter.trim().toLowerCase()
      );
      if (matchedSubTopics.length > 0) {
        const allowedSubTopicIds = matchedSubTopics.flatMap((st) => getFolderAndDescendantIds(st));
        const matchId = q.folderId && allowedSubTopicIds.includes(q.folderId);
        const matchName = matchedSubTopics.some((st) =>
          q.folder?.name?.toLowerCase().includes(st.name.toLowerCase())
        );
        if (!matchId && !matchName) return false;
      } else {
        const matchName = q.folder?.name?.toLowerCase().includes(sidebarSubTopicFilter.toLowerCase());
        if (!matchName) return false;
      }
    }
    if (sidebarSearchQuery.trim()) {
      const query = sidebarSearchQuery.toLowerCase();
      if (!q.questionText?.toLowerCase().includes(query) && !String(q.questionNumber).includes(query)) {
        return false;
      }
    }
    return true;
  });

  // Preset Applicator: Zero Spacing (Eco-Compact)
  const applyZeroSpacingPreset = () => {
    setSpacingPreset('zero');
    setPageMargin('zero');
    setFontSize('10pt');
    setLineSpacing('none');
    setBorderStyle('divider');
    setPageColumns(2);
    setImageBorderStyle('none');
    setWrapOptionsBesideDiagram(true);
    handleSetAllImageHeights(15);
    savePaperLayout(selectedPaperQuestions, {
      spacingPreset: 'zero',
      pageMargin: 'zero',
      fontSize: '10pt',
      lineSpacing: 'none',
      borderStyle: 'divider',
      pageColumns: 2,
      imageBorderStyle: 'none',
      wrapOptionsBesideDiagram: true,
    });
    showToast('Applied Zero-Spacing (Eco-Compact) Mode: Removed spaces between text & questions!');
  };

  // Dedicated Handler: Remove Spaces Between Text
  const handleRemoveSpacesBetweenText = () => {
    setLineSpacing('none');
    setSpacingPreset('zero');
    setWrapOptionsBesideDiagram(true);

    // Clean redundant extra whitespace and blank lines in question & option texts
    const cleaned = selectedPaperQuestions.map((q) => {
      let qText = q.questionText || q.question_text || '';
      // Collapse multiple consecutive spaces (excluding newlines)
      qText = qText.replace(/[^\S\r\n]{2,}/g, ' ');
      // Collapse multiple consecutive blank lines into a single newline
      qText = qText.replace(/\n{2,}/g, '\n').trim();

      const rawOpts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
      const cleanedOpts = rawOpts.map((opt: any) => ({
        ...opt,
        text: typeof opt.text === 'string' ? opt.text.replace(/[^\S\r\n]{2,}/g, ' ').trim() : opt.text,
      }));

      return {
        ...q,
        questionText: qText,
        question_text: qText,
        options: cleanedOpts,
        optionsJson: JSON.stringify(cleanedOpts),
      };
    });

    setSelectedPaperQuestions(cleaned);
    savePaperLayout(cleaned, { lineSpacing: 'none', spacingPreset: 'zero', wrapOptionsBesideDiagram: true });
    showToast('Removed spaces between text! (Zero Line Spacing, Zero Gap & Wrapped Choices applied)');
  };

  const handleFinalizeSnapshot = async () => {
    if (!activePaper) return;
    if (marksMismatch && !adminOverride) {
      alert(`Cannot finalize: Marks mismatch! ${Math.abs(marksDiff)} marks ${marksDiff > 0 ? 'remaining' : 'over'}.`);
      return;
    }

    setLoading(true);
    setSnapshotResult(null);

    const answerKey: Record<string, string> = {};
    selectedPaperQuestions.forEach((q, idx) => {
      answerKey[String(idx + 1)] = q.correctAnswer || 'A';
    });

    try {
      const res = await api.post(`/papers/${activePaper.id}/finalize`, {
        adminOverride,
        questionsSnapshot: selectedPaperQuestions,
        answerKey,
      });

      setSnapshotResult(res.data);
      fetchInitialData();
      showToast('Immutable Examination Snapshot Frozen Successfully!');
    } catch (err: any) {
      alert(`Finalization failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Typography Class Resolver
  const getFontFamilyClass = () => {
    switch (fontFamily) {
      case 'serif': return 'font-serif-times';
      case 'cm': return 'font-serif-cm';
      case 'calibri': return 'font-sans-calibri';
      case 'sans': return 'font-sans-arial';
      case 'cambria': return 'font-serif-cambria';
      case 'georgia': return 'font-serif-georgia';
      case 'garamond': return 'font-serif-garamond';
      case 'verdana': return 'font-sans-verdana';
      case 'trebuchet': return 'font-sans-trebuchet';
      case 'bookman': return 'font-serif-bookman';
      case 'dejavu': return 'font-sans-dejavu';
      case 'monospace': return 'font-mono-code';
      default: return 'font-serif-times';
    }
  };

  const getFontSizeClass = () => {
    const pt = parseFloat(fontSize) || baseFontSizePt || 10;
    if (pt <= 8.5) return 'text-[10px]';
    if (pt <= 9.5) return 'text-[11px]';
    if (pt <= 10.5) return 'text-xs';
    if (pt <= 11.5) return 'text-[13px]';
    if (pt <= 12.5) return 'text-sm';
    if (pt <= 14) return 'text-base';
    return 'text-lg';
  };

  const getLineSpacingClass = () => {
    if (lineSpacing === 'none') return 'leading-[1.08]';
    if (lineSpacing === 'compact') return 'leading-[1.18]';
    if (lineSpacing === 'tight') return 'leading-tight';
    if (lineSpacing === 'relaxed') return 'leading-relaxed';
    return 'leading-normal';
  };

  const getMarginClass = (isSideBySide: boolean) => {
    if (isSideBySide) {
      if (pageMargin === 'zero') return 'p-1.5';
      if (pageMargin === 'narrow') return 'p-2.5';
      if (pageMargin === 'wide') return 'p-6';
      return 'p-4';
    } else {
      if (pageMargin === 'zero') return 'p-2.5';
      if (pageMargin === 'narrow') return 'p-4';
      if (pageMargin === 'wide') return 'p-12';
      return 'p-8';
    }
  };

  // Reusable WYSIWYG A4 White Paper Sheet Content
  const renderA4SheetContent = (isSideBySide: boolean = false) => {
    const eff = getEffectiveMarginsMm();
    const scale = isSideBySide ? 0.65 : 1.0;
    const paddingStyle = {
      paddingTop: `${Math.round(eff.top * scale * 3.78)}px`,
      paddingBottom: `${Math.round(eff.bottom * scale * 3.78)}px`,
      paddingLeft: `${Math.round(eff.left * scale * 3.78)}px`,
      paddingRight: `${Math.round(eff.right * scale * 3.78)}px`,
      minHeight: isSideBySide ? 'auto' : '297mm',
    };

    return (
      <div
        className={`bg-white text-black rounded-xl shadow-2xl printable-paper relative transition-all ${getFontFamilyClass()} ${
          isSideBySide
            ? 'w-full text-[11px] leading-snug overflow-y-auto max-h-[760px] border border-slate-300 select-text'
            : 'max-w-4xl mx-auto my-6 print:m-0 print:max-w-none print:w-full print:rounded-none print:shadow-none print:border-none'
        }`}
        style={paddingStyle}
      >
        {/* Dynamic Print Page Margin Injection & Browser Header/Footer Suppression */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            .printable-paper {
              padding: 0 !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .print-paged-table {
              display: table !important;
              width: 100% !important;
              border-collapse: collapse !important;
              border-spacing: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
            }
            .print-paged-thead {
              display: table-header-group !important;
            }
            .print-paged-thead tr td {
              height: ${eff.top}mm !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
            }
            .print-paged-tfoot {
              display: table-footer-group !important;
            }
            .print-paged-tfoot tr td {
              height: ${eff.bottom}mm !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
            }
            .print-paged-body {
              display: table-row-group !important;
            }
            .print-paged-cell {
              display: table-cell !important;
              padding-left: ${eff.left}mm !important;
              padding-right: ${eff.right}mm !important;
              padding-top: 0 !important;
              padding-bottom: 0 !important;
              border: none !important;
              vertical-align: top !important;
            }
          }
        `}</style>
        {/* Margin Guide Boundary Overlay (Screen Only) */}
        {showMarginGuide && (
          <div
            className="absolute pointer-events-none border-2 border-dashed border-indigo-400/80 z-30 rounded-sm print:hidden"
            style={{
              top: paddingStyle.paddingTop,
              bottom: paddingStyle.paddingBottom,
              left: paddingStyle.paddingLeft,
              right: paddingStyle.paddingRight,
            }}
          >
            <div className="absolute -top-3 left-1.5 bg-indigo-600 text-white text-[9px] font-mono px-1.5 py-0.2 rounded shadow flex items-center space-x-1 select-none">
              <span>📐 Margins:</span>
              <span className="font-bold">{eff.left}L &bull; {eff.right}R &bull; {eff.top}T &bull; {eff.bottom}B mm</span>
            </div>
          </div>
        )}
      {/* Watermark Overlay */}
      {showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none rotate-[-30deg]">
          <span className={`${isSideBySide ? 'text-5xl' : 'text-8xl'} font-black tracking-widest text-slate-950 uppercase`}>
            {watermarkText}
          </span>
        </div>
      )}

      {/* Multi-Page Print Layout Structure: repeats top & bottom margins on every page while suppressing browser headers/footers */}
      <table className="w-full border-collapse print-paged-table block print:table">
        <thead className="print-paged-thead hidden print:table-header-group">
          <tr>
            <td style={{ height: `${eff.top}mm`, padding: 0, margin: 0, border: 'none' }}>
              <div style={{ height: `${eff.top}mm` }} />
            </td>
          </tr>
        </thead>
        <tfoot className="print-paged-tfoot hidden print:table-footer-group">
          <tr>
            <td style={{ height: `${eff.bottom}mm`, padding: 0, margin: 0, border: 'none' }}>
              <div style={{ height: `${eff.bottom}mm` }} />
            </td>
          </tr>
        </tfoot>
        <tbody className="print-paged-body block print:table-row-group">
          <tr className="block print:table-row">
            <td className="print-paged-cell block print:table-cell" style={{ border: 'none', verticalAlign: 'top' }}>
              {/* Paper Header with School Logo & Examination Metadata */}
              <div className="border-b-2 border-black pb-2.5 mb-2.5">
        <div className={`flex items-center gap-3 ${
          schoolLogoPosition === 'center'
            ? 'flex-col justify-center text-center'
            : schoolLogoPosition === 'right'
            ? 'flex-row-reverse justify-between'
            : 'flex-row justify-between'
        }`}>
          {schoolLogoUrl && (
            <div className="shrink-0">
              <img
                src={schoolLogoUrl}
                alt="School Logo"
                style={{
                  width: `${isSideBySide ? Math.min(schoolLogoWidth, 65) : schoolLogoWidth}px`,
                  height: `${isSideBySide ? Math.min(schoolLogoHeight, 65) : schoolLogoHeight}px`,
                  maxHeight: isSideBySide ? '75px' : '120px',
                }}
                className="object-contain"
              />
            </div>
          )}

          <div className="flex-1 text-center space-y-0.5">
            {showSchoolName && (
              <h1
                className="font-bold uppercase tracking-wider"
                style={{ fontSize: `${isSideBySide ? Math.max(12, schoolNameSize - 4) : schoolNameSize}px` }}
              >
                {schoolName || 'ENTER SCHOOL NAME'}
              </h1>
            )}
            {showExamTitle && (
              <h2
                className="font-semibold uppercase"
                style={{ fontSize: `${isSideBySide ? Math.max(10, examTitleSize - 3) : examTitleSize}px` }}
              >
                {title || 'EXAMINATION PAPER'}
              </h2>
            )}
          </div>
        </div>

        {showHeaderMeta && (
          <div className={`flex flex-wrap items-center justify-between ${isSideBySide ? 'text-[10px]' : 'text-xs'} pt-1.5 font-mono font-semibold gap-x-3 gap-y-1`}>
            {showExamCode && <span>EXAM CODE: {examCode}</span>}
            {showTime && <span>TIME: {numericDuration} MINS</span>}
            {showMaxMarks && <span>MAX MARKS: {numericMaxMarks}</span>}
            {customHeaderFields.map((f) => (
              <span key={f.id} className="text-black">{f.label}: {f.value}</span>
            ))}
          </div>
        )}
      </div>

      {/* Candidate Information & Instructions */}
      {showCandidateBox && (
        <div className="border border-black p-2 mb-2.5 space-y-1" style={{ fontSize: `${candidateBoxFontSize}px` }}>
          <div className="flex flex-wrap justify-between items-center font-semibold gap-2">
            {showCandidateName && <span>Candidate Name: ____________________________</span>}

            {customCandidateFields.map((cf) => (
              <span key={cf.id}>{cf.label}: {cf.placeholder}</span>
            ))}

            {/* Roll Number Format */}
            {showRollNo && (
              rollNoStyle === 'boxes' ? (
                <div className="flex items-center space-x-1">
                  <span className="font-mono text-[10px] mr-1">Roll No:</span>
                  <div className="inline-flex space-x-0.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 border border-black bg-white inline-flex items-center justify-center font-mono text-[9px]"
                      />
                    ))}
                  </div>
                </div>
              ) : rollNoStyle === 'blank' ? (
                <div className="flex items-center space-x-1 font-mono text-[10px]">
                  <span>Roll No:</span>
                  <span>________________</span>
                </div>
              ) : null
            )}
          </div>
          {showInstructions && instructions && (
            <div className="text-[9px] whitespace-pre-line leading-tight text-gray-800 border-t border-gray-300 pt-0.5">
              <strong>Instructions:</strong> <MathRenderer content={instructions} inline />
            </div>
          )}
        </div>
      )}

      {/* Teacher's Edition Header Stamp */}
      {isTeacherCopy && (
        <div className="bg-amber-100 border-2 border-amber-500 text-amber-950 px-3 py-1 rounded-md text-center font-bold text-xs uppercase tracking-wider mb-2">
          🎓 TEACHER'S COPY — OFFICIAL ANSWER KEY & SOLUTIONS (QUESTION BANK SYNCHRONIZED)
        </div>
      )}

      {/* Questions in Chosen Columns & Density Mode */}
      <div
        className={`leading-snug ${
          spacingPreset === 'zero'
            ? 'space-y-1'
            : spacingPreset === 'compact'
            ? 'space-y-2'
            : 'space-y-3.5'
        } ${
          pageColumns === 2 ? 'exam-columns-2-print' : ''
        }`}
        style={{ fontSize: `${baseFontSizePt || parseFloat(fontSize) || 10}pt` }}
      >
        {(() => {
          let qCounter = 0;
          return selectedPaperQuestions.map((q, idx) => {
            if (q.type === 'section') {
              const isSectionHidden = q.hideSection !== undefined ? q.hideSection : hideAllSections;
              if (isSectionHidden) return null;
              return (
                <div
                  key={idx}
                  className={`avoid-break py-1.5 my-2 border-b-2 border-black ${q.align === 'left' ? 'text-left' : 'text-center'}`}
                >
                  <div className="font-bold uppercase tracking-wider" style={{ fontSize: `${isSideBySide ? Math.max(11, (q.fontSize || 14) - 2) : (q.fontSize || 14)}px` }}>
                    <MathRenderer content={q.title || ''} inline />
                  </div>
                  {q.subtitle && (
                    <div className="text-[10px] font-normal text-gray-700 italic mt-0.5">
                      <MathRenderer content={q.subtitle} inline />
                    </div>
                  )}
                </div>
              );
            }

            if (q.type === 'note') {
              return (
                <div
                  key={idx}
                  className="avoid-break py-1 my-1 italic text-gray-800 bg-gray-50 border border-gray-200 px-2 rounded"
                  style={{ fontSize: `${isSideBySide ? 10 : (q.fontSize || 11)}px` }}
                >
                  <MathRenderer content={q.text || ''} inline />
                </div>
              );
            }

            if (q.type === 'space') {
              const spaceH = q.height || 60;
              const style = q.spaceStyle || 'blank';
              return (
                <div
                  key={idx}
                  className={`avoid-break my-1 w-full ${
                    style === 'rough'
                      ? 'border border-dashed border-gray-500 flex items-center justify-center'
                      : style === 'ruled'
                      ? 'flex flex-col justify-between'
                      : ''
                  }`}
                  style={{ height: `${spaceH}px` }}
                >
                  {style === 'rough' && (
                    <span className="text-[9px] font-mono uppercase text-gray-500 tracking-widest select-none">
                      — SPACE FOR ROUGH WORK —
                    </span>
                  )}
                  {style === 'ruled' && (
                    <div className="w-full h-full flex flex-col justify-between py-1">
                      {Array.from({ length: Math.max(1, Math.floor(spaceH / 22)) }).map((_, rIdx) => (
                        <div key={rIdx} className="w-full border-b border-dashed border-gray-300 h-0" />
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            qCounter++;
            const currentQNum = qCounter;
            const options = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
            const rawDiagrams = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson) : q.diagrams || [];
            const diagrams = rawDiagrams.map((d: any, origIdx: number) => ({
              ...(typeof d === 'string' ? { relative_url: d } : d),
              originalIndex: origIdx,
            }));
            const isBoxed = borderStyle === 'box';
            const hasDivider = borderStyle === 'divider';
            const isDashed = borderStyle === 'dashed';

            // Default alignment: if question has text, default diagram to 'right' so text wraps around diagram and saves space
            const effectiveDefaultAlign = (imageAlignment === 'inline' && q.questionText && q.questionText.trim() !== '') ? 'right' : imageAlignment;

            const rightDiagrams = diagrams.filter((d: any) => {
              const align = d.alignment || effectiveDefaultAlign;
              return align === 'right' && q.questionText && q.questionText.trim() !== '';
            });

            const leftDiagrams = diagrams.filter((d: any) => {
              const align = d.alignment || effectiveDefaultAlign;
              return align === 'left' && q.questionText && q.questionText.trim() !== '';
            });

            const centerDiagrams = diagrams.filter((d: any) => {
              const align = d.alignment || effectiveDefaultAlign;
              return align === 'center' && q.questionText && q.questionText.trim() !== '';
            });

            const inlineDiagrams = diagrams.filter((d: any) => {
              const align = d.alignment || effectiveDefaultAlign;
              return align === 'inline' || !q.questionText || q.questionText.trim() === '';
            });

            const shouldWrapOptions = q.wrapOptionsBesideDiagram !== undefined ? q.wrapOptionsBesideDiagram : wrapOptionsBesideDiagram;

            const renderA4Options = (wrapBeside: boolean) => (
              <div
                className={`${wrapBeside ? 'relative z-10' : 'clear-both'} ${
                  spacingPreset === 'zero' ? 'pt-0 mt-0.5' : 'pt-0.5 mt-0.5'
                } ${getLineSpacingClass()} ${
                  optionLayout === 'inline'
                    ? spacingPreset === 'zero'
                      ? 'flex flex-wrap items-center gap-x-3 gap-y-0 pl-1.5'
                      : 'flex flex-wrap items-center gap-x-4 gap-y-1 pl-2'
                    : optionLayout === 'grid2'
                    ? spacingPreset === 'zero'
                      ? 'grid grid-cols-2 gap-x-2.5 gap-y-0 pl-1.5'
                      : 'grid grid-cols-2 gap-x-3 gap-y-1 pl-2'
                    : spacingPreset === 'zero'
                    ? 'space-y-0 pl-1.5'
                    : 'space-y-1 pl-2'
                }`}
                style={{ fontSize: q.customFontSize ? `${q.customFontSize}pt` : `${baseFontSizePt || parseFloat(fontSize) || 10}pt` }}
              >
                {options.map((opt: any, oIdx: number) => {
                  const isCorrect = isTeacherCopy && q.correctAnswer && (
                    q.correctAnswer.trim().toUpperCase() === opt.key.toUpperCase() ||
                    q.correctAnswer.trim().toUpperCase() === `(${opt.key.toUpperCase()})` ||
                    q.correctAnswer.trim().toUpperCase() === opt.text?.trim().toUpperCase()
                  );
                  return (
                    <div
                      key={oIdx}
                      className={`flex items-center space-x-1 ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-950 font-bold px-1.5 py-0.5 rounded border border-emerald-400'
                          : ''
                      }`}
                    >
                      <span className="font-bold font-mono shrink-0">
                        {isCorrect ? `✓ (${opt.key})` : `(${opt.key})`}
                      </span>
                      {opt.text && (
                        <span className="inline-block">
                          <MathRenderer content={opt.text} inline />
                        </span>
                      )}
                      {opt.imageUrl && (
                        <ResizableImage
                          src={opt.imageUrl}
                          alt={`Opt ${opt.key}`}
                          initialWidth={opt.imageWidth}
                          initialHeight={opt.imageHeight || (isSideBySide ? 40 : 55)}
                          minHeight={25}
                          maxHeight={250}
                          alignment="inline"
                          movable={false}
                          removable={true}
                          borderStyle={imageBorderStyle === 'subtle' ? 'thin' : 'none'}
                          onResizeEnd={(w, h) => handleResizeOptionImageOnCanvas(idx, oIdx, w, h)}
                          onRemove={() => handleDeleteOptionImageOnCanvas(idx, oIdx)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );

            return (
              <div
                key={idx}
                className={`avoid-break flow-root ${
                  spacingPreset === 'zero'
                    ? lineSpacing === 'none' || lineSpacing === 'compact'
                      ? 'space-y-0'
                      : 'space-y-0.5'
                    : 'space-y-1'
                } ${
                  isBoxed
                    ? spacingPreset === 'zero' ? 'border border-black p-1.5 rounded' : 'border border-black p-2 rounded'
                    : hasDivider
                    ? spacingPreset === 'zero' ? 'border-b border-gray-300 pb-1' : 'border-b border-gray-300 pb-1.5'
                    : isDashed
                    ? spacingPreset === 'zero' ? 'border-b border-dashed border-gray-300 pb-1' : 'border-b border-dashed border-gray-300 pb-1.5'
                    : spacingPreset === 'zero'
                    ? lineSpacing === 'none' ? 'pb-0' : 'pb-0.5'
                    : 'pb-1'
                }`}
                style={{ fontSize: q.customFontSize ? `${q.customFontSize}pt` : undefined }}
              >
                {/* Question Stem with Floated Diagrams for Automatic Text Wrapping & Space Saving */}
                <div className={`flow-root relative w-full font-medium ${getLineSpacingClass()}`}>
                  {/* Floated Right Diagrams: Question text wraps on left and underneath */}
                  {rightDiagrams.map((d: any, dIdx: number) => {
                    const originalIdx = d.originalIndex ?? dIdx;
                    const dSrc = typeof d === 'string' ? d : d.relative_url || d.url || '';
                    return (
                      <div
                        key={`diag-r-${dIdx}`}
                        style={{
                          float: 'right',
                          marginLeft: isSideBySide ? 8 : 12,
                          marginBottom: 4,
                          marginTop: Math.max(0, d.offsetY || 0),
                          maxWidth: isSideBySide ? '45%' : '48%',
                        }}
                        className="no-break-inside relative z-10"
                      >
                        <ResizableImage
                          src={dSrc}
                          alt="Figure"
                          initialWidth={d.width}
                          initialHeight={d.height ? (isSideBySide ? Math.min(d.height, 90) : d.height) : (isSideBySide ? 75 : 120)}
                          initialOffsetX={0}
                          initialOffsetY={d.offsetY || 0}
                          alignment="right"
                          movable={true}
                          removable={true}
                          borderStyle={imageBorderStyle === 'subtle' ? 'thin' : 'none'}
                          onResizeEnd={(w, h) => handleResizeDiagramOnCanvas(idx, originalIdx, w, h)}
                          onMove={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, true)}
                          onMoveEnd={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, false)}
                          onRemove={() => handleDeleteDiagramOnCanvas(idx, originalIdx)}
                        />
                      </div>
                    );
                  })}

                  {/* Floated Left Diagrams: Question text wraps on right and underneath */}
                  {leftDiagrams.map((d: any, dIdx: number) => {
                    const originalIdx = d.originalIndex ?? dIdx;
                    const dSrc = typeof d === 'string' ? d : d.relative_url || d.url || '';
                    return (
                      <div
                        key={`diag-l-${dIdx}`}
                        style={{
                          float: 'left',
                          marginRight: isSideBySide ? 8 : 12,
                          marginBottom: 4,
                          marginTop: Math.max(0, d.offsetY || 0),
                          maxWidth: isSideBySide ? '45%' : '48%',
                        }}
                        className="no-break-inside relative z-10"
                      >
                        <ResizableImage
                          src={dSrc}
                          alt="Figure"
                          initialWidth={d.width}
                          initialHeight={d.height ? (isSideBySide ? Math.min(d.height, 90) : d.height) : (isSideBySide ? 75 : 120)}
                          initialOffsetX={0}
                          initialOffsetY={d.offsetY || 0}
                          alignment="left"
                          movable={true}
                          removable={true}
                          borderStyle={imageBorderStyle === 'subtle' ? 'thin' : 'none'}
                          onResizeEnd={(w, h) => handleResizeDiagramOnCanvas(idx, originalIdx, w, h)}
                          onMove={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, true)}
                          onMoveEnd={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, false)}
                          onRemove={() => handleDeleteDiagramOnCanvas(idx, originalIdx)}
                        />
                      </div>
                    );
                  })}

                  {/* Question Number and Flowing Text (Automatically wraps around floated diagrams) */}
                  <div className={`break-words [overflow-wrap:anywhere] ${getLineSpacingClass()}`}>
                    <span className="font-bold mr-1 shrink-0">Q{currentQNum}.</span>
                    {q.questionText || q.question_text ? (
                      <span className="inline">
                        <MathRenderer content={q.questionText || q.question_text} inline />
                      </span>
                    ) : null}

                    {/* Inline Diagrams (Beside text) */}
                    {inlineDiagrams.length > 0 && (
                      <span className="inline-flex flex-wrap items-center gap-1.5 align-middle mx-1">
                        {inlineDiagrams.map((d: any, dIdx: number) => {
                          const originalIdx = d.originalIndex ?? dIdx;
                          const dSrc = typeof d === 'string' ? d : d.relative_url || d.url || '';
                          return (
                            <ResizableImage
                              key={`diag-i-${dIdx}`}
                              src={dSrc}
                              alt="Figure"
                              initialWidth={d.width}
                              initialHeight={d.height ? (isSideBySide ? Math.min(d.height, 90) : d.height) : (isSideBySide ? 75 : 110)}
                              initialOffsetX={0}
                              initialOffsetY={d.offsetY || 0}
                              alignment="inline"
                              movable={true}
                              removable={true}
                              borderStyle={imageBorderStyle === 'subtle' ? 'thin' : 'none'}
                              onResizeEnd={(w, h) => handleResizeDiagramOnCanvas(idx, originalIdx, w, h)}
                              onMove={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, true)}
                              onMoveEnd={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, false)}
                              onRemove={() => handleDeleteDiagramOnCanvas(idx, originalIdx)}
                            />
                          );
                        })}
                      </span>
                    )}

                    {/* Marks Badge (Floated or Inline at end of question text) */}
                    {!(q.hideMarks !== undefined ? q.hideMarks : !showQuestionMarks) && Number(q.marks) > 0 && (
                      <span className="font-mono font-bold text-[10px] ml-1.5 whitespace-nowrap inline-block">
                        [{q.marks || 1}]
                      </span>
                    )}
                  </div>

                  {/* MCQ Options wrapped beside diagram without clearing float to remove blank spaces */}
                  {options.length > 0 && !(q.hideOptions !== undefined ? q.hideOptions : hideAllOptions) && shouldWrapOptions && (
                    renderA4Options(true)
                  )}

                  {/* Centered Diagrams: Clears float and centers across width */}
                  {centerDiagrams.map((d: any, dIdx: number) => {
                    const originalIdx = d.originalIndex ?? dIdx;
                    const dSrc = typeof d === 'string' ? d : d.relative_url || d.url || '';
                    return (
                      <div
                        key={`diag-c-${dIdx}`}
                        style={{ marginTop: Math.max(0, d.offsetY || 0) }}
                        className="clear-both w-full flex justify-center py-1"
                      >
                        <ResizableImage
                          src={dSrc}
                          alt="Figure"
                          initialWidth={d.width}
                          initialHeight={d.height ? (isSideBySide ? Math.min(d.height, 90) : d.height) : (isSideBySide ? 75 : 125)}
                          initialOffsetX={0}
                          initialOffsetY={d.offsetY || 0}
                          alignment="center"
                          movable={true}
                          removable={true}
                          borderStyle={imageBorderStyle === 'subtle' ? 'thin' : 'none'}
                          onResizeEnd={(w, h) => handleResizeDiagramOnCanvas(idx, originalIdx, w, h)}
                          onMove={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, true)}
                          onMoveEnd={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, false)}
                          onRemove={() => handleDeleteDiagramOnCanvas(idx, originalIdx)}
                        />
                      </div>
                    );
                  })}
                </div>

              {/* MCQ Options placed full-width below diagram when wrapOptionsBesideDiagram is off */}
              {options.length > 0 && !(q.hideOptions !== undefined ? q.hideOptions : hideAllOptions) && !shouldWrapOptions && (
                renderA4Options(false)
              )}

              {/* Teacher's Edition Answer Key & Explanation Box */}
              {isTeacherCopy && (
                <div className="mt-1 p-1.5 rounded bg-emerald-50/90 border border-emerald-300 text-[10px] text-emerald-950">
                  {q.correctAnswer ? (
                    <div>
                      <span className="font-bold text-emerald-800">✓ Official Answer: </span>
                      <span className="font-bold font-mono">({q.correctAnswer})</span>
                      {q.explanation && (
                        <span className="text-gray-800 ml-2">&bull; <strong>Solution:</strong> <MathRenderer content={q.explanation} inline /></span>
                      )}
                    </div>
                  ) : (
                    <div className="text-amber-800 font-semibold flex items-center space-x-1">
                      <span>⚠️ No answer found in Question Bank &bull; Set answer in Studio Canvas</span>
                    </div>
                  )}
                </div>
              )}

              {/* Question Ruled Blank Lines / Answer Working Space on Printable Sheet */}
              {(q.blankLinesCount > 0 || q.blankSpaceHeight > 0) && (
                <div
                  className={`w-full mt-1.5 ${
                    q.blankSpaceStyle === 'rough'
                      ? 'border border-dashed border-gray-400 p-1 flex items-center justify-center'
                      : q.blankSpaceStyle === 'ruled' || !q.blankSpaceStyle
                      ? 'flex flex-col justify-between py-1'
                      : ''
                  }`}
                  style={{
                    height: `${q.blankLinesCount ? q.blankLinesCount * 22 : q.blankSpaceHeight}px`,
                    minHeight: `${q.blankLinesCount ? q.blankLinesCount * 22 : q.blankSpaceHeight}px`,
                  }}
                >
                  {q.blankSpaceStyle === 'rough' && (
                    <span className="text-[9px] font-mono uppercase text-gray-500 tracking-widest">
                      — SPACE FOR ROUGH WORK —
                    </span>
                  )}
                  {(q.blankSpaceStyle === 'ruled' || !q.blankSpaceStyle) && (
                    <div className="w-full h-full flex flex-col justify-between">
                      {Array.from({ length: q.blankLinesCount || Math.max(1, Math.floor(q.blankSpaceHeight / 22)) }).map((_, rIdx) => (
                        <div key={rIdx} className="w-full border-b border-dashed border-gray-300 h-0 my-auto" />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        });
      })()}
        </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

  const centerCanvasColSpan = (() => {
    if (viewMode === 'split') {
      if (!showSidebarBank && !showExamConfigPanel) return 'lg:col-span-5';
      if (!showSidebarBank || !showExamConfigPanel) return 'lg:col-span-5';
      return 'lg:col-span-4';
    }
    if (!showSidebarBank && !showExamConfigPanel) return 'lg:col-span-10';
    if (!showSidebarBank || !showExamConfigPanel) return 'lg:col-span-8';
    return 'lg:col-span-6';
  })();

  const splitPreviewColSpan = (() => {
    if (!showSidebarBank && !showExamConfigPanel) return 'lg:col-span-5';
    if (!showSidebarBank || !showExamConfigPanel) return 'lg:col-span-4';
    return 'lg:col-span-4';
  })();

  const a4PreviewColSpan = (() => {
    if (!showSidebarBank && !showExamConfigPanel) return 'lg:col-span-10';
    if (!showSidebarBank || !showExamConfigPanel) return 'lg:col-span-8';
    return 'lg:col-span-6';
  })();

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 animate-fade-in border border-emerald-400 no-print print:hidden pointer-events-none">
          <Check className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* MS WORD STYLE TOP COMMAND RIBBON (Hidden during print) */}
      <div className="glass-panel p-3.5 rounded-2xl space-y-3 no-print border border-slate-700/80 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white flex items-center space-x-2">
                <span>MS Word Exam Publishing Studio</span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full font-mono">
                  {pageColumns}-Column Layout &bull; {selectedPaperQuestions.length} Questions
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Zero-Spacing Paper Saver &bull; Seamless Borderless Images &bull; Text-Scale Matching
              </p>
            </div>
          </div>

          {/* Active Question Paper Controls: Open Saved, New Paper, Close Paper */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-inner">
            <div className="flex items-center space-x-1.5 px-2 py-0.5">
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-bold text-slate-300">Paper:</span>
              {activePaper ? (
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-semibold font-mono">
                  OPEN
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-semibold font-mono">
                  NEW
                </span>
              )}
            </div>

            <select
              value={activePaper?.id || ''}
              onChange={(e) => {
                if (!e.target.value) {
                  handleStartNewPaper();
                  return;
                }
                const target = papers.find((p) => p.id === e.target.value);
                if (target) handleOpenSavedPaper(target);
              }}
              className="bg-slate-800 text-white text-xs font-semibold rounded-lg px-2.5 py-1 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[200px] truncate"
              title="Select a saved paper or start a new paper"
            >
              <option value="">-- New Paper (Unsaved) --</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.examCode || 'No code'})
                </option>
              ))}
            </select>

            {/* 📂 Open Previous Saved Paper Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsOpenSavedPaperModalOpen(true)}
              className="bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-indigo-500/40 flex items-center space-x-1 transition-all shadow-sm"
              title="Browse and open a previously saved question paper from Paper Bank"
            >
              <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
              <span>Open Saved ({papers.length})</span>
            </button>

            {/* + New Paper Button */}
            <button
              type="button"
              onClick={handleStartNewPaper}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-all shadow-sm"
              title="Start a fresh blank paper canvas"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Paper</span>
            </button>

            {/* ✕ Close Open Paper Button */}
            {(activePaper || selectedPaperQuestions.length > 0) && (
              <button
                type="button"
                onClick={handleCloseActivePaper}
                className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-500/40 flex items-center space-x-1 transition-all shadow-sm"
                title="Close the current open paper and clear canvas"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Close Paper</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Split Side-by-Side vs Canvas Editor vs Real A4 Preview */}
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-700 flex items-center space-x-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                  viewMode === 'split'
                    ? 'bg-indigo-600 text-white shadow font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View Studio Editor and Live A4 Sheet Preview side by side"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side-by-Side (Split)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                  viewMode === 'editor'
                    ? 'bg-indigo-600 text-white shadow font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Full Interactive Canvas Editor"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Studio Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('a4_preview')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                  viewMode === 'a4_preview'
                    ? 'bg-indigo-600 text-white shadow font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Full A4 White Paper Preview"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>A4 Sheet Preview</span>
              </button>
            </div>

            {/* Teacher's Copy (Answer Key & Solutions) Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const next = !isTeacherCopy;
                setIsTeacherCopy(next);
                showToast(next ? '🎓 Teacher’s Copy Active (Answers & Solutions visible)' : '📄 Student Copy Active');
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all shadow ${
                isTeacherCopy
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-500/30 ring-2 ring-amber-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40'
              }`}
              title="Toggle Teacher's Copy with answers & step-by-step solutions"
            >
              <Award className={`w-3.5 h-3.5 ${isTeacherCopy ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>{isTeacherCopy ? '🎓 Teacher’s Copy (ON)' : '🎓 Teacher’s Copy'}</span>
            </button>

            {/* Zero Spacing Eco-Compact Quick Button */}
            <button
              onClick={applyZeroSpacingPreset}
              className="bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-500/40 flex items-center space-x-1.5 transition-all shadow-sm"
              title="Fit maximum questions on fewer paper sheets with zero wasted gap"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero-Spacing</span>
            </button>

            {/* Global Marks Removal / Visibility Toggle */}
            <button
              type="button"
              onClick={handleBatchToggleAllMarks}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all shadow ${
                showQuestionMarks
                  ? 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border-indigo-500/40'
                  : 'bg-rose-950/90 text-rose-300 border-rose-500/60 ring-1 ring-rose-500/40'
              }`}
              title={showQuestionMarks ? 'Click to remove all marks from paper' : 'Click to restore marks on paper'}
            >
              {showQuestionMarks ? (
                <>
                  <Award className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Marks: On</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Marks: Removed</span>
                </>
              )}
            </button>

            {/* Global Options Hide / Unhide Toggle */}
            <button
              type="button"
              onClick={handleBatchToggleAllOptions}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all shadow ${
                hideAllOptions
                  ? 'bg-amber-950 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title={hideAllOptions ? 'Click to unhide all MCQ options' : 'Click to hide all MCQ options (turn into subjective questions)'}
            >
              {hideAllOptions ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Options: Hidden</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Options: Visible</span>
                </>
              )}
            </button>

            {/* Global Sections Hide / Unhide Toggle */}
            <button
              type="button"
              onClick={handleBatchToggleAllSections}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all shadow ${
                hideAllSections
                  ? 'bg-amber-950 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-violet-300 border-violet-500/40'
              }`}
              title={hideAllSections ? 'Click to show all section headings on paper' : 'Click to hide all section headings from paper'}
            >
              {hideAllSections ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sections: Hidden</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-violet-400" />
                  <span>Sections: Visible</span>
                </>
              )}
            </button>

            {/* Batch Blank Lines: Add or Remove Across All Questions */}
            <div className="bg-slate-900/90 p-0.5 rounded-xl border border-slate-700 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleBatchSetBlankLines(3, 'ruled')}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-300 hover:text-white hover:bg-emerald-600/30 transition-all flex items-center space-x-1"
                title="Add 3 ruled answer lines under every question"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>+3 Lines</span>
              </button>
              <button
                type="button"
                onClick={handleBatchRemoveAllBlankLines}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-300 hover:text-white hover:bg-rose-900/40 transition-all flex items-center space-x-1"
                title="Remove all blank lines from all questions"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Clear Lines</span>
              </button>
            </div>

            {/* Save & Store Paper with Custom Name & Folder */}
            <button
              onClick={openSaveModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/30"
              title="Save question paper to physical storage"
            >
              <HardDrive className="w-3.5 h-3.5 text-indigo-200" />
              <span>💾 Save & Store to Disk</span>
            </button>

            {/* Quick Save Layout Button with Popup Notification */}
            <button
              onClick={handleQuickSaveWithPopup}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors"
              title="Quick save changes and display save confirmation popup"
            >
              <Save className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quick Save</span>
            </button>

            {/* Direct Browser Print / PDF Export Button */}
            <button
              onClick={handlePrintPaper}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center space-x-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>
          </div>
        </div>

        {/* MS WORD FORMATTING, BORDERLESS IMAGES & ALIGNMENT TOOLBAR */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Font Family */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400">Font:</span>
            <select
              value={fontFamily}
              onChange={(e) => {
                const val = e.target.value;
                setFontFamily(val);
                savePaperLayout(selectedPaperQuestions, { fontFamily: val });
              }}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="serif" className="bg-slate-900 text-white">Times New Roman (Board)</option>
              <option value="cm" className="bg-slate-900 text-white">Computer Modern (LaTeX / STEM)</option>
              <option value="calibri" className="bg-slate-900 text-white">Calibri (Modern Clear)</option>
              <option value="sans" className="bg-slate-900 text-white">Arial (Clean Sans)</option>
              <option value="cambria" className="bg-slate-900 text-white">Cambria (CBSE Math & Science)</option>
              <option value="georgia" className="bg-slate-900 text-white">Georgia (Elegant Serif)</option>
              <option value="garamond" className="bg-slate-900 text-white">Garamond (Classic Academic)</option>
              <option value="verdana" className="bg-slate-900 text-white">Verdana (High Legibility)</option>
              <option value="trebuchet" className="bg-slate-900 text-white">Trebuchet MS (Dynamic)</option>
              <option value="bookman" className="bg-slate-900 text-white">Bookman / Antiqua (Traditional)</option>
              <option value="dejavu" className="bg-slate-900 text-white">DejaVu / Lucida (Technical)</option>
              <option value="monospace" className="bg-slate-900 text-white">Courier New (Monospace / CS)</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400">Size:</span>
            <select
              value={fontSize}
              onChange={(e) => {
                const val = e.target.value;
                setFontSize(val);
                const num = parseFloat(val) || 10;
                setBaseFontSizePt(num);
                savePaperLayout(selectedPaperQuestions, { fontSize: val, baseFontSizePt: num });
              }}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="8pt" className="bg-slate-900 text-white">8pt (Ultra Saver)</option>
              <option value="8.5pt" className="bg-slate-900 text-white">8.5pt (Compact Saver)</option>
              <option value="9pt" className="bg-slate-900 text-white">9pt (Micro Saver)</option>
              <option value="9.5pt" className="bg-slate-900 text-white">9.5pt (Dense Compact)</option>
              <option value="10pt" className="bg-slate-900 text-white">10pt (Standard Compact)</option>
              <option value="10.5pt" className="bg-slate-900 text-white">10.5pt (CBSE Standard)</option>
              <option value="11pt" className="bg-slate-900 text-white">11pt (Normal)</option>
              <option value="11.5pt" className="bg-slate-900 text-white">11.5pt (Comfortable)</option>
              <option value="12pt" className="bg-slate-900 text-white">12pt (Large)</option>
              <option value="13pt" className="bg-slate-900 text-white">13pt (Extra Large)</option>
              <option value="14pt" className="bg-slate-900 text-white">14pt (Senior / Primary)</option>
              <option value="16pt" className="bg-slate-900 text-white">16pt (Primary / Large Print)</option>
            </select>
          </div>

          {/* Image Borders: None (Seamless Default) vs Box */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1">Image Border:</span>
            <button
              onClick={() => {
                setImageBorderStyle('none');
                savePaperLayout(selectedPaperQuestions, { imageBorderStyle: 'none' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                imageBorderStyle === 'none' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="No border outside images - blends seamlessly into text"
            >
              ✓ None (Seamless)
            </button>
            <button
              onClick={() => {
                setImageBorderStyle('subtle');
                savePaperLayout(selectedPaperQuestions, { imageBorderStyle: 'subtle' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                imageBorderStyle === 'subtle' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Box Border
            </button>
          </div>

          {/* Precision Image Height & Auto-Match Text Size Toolbar Controls */}
          <div className="flex items-center space-x-1.5 bg-slate-900/95 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 pl-1 font-semibold">Image Size:</span>

            {/* 1-Click Auto-Match Text Size */}
            <button
              type="button"
              onClick={() => handleSetAllImageHeights(15)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center space-x-1 transition-colors ${
                imageCustomHeight === 15
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-emerald-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Automatically match the exact font size of the question text (100% Scale)"
            >
              <Type className="w-3 h-3" />
              <span>🎯 Auto-Match Text (15px)</span>
            </button>

            {/* Stepper Down [-] */}
            <button
              type="button"
              onClick={() => handleSetAllImageHeights(imageCustomHeight - 2)}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
              title="Decrease formula height (-2px)"
            >
              -
            </button>

            {/* Live Pixel Indicator */}
            <span className="font-mono text-xs font-bold text-indigo-300 px-1 select-none">
              {imageCustomHeight}px
            </span>

            {/* Stepper Up [+] */}
            <button
              type="button"
              onClick={() => handleSetAllImageHeights(imageCustomHeight + 2)}
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
              title="Increase formula height (+2px)"
            >
              +
            </button>

            {/* Quick Size Presets */}
            <button
              type="button"
              onClick={() => handleSetAllImageHeights(18)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                imageCustomHeight === 18 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              18px
            </button>
            <button
              type="button"
              onClick={() => handleSetAllImageHeights(24)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                imageCustomHeight === 24 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24px
            </button>
          </div>

          {/* Page Columns */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1">Cols:</span>
            <button
              onClick={() => {
                setPageColumns(1);
                savePaperLayout(selectedPaperQuestions, { pageColumns: 1 });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                pageColumns === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1 Col
            </button>
            <button
              onClick={() => {
                setPageColumns(2);
                savePaperLayout(selectedPaperQuestions, { pageColumns: 2 });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                pageColumns === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="2-Column Newspaper Exam Style (Saves Space)"
            >
              2 Col
            </button>
          </div>

          {/* Option Layout */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1">Options:</span>
            <button
              onClick={() => {
                setOptionLayout('inline');
                savePaperLayout(selectedPaperQuestions, { optionLayout: 'inline' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                optionLayout === 'inline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="4 Options on 1 Line (Saves maximum vertical paper space)"
            >
              Inline (4 Across)
            </button>
            <button
              onClick={() => {
                setOptionLayout('grid2');
                savePaperLayout(selectedPaperQuestions, { optionLayout: 'grid2' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                optionLayout === 'grid2' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2x2 Grid
            </button>
          </div>

          {/* Image Alignment (Inline with Q# / Left / Center) */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1 font-semibold">Image Align:</span>
            <button
              onClick={() => {
                setImageAlignment('inline');
                savePaperLayout(selectedPaperQuestions, { imageAlignment: 'inline' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                imageAlignment === 'inline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Align image inline beside question number (eliminates empty space)"
            >
              ↔ Inline (Beside Q#)
            </button>
            <button
              onClick={() => {
                setImageAlignment('left');
                savePaperLayout(selectedPaperQuestions, { imageAlignment: 'left' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                imageAlignment === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Left Aligned (no indent)"
            >
              Left
            </button>
            <button
              onClick={() => {
                setImageAlignment('center');
                savePaperLayout(selectedPaperQuestions, { imageAlignment: 'center' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                imageAlignment === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Center Aligned"
            >
              Center
            </button>
          </div>

          {/* Paper Spacing Density (Zero Spacing to save paper) */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1 font-semibold">Spacing:</span>
            <button
              onClick={applyZeroSpacingPreset}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                spacingPreset === 'zero' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-white'
              }`}
              title="Zero Spacing: Removes extra vertical gaps between questions, images, and options to save maximum paper"
            >
              ⚡ Zero Space
            </button>
            <button
              onClick={() => {
                setSpacingPreset('compact');
                setLineSpacing('tight');
                savePaperLayout(selectedPaperQuestions, { spacingPreset: 'compact', lineSpacing: 'tight' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                spacingPreset === 'compact' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compact
            </button>
            <button
              onClick={() => {
                setSpacingPreset('standard');
                setLineSpacing('normal');
                savePaperLayout(selectedPaperQuestions, { spacingPreset: 'standard', lineSpacing: 'normal' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                spacingPreset === 'standard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Normal
            </button>
          </div>

          {/* Page Margins: Zero / Narrow / Normal / Wide */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1 font-semibold flex items-center space-x-1">
              <Maximize2 className="w-3 h-3 text-indigo-400" />
              <span>Margins:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSelectPresetMargin('zero')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                pageMargin === 'zero' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Zero / Ultra-Eco Margins (4mm) - Maximum printable area on paper"
            >
              Zero (4mm)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPresetMargin('narrow')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                pageMargin === 'narrow' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Narrow Margins (8mm) - Eco compact paper saver"
            >
              Narrow (8mm)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPresetMargin('normal')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                pageMargin === 'normal' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Normal Margins (15mm) - Standard examination format"
            >
              Normal (15mm)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPresetMargin('wide')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                pageMargin === 'wide' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Wide Margins (25mm / 1 inch)"
            >
              Wide (25mm)
            </button>
            <button
              type="button"
              onClick={() => setIsCustomMarginModalOpen(true)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center space-x-1 ${
                pageMargin === 'custom'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-amber-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Set custom page margins in millimeters (Top, Bottom, Left, Right)"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>{pageMargin === 'custom' ? `Custom (${marginLeft}mm)` : 'Set Custom...'}</span>
            </button>
          </div>

          {/* Roll No Format Toggle */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1 font-semibold">Roll No:</span>
            <button
              onClick={() => {
                setRollNoStyle('boxes');
                savePaperLayout(selectedPaperQuestions, { rollNoStyle: 'boxes' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                rollNoStyle === 'boxes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Printable Square Grid Boxes for Roll Number"
            >
              🔲 Boxes
            </button>
            <button
              onClick={() => {
                setRollNoStyle('blank');
                savePaperLayout(selectedPaperQuestions, { rollNoStyle: 'blank' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                rollNoStyle === 'blank' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Underline Blank Space for Roll Number"
            >
              ➖ Line
            </button>
            <button
              onClick={() => {
                setRollNoStyle('none');
                savePaperLayout(selectedPaperQuestions, { rollNoStyle: 'none' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                rollNoStyle === 'none' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              None
            </button>
          </div>

          {/* School Logo Insert & Controls */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1 font-semibold">Logo:</span>
            {schoolLogoUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-semibold flex items-center space-x-1"
                  title="Change school logo image"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Change</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextPos = schoolLogoPosition === 'left' ? 'center' : schoolLogoPosition === 'center' ? 'right' : 'left';
                    setSchoolLogoPosition(nextPos);
                    savePaperLayout(selectedPaperQuestions, { schoolLogoPosition: nextPos });
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                  title={`Change Logo Alignment (Current: ${schoolLogoPosition})`}
                >
                  {schoolLogoPosition === 'left' ? '⬅ Left' : schoolLogoPosition === 'center' ? '⬛ Center' : '➡ Right'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSchoolLogoUrl(null);
                    savePaperLayout(selectedPaperQuestions, { schoolLogoUrl: null });
                  }}
                  className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white"
                  title="Remove Logo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => logoFileInputRef.current?.click()}
                className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-[11px] font-semibold flex items-center space-x-1"
                title="Upload and insert School/Institute Logo"
              >
                <Upload className="w-3 h-3" />
                <span>+ Upload Logo</span>
              </button>
            )}
          </div>

          {/* Question Border Style */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1">Dividers:</span>
            <button
              onClick={() => {
                setBorderStyle('none');
                savePaperLayout(selectedPaperQuestions, { borderStyle: 'none' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                borderStyle === 'none' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              None
            </button>
            <button
              onClick={() => {
                setBorderStyle('divider');
                savePaperLayout(selectedPaperQuestions, { borderStyle: 'divider' });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                borderStyle === 'divider' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Line
            </button>
          </div>
        </div>
      </div>

      {/* Hidden File Input for School Logo Upload */}
      <input
        type="file"
        ref={logoFileInputRef}
        onChange={handleLogoUpload}
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
      />

      {/* MAIN STUDIO WORKSPACE (MULTI-PANEL / SIDE-BY-SIDE LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[750px] no-print">
        {/* LEFT PANEL: Available Question Bank Selector */}
        <div className={`${
          !showSidebarBank
            ? 'lg:col-span-1'
            : viewMode === 'split' ? 'lg:col-span-2' : 'lg:col-span-3'
        } glass-panel rounded-2xl flex flex-col max-h-[820px] overflow-hidden transition-all duration-300`}>

          {/* Collapsed strip — shown when minimised */}
          <div className={!showSidebarBank ? 'flex flex-col items-center justify-start py-4 space-y-4 h-full' : 'hidden'}>
            <button
              type="button"
              onClick={() => setShowSidebarBank(true)}
              className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 hover:text-white transition-all"
              title="Expand Question Bank"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div
              className="text-[10px] font-bold text-slate-500 tracking-widest select-none"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              QUESTION BANK
            </div>
          </div>

          {/* Expanded content — shown when not minimised */}
          <div className={!showSidebarBank ? 'hidden' : 'space-y-2.5 flex-1 flex flex-col min-h-0 p-3.5'}>
            {/* Header & New Paper */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer select-none">
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
                  className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Question Bank ({filteredSidebarQuestions.length})</span>
              </label>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleCreateNewPaper}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-semibold"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Paper</span>
                </button>
                {/* Minimize / collapse button */}
                <button
                  type="button"
                  onClick={() => setShowSidebarBank(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Minimise Question Bank panel"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Prominent Question Bank Explorer Open Button */}
            <button
              type="button"
              onClick={handleOpenQuestionBankExplorer}
              className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-2 px-3 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 text-xs transition-all border border-indigo-400/40 group hover:scale-[1.01]"
              title="Open full Question Bank Explorer dialog to select questions by Folder & Subject, and assign marks"
            >
              <FolderTree className="w-4 h-4 text-indigo-200 group-hover:scale-110 transition-transform" />
              <span>Open Question Bank Explorer</span>
            </button>

            {/* Quick Sidebar Filters (Class Folder, Subject, Search) */}
            <div className="space-y-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800/90 text-xs">
              {/* Folder / Class Dropdown */}
              <select
                value={sidebarFolderFilter}
                onChange={(e) => {
                  setSidebarFolderFilter(e.target.value);
                  setSidebarSubjectFilter('all');
                  setSidebarChapterFilter('all');
                  setSidebarSubTopicFilter('all');
                }}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg text-[11px] text-slate-200 px-2 py-1 focus:outline-none focus:border-indigo-500 truncate"
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
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg text-[11px] text-slate-200 px-2 py-1 focus:outline-none focus:border-indigo-500 truncate"
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

              {/* Chapter / Topic Dropdown (Sub-filter 1) */}
              <select
                value={sidebarChapterFilter}
                onChange={(e) => {
                  setSidebarChapterFilter(e.target.value);
                  setSidebarSubTopicFilter('all');
                }}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg text-[11px] text-slate-200 px-2 py-1 focus:outline-none focus:border-emerald-500 truncate"
                title="Filter questions by Chapter / Topic"
              >
                <option value="all">📖 All Chapters / Topics</option>
                {getAvailableChapters(sidebarFolderFilter, sidebarSubjectFilter).map((ch: any) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>

              {/* Sub-Topic Dropdown (Sub-filter 2) */}
              {getAvailableSubTopics(sidebarFolderFilter, sidebarSubjectFilter, sidebarChapterFilter).length > 0 && (
                <select
                  value={sidebarSubTopicFilter}
                  onChange={(e) => setSidebarSubTopicFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg text-[11px] text-slate-200 px-2 py-1 focus:outline-none focus:border-amber-500 truncate"
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
                <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="Filter text or Q#..."
                  value={sidebarSearchQuery}
                  onChange={(e) => setSidebarSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg text-[11px] text-slate-200 pl-6 pr-2 py-1 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Bulk Insert Selected Button */}
            {selectedBankQIds.size > 0 && (
              <button
                type="button"
                onClick={handleAddSelectedQuestionsToCanvas}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-1.5 transition-all animate-fade-in"
              >
                <Plus className="w-4 h-4" />
                <span>Insert Selected ({selectedBankQIds.size}) to Canvas</span>
              </button>
            )}

            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {filteredSidebarQuestions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs space-y-1">
                  <p>No questions match filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarFolderFilter('all');
                      setSidebarSubjectFilter('all');
                      setSidebarSearchQuery('');
                    }}
                    className="text-indigo-400 hover:underline text-[11px]"
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
                      className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                        isChecked
                          ? 'bg-indigo-950/50 border-indigo-500/90 ring-1 ring-indigo-500/50 shadow-md shadow-indigo-950/40'
                          : isAdded
                          ? 'bg-slate-900/40 border-slate-800 opacity-60'
                          : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectBankQuestion(q.id)}
                            className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="font-mono font-bold text-indigo-400">Q{q.questionNumber}</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">[{q.marks} Mark{q.marks > 1 ? 's' : ''}]</span>
                      </div>
                      <div className="line-clamp-2 text-slate-300 text-[11px]">
                        <MathRenderer content={q.questionText} />
                      </div>
                      <button
                        onClick={() => handleAddQuestionToCanvas(q)}
                        disabled={isAdded}
                        className="w-full mt-1 bg-indigo-600/20 hover:bg-indigo-600/40 disabled:opacity-40 text-indigo-300 text-[11px] font-semibold py-1 rounded-lg border border-indigo-500/30 flex items-center justify-center space-x-1"
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

        {/* CENTER: INTERACTIVE STUDIO CANVAS */}
        <div className={`${viewMode === 'split' ? centerCanvasColSpan : viewMode === 'editor' ? centerCanvasColSpan : 'hidden'} glass-panel rounded-2xl p-4 space-y-4 bg-slate-900/90 overflow-y-auto max-h-[820px] border border-slate-700/80 select-text`}>
          {/* CANVAS DOCKED MOUSE ACTION RIBBON */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-950/90 rounded-xl border border-indigo-500/40 text-xs shadow-lg sticky top-0 z-20 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-indigo-300 flex items-center space-x-1 mr-1 text-[11px] uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Canvas:</span>
              </span>

              {/* 📚 Open Question Bank Explorer Dialog */}
              <button
                type="button"
                onClick={handleOpenQuestionBankExplorer}
                className="px-2.5 py-1 bg-gradient-to-r from-indigo-600/30 to-violet-600/30 hover:from-indigo-600 hover:to-violet-600 text-indigo-200 hover:text-white font-bold rounded-lg border border-indigo-500/40 flex items-center space-x-1.5 transition-all text-xs shadow-sm"
                title="Open Question Bank Explorer to filter by Class & Subject, select questions and assign marks"
              >
                <FolderTree className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
                <span>+ Question Bank</span>
              </button>

              {/* 📂 Open Saved Paper */}
              <button
                type="button"
                onClick={() => setIsOpenSavedPaperModalOpen(true)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-semibold rounded-lg border border-slate-700 flex items-center space-x-1 transition-all text-xs"
                title="Browse and open a saved paper from Paper Bank"
              >
                <Folder className="w-3.5 h-3.5 text-indigo-400" />
                <span>Open Saved</span>
              </button>

              {/* + New Paper */}
              <button
                type="button"
                onClick={handleStartNewPaper}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg border border-slate-700 flex items-center space-x-1 transition-all text-xs"
                title="Start a fresh blank paper canvas"
              >
                <Plus className="w-3 h-3 text-indigo-400" />
                <span>New Paper</span>
              </button>

              {/* ✕ Close Paper */}
              {(activePaper || selectedPaperQuestions.length > 0) && (
                <button
                  type="button"
                  onClick={handleCloseActivePaper}
                  className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white font-semibold rounded-lg border border-rose-500/40 flex items-center space-x-1 transition-all text-xs"
                  title="Close current paper and clear canvas"
                >
                  <X className="w-3 h-3 text-rose-400" />
                  <span>Close</span>
                </button>
              )}

              {/* + Question Button */}
              <button
                type="button"
                onClick={() => handleAddNewQuestionToCanvas()}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center space-x-1 transition-all shadow-md shadow-indigo-600/30 text-xs"
                title="Add a new custom question directly onto the canvas"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Question</span>
              </button>

              {/* + Section Heading */}
              <button
                type="button"
                onClick={() => handleOpenCreateFieldModal('section')}
                className="px-2.5 py-1 bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white font-semibold rounded-lg border border-violet-500/40 flex items-center space-x-1 transition-all text-xs"
                title="Add Section Heading (e.g. SECTION A, SECTION B)"
              >
                <Type className="w-3.5 h-3.5 text-violet-400" />
                <span>+ Section</span>
              </button>

              {/* + Header Field */}
              <button
                type="button"
                onClick={() => handleOpenCreateFieldModal('header')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg border border-slate-700 flex items-center space-x-1 transition-all text-xs"
                title="Add Header Metadata Field (e.g. Subject, Class, Date, Room No)"
              >
                <Hash className="w-3.5 h-3.5 text-indigo-400" />
                <span>+ Header Field</span>
              </button>

              {/* + Note Block */}
              <button
                type="button"
                onClick={() => handleOpenCreateFieldModal('note')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg border border-slate-700 flex items-center space-x-1 transition-all text-xs"
                title="Add general instructions or note block"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Note</span>
              </button>

              {/* + Blank Space */}
              <button
                type="button"
                onClick={() => handleAddBlankSpace(60, 'blank')}
                className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white font-semibold rounded-lg border border-emerald-500/40 flex items-center space-x-1 transition-all text-xs"
                title="Add blank space, ruled answer lines, or rough work box"
              >
                <Square className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ Blank Space</span>
              </button>

              {/* Margins Quick Setup Button */}
              <button
                type="button"
                onClick={() => setIsCustomMarginModalOpen(true)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-semibold rounded-lg border border-slate-700 flex items-center space-x-1 transition-all text-xs"
                title="Configure page margins (Top, Bottom, Left, Right in mm)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Margins ({pageMargin === 'custom' ? `${marginLeft}mm` : pageMargin})</span>
              </button>

              {/* Quick Canvas Options Toggle */}
              <button
                type="button"
                onClick={handleBatchToggleAllOptions}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
                  hideAllOptions
                    ? 'bg-amber-950 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
                }`}
                title={hideAllOptions ? 'Click to show all MCQ options on paper' : 'Click to hide all MCQ options'}
              >
                {hideAllOptions ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Options: Hidden</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Options: Visible</span>
                  </>
                )}
              </button>

              {/* Quick Canvas Marks Toggle */}
              <button
                type="button"
                onClick={handleBatchToggleAllMarks}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
                  !showQuestionMarks
                    ? 'bg-rose-950 text-rose-300 border-rose-500/50 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={!showQuestionMarks ? 'Click to restore marks on paper' : 'Click to remove marks from paper'}
              >
                {!showQuestionMarks ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Marks: Removed</span>
                  </>
                ) : (
                  <>
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Marks: On</span>
                  </>
                )}
              </button>

              {/* Quick Canvas Sections Toggle */}
              <button
                type="button"
                onClick={handleBatchToggleAllSections}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
                  hideAllSections
                    ? 'bg-amber-950 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-violet-950/50 hover:bg-violet-900/60 text-violet-300 border-violet-500/40'
                }`}
                title={hideAllSections ? 'Click to show all section headings on paper' : 'Click to hide all section headings'}
              >
                {hideAllSections ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sections: Hidden</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-violet-400" />
                    <span>Sections: Visible</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Canvas Text Size Stepper (A- / A+) */}
            <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Text Size:</span>
              <button
                type="button"
                onClick={() => handleAdjustGlobalFontSize(-1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center transition-colors shadow-sm"
                title="Decrease Canvas Text Size (A-) [Ctrl+-]"
              >
                A-
              </button>
              <span className="font-mono font-bold text-indigo-300 text-xs px-1.5 select-none">
                {baseFontSizePt}pt
              </span>
              <button
                type="button"
                onClick={() => handleAdjustGlobalFontSize(1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center transition-colors shadow-sm"
                title="Increase Canvas Text Size (A+) [Ctrl++]"
              >
                A+
              </button>
            </div>

            {/* Quick Canvas Line Spacing Stepper (None / Compact / Tight / Normal / Relaxed) */}
            <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
              <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center space-x-1">
                <AlignJustify className="w-3 h-3 text-indigo-400" />
                <span>Line Spacing:</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (lineSpacing === 'relaxed') {
                    setLineSpacing('normal');
                    savePaperLayout(selectedPaperQuestions, { lineSpacing: 'normal' });
                    showToast('Line Spacing: NORMAL');
                  } else if (lineSpacing === 'normal') {
                    setLineSpacing('tight');
                    savePaperLayout(selectedPaperQuestions, { lineSpacing: 'tight' });
                    showToast('Line Spacing: TIGHT');
                  } else if (lineSpacing === 'tight') {
                    setLineSpacing('compact');
                    savePaperLayout(selectedPaperQuestions, { lineSpacing: 'compact' });
                    showToast('Line Spacing: COMPACT (Reduced Space)');
                  } else if (lineSpacing === 'compact') {
                    setLineSpacing('none');
                    savePaperLayout(selectedPaperQuestions, { lineSpacing: 'none' });
                    showToast('Line Spacing: NONE (Zero Space Between Lines)');
                  }
                }}
                disabled={lineSpacing === 'none'}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 disabled:opacity-30 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center transition-colors shadow-sm"
                title="Decrease Line Spacing (Remove spaces between text lines) [Alt+Up]"
              >
                -
              </button>
              <span className="font-mono font-bold text-indigo-300 text-xs px-1 select-none capitalize">
                {lineSpacing === 'none' ? 'None (0 Gap)' : lineSpacing}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (lineSpacing === 'none') {
                    setLineSpacing('compact');
                    savePaperLayout(selectedPaperQuestions, { lineSpacing: 'compact' });
                    showToast('Line Spacing: COMPACT');
                  } else if (lineSpacing === 'compact') {
                    setLineSpacing('tight');
                    savePaperLayout(selectedPaperQuestions, { lineSpacing: 'tight' });
                    showToast('Line Spacing: TIGHT');
                  } else if (lineSpacing === 'tight') {
                    setLineSpacing('normal');
                    savePaperLayout(selectedPaperQuestions, { lineSpacing: 'normal' });
                    showToast('Line Spacing: NORMAL');
                  } else if (lineSpacing === 'normal') {
                    setLineSpacing('relaxed');
                    savePaperLayout(selectedPaperQuestions, { lineSpacing: 'relaxed' });
                    showToast('Line Spacing: RELAXED');
                  }
                }}
                disabled={lineSpacing === 'relaxed'}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 disabled:opacity-30 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center transition-colors shadow-sm"
                title="Increase Line Spacing (More breathing room) [Alt+Down]"
              >
                +
              </button>
            </div>

            {/* Quick One-Click Action: Remove Spaces Between Text */}
            <button
              type="button"
              onClick={handleRemoveSpacesBetweenText}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shadow-sm ${
                lineSpacing === 'none' && spacingPreset === 'zero'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-900/40'
                  : 'bg-slate-900 hover:bg-emerald-600/20 text-emerald-400 hover:text-white border-emerald-500/40'
              }`}
              title="Click to remove spaces between text lines, tighten gaps, and collapse redundant whitespace"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Remove Text Spaces</span>
            </button>

            {/* Quick One-Click Action: Remove Blank Space Between Question & Choices */}
            <button
              type="button"
              onClick={() => {
                const next = !wrapOptionsBesideDiagram;
                setWrapOptionsBesideDiagram(next);
                savePaperLayout(selectedPaperQuestions, { wrapOptionsBesideDiagram: next });
                showToast(next ? 'Zero Space Before Choices: ON (Wrapped beside diagrams)' : 'Zero Space Before Choices: OFF (Choices below diagram)');
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shadow-sm ${
                wrapOptionsBesideDiagram
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-900/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title={
                wrapOptionsBesideDiagram
                  ? 'Zero Space Before Choices is ON: Choices wrap beside floated diagrams eliminating blank gaps. Click to place choices below diagram.'
                  : 'Click to eliminate blank space between questions and choices by wrapping choices beside diagram.'
              }
            >
              <WrapText className="w-3.5 h-3.5" />
              <span>{wrapOptionsBesideDiagram ? 'Zero Choice Gap: ON' : 'Zero Choice Gap: OFF'}</span>
            </button>

            {/* Quick Canvas Question Gap Spacing Stepper */}
            <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Gap:</span>
              <button
                type="button"
                onClick={() => {
                  if (spacingPreset === 'standard') {
                    setSpacingPreset('compact');
                    savePaperLayout(selectedPaperQuestions, { spacingPreset: 'compact' });
                    showToast('Question Gap: COMPACT');
                  } else if (spacingPreset === 'compact') {
                    setSpacingPreset('zero');
                    savePaperLayout(selectedPaperQuestions, { spacingPreset: 'zero' });
                    showToast('Question Gap: ZERO (Max Density)');
                  }
                }}
                disabled={spacingPreset === 'zero'}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 disabled:opacity-30 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center transition-colors shadow-sm"
                title="Decrease Question Spacing (Save space)"
              >
                -
              </button>
              <span className="font-mono font-bold text-indigo-300 text-xs px-1 select-none capitalize">
                {spacingPreset}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (spacingPreset === 'zero') {
                    setSpacingPreset('compact');
                    savePaperLayout(selectedPaperQuestions, { spacingPreset: 'compact' });
                    showToast('Question Gap: COMPACT');
                  } else if (spacingPreset === 'compact') {
                    setSpacingPreset('standard');
                    savePaperLayout(selectedPaperQuestions, { spacingPreset: 'standard' });
                    showToast('Question Gap: STANDARD');
                  }
                }}
                disabled={spacingPreset === 'standard'}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 disabled:opacity-30 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center transition-colors shadow-sm"
                title="Increase Question Spacing"
              >
                +
              </button>
            </div>

            {/* Quick Canvas Font Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
              <Type className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={fontFamily}
                onChange={(e) => {
                  const val = e.target.value;
                  setFontFamily(val);
                  savePaperLayout(selectedPaperQuestions, { fontFamily: val });
                }}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
                title="Change Paper Font Style"
              >
                <option value="serif" className="bg-slate-900 text-white">Times New Roman (Board)</option>
                <option value="cm" className="bg-slate-900 text-white">Computer Modern (LaTeX / STEM)</option>
                <option value="calibri" className="bg-slate-900 text-white">Calibri (Modern Clear)</option>
                <option value="sans" className="bg-slate-900 text-white">Arial (Clean Sans)</option>
                <option value="cambria" className="bg-slate-900 text-white">Cambria (CBSE Math & Science)</option>
                <option value="georgia" className="bg-slate-900 text-white">Georgia (Elegant Serif)</option>
                <option value="garamond" className="bg-slate-900 text-white">Garamond (Classic Academic)</option>
                <option value="verdana" className="bg-slate-900 text-white">Verdana (High Legibility)</option>
                <option value="trebuchet" className="bg-slate-900 text-white">Trebuchet MS (Dynamic)</option>
                <option value="bookman" className="bg-slate-900 text-white">Bookman / Antiqua (Traditional)</option>
                <option value="dejavu" className="bg-slate-900 text-white">DejaVu / Lucida (Technical)</option>
                <option value="monospace" className="bg-slate-900 text-white">Courier New (Monospace / CS)</option>
              </select>
            </div>
          </div>

          {/* Header Layout Block with Inline Editing & School Logo */}
          <div className="border-b-2 border-slate-700 pb-4 relative group/header space-y-3">
            <div className={`flex items-center gap-4 ${
              schoolLogoPosition === 'center'
                ? 'flex-col justify-center text-center'
                : schoolLogoPosition === 'right'
                ? 'flex-row-reverse justify-between'
                : 'flex-row justify-between'
            }`}>
              {/* School Logo Container with Direct Mouse Resizing */}
              {schoolLogoUrl ? (
                <div className="relative group/logo inline-block shrink-0">
                  <ResizableImage
                    src={schoolLogoUrl}
                    alt="School Logo"
                    initialWidth={schoolLogoWidth}
                    initialHeight={schoolLogoHeight}
                    minHeight={30}
                    maxHeight={200}
                    borderStyle="none"
                    onResizeEnd={(w, h) => {
                      setSchoolLogoWidth(w);
                      setSchoolLogoHeight(h);
                      savePaperLayout(selectedPaperQuestions, { schoolLogoWidth: w, schoolLogoHeight: h });
                    }}
                  />
                  {/* Floating Action Bar over Logo on Hover */}
                  <div className="absolute -top-3 -right-3 hidden group-hover/logo:flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-lg p-1 shadow-xl z-20">
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="p-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded"
                      title="Change Logo Image"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextPos = schoolLogoPosition === 'left' ? 'center' : schoolLogoPosition === 'center' ? 'right' : 'left';
                        setSchoolLogoPosition(nextPos);
                        savePaperLayout(selectedPaperQuestions, { schoolLogoPosition: nextPos });
                      }}
                      className="p-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded font-mono text-[10px]"
                      title={`Align Logo (Current: ${schoolLogoPosition})`}
                    >
                      {schoolLogoPosition === 'left' ? '⬅ L' : schoolLogoPosition === 'center' ? '⬛ C' : '➡ R'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSchoolLogoUrl(null);
                        savePaperLayout(selectedPaperQuestions, { schoolLogoUrl: null });
                      }}
                      className="p-1 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Title & School Name Texts with Live Font Scaling on Hover */}
              <div className="flex-1 text-center space-y-1.5">
                {/* School Name with Mouse Controls */}
                {showSchoolName && (
                  <div className="relative group/schoolName flex items-center justify-center">
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      onBlur={() => savePaperLayout()}
                      style={{ fontSize: `${schoolNameSize}px` }}
                      className="w-full text-center font-black tracking-wider uppercase text-white font-display bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="ENTER SCHOOL / INSTITUTE NAME"
                    />
                    {/* Hover toolbar for School Name */}
                    <div className="absolute -right-2 top-0 hidden group-hover/schoolName:flex items-center space-x-1 bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-0.5 shadow-lg z-10">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(12, schoolNameSize - 2);
                          setSchoolNameSize(next);
                          savePaperLayout(selectedPaperQuestions, { schoolNameSize: next });
                        }}
                        className="p-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                        title="Decrease School Name size"
                      >
                        A-
                      </button>
                      <span className="font-mono text-[10px] text-indigo-300 font-bold px-0.5 select-none">
                        {schoolNameSize}px
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(32, schoolNameSize + 2);
                          setSchoolNameSize(next);
                          savePaperLayout(selectedPaperQuestions, { schoolNameSize: next });
                        }}
                        className="p-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                        title="Increase School Name size"
                      >
                        A+
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSchoolName(false);
                          savePaperLayout(selectedPaperQuestions, { showSchoolName: false });
                        }}
                        className="p-0.5 hover:bg-rose-600 text-slate-400 hover:text-white rounded ml-1"
                        title="Hide / Delete School Name"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Exam Title with Mouse Controls */}
                {showExamTitle && (
                  <div className="relative group/examTitle flex items-center justify-center">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => savePaperLayout()}
                      style={{ fontSize: `${examTitleSize}px` }}
                      className="w-full text-center font-bold text-indigo-300 uppercase tracking-wide bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
                      placeholder="ENTER EXAM TITLE"
                    />
                    {/* Hover toolbar for Exam Title */}
                    <div className="absolute -right-2 top-0 hidden group-hover/examTitle:flex items-center space-x-1 bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-0.5 shadow-lg z-10">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(10, examTitleSize - 1);
                          setExamTitleSize(next);
                          savePaperLayout(selectedPaperQuestions, { examTitleSize: next });
                        }}
                        className="p-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                        title="Decrease Exam Title size"
                      >
                        A-
                      </button>
                      <span className="font-mono text-[10px] text-indigo-300 font-bold px-0.5 select-none">
                        {examTitleSize}px
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(24, examTitleSize + 1);
                          setExamTitleSize(next);
                          savePaperLayout(selectedPaperQuestions, { examTitleSize: next });
                        }}
                        className="p-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                        title="Increase Exam Title size"
                      >
                        A+
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowExamTitle(false);
                          savePaperLayout(selectedPaperQuestions, { showExamTitle: false });
                        }}
                        className="p-0.5 hover:bg-rose-600 text-slate-400 hover:text-white rounded ml-1"
                        title="Hide / Delete Exam Title"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Chips Bar (Exam Code, Duration, Max Marks, Custom Fields) */}
            {showHeaderMeta && (
              <div className="relative group/metaRow pt-1 px-2">
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 font-mono gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* EXAM CODE */}
                    {showExamCode && (
                      <div className="group/chip inline-flex items-center space-x-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-lg px-2 py-0.5 transition-colors">
                        <span className="text-slate-400 font-bold text-[11px]">EXAM CODE:</span>
                        <input
                          type="text"
                          value={examCode}
                          onChange={(e) => setExamCode(e.target.value)}
                          onBlur={() => savePaperLayout()}
                          className="bg-transparent text-white font-semibold font-mono w-24 border-b border-transparent focus:border-indigo-400 focus:outline-none px-0.5 text-xs"
                          placeholder="EXAM-101"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowExamCode(false);
                            savePaperLayout(selectedPaperQuestions, { showExamCode: false });
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                          title="Delete / Hide Exam Code"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* TIME */}
                    {showTime && (
                      <div className="group/chip inline-flex items-center space-x-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-lg px-2 py-0.5 transition-colors">
                        <span className="text-slate-400 font-bold text-[11px]">TIME:</span>
                        <input
                          type="number"
                          value={duration === undefined || duration === null || Number.isNaN(Number(duration)) ? '' : duration}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                            setDuration(val as any);
                          }}
                          onBlur={() => savePaperLayout()}
                          className="bg-transparent text-white font-semibold font-mono w-14 text-center border-b border-transparent focus:border-indigo-400 focus:outline-none px-0.5 text-xs"
                          placeholder="180"
                        />
                        <span className="text-slate-400 font-semibold text-[11px]">MINS</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTime(false);
                            savePaperLayout(selectedPaperQuestions, { showTime: false });
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                          title="Delete / Hide Time"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* MAX MARKS */}
                    {showMaxMarks && (
                      <div className="group/chip inline-flex items-center space-x-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-lg px-2 py-0.5 transition-colors">
                        <span className="text-indigo-300 font-bold text-[11px]">MAX MARKS:</span>
                        <input
                          type="number"
                          value={maxMarks === undefined || maxMarks === null || Number.isNaN(Number(maxMarks)) ? '' : maxMarks}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                            setMaxMarks(val as any);
                          }}
                          onBlur={() => savePaperLayout()}
                          className="bg-transparent text-indigo-300 font-semibold font-mono w-14 text-center border-b border-transparent focus:border-indigo-400 focus:outline-none px-0.5 text-xs"
                          placeholder="70"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowMaxMarks(false);
                            savePaperLayout(selectedPaperQuestions, { showMaxMarks: false });
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                          title="Delete / Hide Max Marks"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Custom Header Fields (Subject, Class, Date, Room, etc.) */}
                    {customHeaderFields.map((f, fIdx) => (
                      <div
                        key={f.id}
                        className="group/chip inline-flex items-center space-x-1.5 bg-slate-950 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-500/60 rounded-lg px-2 py-0.5 transition-colors"
                      >
                        <input
                          type="text"
                          value={f.label}
                          onChange={(e) => {
                            const updated = [...customHeaderFields];
                            updated[fIdx] = { ...f, label: e.target.value.toUpperCase() };
                            setCustomHeaderFields(updated);
                          }}
                          onBlur={() => savePaperLayout(selectedPaperQuestions, { customHeaderFields })}
                          className="bg-transparent text-slate-400 font-bold font-mono w-20 border-b border-transparent focus:border-indigo-400 focus:outline-none px-0.5 text-xs uppercase"
                        />
                        <span className="text-slate-500">:</span>
                        <input
                          type="text"
                          value={f.value}
                          onChange={(e) => {
                            const updated = [...customHeaderFields];
                            updated[fIdx] = { ...f, value: e.target.value };
                            setCustomHeaderFields(updated);
                          }}
                          onBlur={() => savePaperLayout(selectedPaperQuestions, { customHeaderFields })}
                          className="bg-transparent text-white font-semibold font-mono w-28 border-b border-transparent focus:border-indigo-400 focus:outline-none px-0.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteHeaderField(f.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                          title={`Delete field "${f.label}"`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* Quick Restore Chips when fields are hidden */}
                    {!showExamCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowExamCode(true);
                          savePaperLayout(selectedPaperQuestions, { showExamCode: true });
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-500/30 transition-colors"
                        title="Restore Exam Code badge"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Exam Code</span>
                      </button>
                    )}
                    {!showTime && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowTime(true);
                          savePaperLayout(selectedPaperQuestions, { showTime: true });
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-500/30 transition-colors"
                        title="Restore Time badge"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Time</span>
                      </button>
                    )}
                    {!showMaxMarks && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMaxMarks(true);
                          savePaperLayout(selectedPaperQuestions, { showMaxMarks: true });
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-500/30 transition-colors"
                        title="Restore Max Marks badge"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Max Marks</span>
                      </button>
                    )}
                    {!showSchoolName && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSchoolName(true);
                          savePaperLayout(selectedPaperQuestions, { showSchoolName: true });
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-500/30 transition-colors"
                        title="Restore School Name"
                      >
                        <Plus className="w-3 h-3" />
                        <span>School Name</span>
                      </button>
                    )}
                    {!showExamTitle && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowExamTitle(true);
                          savePaperLayout(selectedPaperQuestions, { showExamTitle: true });
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-500/30 transition-colors"
                        title="Restore Exam Title"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Exam Title</span>
                      </button>
                    )}
                    {!showCandidateBox && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCandidateBox(true);
                          savePaperLayout(selectedPaperQuestions, { showCandidateBox: true });
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 px-2 py-0.5 rounded-lg border border-emerald-500/30 transition-colors"
                        title="Restore Candidate Details Box"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Candidate Box</span>
                      </button>
                    )}

                    {/* + Add Field directly in Metadata Row */}
                    <button
                      type="button"
                      onClick={() => handleOpenCreateFieldModal('header')}
                      className="inline-flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-dashed border-indigo-500/40 transition-colors"
                      title="Add a custom metadata field (e.g. Subject, Class, Date, Room No, Set A)"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Field</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Candidate Box with Full Mouse Access & Custom Fields */}
          {showCandidateBox && (
            <div className="relative group/candBox p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 text-xs space-y-2.5 transition-all">
              {/* Candidate Box Hover Actions */}
              <div className="absolute -top-2.5 right-3 hidden group-hover/candBox:flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 shadow-xl z-10">
                <span className="text-[10px] text-slate-400 font-semibold">Box Text:</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(9, candidateBoxFontSize - 1);
                    setCandidateBoxFontSize(next);
                    savePaperLayout(selectedPaperQuestions, { candidateBoxFontSize: next });
                  }}
                  className="p-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                  title="Decrease Candidate Box font size"
                >
                  A-
                </button>
                <span className="font-mono text-[10px] text-indigo-300 font-bold px-0.5">
                  {candidateBoxFontSize}px
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(16, candidateBoxFontSize + 1);
                    setCandidateBoxFontSize(next);
                    savePaperLayout(selectedPaperQuestions, { candidateBoxFontSize: next });
                  }}
                  className="p-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                  title="Increase Candidate Box font size"
                >
                  A+
                </button>
                {!showCandidateName && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCandidateName(true);
                      savePaperLayout(selectedPaperQuestions, { showCandidateName: true });
                    }}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    title="Restore Candidate Name field"
                  >
                    + Name
                  </button>
                )}
                {!showRollNo && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowRollNo(true);
                      savePaperLayout(selectedPaperQuestions, { showRollNo: true });
                    }}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    title="Restore Roll No field"
                  >
                    + Roll No
                  </button>
                )}
                {!showInstructions && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowInstructions(true);
                      savePaperLayout(selectedPaperQuestions, { showInstructions: true });
                    }}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    title="Restore Instructions field"
                  >
                    + Instructions
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenCreateFieldModal('candidate')}
                  className="text-[10px] px-1.5 py-0.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded font-medium ml-1"
                  title="Add candidate detail (e.g. Father's Name, Invigilator Sign, Date of Birth)"
                >
                  + Field
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCandidateBox(false);
                    savePaperLayout(selectedPaperQuestions, { showCandidateBox: false });
                  }}
                  className="p-1 hover:bg-rose-600 text-slate-400 hover:text-white rounded"
                  title="Hide Candidate Box"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Main Candidate Details Row */}
              <div
                className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-2 gap-2"
                style={{ fontSize: `${candidateBoxFontSize}px` }}
              >
                {showCandidateName && (
                  <div className="group/nameField inline-flex items-center space-x-1">
                    <span className="font-semibold text-slate-300">Candidate Name: __________________________</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCandidateName(false);
                        savePaperLayout(selectedPaperQuestions, { showCandidateName: false });
                      }}
                      className="opacity-0 group-hover/nameField:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-opacity"
                      title="Remove Candidate Name field"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Custom Candidate Fields */}
                {customCandidateFields.map((cf, cfIdx) => (
                  <div key={cf.id} className="group/candCustomField inline-flex items-center space-x-1 font-semibold text-slate-300">
                    <input
                      type="text"
                      value={cf.label}
                      onChange={(e) => {
                        const updated = [...customCandidateFields];
                        updated[cfIdx] = { ...cf, label: e.target.value };
                        setCustomCandidateFields(updated);
                      }}
                      onBlur={() => savePaperLayout(selectedPaperQuestions, { customCandidateFields })}
                      className="bg-transparent text-slate-300 font-semibold border-b border-transparent focus:border-indigo-400 focus:outline-none px-0.5 w-24 text-xs"
                      placeholder="Field Name"
                    />
                    <span>:</span>
                    <input
                      type="text"
                      value={cf.placeholder}
                      onChange={(e) => {
                        const updated = [...customCandidateFields];
                        updated[cfIdx] = { ...cf, placeholder: e.target.value };
                        setCustomCandidateFields(updated);
                      }}
                      onBlur={() => savePaperLayout(selectedPaperQuestions, { customCandidateFields })}
                      className="bg-transparent text-slate-400 font-mono border-b border-transparent focus:border-indigo-400 focus:outline-none px-0.5 w-32 text-xs"
                      placeholder="Blank space"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteCandidateField(cf.id)}
                      className="opacity-0 group-hover/candCustomField:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-opacity"
                      title={`Remove "${cf.label}"`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Roll Number Format with Mouse Controls */}
                {showRollNo && (
                  <div className="group/rollNoField inline-flex items-center space-x-1.5">
                    {rollNoStyle === 'boxes' ? (
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-slate-300 font-mono text-[11px]">Roll No:</span>
                        <div className="inline-flex space-x-1">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-5 h-5 border border-slate-700 bg-slate-900/90 inline-flex items-center justify-center rounded-[3px]"
                            />
                          ))}
                        </div>
                      </div>
                    ) : rollNoStyle === 'blank' ? (
                      <div className="flex items-center space-x-1 font-mono text-slate-300">
                        <span className="font-semibold">Roll No:</span>
                        <span>________________________</span>
                      </div>
                    ) : null}

                    {/* Quick Roll No Style Switcher on Hover */}
                    <div className="opacity-0 group-hover/rollNoField:opacity-100 flex items-center space-x-0.5 bg-slate-900 border border-slate-700 rounded px-1 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setRollNoStyle('boxes');
                          savePaperLayout(selectedPaperQuestions, { rollNoStyle: 'boxes' });
                        }}
                        className={`text-[9px] px-1 py-0.5 rounded font-mono ${rollNoStyle === 'boxes' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                      >
                        Boxes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRollNoStyle('blank');
                          savePaperLayout(selectedPaperQuestions, { rollNoStyle: 'blank' });
                        }}
                        className={`text-[9px] px-1 py-0.5 rounded font-mono ${rollNoStyle === 'blank' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                      >
                        Line
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRollNo(false);
                          savePaperLayout(selectedPaperQuestions, { showRollNo: false });
                        }}
                        className="p-0.5 text-slate-500 hover:text-rose-400"
                        title="Remove Roll No field"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions Row with Direct Inline Textarea */}
              {showInstructions && (
                <div className="relative group/inst text-slate-400 text-[11px] leading-relaxed">
                  <div className="flex items-center justify-between pb-0.5">
                    <span className="font-bold text-slate-300">General Instructions:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInstructions(false);
                        savePaperLayout(selectedPaperQuestions, { showInstructions: false });
                      }}
                      className="opacity-0 group-hover/inst:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 transition-opacity"
                      title="Remove Instructions block"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <textarea
                    rows={Math.max(2, (instructions.match(/\n/g) || []).length + 1)}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    onBlur={() => savePaperLayout()}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-slate-300 text-[11px] focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed resize-y"
                    placeholder="Enter exam instructions (e.g. 1. All questions are compulsory...)"
                  />
                </div>
              )}
            </div>
          )}

          {/* Question & Element Stream on Interactive Canvas */}
          <div
            className={`space-y-3 ${
              pageColumns === 2 ? 'exam-columns-2' : ''
            }`}
          >
            {selectedPaperQuestions.length === 0 ? (
              /* ACTIONABLE INTERACTIVE EMPTY CANVAS HUB */
              <div className="text-center py-10 px-6 border-2 border-dashed border-slate-800 hover:border-indigo-500/40 rounded-3xl bg-slate-950/40 space-y-5 transition-all">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base font-bold text-white">
                    {activePaper ? `Editing: ${activePaper.title}` : 'New Blank Examination Paper'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {activePaper
                      ? 'This paper has no questions yet. Add questions from the bank on the left or create new ones below.'
                      : 'Choose to open a previously saved paper from the Paper Bank, or start fresh by adding questions to this blank canvas.'}
                  </p>
                </div>

                {/* Primary Paper Actions */}
                <div className="flex flex-col items-center space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsOpenSavedPaperModalOpen(true)}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-700 to-violet-700 hover:from-indigo-600 hover:to-violet-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-700/30 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
                    >
                      <FolderTree className="w-4 h-4" />
                      <span>📂 Open Saved Paper ({papers.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartNewPaper}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-2 transition-all"
                    >
                      <Plus className="w-4 h-4 text-indigo-400" />
                      <span>✨ Start Fresh New Paper</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 text-slate-600 text-[11px]">
                    <div className="flex-1 h-px bg-slate-800"></div>
                    <span>or add questions to this blank canvas</span>
                    <div className="flex-1 h-px bg-slate-800"></div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddNewQuestionToCanvas()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Question</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateFieldModal('section')}
                      className="px-3.5 py-2 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 hover:text-white border border-violet-500/40 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-all"
                    >
                      <Type className="w-3.5 h-3.5" />
                      <span>+ Section Heading</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateFieldModal('note')}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>+ Note Block</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              (() => {
                let qCounter = 0;
                return selectedPaperQuestions.map((q, idx) => {
                  {/* HOVER INSERTION BAR BETWEEN ELEMENTS */}
                  const insertionBar = (
                    <div className="relative group/insertBar h-2 hover:h-7 transition-all flex items-center justify-center my-1 z-10">
                      <div className="absolute inset-x-0 h-px bg-slate-800 group-hover/insertBar:bg-indigo-500/50 transition-colors" />
                      <div className="opacity-0 group-hover/insertBar:opacity-100 flex items-center space-x-1 bg-slate-900 border border-indigo-500/60 rounded-lg px-2 py-0.5 shadow-xl transition-all scale-90 group-hover/insertBar:scale-100">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">Insert Here:</span>
                        <button
                          type="button"
                          onClick={() => handleAddNewQuestionToCanvas(idx)}
                          className="text-[10px] px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold transition-colors"
                        >
                          + Question
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateFieldModal('section', idx)}
                          className="text-[10px] px-1.5 py-0.5 bg-violet-600/30 hover:bg-violet-600 text-violet-200 rounded font-semibold transition-colors"
                        >
                          + Section
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateFieldModal('note', idx)}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold transition-colors"
                        >
                          + Note
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddBlankSpace(60, 'blank', idx)}
                          className="text-[10px] px-1.5 py-0.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 rounded font-semibold transition-colors"
                          title="Insert blank space / working area here"
                        >
                          + Space
                        </button>
                      </div>
                    </div>
                  );

                  {/* SECTION HEADING RENDERER */}
                  if (q.type === 'section') {
                    const isSectionHidden = q.hideSection !== undefined ? q.hideSection : hideAllSections;
                    return (
                      <React.Fragment key={q.id || idx}>
                        {idx > 0 && insertionBar}
                        <div
                          className={`group/sec relative p-3 rounded-2xl transition-all shadow-lg space-y-1.5 my-2 border ${
                            isSectionHidden
                              ? 'bg-gradient-to-r from-amber-950/40 via-slate-950/70 to-slate-950/90 border-amber-500/50 opacity-80'
                              : 'bg-gradient-to-r from-violet-950/60 via-indigo-950/40 to-slate-950/80 border-violet-500/40'
                          }`}
                        >
                          {/* Top Status & Controls Header */}
                          <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-white/5">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-violet-300 bg-violet-950/80 px-1.5 py-0.5 rounded border border-violet-500/30">
                                SECTION
                              </span>
                              {isSectionHidden ? (
                                <span className="text-[9px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-semibold flex items-center space-x-1">
                                  <EyeOff className="w-2.5 h-2.5" />
                                  <span>Hidden on Paper</span>
                                </span>
                              ) : (
                                <span className="text-[9px] px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded font-semibold flex items-center space-x-1">
                                  <Eye className="w-2.5 h-2.5" />
                                  <span>Visible on Paper</span>
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleSectionVisibility(idx)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-all border ${
                                isSectionHidden
                                  ? 'bg-amber-950 text-amber-300 border-amber-500/50 hover:bg-amber-900 shadow-sm'
                                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800 border-slate-700/60'
                              }`}
                              title={isSectionHidden ? 'Section is hidden on paper. Click to unhide' : 'Click to hide section heading from paper'}
                            >
                              {isSectionHidden ? (
                                <>
                                  <Eye className="w-3 h-3 text-amber-400" />
                                  <span>Unhide Section</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3 text-slate-400" />
                                  <span>Hide Section</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Section Hover Toolbar */}
                          <div className="absolute -top-2.5 right-3 hidden group-hover/sec:flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 shadow-xl z-10">
                            {/* Direct Hide / Unhide button in hover toolbar */}
                            <button
                              type="button"
                              onClick={() => handleToggleSectionVisibility(idx)}
                              className={`p-1 rounded transition-colors ${
                                isSectionHidden
                                  ? 'bg-amber-900/60 text-amber-300 hover:bg-amber-800'
                                  : 'hover:bg-slate-800 text-slate-300'
                              }`}
                              title={isSectionHidden ? 'Unhide section on paper' : 'Hide section from paper'}
                            >
                              {isSectionHidden ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3 text-violet-300" />}
                            </button>

                            <span className="text-[10px] text-slate-400 font-semibold">Size:</span>
                            <button
                              type="button"
                              onClick={() => handleAdjustItemFontSize(idx, -1)}
                              className="p-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                            >
                              A-
                            </button>
                            <span className="font-mono text-[10px] text-violet-300 font-bold px-0.5">
                              {q.customFontSize || q.fontSize || 14}pt
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustItemFontSize(idx, 1)}
                              className="p-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                            >
                              A+
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const nextAlign = q.align === 'left' ? 'center' : 'left';
                                const updated = [...selectedPaperQuestions];
                                updated[idx] = { ...q, align: nextAlign };
                                setSelectedPaperQuestions(updated);
                                savePaperLayout(updated);
                              }}
                              className="p-1 hover:bg-slate-800 text-slate-300 rounded text-[10px] font-mono ml-1"
                              title="Toggle Text Alignment"
                            >
                              {q.align === 'left' ? 'Left' : 'Center'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateCanvasItem(idx)}
                              className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                              title="Duplicate Section"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded"
                            >
                              <MoveUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === selectedPaperQuestions.length - 1}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded"
                            >
                              <MoveDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = selectedPaperQuestions.filter((_, i) => i !== idx);
                                setSelectedPaperQuestions(updated);
                                savePaperLayout(updated);
                                showToast('Deleted section heading');
                              }}
                              className="p-1 hover:bg-rose-600 text-slate-400 hover:text-white rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => {
                              const updated = [...selectedPaperQuestions];
                              updated[idx] = { ...q, title: e.target.value };
                              setSelectedPaperQuestions(updated);
                            }}
                            onBlur={() => savePaperLayout()}
                            style={{ fontSize: `${q.customFontSize || q.fontSize || 14}pt` }}
                            className={`w-full bg-transparent font-bold uppercase tracking-wider text-violet-200 border-b border-transparent hover:border-violet-500/40 focus:border-violet-500 focus:outline-none transition-colors ${
                              q.align === 'left' ? 'text-left' : 'text-center'
                            }`}
                            placeholder="ENTER SECTION TITLE (e.g. SECTION A)"
                          />
                          <input
                            type="text"
                            value={q.subtitle || ''}
                            onChange={(e) => {
                              const updated = [...selectedPaperQuestions];
                              updated[idx] = { ...q, subtitle: e.target.value };
                              setSelectedPaperQuestions(updated);
                            }}
                            onBlur={() => savePaperLayout()}
                            className={`w-full bg-transparent text-xs text-slate-400 border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors ${
                              q.align === 'left' ? 'text-left' : 'text-center'
                            }`}
                            placeholder="Optional section description e.g. Questions 1 to 10 carry 1 mark each"
                          />
                        </div>
                      </React.Fragment>
                    );
                  }

                  {/* NOTE / NOTICE BLOCK RENDERER */}
                  if (q.type === 'note') {
                    return (
                      <React.Fragment key={q.id || idx}>
                        {idx > 0 && insertionBar}
                        <div className="group/note relative p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 my-1.5 transition-all">
                          {/* Note Hover Toolbar */}
                          <div className="absolute -top-2.5 right-3 hidden group-hover/note:flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 shadow-xl z-10">
                            <span className="text-[10px] text-slate-400 font-semibold">Size:</span>
                            <button
                              type="button"
                              onClick={() => handleAdjustItemFontSize(idx, -1)}
                              className="p-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                            >
                              A-
                            </button>
                            <span className="font-mono text-[10px] text-amber-300 font-bold px-0.5">
                              {q.customFontSize || q.fontSize || 11}pt
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustItemFontSize(idx, 1)}
                              className="p-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                            >
                              A+
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateCanvasItem(idx)}
                              className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded"
                            >
                              <MoveUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === selectedPaperQuestions.length - 1}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded"
                            >
                              <MoveDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = selectedPaperQuestions.filter((_, i) => i !== idx);
                                setSelectedPaperQuestions(updated);
                                savePaperLayout(updated);
                                showToast('Deleted note block');
                              }}
                              className="p-1 hover:bg-rose-600 text-slate-400 hover:text-white rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-start space-x-2">
                            <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <textarea
                              rows={2}
                              value={q.text}
                              onChange={(e) => {
                                const updated = [...selectedPaperQuestions];
                                updated[idx] = { ...q, text: e.target.value };
                                setSelectedPaperQuestions(updated);
                              }}
                              onBlur={() => savePaperLayout()}
                              style={{ fontSize: `${q.customFontSize || q.fontSize || 11}pt` }}
                              className="w-full bg-transparent text-slate-300 italic border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none transition-colors leading-relaxed"
                              placeholder="Type note or instructions text..."
                            />
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  }

                  {/* BLANK SPACE / ANSWER WORKING AREA RENDERER */}
                  if (q.type === 'space') {
                    const spaceH = q.height || 60;
                    const style = q.spaceStyle || 'blank';
                    return (
                      <React.Fragment key={q.id || idx}>
                        {idx > 0 && insertionBar}
                        <div className="group/space relative p-3 rounded-2xl bg-slate-950/60 border border-dashed border-emerald-500/40 space-y-2 my-2 transition-all hover:border-emerald-400">
                          {/* Space Hover Toolbar */}
                          <div className="absolute -top-2.5 right-3 hidden group-hover/space:flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 shadow-xl z-10">
                            <span className="text-[10px] text-slate-400 font-semibold">Height:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextH = Math.max(20, spaceH - 20);
                                const updated = [...selectedPaperQuestions];
                                updated[idx] = { ...q, height: nextH };
                                setSelectedPaperQuestions(updated);
                                savePaperLayout(updated);
                              }}
                              className="px-1 py-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                              title="Decrease Space Height (-20px)"
                            >
                              -20px
                            </button>
                            <span className="font-mono text-[10px] text-emerald-300 font-bold px-1">
                              {spaceH}px
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextH = Math.min(600, spaceH + 20);
                                const updated = [...selectedPaperQuestions];
                                updated[idx] = { ...q, height: nextH };
                                setSelectedPaperQuestions(updated);
                                savePaperLayout(updated);
                              }}
                              className="px-1 py-0.5 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                              title="Increase Space Height (+20px)"
                            >
                              +20px
                            </button>

                            {/* Style switch */}
                            <div className="flex items-center space-x-0.5 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 ml-1">
                              {(['blank', 'ruled', 'rough'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...selectedPaperQuestions];
                                    updated[idx] = { ...q, spaceStyle: st };
                                    setSelectedPaperQuestions(updated);
                                    savePaperLayout(updated);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                                    style === st
                                      ? 'bg-emerald-600 text-white'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {st === 'blank' ? 'Blank' : st === 'ruled' ? 'Ruled' : 'Rough Box'}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDuplicateCanvasItem(idx)}
                              className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                              title="Duplicate Space"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded"
                              title="Move Up"
                            >
                              <MoveUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === selectedPaperQuestions.length - 1}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded"
                              title="Move Down"
                            >
                              <MoveDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = selectedPaperQuestions.filter((_, i) => i !== idx);
                                setSelectedPaperQuestions(updated);
                                savePaperLayout(updated);
                                showToast('Removed blank space');
                              }}
                              className="p-1 hover:bg-rose-600 text-slate-400 hover:text-white rounded"
                              title="Delete Space"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Visual Display of Blank Space */}
                          <div
                            style={{ height: `${spaceH}px` }}
                            className={`w-full rounded-xl flex items-center justify-center transition-all ${
                              style === 'rough'
                                ? 'border border-dashed border-slate-600 bg-slate-900/40 text-slate-500'
                                : style === 'ruled'
                                ? 'bg-transparent text-slate-500'
                                : 'bg-slate-900/20 text-slate-600'
                            }`}
                          >
                            {style === 'rough' && (
                              <span className="text-[11px] font-mono uppercase tracking-widest font-semibold opacity-60">
                                — SPACE FOR ROUGH WORK —
                              </span>
                            )}
                            {style === 'ruled' && (
                              <div className="w-full h-full flex flex-col justify-between py-1 opacity-40">
                                {Array.from({ length: Math.max(1, Math.floor(spaceH / 20)) }).map((_, rIdx) => (
                                  <div key={rIdx} className="w-full border-b border-dashed border-slate-600 h-0" />
                                ))}
                              </div>
                            )}
                            {style === 'blank' && (
                              <span className="text-[10px] font-mono uppercase tracking-wider opacity-40">
                                ␣ Blank Answer Space ({spaceH}px)
                              </span>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  }

                  {/* STANDARD QUESTION RENDERER */}
                  qCounter++;
                  const currentQNum = qCounter;
                  const options = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
                  const rawDiagrams = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson) : q.diagrams || [];
                  const diagrams = rawDiagrams.map((d: any, origIdx: number) => ({
                    ...(typeof d === 'string' ? { relative_url: d } : d),
                    originalIndex: origIdx,
                  }));
                  const isBoxed = borderStyle === 'box';
                  const hasDivider = borderStyle === 'divider';
                  const isDashed = borderStyle === 'dashed';

                  const effectiveDefaultAlign = (imageAlignment === 'inline' && q.questionText && q.questionText.trim() !== '') ? 'right' : imageAlignment;

                  const rightDiagrams = diagrams.filter((d: any) => {
                    const align = d.alignment || effectiveDefaultAlign;
                    return align === 'right' && q.questionText && q.questionText.trim() !== '';
                  });

                  const leftDiagrams = diagrams.filter((d: any) => {
                    const align = d.alignment || effectiveDefaultAlign;
                    return align === 'left' && q.questionText && q.questionText.trim() !== '';
                  });

                  const centerDiagrams = diagrams.filter((d: any) => {
                    const align = d.alignment || effectiveDefaultAlign;
                    return align === 'center' && q.questionText && q.questionText.trim() !== '';
                  });

                  const inlineDiagrams = diagrams.filter((d: any) => {
                    const align = d.alignment || effectiveDefaultAlign;
                    return align === 'inline' || !q.questionText || q.questionText.trim() === '';
                  });

                  const shouldWrapOptions = q.wrapOptionsBesideDiagram !== undefined ? q.wrapOptionsBesideDiagram : wrapOptionsBesideDiagram;

                  const renderCanvasOptionsBlock = (wrapBeside: boolean) => {
                    const isQOptionsHidden = q.hideOptions !== undefined ? q.hideOptions : hideAllOptions;
                    return (
                      <div className={`${wrapBeside ? 'relative z-10' : 'clear-both'} mt-1 space-y-1`}>
                        <div className="flex items-center justify-between px-1 py-0.5 bg-slate-900/40 rounded-lg border border-slate-800/60">
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center space-x-1.5">
                            <span>Choices ({options.length}):</span>
                            {isQOptionsHidden ? (
                              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-semibold">
                                Hidden on Paper (Subjective)
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded font-semibold">
                                Visible on Paper
                              </span>
                            )}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleQuestionWrapOptions(idx);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-all border ${
                                shouldWrapOptions
                                  ? 'bg-indigo-950 text-indigo-300 border-indigo-500/50 hover:bg-indigo-900'
                                  : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800 border-slate-700/60'
                              }`}
                              title={
                                shouldWrapOptions
                                  ? 'Choices wrap beside diagram (zero blank space). Click to place choices below diagram.'
                                  : 'Choices placed below diagram. Click to wrap beside diagram to remove blank space.'
                              }
                            >
                              <WrapText className="w-3 h-3" />
                              <span>{shouldWrapOptions ? 'Beside Diagram' : 'Below Diagram'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleQuestionOptions(idx);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-all border ${
                                isQOptionsHidden
                                  ? 'bg-amber-950 text-amber-300 border-amber-500/50 hover:bg-amber-900'
                                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800 border-slate-700/60'
                              }`}
                              title={isQOptionsHidden ? 'Choices are hidden on paper. Click to unhide' : 'Click to hide choices (converts to subjective format)'}
                            >
                              {isQOptionsHidden ? (
                                <>
                                  <Eye className="w-3 h-3 text-amber-400" />
                                  <span>Unhide Options</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3 text-slate-400" />
                                  <span>Hide Options</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div
                          className={`pt-0.5 transition-opacity ${
                            isQOptionsHidden ? 'opacity-40 hover:opacity-90' : 'opacity-100'
                          } ${
                            optionLayout === 'inline'
                              ? 'flex flex-wrap items-center gap-x-4 gap-y-1'
                              : optionLayout === 'grid2'
                              ? 'grid grid-cols-2 gap-2'
                              : 'space-y-1.5'
                          }`}
                          style={{ fontSize: `${q.customFontSize || baseFontSizePt || 10}pt` }}
                        >
                          {options.map((opt: any, oIdx: number) => {
                            const isCorrect = q.correctAnswer && (
                              q.correctAnswer.trim().toUpperCase() === opt.key.toUpperCase() ||
                              q.correctAnswer.trim().toUpperCase() === `(${opt.key.toUpperCase()})` ||
                              q.correctAnswer.trim().toUpperCase() === opt.text?.trim().toUpperCase()
                            );
                            return (
                              <div
                                key={oIdx}
                                onClick={() => handleSaveQuickAnswer(idx, opt.key)}
                                className={`rounded-lg flex items-center space-x-1.5 cursor-pointer select-none transition-all ${
                                  optionLayout === 'inline' ? 'inline-flex' : 'w-full'
                                } ${
                                  isCorrect
                                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 font-bold shadow-sm ring-1 ring-emerald-500/30'
                                    : 'hover:bg-slate-800/80 px-1.5 py-0.5'
                                }`}
                                style={{ fontSize: 'inherit' }}
                                title={`Click to mark (${opt.key}) as the correct answer`}
                              >
                                <span className={`font-mono font-bold shrink-0 ${isCorrect ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                  {isCorrect ? `✓ (${opt.key})` : `(${opt.key})`}
                                </span>
                                {opt.text && (
                                  <span className={`${getFontFamilyClass()} ${isCorrect ? 'text-emerald-200 font-semibold' : 'text-slate-300'}`} style={{ fontSize: 'inherit' }}>
                                    <MathRenderer content={opt.text} />
                                  </span>
                                )}
                                {opt.imageUrl && (
                                  <div className="inline-block" onClick={(e) => e.stopPropagation()}>
                                    <ResizableImage
                                      src={opt.imageUrl}
                                      alt={`Option (${opt.key})`}
                                      initialWidth={opt.imageWidth}
                                      initialHeight={opt.imageHeight || imageCustomHeight}
                                      minHeight={10}
                                      maxHeight={200}
                                      borderStyle={imageBorderStyle === 'none' ? 'none' : 'thin'}
                                      removable={true}
                                      onRemove={() => handleDeleteOptionImageOnCanvas(idx, oIdx)}
                                      onResizeEnd={(w, h) => handleResizeOptionImageOnCanvas(idx, oIdx, w, h)}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <React.Fragment key={q.id || idx}>
                      {idx > 0 && insertionBar}
                      <div
                        className={`avoid-break transition-all group relative ${
                          spacingPreset === 'zero' ? 'space-y-1' : 'space-y-2'
                        } ${
                          isBoxed
                            ? spacingPreset === 'zero' ? 'p-2 rounded-xl bg-slate-950/90 border border-slate-700/80' : 'p-3.5 rounded-xl bg-slate-950/90 border border-slate-700/80'
                            : hasDivider
                            ? spacingPreset === 'zero' ? 'pb-1.5 border-b border-slate-800/80' : 'pb-3 border-b border-slate-800/80'
                            : isDashed
                            ? spacingPreset === 'zero' ? 'pb-1.5 border-b border-dashed border-slate-800/80' : 'pb-3 border-b border-dashed border-slate-800/80'
                            : spacingPreset === 'zero' ? 'pb-1' : 'pb-2'
                        }`}
                        style={{ fontSize: q.customFontSize ? `${q.customFontSize}pt` : undefined }}
                      >
                        {/* Header Row: Question Number, Marks & Action Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap items-center gap-2 flex-1 mr-2">
                            <span className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center justify-center font-mono shrink-0 shadow-sm">
                              Q{currentQNum}
                            </span>

                            {/* Direct Marks Entry Controller on Canvas */}
                            <div className="inline-flex items-center space-x-1.5 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-700/80 hover:border-indigo-500 transition-all shadow-sm">
                              <span className="text-[10px] text-slate-400 font-semibold select-none">Marks:</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentMarks = Number(q.marks) || 1;
                                  handleUpdateMarksOnCanvas(idx, Math.max(0.5, currentMarks - (currentMarks > 1 ? 1 : 0.5)));
                                }}
                                className="w-4 h-4 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
                                title="Decrease Marks"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={q.marks !== undefined ? q.marks : 1}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  handleUpdateMarksOnCanvas(idx, isNaN(val) ? 0 : val);
                                }}
                                className="w-10 bg-slate-950 text-indigo-300 font-mono font-bold text-xs text-center rounded border border-slate-700 focus:outline-none focus:border-indigo-400 py-0.5"
                                title="Enter marks directly"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentMarks = Number(q.marks) || 1;
                                  handleUpdateMarksOnCanvas(idx, currentMarks + (currentMarks < 1 ? 0.5 : 1));
                                }}
                                className="w-4 h-4 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
                                title="Increase Marks"
                              >
                                +
                              </button>
                              {/* Quick Mark Presets */}
                              <div className="flex items-center space-x-0.5 pl-1 border-l border-slate-800">
                                {[1, 2, 3, 5].map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateMarksOnCanvas(idx, m);
                                    }}
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold transition-all ${
                                      Number(q.marks) === m && !q.hideMarks
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    }`}
                                    title={`Set ${m} Mark${m > 1 ? 's' : ''}`}
                                  >
                                    {m}m
                                  </button>
                                ))}
                              </div>
                              {/* Per-Question Marks Removal Toggle */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleQuestionMarks(idx);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ml-1 border ${
                                  q.hideMarks || !showQuestionMarks
                                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 hover:bg-rose-900 shadow-sm'
                                    : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800 border-transparent'
                                }`}
                                title={q.hideMarks ? 'Marks are removed from this question. Click to restore' : 'Click to remove marks display from this question'}
                              >
                                {q.hideMarks ? '✕ Marks Removed' : 'Remove Marks'}
                              </button>
                            </div>
                          </div>

                          {/* Full Canvas Mouse Action Toolbar on Hover */}
                          <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 bg-slate-950/80 px-1.5 py-0.5 rounded-lg border border-slate-800 transition-opacity">
                            {/* Question Font Size Adjuster (A- / A+) */}
                            <button
                              type="button"
                              onClick={() => handleAdjustItemFontSize(idx, -1)}
                              className="p-1 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                              title="Decrease font size for this question"
                            >
                              A-
                            </button>
                            <span className="font-mono text-[10px] text-indigo-300 font-bold px-0.5 select-none">
                              {q.customFontSize || baseFontSizePt || 10}pt
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustItemFontSize(idx, 1)}
                              className="p-1 hover:bg-slate-800 text-slate-300 rounded font-bold text-[10px]"
                              title="Increase font size for this question"
                            >
                              A+
                            </button>

                            {/* Edit Question */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditQuestion(idx)}
                              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 rounded ml-1"
                              title="Edit Question Text, Math Equations, Options & Diagrams"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Duplicate Question */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateCanvasItem(idx)}
                              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                              title="Duplicate question"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Up */}
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded"
                              title="Move Question Up"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === selectedPaperQuestions.length - 1}
                              className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded"
                              title="Move Question Down"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Question */}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = selectedPaperQuestions.filter((_, i) => i !== idx);
                                setSelectedPaperQuestions(updated);
                                savePaperLayout(updated);
                                showToast(`Removed Q${currentQNum} from canvas`);
                              }}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded ml-1"
                              title="Remove question from canvas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Question Stem with Floated Diagrams for Automatic Text Wrapping & Space Saving */}
                        <div className="flow-root relative w-full">
                          {/* Floated Right Diagrams on Canvas */}
                          {rightDiagrams.map((d: any, dIdx: number) => {
                            const originalIdx = d.originalIndex ?? dIdx;
                            const dSrc = typeof d === 'string' ? d : d.relative_url || d.url || '';
                            return (
                              <div
                                key={`c-diag-r-${dIdx}`}
                                style={{
                                  float: 'right',
                                  marginLeft: 12,
                                  marginBottom: 6,
                                  marginTop: Math.max(0, d.offsetY || 0),
                                  maxWidth: '48%',
                                }}
                                className="no-break-inside relative z-10"
                              >
                                <ResizableImage
                                  src={dSrc}
                                  alt={`Question Figure ${dIdx + 1}`}
                                  initialWidth={d.width}
                                  initialHeight={d.height || 80}
                                  initialOffsetX={0}
                                  initialOffsetY={d.offsetY || 0}
                                  alignment="right"
                                  minHeight={35}
                                  maxHeight={350}
                                  borderStyle={imageBorderStyle === 'none' ? 'none' : 'thin'}
                                  removable={true}
                                  movable={true}
                                  onRemove={() => handleDeleteDiagramOnCanvas(idx, originalIdx)}
                                  onResizeEnd={(w, h) => handleResizeDiagramOnCanvas(idx, originalIdx, w, h)}
                                  onMove={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, true)}
                                  onMoveEnd={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, false)}
                                />
                              </div>
                            );
                          })}

                          {/* Floated Left Diagrams on Canvas */}
                          {leftDiagrams.map((d: any, dIdx: number) => {
                            const originalIdx = d.originalIndex ?? dIdx;
                            const dSrc = typeof d === 'string' ? d : d.relative_url || d.url || '';
                            return (
                              <div
                                key={`c-diag-l-${dIdx}`}
                                style={{
                                  float: 'left',
                                  marginRight: 12,
                                  marginBottom: 6,
                                  marginTop: Math.max(0, d.offsetY || 0),
                                  maxWidth: '48%',
                                }}
                                className="no-break-inside relative z-10"
                              >
                                <ResizableImage
                                  src={dSrc}
                                  alt={`Question Figure ${dIdx + 1}`}
                                  initialWidth={d.width}
                                  initialHeight={d.height || 80}
                                  initialOffsetX={0}
                                  initialOffsetY={d.offsetY || 0}
                                  alignment="left"
                                  minHeight={35}
                                  maxHeight={350}
                                  borderStyle={imageBorderStyle === 'none' ? 'none' : 'thin'}
                                  removable={true}
                                  movable={true}
                                  onRemove={() => handleDeleteDiagramOnCanvas(idx, originalIdx)}
                                  onResizeEnd={(w, h) => handleResizeDiagramOnCanvas(idx, originalIdx, w, h)}
                                  onMove={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, true)}
                                  onMoveEnd={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, false)}
                                />
                              </div>
                            );
                          })}

                          {/* Question Body with Click-to-Edit (Wraps around floated diagrams) */}
                          {q.questionText && q.questionText.trim() !== '' && (
                            <div
                              onClick={() => handleOpenEditQuestion(idx)}
                              className={`${getFontFamilyClass()} ${getLineSpacingClass()} text-slate-100 cursor-pointer hover:bg-indigo-950/20 p-1 rounded-lg transition-colors break-words [overflow-wrap:anywhere]`}
                              style={{ fontSize: `${q.customFontSize || baseFontSizePt || 10}pt` }}
                              title="Click to edit question text"
                            >
                              <MathRenderer content={q.questionText || q.question_text || ''} />
                            </div>
                          )}

                          {/* Inline Diagrams on Canvas */}
                          {inlineDiagrams.length > 0 && (
                            <div className="inline-flex flex-wrap items-center gap-2 py-1 align-middle">
                              {inlineDiagrams.map((d: any, dIdx: number) => {
                                const originalIdx = d.originalIndex ?? dIdx;
                                const dSrc = typeof d === 'string' ? d : d.relative_url || d.url || '';
                                return (
                                  <ResizableImage
                                    key={`c-diag-i-${dIdx}`}
                                    src={dSrc}
                                    alt={`Question Figure ${dIdx + 1}`}
                                    initialWidth={d.width}
                                    initialHeight={d.height || 75}
                                    initialOffsetX={0}
                                    initialOffsetY={d.offsetY || 0}
                                    alignment="inline"
                                    minHeight={25}
                                    maxHeight={350}
                                    borderStyle={imageBorderStyle === 'none' ? 'none' : 'thin'}
                                    removable={true}
                                    movable={true}
                                    onRemove={() => handleDeleteDiagramOnCanvas(idx, originalIdx)}
                                    onResizeEnd={(w, h) => handleResizeDiagramOnCanvas(idx, originalIdx, w, h)}
                                    onMove={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, true)}
                                    onMoveEnd={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, false)}
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* MCQ Options wrapped beside diagram without clearing float to remove blank spaces */}
                          {options.length > 0 && shouldWrapOptions && (
                            renderCanvasOptionsBlock(true)
                          )}

                          {/* Centered Diagrams on Canvas */}
                          {centerDiagrams.map((d: any, dIdx: number) => {
                            const originalIdx = d.originalIndex ?? dIdx;
                            const dSrc = typeof d === 'string' ? d : d.relative_url || d.url || '';
                            return (
                              <div
                                key={`c-diag-c-${dIdx}`}
                                style={{ marginTop: Math.max(0, d.offsetY || 0) }}
                                className="clear-both w-full flex justify-center py-1"
                              >
                                <ResizableImage
                                  src={dSrc}
                                  alt={`Question Figure ${dIdx + 1}`}
                                  initialWidth={d.width}
                                  initialHeight={d.height || 80}
                                  initialOffsetX={0}
                                  initialOffsetY={d.offsetY || 0}
                                  alignment="center"
                                  minHeight={35}
                                  maxHeight={350}
                                  borderStyle={imageBorderStyle === 'none' ? 'none' : 'thin'}
                                  removable={true}
                                  movable={true}
                                  onRemove={() => handleDeleteDiagramOnCanvas(idx, originalIdx)}
                                  onResizeEnd={(w, h) => handleResizeDiagramOnCanvas(idx, originalIdx, w, h)}
                                  onMove={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, true)}
                                  onMoveEnd={(newAlign, offX, offY) => handleMoveDiagramOnCanvas(idx, originalIdx, newAlign, offX, offY, false)}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* MCQ Options placed full-width below diagram when wrapOptionsBesideDiagram is off */}
                        {options.length > 0 && !shouldWrapOptions && (
                          renderCanvasOptionsBlock(false)
                        )}

                        {/* Teacher's Edition Answer & Solution Bar on Studio Canvas */}
                        {q.correctAnswer ? (
                          <div className="mt-1.5 p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-emerald-400 flex items-center space-x-1">
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Correct Answer:</span>
                              </span>
                              <span className="font-mono font-extrabold text-white bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/40">
                                {q.correctAnswer}
                              </span>
                              {q.explanation && (
                                <span className="text-slate-300 text-[11px]">
                                  &bull; <strong>Solution:</strong> {q.explanation}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenEditAnswerModal(idx)}
                              className="text-[11px] text-emerald-300 hover:text-white underline font-semibold flex items-center space-x-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Answer</span>
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1.5 p-2 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 text-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="font-bold">No answer set</span>
                              {options.length > 0 && (
                                <div className="flex items-center space-x-1 ml-2">
                                  <span className="text-[11px] text-slate-400">Quick set:</span>
                                  {options.map((opt: any) => (
                                    <button
                                      key={opt.key}
                                      type="button"
                                      onClick={() => handleSaveQuickAnswer(idx, opt.key)}
                                      className="w-5 h-5 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 text-[10px] font-bold font-mono border border-slate-700 transition-colors"
                                      title={`Set Option (${opt.key}) as correct answer`}
                                    >
                                      {opt.key}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenEditAnswerModal(idx)}
                              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 shadow"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Enter Answer</span>
                            </button>
                          </div>
                        )}

                        {/* Ruled Blank Lines / Answer Writing Space for this Question */}
                        {(() => {
                          const currentLines = q.blankLinesCount !== undefined && q.blankLinesCount !== null
                            ? q.blankLinesCount
                            : (q.blankSpaceHeight ? Math.round(q.blankSpaceHeight / 22) : 0);
                          const currentStyle = q.blankSpaceStyle || 'ruled';

                          return (
                            <div className="mt-2 pt-1.5 border-t border-slate-800/80 space-y-1.5 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] text-slate-400 font-semibold select-none flex items-center space-x-1">
                                    <Square className="w-3 h-3 text-emerald-400" />
                                    <span>Blank Lines:</span>
                                  </span>

                                  {/* Line Stepper: [-] [X Lines] [+] */}
                                  <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700/80 rounded-lg px-1 py-0.5 shadow-inner">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuestionBlankLines(idx, Math.max(0, currentLines - 1), currentStyle)}
                                      className="w-4 h-4 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
                                      title="Decrease 1 line"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono text-xs font-bold text-emerald-300 px-1.5 min-w-[50px] text-center select-none">
                                      {currentLines} {currentLines === 1 ? 'Line' : 'Lines'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuestionBlankLines(idx, Math.min(20, currentLines + 1), currentStyle)}
                                      className="w-4 h-4 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
                                      title="Add 1 line"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {/* Quick Line Presets */}
                                  <div className="flex items-center space-x-1">
                                    {[2, 4, 6, 8].map((ln) => (
                                      <button
                                        key={ln}
                                        type="button"
                                        onClick={() => handleUpdateQuestionBlankLines(idx, ln, currentStyle)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                                          currentLines === ln
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                                        }`}
                                        title={`Set ${ln} ruled blank lines`}
                                      >
                                        +{ln}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Remove Lines Button */}
                                  {currentLines > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuestionBlankLines(idx, 0, currentStyle)}
                                      className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 transition-all flex items-center space-x-1"
                                      title="Remove all blank lines from this question"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>Remove Lines</span>
                                    </button>
                                  )}
                                </div>

                                {/* Style Selector (Ruled lines vs Plain Blank space vs Rough work) */}
                                {currentLines > 0 && (
                                  <div className="flex items-center space-x-1">
                                    {(['ruled', 'blank', 'rough'] as const).map((st) => (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => handleUpdateQuestionBlankLines(idx, currentLines, st)}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase transition-colors ${
                                          currentStyle === st
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                                        }`}
                                      >
                                        {st === 'ruled' ? 'Ruled Lines' : st === 'blank' ? 'Blank' : 'Rough'}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Interactive Canvas Preview of Blank Answer Space / Ruled Lines */}
                              {currentLines > 0 && (
                                <div
                                  style={{ height: `${currentLines * 22}px`, minHeight: `${currentLines * 22}px` }}
                                  className={`w-full rounded-xl flex items-center justify-center transition-all ${
                                    currentStyle === 'rough'
                                      ? 'border border-dashed border-slate-700 bg-slate-900/40 text-slate-500'
                                      : currentStyle === 'blank'
                                      ? 'bg-slate-900/20 text-slate-600'
                                      : 'bg-transparent text-slate-600'
                                  }`}
                                >
                                  {currentStyle === 'ruled' && (
                                    <div className="w-full h-full flex flex-col justify-between py-1 opacity-40">
                                      {Array.from({ length: currentLines }).map((_, rIdx) => (
                                        <div key={rIdx} className="w-full border-b border-dashed border-slate-500 h-0 my-auto" />
                                      ))}
                                    </div>
                                  )}
                                  {currentStyle === 'rough' && (
                                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">
                                      — SPACE FOR ROUGH WORK ({currentLines} LINES) —
                                    </span>
                                  )}
                                  {currentStyle === 'blank' && (
                                    <span className="text-[10px] font-mono uppercase tracking-wider opacity-40">
                                      ␣ Blank Answer Space ({currentLines} Lines &bull; {currentLines * 22}px)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* LIVE A4 SHEET PREVIEW (SIDE-BY-SIDE IN SPLIT MODE) */}
        {viewMode === 'split' && (
          <div className={`${splitPreviewColSpan} glass-panel rounded-2xl p-3 bg-slate-950/80 overflow-hidden flex flex-col max-h-[820px] border border-slate-700/80 space-y-2`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-1 shrink-0">
              <div className="flex items-center space-x-2">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200">Live A4 Sheet Preview</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono rounded font-semibold">
                  Real-Time
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomMarginModalOpen(true)}
                  className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 hover:text-white font-mono flex items-center space-x-1"
                  title="Configure page margins"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                  <span>Margins: {pageMargin === 'custom' ? `${marginLeft}L/${marginTop}T mm` : pageMargin.toUpperCase()}</span>
                </button>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setShowMarginGuide(!showMarginGuide)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                    showMarginGuide
                      ? 'bg-indigo-600 border-indigo-400 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle visual margin guidelines on the paper"
                >
                  📐 {showMarginGuide ? 'Guides ON' : 'Guides'}
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  {pageColumns} Col &bull; {selectedPaperQuestions.length} Qs
                </span>
                <button
                  type="button"
                  onClick={handlePrintPaper}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold transition-all flex items-center space-x-1"
                  title="Print or Save as PDF"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {renderA4SheetContent(true)}
            </div>
          </div>
        )}

        {/* FULL A4 SHEET PREVIEW (IN A4 PREVIEW MODE) */}
        {viewMode === 'a4_preview' && (
          <div className={`${a4PreviewColSpan} glass-panel rounded-2xl p-3 bg-slate-950/80 overflow-hidden flex flex-col max-h-[820px] border border-slate-700/80 space-y-2`}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 px-1 shrink-0">
              <div className="flex items-center space-x-2">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200">A4 Printable Paper Preview</span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono rounded font-semibold">
                  {pageMargin === 'custom' ? `Margins: ${marginLeft}L &bull; ${marginRight}R &bull; ${marginTop}T &bull; ${marginBottom}B mm` : `Margins: ${pageMargin.toUpperCase()}`}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {/* Direct Margin Presets & Custom Setup Button */}
                <div className="flex items-center space-x-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-700">
                  <Maximize2 className="w-3 h-3 text-indigo-400 mr-0.5" />
                  {(['zero', 'narrow', 'normal', 'wide'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectPresetMargin(m)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize transition-colors ${
                        pageMargin === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomMarginModalOpen(true)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors flex items-center space-x-1 ${
                      pageMargin === 'custom' ? 'bg-amber-600 text-white' : 'text-amber-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Set custom millimeter margins (Top, Bottom, Left, Right)"
                  >
                    <Sliders className="w-2.5 h-2.5" />
                    <span>Set Margins...</span>
                  </button>
                </div>

                {/* Show Margin Guide Toggle */}
                <button
                  type="button"
                  onClick={() => setShowMarginGuide(!showMarginGuide)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all border ${
                    showMarginGuide
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Toggle visual margin guidelines on the paper"
                >
                  📐 {showMarginGuide ? 'Hide Guide' : 'Show Guide'}
                </button>

                <button
                  type="button"
                  onClick={handlePrintPaper}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {renderA4SheetContent(false)}
            </div>
          </div>
        )}

        {/* RIGHT PANEL: Live Marks Validator & Snapshot Freeze */}
        <div className={`${
          !showExamConfigPanel
            ? 'lg:col-span-1'
            : viewMode === 'split' ? 'lg:col-span-2' : 'lg:col-span-3'
        } glass-panel rounded-2xl flex flex-col max-h-[820px] overflow-y-auto transition-all duration-300`}>

          {/* Collapsed strip — shown when minimised */}
          <div className={!showExamConfigPanel ? 'flex flex-col items-center justify-start py-4 space-y-4 h-full' : 'hidden'}>
            <button
              type="button"
              onClick={() => setShowExamConfigPanel(true)}
              className="p-2 rounded-xl bg-violet-600/20 text-violet-400 hover:bg-violet-600/40 hover:text-white transition-all"
              title="Expand Exam Configuration"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div
              className="text-[10px] font-bold text-slate-500 tracking-widest select-none"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              EXAM CONFIG
            </div>
          </div>

          {/* Expanded content — shown when not minimised */}
          <div className={!showExamConfigPanel ? 'hidden' : 'space-y-4 p-4 flex-1'}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Exam Configuration
              </span>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                {/* Minimize / collapse button */}
                <button
                  type="button"
                  onClick={() => setShowExamConfigPanel(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Minimise Exam Configuration panel"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Max Marks</label>
                <input
                  type="number"
                  value={maxMarks === undefined || maxMarks === null || Number.isNaN(Number(maxMarks)) ? '' : maxMarks}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                    setMaxMarks(val as any);
                  }}
                  onBlur={() => savePaperLayout()}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Class Folder</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    onBlur={() => savePaperLayout()}
                    placeholder="e.g. Class 12"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    onBlur={() => savePaperLayout()}
                    placeholder="e.g. Physics"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Exam Code</label>
                  <input
                    type="text"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    onBlur={() => savePaperLayout()}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={duration === undefined || duration === null || Number.isNaN(Number(duration)) ? '' : duration}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                      setDuration(val as any);
                    }}
                    onBlur={() => savePaperLayout()}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Exam Date & Time</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    onBlur={() => savePaperLayout()}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={examTime}
                    onChange={(e) => setExamTime(e.target.value)}
                    onBlur={() => savePaperLayout()}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">General Instructions</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  onBlur={() => savePaperLayout()}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-sans"
                />
              </div>

              <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
                <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Page Margins (Print & PDF)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCustomMarginModalOpen(true)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-mono"
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
                      className={`py-1.5 px-0.5 rounded-xl text-center border text-[10px] font-bold transition-all ${
                        pageMargin === m.id
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className="leading-none">{m.label}</div>
                      <div className="text-[8.5px] opacity-70 font-mono mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Direct 4-Way Margin Numeric Inputs & Steppers */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                    <span>Precision Margins:</span>
                    <span className="font-mono text-indigo-300">{marginLeft}L &bull; {marginRight}R &bull; {marginTop}T &bull; {marginBottom}B mm</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Left Margin (Crucial for binding/stapling) */}
                    <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Left (Binding):</span>
                        <span className="font-mono font-bold text-indigo-400">{marginLeft}mm</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleApplyCustomMargins(marginTop, marginBottom, Math.max(0, marginLeft - 2), marginRight)}
                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold flex items-center justify-center"
                        >-</button>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={marginLeft}
                          onChange={(e) => handleApplyCustomMargins(marginTop, marginBottom, parseInt(e.target.value, 10) || 0, marginRight)}
                          className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold text-center rounded py-0.5 focus:outline-none focus:border-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCustomMargins(marginTop, marginBottom, Math.min(60, marginLeft + 2), marginRight)}
                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold flex items-center justify-center"
                        >+</button>
                      </div>
                    </div>

                    {/* Right Margin */}
                    <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Right:</span>
                        <span className="font-mono font-bold text-indigo-400">{marginRight}mm</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleApplyCustomMargins(marginTop, marginBottom, marginLeft, Math.max(0, marginRight - 2))}
                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold flex items-center justify-center"
                        >-</button>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={marginRight}
                          onChange={(e) => handleApplyCustomMargins(marginTop, marginBottom, marginLeft, parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold text-center rounded py-0.5 focus:outline-none focus:border-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCustomMargins(marginTop, marginBottom, marginLeft, Math.min(60, marginRight + 2))}
                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold flex items-center justify-center"
                        >+</button>
                      </div>
                    </div>

                    {/* Top Margin */}
                    <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Top:</span>
                        <span className="font-mono font-bold text-indigo-400">{marginTop}mm</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleApplyCustomMargins(Math.max(0, marginTop - 2), marginBottom, marginLeft, marginRight)}
                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold flex items-center justify-center"
                        >-</button>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={marginTop}
                          onChange={(e) => handleApplyCustomMargins(parseInt(e.target.value, 10) || 0, marginBottom, marginLeft, marginRight)}
                          className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold text-center rounded py-0.5 focus:outline-none focus:border-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCustomMargins(Math.min(60, marginTop + 2), marginBottom, marginLeft, marginRight)}
                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold flex items-center justify-center"
                        >+</button>
                      </div>
                    </div>

                    {/* Bottom Margin */}
                    <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Bottom:</span>
                        <span className="font-mono font-bold text-indigo-400">{marginBottom}mm</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleApplyCustomMargins(marginTop, Math.max(0, marginBottom - 2), marginLeft, marginRight)}
                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold flex items-center justify-center"
                        >-</button>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={marginBottom}
                          onChange={(e) => handleApplyCustomMargins(marginTop, parseInt(e.target.value, 10) || 0, marginLeft, marginRight)}
                          className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold text-center rounded py-0.5 focus:outline-none focus:border-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCustomMargins(marginTop, Math.min(60, marginBottom + 2), marginLeft, marginRight)}
                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold flex items-center justify-center"
                        >+</button>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Margin Guidelines */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer text-[10px] text-slate-300 font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={showMarginGuide}
                        onChange={(e) => setShowMarginGuide(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span>Show On-Screen Margin Guides</span>
                    </label>
                    <span className="text-[9px] text-indigo-400 font-mono">
                      {showMarginGuide ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE MARKS MANAGEMENT VALIDATOR */}
            <div className="space-y-2 pt-2">
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target Maximum Marks:</span>
                  <span className="font-mono font-bold text-white text-sm">{numericMaxMarks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Current Question Total:</span>
                  <span className="font-mono font-bold text-indigo-400 text-sm">{currentTotalMarks}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Difference:</span>
                  <span className={`font-mono font-bold ${marksDiff === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {marksDiff === 0 ? '✓ Exact Match (0)' : `${marksDiff > 0 ? '+' : ''}${marksDiff} Marks`}
                  </span>
                </div>
              </div>

              {/* Marks Mismatch Alert */}
              {marksMismatch ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Marks Mismatch!</span>
                    <br />
                    {marksDiff > 0
                      ? `${marksDiff} marks needed to reach Target (${numericMaxMarks}).`
                      : `Current total exceeds Target (${numericMaxMarks}) by ${Math.abs(marksDiff)} marks.`}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="adminOverride" className="text-[11px] text-slate-400 font-medium">
                  Allow Administrator Override for marks mismatch
                </label>
              </div>
            )}
          </div>

          {/* Action Buttons & Multi-Format Exports */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            {/* Multi-Format Export Buttons */}
            {activePaper && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportWord}
                  className="py-2 px-3 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow"
                  title="Export styled Word Document (.doc)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Word (.doc)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow"
                  title="Export Excel spreadsheet (.csv)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.csv)</span>
                </button>
              </div>
            )}

            <button
              onClick={handleFinalizeSnapshot}
              disabled={loading || (marksMismatch && !adminOverride)}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Finalizing Snapshot...' : 'Finalize & Freeze Snapshot'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* WYSIWYG A4 WHITE SHEET PRINT PREVIEW (Rendered during browser print) */}
      <div className="print-only hidden">
        {renderA4SheetContent(false)}
      </div>

      {/* Save Question Paper & Choose Physical Storage Location Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Save Question Paper & Storage Location</h2>
                  <p className="text-xs text-slate-400">Give your paper a title and assign physical storage folder</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSaveToStorage} className="space-y-4">
              {/* Paper Title / Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Question Paper Title / Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={saveModalTitle}
                  onChange={(e) => setSaveModalTitle(e.target.value)}
                  placeholder="e.g., Class 12 Physics Pre-Board Examination 2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Exam Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Exam Code / Paper Identifier <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={saveModalExamCode}
                  onChange={(e) => setSaveModalExamCode(e.target.value)}
                  placeholder="e.g., PHY-12-2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono font-medium"
                />
              </div>

              {/* Class & Subject Folders Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Class / Grade Folder <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={saveModalClass}
                    onChange={(e) => setSaveModalClass(e.target.value)}
                    placeholder="e.g., Class 12"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Subject Subfolder <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={saveModalSubject}
                    onChange={(e) => setSaveModalSubject(e.target.value)}
                    placeholder="e.g., Physics"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Physical Storage Preview Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Physical Storage Destination Preview:</span>
                </div>
                <div className="font-mono text-[11px] text-emerald-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800/80 break-all select-all">
                  D:\Recovered_school_app\PAPERGENERATOR\data\Bank\Qpapers\{saveModalClass || '<Class>'}\{saveModalSubject || '<Subject>'}\
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 pl-1">
                  <div>📄 <span className="text-slate-300 font-mono">{(saveModalTitle || 'Paper').replace(/[^a-zA-Z0-9_-]/g, '_')}_{saveModalExamCode || 'CODE'}.json</span> (Database Snapshot)</div>
                  <div>📝 <span className="text-slate-300 font-mono">{(saveModalTitle || 'Paper').replace(/[^a-zA-Z0-9_-]/g, '_')}_{saveModalExamCode || 'CODE'}.doc</span> (Microsoft Word Document)</div>
                  <div>📊 <span className="text-slate-300 font-mono">{(saveModalTitle || 'Paper').replace(/[^a-zA-Z0-9_-]/g, '_')}_{saveModalExamCode || 'CODE'}.csv</span> (Excel Spreadsheet)</div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>💾 Save Paper & Store to Disk</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Question on Canvas Modal */}
      {editingQuestionIndex !== null && editQForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-sm">
                  Q{editingQuestionIndex + 1}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Edit Question Details & Images</h2>
                  <p className="text-xs text-slate-400">Modify question text, formula/LaTeX, options, marks & diagrams</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingQuestionIndex(null);
                  setEditQForm(null);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Question Text / Statement (Supports LaTeX math)
                </label>
                <textarea
                  rows={4}
                  value={editQForm.questionText}
                  onChange={(e) => setEditQForm({ ...editQForm, questionText: e.target.value })}
                  placeholder="Enter question text or mathematical equation e.g. Calculate the value of $\int_0^\pi \sin(x) dx$"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                />
                {/* Live Math Preview */}
                {editQForm.questionText && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-200">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">Live Equation Preview:</span>
                    <MathRenderer content={editQForm.questionText} />
                  </div>
                )}
              </div>

              {/* Marks, Negative Marks & Difficulty Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Marks <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editQForm.marks}
                    onChange={(e) => setEditQForm({ ...editQForm, marks: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Negative Marks</label>
                  <input
                    type="number"
                    step="0.25"
                    value={editQForm.negativeMarks}
                    onChange={(e) => setEditQForm({ ...editQForm, negativeMarks: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={editQForm.difficulty}
                    onChange={(e) => setEditQForm({ ...editQForm, difficulty: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              {/* Attached Diagrams Section with Delete & Add */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Attached Question Figures / Diagrams ({editQForm.diagrams.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => editQDiagramInputRef.current?.click()}
                    className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-xs font-medium flex items-center space-x-1 border border-indigo-500/30"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Attach Image</span>
                  </button>
                  <input
                    type="file"
                    ref={editQDiagramInputRef}
                    onChange={handleUploadEditQDiagram}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {editQForm.diagrams.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No diagrams attached to this question.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {editQForm.diagrams.map((diag, dIdx) => (
                      <div key={dIdx} className="relative group bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
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
                              diagrams: editQForm.diagrams.filter((_, i) => i !== dIdx),
                            });
                          }}
                          className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100 shadow"
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
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Options ({editQForm.options.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextKey = String.fromCharCode(65 + editQForm.options.length);
                      setEditQForm({
                        ...editQForm,
                        options: [...editQForm.options, { key: nextKey, text: '' }],
                      });
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Option</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editQForm.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="w-6 h-6 rounded-lg bg-indigo-950 text-indigo-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
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
                        className="flex-1 bg-transparent border-0 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                      {opt.imageUrl && (
                        <div className="relative inline-flex items-center bg-slate-900 px-2 py-1 rounded border border-slate-700">
                          <img src={opt.imageUrl} alt={`Opt ${opt.key}`} className="h-6 object-contain mr-1" />
                          <button
                            type="button"
                            onClick={() => {
                              const updatedOpts = [...editQForm.options];
                              updatedOpts[oIdx] = { ...updatedOpts[oIdx], imageUrl: null };
                              setEditQForm({ ...editQForm, options: updatedOpts });
                            }}
                            className="text-rose-400 hover:text-rose-200"
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
                            options: editQForm.options.filter((_, i) => i !== oIdx),
                          });
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400"
                        title="Remove this option"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Correct Answer & Explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Correct Answer</label>
                  <select
                    value={editQForm.correctAnswer}
                    onChange={(e) => setEditQForm({ ...editQForm, correctAnswer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">None / Not Specified</option>
                    {editQForm.options.map((o) => (
                      <option key={o.key} value={o.key}>
                        Option ({o.key})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Explanation / Solution</label>
                  <input
                    type="text"
                    value={editQForm.explanation}
                    onChange={(e) => setEditQForm({ ...editQForm, explanation: e.target.value })}
                    placeholder="Brief explanation for the answer"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-slate-800 shrink-0 bg-slate-950">
              <button
                type="button"
                onClick={() => {
                  setEditingQuestionIndex(null);
                  setEditQForm(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedQuestion}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>💾 Save & Update Question on Canvas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Answer Key & Solution Modal (Syncs to Paper & Question Bank) */}
      {quickAnswerModalIdx !== null && selectedPaperQuestions[quickAnswerModalIdx] && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Set Correct Answer for Q{quickAnswerModalIdx + 1}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Saves to this question paper and updates the Question Bank
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickAnswerModalIdx(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 max-h-24 overflow-y-auto">
              <span className="font-bold text-indigo-400 mr-1.5">Q{quickAnswerModalIdx + 1}.</span>
              <MathRenderer content={selectedPaperQuestions[quickAnswerModalIdx].questionText || selectedPaperQuestions[quickAnswerModalIdx].question_text || ''} />
            </div>

            {/* Quick Option Selector Buttons if MCQ options exist */}
            {(() => {
              const opts = typeof selectedPaperQuestions[quickAnswerModalIdx].optionsJson === 'string'
                ? JSON.parse(selectedPaperQuestions[quickAnswerModalIdx].optionsJson)
                : selectedPaperQuestions[quickAnswerModalIdx].options || [];
              if (opts.length === 0) return null;

              return (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Choose Option:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {opts.map((opt: any) => {
                      const isSel = quickAnswerVal.trim().toUpperCase() === opt.key.toUpperCase();
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setQuickAnswerVal(opt.key)}
                          className={`p-2 rounded-xl text-xs font-bold font-mono flex items-center justify-center space-x-1.5 border transition-all ${
                            isSel
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <span>({opt.key})</span>
                          {opt.text && <span className="truncate max-w-[80px] font-sans font-normal text-[11px]">{opt.text}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Custom Answer Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correct Answer (Option Key or Text Value) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={quickAnswerVal}
                onChange={(e) => setQuickAnswerVal(e.target.value)}
                placeholder="e.g., A or B or 4.5 m/s"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono font-bold"
              />
            </div>

            {/* Explanation / Step-by-Step Solution */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Step-by-Step Solution / Explanation (Optional)
              </label>
              <textarea
                rows={3}
                value={quickExplanationVal}
                onChange={(e) => setQuickExplanationVal(e.target.value)}
                placeholder="Enter detailed explanation, derivation or solution steps..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setQuickAnswerModalIdx(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveQuickAnswer(quickAnswerModalIdx, quickAnswerVal, quickExplanationVal)}
                disabled={!quickAnswerVal.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>💾 Save to Paper & Question Bank</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Field / Section / Note Creator Modal */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  {fieldModalType === 'section' ? (
                    <Type className="w-5 h-5 text-violet-400" />
                  ) : fieldModalType === 'note' ? (
                    <FileText className="w-5 h-5 text-amber-400" />
                  ) : fieldModalType === 'candidate' ? (
                    <User className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Hash className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {fieldModalType === 'section'
                      ? 'Add Section Heading'
                      : fieldModalType === 'note'
                      ? 'Add Note or Notice Block'
                      : fieldModalType === 'candidate'
                      ? 'Add Candidate Detail Field'
                      : 'Add Header Metadata Field'}
                  </h2>
                  <p className="text-xs text-slate-400">
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
                onClick={() => setIsFieldModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
                        className="px-2 py-1 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-[11px] font-mono rounded-lg transition-colors border border-slate-700"
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
                        className="px-2 py-1 bg-slate-800 hover:bg-violet-600 hover:text-white text-slate-300 text-[11px] rounded-lg transition-colors border border-slate-700"
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
                        className="px-2 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[11px] rounded-lg transition-colors border border-slate-700"
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
                        className="px-2 py-1 bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 text-[11px] rounded-lg transition-colors border border-slate-700 text-left truncate max-w-full"
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
                  handleAddSectionHeading(fieldModalLabel, fieldModalValue, fieldModalInsertIdx ?? undefined);
                } else if (fieldModalType === 'note') {
                  handleAddNoteBlock(fieldModalValue || fieldModalLabel, fieldModalInsertIdx ?? undefined);
                } else if (fieldModalType === 'candidate') {
                  handleAddCandidateField(fieldModalLabel, fieldModalValue || '________________________');
                } else {
                  handleAddHeaderField(fieldModalLabel, fieldModalValue);
                }
                setIsFieldModalOpen(false);
              }}
              className="space-y-4 pt-1"
            >
              {fieldModalType !== 'note' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {fieldModalType === 'section' ? 'Section Title' : 'Field Label / Name'} <span className="text-rose-400">*</span>
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Instructions / Note Text <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={fieldModalValue}
                    onChange={(e) => setFieldModalValue(e.target.value)}
                    placeholder="Enter instructions, notice, or note text for the exam paper..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFieldModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Insert to Canvas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAGE SETUP & CUSTOM MARGINS MODAL */}
      {isCustomMarginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Page Setup: Margins (Print & PDF)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Customize boundary margins for screen preview, PDF export, and Word documents
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomMarginModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Grid */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Quick Margins Presets:</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'zero', label: 'Eco Zero', t: 4, b: 4, l: 5, r: 5, desc: '4mm' },
                  { id: 'narrow', label: 'Narrow', t: 8, b: 8, l: 10, r: 10, desc: '8mm' },
                  { id: 'normal', label: 'Normal', t: 15, b: 15, l: 18, r: 18, desc: '15mm' },
                  { id: 'wide', label: 'Wide', t: 25, b: 25, l: 25, r: 25, desc: '25mm' },
                  { id: 'binding', label: 'Binding', t: 15, b: 15, l: 25, r: 15, desc: '25mm L' },
                ].map((preset) => {
                  const isCur = pageMargin === preset.id || (
                    pageMargin === 'custom' &&
                    marginLeft === preset.l &&
                    marginRight === preset.r &&
                    marginTop === preset.t &&
                    marginBottom === preset.b
                  );
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyCustomMargins(preset.t, preset.b, preset.l, preset.r)}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        isCur
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{preset.label}</div>
                      <div className="text-[9px] opacity-70 font-mono mt-0.5">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Page Margin Preview & Numeric Steppers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {/* Visual Diagram Preview */}
              <div className="flex flex-col items-center justify-center p-2">
                <span className="text-[10px] text-slate-400 font-semibold mb-2">Live Page Boundary Representation:</span>
                <div
                  className="w-36 h-48 bg-white rounded-lg shadow-lg border border-slate-400 relative flex flex-col justify-between"
                  style={{
                    paddingTop: `${Math.min(30, Math.max(4, marginTop * 0.8))}px`,
                    paddingBottom: `${Math.min(30, Math.max(4, marginBottom * 0.8))}px`,
                    paddingLeft: `${Math.min(30, Math.max(4, marginLeft * 0.8))}px`,
                    paddingRight: `${Math.min(30, Math.max(4, marginRight * 0.8))}px`,
                  }}
                >
                  <div className="w-full h-full border border-dashed border-indigo-500/80 bg-indigo-50/50 rounded flex flex-col items-center justify-center text-[9px] font-mono text-indigo-700 font-bold select-none text-center p-1">
                    <span>Printable Body</span>
                    <span className="text-[8px] font-normal opacity-80 mt-0.5">{marginLeft}L &bull; {marginRight}R</span>
                  </div>
                </div>
              </div>

              {/* 4 Inputs */}
              <div className="space-y-2.5">
                {/* Left Margin (Binding Side) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Left Margin (Binding/Punch):</span>
                    <span className="font-mono text-indigo-400 font-bold">{marginLeft} mm</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, marginBottom, Math.max(0, marginLeft - 1), marginRight)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
                    >-</button>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={marginLeft}
                      onChange={(e) => handleApplyCustomMargins(marginTop, marginBottom, parseInt(e.target.value, 10) || 0, marginRight)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg text-center text-sm font-mono font-bold text-white py-1 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, marginBottom, Math.min(60, marginLeft + 1), marginRight)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
                    >+</button>
                  </div>
                </div>

                {/* Right Margin */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Right Margin:</span>
                    <span className="font-mono text-indigo-400 font-bold">{marginRight} mm</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, marginBottom, marginLeft, Math.max(0, marginRight - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
                    >-</button>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={marginRight}
                      onChange={(e) => handleApplyCustomMargins(marginTop, marginBottom, marginLeft, parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg text-center text-sm font-mono font-bold text-white py-1 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, marginBottom, marginLeft, Math.min(60, marginRight + 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
                    >+</button>
                  </div>
                </div>

                {/* Top Margin */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Top Margin:</span>
                    <span className="font-mono text-indigo-400 font-bold">{marginTop} mm</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(Math.max(0, marginTop - 1), marginBottom, marginLeft, marginRight)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
                    >-</button>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={marginTop}
                      onChange={(e) => handleApplyCustomMargins(parseInt(e.target.value, 10) || 0, marginBottom, marginLeft, marginRight)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg text-center text-sm font-mono font-bold text-white py-1 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(Math.min(60, marginTop + 1), marginBottom, marginLeft, marginRight)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
                    >+</button>
                  </div>
                </div>

                {/* Bottom Margin */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Bottom Margin:</span>
                    <span className="font-mono text-indigo-400 font-bold">{marginBottom} mm</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, Math.max(0, marginBottom - 1), marginLeft, marginRight)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
                    >-</button>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={marginBottom}
                      onChange={(e) => handleApplyCustomMargins(marginTop, parseInt(e.target.value, 10) || 0, marginLeft, marginRight)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg text-center text-sm font-mono font-bold text-white py-1 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCustomMargins(marginTop, Math.min(60, marginBottom + 1), marginLeft, marginRight)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
                    >+</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">
                💡 Tip: Set Left margin to 25mm if stapling or punch-binding exams.
              </span>
              <button
                type="button"
                onClick={() => setIsCustomMarginModalOpen(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Apply &amp; Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUESTION BANK EXPLORER MODAL DIALOG                                        */}
      {/* Dedicated full page explorer for filtering folders, subjects, selecting     */}
      {/* questions via checkboxes, assigning marks, and inserting into canvas.      */}
      {/* ========================================================================= */}
      {isQuestionBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Top Modal Header Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="font-bold text-base text-white">Question Bank Explorer</h2>
                    <span className="text-xs px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full font-mono font-semibold border border-indigo-500/30">
                      Showing {filteredModalQuestions.length} of {bankQuestions.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select Class Folder &amp; Subject &bull; Select questions using checkboxes &bull; Adjust marks &bull; Insert directly into Canvas
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href="/bank"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700 shadow-sm"
                  title="Open full Question Bank management in a new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Full Bank Page ↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsQuestionBankModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Close Explorer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Ribbon */}
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/60 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                {/* 1. Folder / Class Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                    <Folder className="w-3.5 h-3.5 text-indigo-400" />
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-medium truncate"
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
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                    <Filter className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Subject:</span>
                  </label>
                  <select
                    value={bankSubjectFilter}
                    onChange={(e) => {
                      setBankSubjectFilter(e.target.value);
                      setBankChapterFilter('all');
                      setBankSubTopicFilter('all');
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-medium truncate"
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

                {/* 3. Chapter / Topic Dropdown (Sub-filter 1) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Chapter / Topic:</span>
                  </label>
                  <select
                    value={bankChapterFilter}
                    onChange={(e) => {
                      setBankChapterFilter(e.target.value);
                      setBankSubTopicFilter('all');
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-medium truncate"
                  >
                    <option value="all">📖 All Chapters / Topics</option>
                    {getAvailableChapters(bankFolderFilter, bankSubjectFilter).map((ch: any) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Sub-Topic / DPP Dropdown (Sub-filter 2) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sub-Topic / DPP:</span>
                  </label>
                  <select
                    value={bankSubTopicFilter}
                    onChange={(e) => setBankSubTopicFilter(e.target.value)}
                    disabled={bankChapterFilter === 'all' && getAvailableSubTopics(bankFolderFilter, bankSubjectFilter, bankChapterFilter).length === 0}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-medium truncate disabled:opacity-40 disabled:cursor-not-allowed"
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
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5 text-purple-400" />
                    <span>Difficulty:</span>
                  </label>
                  <select
                    value={bankDifficultyFilter}
                    onChange={(e) => setBankDifficultyFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-purple-500 font-medium truncate"
                  >
                    <option value="all">⚡ All Difficulties</option>
                    <option value="EASY">🟢 Easy</option>
                    <option value="MEDIUM">🟡 Medium</option>
                    <option value="HARD">🔴 Hard</option>
                  </select>
                </div>

                {/* 6. Search Bar */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                    <Search className="w-3.5 h-3.5 text-pink-400" />
                    <span>Search Questions:</span>
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Keywords, formulas..."
                      value={bankSearchQuery}
                      onChange={(e) => setBankSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    {bankSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setBankSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
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
                <div className="flex items-center flex-wrap gap-1.5 pt-1 text-[11px]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mr-1">Active Filters:</span>
                  {bankFolderFilter !== 'all' && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      <span>Class: {folders.find((f) => f.id === bankFolderFilter)?.name || bankFolderFilter}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setBankFolderFilter('all');
                          setBankSubjectFilter('all');
                          setBankChapterFilter('all');
                          setBankSubTopicFilter('all');
                        }}
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {bankSubjectFilter !== 'all' && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
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
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {bankChapterFilter !== 'all' && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
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
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {bankSubTopicFilter !== 'all' && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <span>
                        Sub-Topic:{' '}
                        {getAvailableSubTopics(bankFolderFilter, bankSubjectFilter, bankChapterFilter).find(
                          (st: any) => st.id === bankSubTopicFilter || st.name === bankSubTopicFilter
                        )?.name || bankSubTopicFilter}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBankSubTopicFilter('all')}
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {bankDifficultyFilter !== 'all' && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      <span>Difficulty: {bankDifficultyFilter}</span>
                      <button type="button" onClick={() => setBankDifficultyFilter('all')} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {bankSearchQuery && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-pink-500/15 text-pink-300 border border-pink-500/30">
                      <span>Search: "{bankSearchQuery}"</span>
                      <button type="button" onClick={() => setBankSearchQuery('')} className="hover:text-white">
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
                    className="text-[10px] text-slate-400 hover:text-rose-300 underline ml-2 cursor-pointer font-medium"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Questions Grid / Main Content */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-950/50">
              {filteredModalQuestions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-700">
                    <Search className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-slate-200 text-sm">No Questions Found</h3>
                  <p className="text-slate-400 text-xs max-w-md">
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
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-md transition-all"
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
                        onClick={() => handleToggleSelectModalQuestion(q.id)}
                        className={`rounded-2xl border p-4 space-y-3 transition-all cursor-pointer select-none flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50 shadow-xl shadow-indigo-950/60'
                            : isAlreadyOnCanvas
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900'
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
                                onChange={() => handleToggleSelectModalQuestion(q.id)}
                                className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="font-mono font-extrabold text-xs text-indigo-300">
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
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-300 font-medium border border-emerald-500/40 hover:bg-emerald-800/50 cursor-pointer transition-colors"
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
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-indigo-900/60 hover:text-indigo-200 hover:border-indigo-500 text-slate-300 font-medium border border-slate-700 transition-all cursor-pointer"
                                  title={`Click to filter by "${q.folder.name}"`}
                                >
                                  {q.folder.name}
                                </span>
                              )}
                              {q.difficulty && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                                    q.difficulty.toUpperCase() === 'EASY'
                                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                      : q.difficulty.toUpperCase() === 'HARD'
                                      ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {q.difficulty.toUpperCase()}
                                </span>
                              )}
                              {isAlreadyOnCanvas && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/40">
                                  ✓ On Canvas
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Question Stem with Math Renderer */}
                          <div className="text-slate-200 text-xs leading-relaxed max-h-32 overflow-y-auto pr-1">
                            <MathRenderer content={q.questionText || ''} />
                          </div>

                          {/* Diagrams Preview if any */}
                          {diagrams.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {diagrams.map((d: any, dIdx: number) => (
                                <div key={dIdx} className="bg-slate-950 p-1 rounded-lg border border-slate-800">
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
                            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-400">
                              {options.slice(0, 4).map((opt: any, optIdx: number) => (
                                <div
                                  key={optIdx}
                                  className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80 flex items-start space-x-1.5"
                                >
                                  <span className="font-bold text-indigo-400">{opt.key || String.fromCharCode(65 + optIdx)}.</span>
                                  <div className="truncate text-slate-300">
                                    <MathRenderer content={opt.text || ''} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Bottom Row: Assign Marks Stepper & Presets */}
                        <div
                          className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                            <span className="text-[11px] font-semibold text-slate-400 select-none">Marks:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateModalQuestionMarks(q.id, Math.max(0.5, currentMarks - (currentMarks > 1 ? 1 : 0.5)))}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center"
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
                                handleUpdateModalQuestionMarks(q.id, isNaN(val) ? 0 : val);
                              }}
                              className="w-12 bg-slate-900 text-indigo-300 font-mono font-bold text-xs text-center rounded border border-slate-700 py-0.5 focus:outline-none focus:border-indigo-400"
                              title="Set marks directly"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateModalQuestionMarks(q.id, currentMarks + (currentMarks < 1 ? 0.5 : 1))}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center"
                              title="Increase marks"
                            >
                              +
                            </button>

                            {/* Quick Marks Presets */}
                            <div className="flex items-center space-x-1 pl-1 border-l border-slate-800">
                              {[1, 2, 3, 5].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => handleUpdateModalQuestionMarks(q.id, m)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                                    currentMarks === m
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                                  }`}
                                  title={`Set ${m} Mark${m > 1 ? 's' : ''}`}
                                >
                                  {m}m
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="text-[11px] font-mono text-slate-400">
                            {isSelected ? (
                              <span className="text-indigo-400 font-semibold flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Selected</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">Click to select</span>
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
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center space-x-2 cursor-pointer select-none font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={
                      filteredModalQuestions.length > 0 &&
                      filteredModalQuestions.every((q) => modalSelectedQIds.has(q.id))
                    }
                    onChange={() =>
                      handleToggleSelectAllFilteredModal(filteredModalQuestions.map((q) => q.id))
                    }
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Select All Filtered ({filteredModalQuestions.length})</span>
                </label>

                {modalSelectedQIds.size > 0 && (
                  <>
                    <span className="text-slate-700">|</span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30">
                      {modalSelectedQIds.size} Question{modalSelectedQIds.size !== 1 ? 's' : ''} Selected
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                      Total: {bankQuestions
                        .filter((q) => modalSelectedQIds.has(q.id))
                        .reduce((sum, q) => sum + (modalQuestionMarksMap[q.id] !== undefined ? modalQuestionMarksMap[q.id] : (Number(q.marks) || 1)), 0)}{' '}
                      Marks
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalSelectedQIds(new Set())}
                      className="text-slate-400 hover:text-slate-200 text-xs underline"
                    >
                      Clear Selection
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsQuestionBankModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleInsertQuestionsFromModalToCanvas}
                  disabled={modalSelectedQIds.size === 0}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Insert Selected ({modalSelectedQIds.size}) to Canvas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVED GENERATED QUESTION PAPER POPUP NOTIFICATION MODAL */}
      {savedPopupInfo && savedPopupInfo.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl w-full max-w-lg p-6 shadow-2xl shadow-emerald-950/60 space-y-5 animate-scale-in">
            {/* Header with glowing success check */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-inner">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-white flex items-center space-x-2">
                    <span>Paper Saved Successfully!</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-mono font-bold">
                      SYNCED
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Your generated question paper is stored in physical storage &amp; database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSavedPopupInfo(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Paper Summary Card */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paper Title:</div>
                <div className="text-sm font-extrabold text-indigo-300 leading-snug">
                  {savedPopupInfo.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">Exam Code:</div>
                  <div className="font-mono font-bold text-white text-xs">{savedPopupInfo.examCode}</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">Class &amp; Subject:</div>
                  <div className="font-semibold text-slate-200 text-xs truncate">
                    {savedPopupInfo.className} &gt; {savedPopupInfo.subjectName}
                  </div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">Questions:</div>
                  <div className="font-bold text-emerald-400 text-xs">
                    {savedPopupInfo.questionCount} Questions
                  </div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">Max Marks:</div>
                  <div className="font-mono font-bold text-amber-400 text-xs">
                    {savedPopupInfo.totalMarks} Marks
                  </div>
                </div>
              </div>

              {/* Physical Storage Destination Card */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-300">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Physical Storage Directory:</span>
                </div>
                <div className="font-mono text-[10px] text-emerald-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 break-all select-all">
                  {savedPopupInfo.storagePath}
                </div>
                <div className="flex items-center space-x-2 pt-0.5 text-[10px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                    ✓ Word .doc
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                    ✓ Excel .csv
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
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
                    handleExportWord();
                    setSavedPopupInfo(null);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
                  title="Download editable Microsoft Word document"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Word (.doc)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePrintPaper();
                    setSavedPopupInfo(null);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-700 flex items-center space-x-1.5"
                  title="Print paper or save as PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/papers');
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-700 flex items-center space-x-1"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Paper Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSavedPopupInfo(null)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>OK, Done</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== OPEN SAVED PAPER MODAL ===== */}
      {isOpenSavedPaperModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">Open Saved Paper</h2>
                  <p className="text-[11px] text-slate-400">Browse and open a previously saved question paper</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenSavedPaperModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center space-x-2 px-6 py-3 border-b border-slate-800/80">
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={savedPaperSearchQuery}
                  onChange={(e) => setSavedPaperSearchQuery(e.target.value)}
                  placeholder="Search papers by title, exam code, subject..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <select
                value={savedPaperClassFilter}
                onChange={(e) => setSavedPaperClassFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Classes</option>
                {Array.from(new Set(papers.map((p: any) => {
                  try { return JSON.parse(p.canvasLayoutJson || '{}').settings?.className || 'Unknown'; } catch { return 'Unknown'; }
                }))).map((cls: any) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleStartNewPaper}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Paper</span>
              </button>
            </div>

            {/* Papers List */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
              {papers.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No saved papers found.</p>
                  <p className="text-xs mt-1">Create your first paper to see it here.</p>
                </div>
              ) : (() => {
                const filtered = papers.filter((p: any) => {
                  let cls = 'Unknown';
                  try { cls = JSON.parse(p.canvasLayoutJson || '{}').settings?.className || 'Unknown'; } catch {}
                  const q = savedPaperSearchQuery.toLowerCase();
                  const matchSearch = !q || (p.title || '').toLowerCase().includes(q) || (p.examCode || '').toLowerCase().includes(q) || cls.toLowerCase().includes(q) || (p.subjectName || '').toLowerCase().includes(q);
                  const matchClass = savedPaperClassFilter === 'ALL' || cls === savedPaperClassFilter;
                  return matchSearch && matchClass;
                });

                if (filtered.length === 0) return (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    <p>No papers match your search.</p>
                  </div>
                );

                return filtered.map((p: any) => {
                  let settings: any = {};
                  let questionCount = 0;
                  try {
                    const layout = JSON.parse(p.canvasLayoutJson || '{}');
                    settings = layout.settings || {};
                    questionCount = (layout.questions || []).filter((q: any) => q.type !== 'section' && q.type !== 'note' && q.type !== 'space').length;
                  } catch {}
                  const isActive = activePaper?.id === p.id;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleOpenSavedPaper(p)}
                      className={`cursor-pointer group p-4 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-indigo-950/50 border-indigo-500/60 ring-1 ring-indigo-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className={`font-bold text-sm truncate ${isActive ? 'text-indigo-300' : 'text-white group-hover:text-indigo-300'} transition-colors`}>
                              {p.title}
                            </h4>
                            <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/80 border border-indigo-500/40 px-1.5 py-0.2 rounded shrink-0">
                              {p.examCode}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                              p.status === 'FINALIZED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {p.status === 'FINALIZED' ? '✓ Finalized' : 'Draft'}
                            </span>
                            {isActive && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-600/40 text-indigo-300 border border-indigo-500/50 rounded font-bold">
                                Currently Open
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
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
                            onClick={(e) => { e.stopPropagation(); handleOpenSavedPaper(p); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1 transition-all ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40'
                            }`}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{isActive ? 'Editing' : 'Open'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedPaperFromModal(e, p.id, p.title)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete this paper permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {papers.length} paper{papers.length !== 1 ? 's' : ''} in Paper Bank
              </span>
              <button
                type="button"
                onClick={() => setIsOpenSavedPaperModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
