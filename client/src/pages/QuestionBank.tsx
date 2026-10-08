import React, { useState, useEffect, useRef } from 'react';
import {
  FolderTree,
  Folder,
  FolderPlus,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Sparkles,
  Lock,
  ArrowRightLeft,
  Move,
  Check,
  X,
  AlertTriangle,
  Download,
  Upload,
  FileText,
  File as FileIcon,
  Languages,
  FileSpreadsheet,
  FileJson,
  HardDrive,
  Clipboard,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Printer,
} from 'lucide-react';
import { api } from '../lib/api';
import { triggerFileDownload, extractErrorMessage } from '../lib/downloadHelper';
import { MathRenderer } from '../components/common/MathRenderer';
import { QuestionEditorModal } from '../components/questions/QuestionEditorModal';
import { ResizableImage } from '../components/common/ResizableImage';
import { LanguageTranslatorBar } from '../components/common/LanguageTranslatorBar';

export function parsePastedQuestionsText(text: string) {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n');
  const questionBlocks: { header: string; lines: string[] }[] = [];
  let currentBlock: { header: string; lines: string[] } | null = null;

  const qStartRegex = /^(?:Q(?:uestion)?\.?\s*(\d+)(?:[.)\]:\-\s]|\b)|\((\d+)\)|(\d+)[.)\]:\-])\s*(.*)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(qStartRegex);

    if (match && !/^\([a-dA-D]\)/i.test(trimmed)) {
      if (currentBlock) {
        questionBlocks.push(currentBlock);
      }
      currentBlock = {
        header: match[1] || match[2] || match[3] || String(questionBlocks.length + 1),
        lines: [match[4] ? match[4] : ''],
      };
    } else {
      if (!currentBlock) {
        currentBlock = {
          header: '1',
          lines: [line],
        };
      } else {
        currentBlock.lines.push(line);
      }
    }
  }

  if (currentBlock) {
    questionBlocks.push(currentBlock);
  }

  return questionBlocks.map((block, idx) => {
    const blockText = block.lines.join('\n');
    const qNum = block.header || String(idx + 1);

    let marks = 1;
    const marksMatch = blockText.match(/(?:\[|\()(\d+)\s*(?:marks?|mark|m|pts?)(?:\]|\))/i);
    if (marksMatch) {
      marks = parseInt(marksMatch[1], 10) || 1;
    }

    let correctAnswer = '';
    const ansMatch = blockText.match(/\b(?:Ans(?:wer)?|Correct Option|Key)\s*[:=\-]\s*([A-Da-d1-4])/i);
    if (ansMatch) {
      correctAnswer = ansMatch[1].toUpperCase();
      const numToChar: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
      if (numToChar[correctAnswer]) correctAnswer = numToChar[correctAnswer];
    }

    let explanation = '';
    const expMatch = blockText.match(/\b(?:Exp(?:lanation)?|Sol(?:ution)?)\s*[:=\-]\s*(.*)$/im);
    if (expMatch) {
      explanation = expMatch[1].trim();
    }

    const options: { key: string; text: string }[] = [];
    const questionBodyLines: string[] = [];
    const numMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
    const inlineOptRegex = /(?:\(([a-dA-D1-4])\)|(?:(?<=^)|(?<=\s))([a-dA-D1-4])\.(?!\d)|(?:(?<=^)|(?<=\s))([a-dA-D1-4])\))\s*/g;

    for (const rawLine of block.lines) {
      const lineStr = rawLine.trim();
      if (/^(?:Ans(?:wer)?|Correct Option|Key)\s*[:=\-]/i.test(lineStr)) continue;
      if (/^(?:Exp(?:lanation)?|Sol(?:ution)?)\s*[:=\-]/i.test(lineStr)) continue;

      const inlineMatches = Array.from(lineStr.matchAll(inlineOptRegex));
      if (inlineMatches.length >= 2) {
        for (let i = 0; i < inlineMatches.length; i++) {
          const m = inlineMatches[i];
          let key = (m[1] || m[2] || m[3]).toUpperCase();
          if (numMap[key]) key = numMap[key];
          const start = m.index! + m[0].length;
          const end = i + 1 < inlineMatches.length ? inlineMatches[i + 1].index! : lineStr.length;
          options.push({ key, text: lineStr.slice(start, end).trim() });
        }
      } else {
        const optM = lineStr.match(/^(?:\(([A-Da-d1-4])\)|([A-Da-d1-4])[.)\]])\s*(.*)$/);
        if (optM) {
          let key = (optM[1] || optM[2]).toUpperCase();
          if (numMap[key]) key = numMap[key];
          options.push({ key, text: optM[3].trim() });
        } else {
          if (options.length === 0) {
            questionBodyLines.push(rawLine);
          } else {
            options[options.length - 1].text += '\n' + rawLine;
          }
        }
      }
    }

    let questionText = questionBodyLines.join('\n').trim();
    if (options.length === 0) {
      const bodyMatches = Array.from(questionText.matchAll(inlineOptRegex));
      if (bodyMatches.length >= 2) {
        const firstIdx = bodyMatches[0].index!;
        const optsText = questionText.slice(firstIdx);
        questionText = questionText.slice(0, firstIdx).trim();
        const subMatches = Array.from(optsText.matchAll(inlineOptRegex));
        for (let i = 0; i < subMatches.length; i++) {
          const m = subMatches[i];
          let key = (m[1] || m[2] || m[3]).toUpperCase();
          if (numMap[key]) key = numMap[key];
          const start = m.index! + m[0].length;
          const end = i + 1 < subMatches.length ? subMatches[i + 1].index! : optsText.length;
          options.push({ key, text: optsText.slice(start, end).trim() });
        }
      }
    }
    questionText = questionText.replace(/(?:\[|\()\d+\s*(?:marks?|mark|m|pts?)(?:\]|\))\s*$/i, '').trim();

    const finalOptions =
      options.length > 0
        ? options
        : [
            { key: 'A', text: '' },
            { key: 'B', text: '' },
            { key: 'C', text: '' },
            { key: 'D', text: '' },
          ];

    return {
      questionNumber: qNum,
      questionText: questionText || `Question ${qNum}`,
      options: finalOptions,
      correctAnswer,
      explanation,
      marks,
      difficulty: 'MEDIUM',
    };
  });
}

export const QuestionBank: React.FC = () => {
  const [folders, setFolders] = useState<any[]>([]);
  const [flatFolders, setFlatFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [languageScript, setLanguageScript] = useState<'all' | 'hindi' | 'punjabi' | 'urdu' | 'sanskrit'>('all');
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

  // New Folder Modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderType, setNewFolderType] = useState('CLASS');
  const [newFolderParentId, setNewFolderParentId] = useState('');

  // Move Folder Modal
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [folderToMove, setFolderToMove] = useState<any | null>(null);
  const [newParentFolderId, setNewParentFolderId] = useState<string>('');

  // Edit / Rename Folder Modal
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<any | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderType, setEditFolderType] = useState('CLASS');

  // Feedback Notification
  const [toastMsg, setToastMsg] = useState('');

  // Multi-Select Questions State
  const [selectedBankQIds, setSelectedBankQIds] = useState<Set<string>>(new Set());
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [batchTargetFolderId, setBatchTargetFolderId] = useState('');

  // Question Options Visibility (Hidden by default to display only questions; teachers can view full question on click)
  const [expandedQuestionOptionIds, setExpandedQuestionOptionIds] = useState<Set<string>>(new Set());

  const handleToggleQuestionOptions = (qId: string) => {
    setExpandedQuestionOptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const handleToggleAllOptions = () => {
    const questionsWithOptions = questions.filter((q) => {
      const opts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
      return opts && opts.length > 0;
    });
    const allExpanded = questionsWithOptions.length > 0 && questionsWithOptions.every((q) => expandedQuestionOptionIds.has(q.id));
    if (allExpanded) {
      setExpandedQuestionOptionIds(new Set());
    } else {
      setExpandedQuestionOptionIds(new Set(questionsWithOptions.map((q) => q.id)));
    }
  };

  // Duplicate Questions Management State
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [duplicateSummary, setDuplicateSummary] = useState<{ total: number; scanned: number } | null>(null);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Universal Import & Export State
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [importExportModalMode, setImportExportModalMode] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [importModalTab, setImportModalTab] = useState<'JSON' | 'WORD' | 'PDF' | 'IMAGE' | 'TEXT'>('JSON');
  const [pasteModalText, setPasteModalText] = useState('');
  const [pasteModalTargetFolder, setPasteModalTargetFolder] = useState('');
  const [isImportingPasted, setIsImportingPasted] = useState(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const [imageOcrMeta, setImageOcrMeta] = useState<{ langName: string; confidence: number; linesCount: number } | null>(null);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [parsedFileQuestions, setParsedFileQuestions] = useState<any[]>([]);
  const [jsonRawInput, setJsonRawInput] = useState('');
  const [importErrorMsg, setImportErrorMsg] = useState('');

  // Exact App Math Print & PDF Export State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printIncludeAnswers, setPrintIncludeAnswers] = useState(true);
  const [printIncludeExplanations, setPrintIncludeExplanations] = useState(true);
  const [printQuestionsList, setPrintQuestionsList] = useState<any[]>([]);
  const [printScopeTitle, setPrintScopeTitle] = useState('Question Bank');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Image Placement Selector Modal State
  const [attachImageModal, setAttachImageModal] = useState<{
    question: any;
    destination: string; // 'BODY' or option key ('A', 'B', 'C', 'D')
  } | null>(null);
  const [modalUploadFile, setModalUploadFile] = useState<File | null>(null);
  const [isSubmittingImageModal, setIsSubmittingImageModal] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const buildExportParams = (overrideFolderId?: string) => {
    const params: Record<string, string> = {};
    const targetFolder = overrideFolderId !== undefined ? overrideFolderId : (selectedFolderId || '');
    if (targetFolder) {
      params.folderId = targetFolder;
    }
    if (selectedBankQIds.size > 0) {
      params.questionIds = Array.from(selectedBankQIds).join(',');
    }
    if (difficultyFilter) {
      params.difficulty = difficultyFilter;
    }
    if (search) {
      params.search = search;
    }
    return params;
  };

  const getExportScopeLabel = (overrideFolderId?: string) => {
    if (selectedBankQIds.size > 0) {
      return `${selectedBankQIds.size} Selected Question${selectedBankQIds.size > 1 ? 's' : ''}`;
    }
    const targetFolder = overrideFolderId !== undefined ? overrideFolderId : selectedFolderId;
    if (targetFolder) {
      const folderName = flatFolders.find((f) => f.id === targetFolder)?.name || 'Folder';
      return `${folderName} (${questions.length} Questions)`;
    }
    return `All (${questions.length} Questions)`;
  };

  const handleExportWord = async (overrideFolderId?: string) => {
    setExportingFormat('word');
    try {
      showToast('📄 Generating Microsoft Word document with solutions...');
      const params = buildExportParams(overrideFolderId);
      const res = await api.get('/questions/export/word', { params, responseType: 'blob' });
      const targetFolder = overrideFolderId !== undefined ? overrideFolderId : selectedFolderId;
      const folderName = targetFolder ? (flatFolders.find((f) => f.id === targetFolder)?.name || 'Folder') : 'Question_Bank';
      const prefix = selectedBankQIds.size > 0 ? `Selected_${selectedBankQIds.size}_` : '';
      const safeTitle = (prefix + folderName).replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerFileDownload(res.data, `${safeTitle}_Questions_and_Answers.doc`, 'application/msword; charset=utf-8');
      showToast('✓ Exported Questions & Solutions to Word (.doc)!');
    } catch (err: any) {
      const msg = await extractErrorMessage(err);
      alert(`Word Export failed: ${msg}`);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportPdf = async (overrideFolderId?: string) => {
    setExportingFormat('pdf');
    try {
      showToast('📄 Generating A4 PDF of Questions & Answer Key...');
      const params = buildExportParams(overrideFolderId);
      const res = await api.get('/questions/export/pdf', { params, responseType: 'blob' });
      const targetFolder = overrideFolderId !== undefined ? overrideFolderId : selectedFolderId;
      const folderName = targetFolder ? (flatFolders.find((f) => f.id === targetFolder)?.name || 'Folder') : 'Question_Bank';
      const prefix = selectedBankQIds.size > 0 ? `Selected_${selectedBankQIds.size}_` : '';
      const safeTitle = (prefix + folderName).replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerFileDownload(res.data, `${safeTitle}_Questions_and_Answers.pdf`, 'application/pdf');
      showToast('✓ Downloaded Question Bank PDF with Solutions!');
    } catch (err: any) {
      const msg = await extractErrorMessage(err);
      alert(`PDF Export failed: ${msg}`);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportJson = async (overrideFolderId?: string) => {
    setExportingFormat('json');
    try {
      showToast('📦 Generating Universal JSON export...');
      const params = buildExportParams(overrideFolderId);
      const res = await api.get('/questions/export/json', { params });
      const targetFolder = overrideFolderId !== undefined ? overrideFolderId : selectedFolderId;
      const folderName = targetFolder ? (flatFolders.find((f) => f.id === targetFolder)?.name || 'Folder') : 'Question_Bank';
      const prefix = selectedBankQIds.size > 0 ? `Selected_${selectedBankQIds.size}_` : '';
      const safeTitle = (prefix + folderName).replace(/[^a-zA-Z0-9_-]/g, '_');
      const jsonStr = JSON.stringify(res.data, null, 2);
      triggerFileDownload(jsonStr, `${safeTitle}_Questions_v2.json`, 'application/json; charset=utf-8');
      showToast('✓ Exported questions to Universal JSON format!');
    } catch (err: any) {
      const msg = await extractErrorMessage(err);
      alert(`JSON Export failed: ${msg}`);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportCsv = async (overrideFolderId?: string) => {
    setExportingFormat('csv');
    try {
      showToast('📊 Generating Multi-Language Excel CSV...');
      const params = buildExportParams(overrideFolderId);
      const res = await api.get('/questions/export/csv', { params, responseType: 'blob' });
      const targetFolder = overrideFolderId !== undefined ? overrideFolderId : selectedFolderId;
      const folderName = targetFolder ? (flatFolders.find((f) => f.id === targetFolder)?.name || 'Folder') : 'Question_Bank';
      const prefix = selectedBankQIds.size > 0 ? `Selected_${selectedBankQIds.size}_` : '';
      const safeTitle = (prefix + folderName).replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerFileDownload(res.data, `${safeTitle}_Questions.csv`, 'text/csv; charset=utf-8');
      showToast('✓ Exported questions to Excel CSV (UTF-8 Multi-Language)!');
    } catch (err: any) {
      const msg = await extractErrorMessage(err);
      alert(`CSV Export failed: ${msg}`);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleOpenPrintModal = async (overrideFolderId?: string) => {
    let list: any[] = [];
    let title = 'Question Bank';
    if (selectedBankQIds.size > 0) {
      list = questions.filter((q) => selectedBankQIds.has(q.id));
      title = `${selectedBankQIds.size} Selected Questions`;
    } else {
      const targetFolder = overrideFolderId !== undefined ? overrideFolderId : selectedFolderId;
      if (targetFolder && targetFolder !== selectedFolderId) {
        try {
          showToast('Loading folder questions for preview...');
          const res = await api.get('/questions', { params: { folderId: targetFolder } });
          list = res.data || [];
        } catch (e) {
          list = questions;
        }
      } else {
        list = questions;
      }
      if (targetFolder) {
        const folderName = flatFolders.find((f) => f.id === targetFolder)?.name || 'Folder';
        title = `${folderName} (${list.length} Questions)`;
      } else {
        title = `All Questions (${list.length})`;
      }
    }
    setPrintQuestionsList(list);
    setPrintScopeTitle(title);
    setShowPrintModal(true);
  };

  const handleTriggerDirectPrint = () => {
    document.body.classList.add('printing-exact-bank');
    const cleanup = () => {
      document.body.classList.remove('printing-exact-bank');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 2000);
    }, 150);
  };

  const handleParseDocOrPdfFile = async (file: File) => {
    if (!file) return;
    setIsParsingDoc(true);
    setImportErrorMsg('');
    setParsedFileQuestions([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dryRun', 'true');
      const res = await api.post('/questions/import/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
        setParsedFileQuestions(res.data.questions);
        showToast(`✓ Extracted ${res.data.questions.length} question(s) from ${file.name}!`);
      } else {
        setImportErrorMsg('No questions could be extracted from this document.');
      }
    } catch (err: any) {
      setImportErrorMsg(`Extraction failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsParsingDoc(false);
    }
  };

  const handleParseJsonFile = async (file: File) => {
    if (!file) return;
    setIsParsingDoc(true);
    setImportErrorMsg('');
    try {
      const text = await file.text();
      setJsonRawInput(text);
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.questions || [];
      if (list.length > 0) {
        setParsedFileQuestions(list);
        showToast(`✓ Detected ${list.length} question(s) in ${file.name}!`);
      } else {
        setImportErrorMsg('JSON file does not contain an array of questions or { questions: [...] }');
      }
    } catch (err: any) {
      setImportErrorMsg(`Invalid JSON file: ${err.message}`);
    } finally {
      setIsParsingDoc(false);
    }
  };

  const handleCommitBatchImport = async (questionsToCommit: any[]) => {
    if (!questionsToCommit || questionsToCommit.length === 0) {
      alert('No questions to import.');
      return;
    }
    setIsImportingPasted(true);
    try {
      const res = await api.post('/questions/import/json', {
        folderId: pasteModalTargetFolder || selectedFolderId || null,
        questions: questionsToCommit,
      });
      showToast(`✓ Successfully imported ${res.data.count || questionsToCommit.length} question(s) & answers!`);
      setIsPasteModalOpen(false);
      setParsedFileQuestions([]);
      setPasteModalText('');
      setJsonRawInput('');
      fetchQuestions();
      fetchFolders();
      fetchDuplicateStats();
    } catch (err: any) {
      alert(`Import failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsImportingPasted(false);
    }
  };

  const handleExtractFromImageFile = async (file: File) => {
    if (!file) return;
    setIsExtractingImage(true);
    setImageOcrMeta(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/documents/ocr-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data;
      if (data && data.extracted_text) {
        setPasteModalText((prev) => (prev ? prev + '\n\n' + data.extracted_text : data.extracted_text));
        setImageOcrMeta({
          langName: data.language_name || data.detected_language,
          confidence: Math.round((data.confidence || 0) * 100),
          linesCount: data.lines_count || 0,
        });
        showToast(`✓ Extracted digital text in ${data.language_name || 'same language'}!`);
      } else {
        alert('No text detected in this image document.');
      }
    } catch (err: any) {
      alert(`Image text extraction failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsExtractingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleImportPastedQuestions = async () => {
    const parsed = parsePastedQuestionsText(pasteModalText);
    if (parsed.length === 0) {
      alert('No questions detected. Please paste question text from your source.');
      return;
    }
    setIsImportingPasted(true);
    try {
      const res = await api.post('/questions/batch', {
        folderId: pasteModalTargetFolder || selectedFolderId || null,
        questions: parsed,
      });
      showToast(`✓ Imported ${res.data.count || parsed.length} question(s) verbatim to Question Bank!`);
      setIsPasteModalOpen(false);
      setPasteModalText('');
      fetchQuestions();
      fetchFolders();
      fetchDuplicateStats();
    } catch (err: any) {
      alert(`Import failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsImportingPasted(false);
    }
  };

  const handleToggleSelectQuestion = (qId: string) => {
    setSelectedBankQIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedBankQIds.size >= questions.length && questions.length > 0) {
      setSelectedBankQIds(new Set());
    } else {
      setSelectedBankQIds(new Set(questions.map((q) => q.id)));
    }
  };

  const handleBatchDeleteQuestions = async () => {
    if (selectedBankQIds.size === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedBankQIds.size} selected question(s)?`)) return;
    try {
      await Promise.all(Array.from(selectedBankQIds).map((id) => api.delete(`/questions/${id}`)));
      showToast(`Deleted ${selectedBankQIds.size} questions successfully`);
      setSelectedBankQIds(new Set());
      fetchQuestions();
      fetchDuplicateStats();
    } catch (err: any) {
      alert(`Batch delete failed: ${err.message}`);
    }
  };

  const handleBatchMoveQuestions = async () => {
    if (selectedBankQIds.size === 0 || !batchTargetFolderId) return;
    try {
      await Promise.all(
        Array.from(selectedBankQIds).map((id) =>
          api.put(`/questions/${id}`, { folderId: batchTargetFolderId })
        )
      );
      showToast(`Moved ${selectedBankQIds.size} questions to folder!`);
      setSelectedBankQIds(new Set());
      setIsBatchMoveModalOpen(false);
      fetchQuestions();
    } catch (err: any) {
      alert(`Batch move failed: ${err.message}`);
    }
  };

  const fetchDuplicateStats = async () => {
    try {
      const res = await api.get('/questions/check-duplicates');
      setDuplicateGroups(res.data.duplicateGroups || []);
      setDuplicateSummary({
        total: res.data.totalDuplicateCount || 0,
        scanned: res.data.totalQuestionsScanned || 0,
      });
    } catch (err) {
      console.debug('Duplicate stats error:', err);
    }
  };

  const handleCheckDuplicates = async () => {
    setIsCheckingDuplicates(true);
    try {
      const res = await api.get('/questions/check-duplicates');
      setDuplicateGroups(res.data.duplicateGroups || []);
      setDuplicateSummary({
        total: res.data.totalDuplicateCount || 0,
        scanned: res.data.totalQuestionsScanned || 0,
      });
      setShowDuplicatesModal(true);
      if (res.data.totalDuplicateCount === 0) {
        showToast('✓ No duplicate questions found in question bank!');
      } else {
        showToast(`⚠️ Found ${res.data.totalDuplicateCount} duplicate question(s) across folders!`);
      }
    } catch (err: any) {
      alert(`Duplicate check failed: ${err.message}`);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleDeleteDuplicate = async (qId: string) => {
    if (!confirm('Are you sure you want to permanently delete this duplicate question?')) return;
    try {
      await api.delete(`/questions/${qId}`);
      showToast('Deleted duplicate question successfully');
      fetchQuestions();
      fetchDuplicateStats();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleCleanAllDuplicates = async () => {
    if (!confirm('Are you sure you want to delete all duplicate copies? Original canonical questions will be kept intact.')) return;
    try {
      const res = await api.post('/questions/delete-all-duplicates');
      showToast(`⚡ Cleaned ${res.data.deletedCount || 0} duplicate question(s)!`);
      fetchQuestions();
      fetchDuplicateStats();
      setShowDuplicatesModal(false);
    } catch (err: any) {
      alert(`Clean duplicates failed: ${err.message}`);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await api.get('/folders');
      const rootFolders = res.data.folders || [];
      setFolders(rootFolders);

      // Flatten folders for select dropdowns
      const flat: any[] = [];
      const traverse = (list: any[]) => {
        for (const item of list) {
          flat.push(item);
          if (item.children && item.children.length > 0) {
            traverse(item.children);
          }
        }
      };
      traverse(rootFolders);
      setFlatFolders(flat);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedFolderId) params.folderId = selectedFolderId;
      if (search) params.search = search;
      if (difficultyFilter) params.difficulty = difficultyFilter;

      const res = await api.get('/questions', { params });
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchDuplicateStats();
  }, []);

  useEffect(() => {
    fetchQuestions();
    fetchDuplicateStats();
  }, [selectedFolderId, search, difficultyFilter]);

  // Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await api.post('/folders', {
        name: newFolderName.trim(),
        type: newFolderType,
        parentId: newFolderParentId || null,
      });
      setNewFolderName('');
      setIsFolderModalOpen(false);
      await fetchFolders();
      showToast(`Folder "${newFolderName}" created successfully!`);
    } catch (err: any) {
      alert(`Failed to create folder: ${err.message}`);
    }
  };

  // Move Folder
  const handleMoveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToMove) return;

    try {
      await api.put(`/folders/${folderToMove.id}`, {
        parentId: newParentFolderId || null,
      });
      setIsMoveModalOpen(false);
      setFolderToMove(null);
      await fetchFolders();
      showToast(`Folder moved successfully!`);
    } catch (err: any) {
      alert(`Failed to move folder: ${err.message}`);
    }
  };

  // Edit / Rename Folder
  const handleEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToEdit || !editFolderName.trim()) return;

    try {
      await api.put(`/folders/${folderToEdit.id}`, {
        name: editFolderName.trim(),
      });
      setIsEditFolderModalOpen(false);
      setFolderToEdit(null);
      await fetchFolders();
      showToast(`Folder renamed to "${editFolderName}"!`);
    } catch (err: any) {
      alert(`Failed to rename folder: ${err.message}`);
    }
  };

  // Delete Folder
  const handleDeleteFolder = async (folder: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm(
      `Are you sure you want to delete the folder "${folder.name}" (${folder.type})?\n\n` +
      `• All subfolders within it will also be deleted.\n` +
      `• Questions inside this folder will remain safely in the Question Bank.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/folders/${folder.id}`);
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null);
      }
      await fetchFolders();
      await fetchQuestions();
      showToast(`Folder "${folder.name}" deleted successfully.`);
    } catch (err: any) {
      alert(`Delete folder failed: ${err.message}`);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/questions/${id}`);
      fetchQuestions();
      showToast('Question deleted.');
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Add / Attach Diagram to Question Body
  const handleAddDiagramToQuestion = async (questionId: string, file: File) => {
    if (!file) return;
    const q = questions.find((item) => item.id === questionId);
    if (!q) return;

    const formData = new FormData();
    formData.append('image', file);
    try {
      showToast('Uploading diagram...');
      const uploadRes = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newDiag = { relative_url: uploadRes.data.url, label: file.name };
      const currentDiags = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson) : q.diagrams || [];
      const updatedDiags = [...currentDiags, newDiag];
      await api.put(`/questions/${questionId}`, { diagrams: updatedDiags });
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId
            ? { ...item, diagrams: updatedDiags, diagramsJson: JSON.stringify(updatedDiags) }
            : item
        )
      );
      showToast('✓ Attached diagram to question body!');
    } catch (err: any) {
      alert(`Upload diagram failed: ${err.message}`);
    }
  };

  // Remove Diagram from Question Body
  const handleRemoveDiagramFromQuestion = async (questionId: string, diagIdx: number) => {
    const q = questions.find((item) => item.id === questionId);
    if (!q) return;
    const currentDiags = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson) : q.diagrams || [];
    const updatedDiags = currentDiags.filter((_: any, i: number) => i !== diagIdx);
    try {
      await api.put(`/questions/${questionId}`, { diagrams: updatedDiags });
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId
            ? { ...item, diagrams: updatedDiags, diagramsJson: JSON.stringify(updatedDiags) }
            : item
        )
      );
      showToast(`✓ Removed Figure ${diagIdx + 1} from question.`);
    } catch (err: any) {
      alert(`Failed to remove diagram: ${err.message}`);
    }
  };

  // Add / Replace Image for an Option (A, B, C, D)
  const handleAddOptionImageToQuestion = async (questionId: string, optKey: string, file: File) => {
    if (!file) return;
    const q = questions.find((item) => item.id === questionId);
    if (!q) return;

    const formData = new FormData();
    formData.append('image', file);
    try {
      showToast(`Uploading image for Option (${optKey})...`);
      const uploadRes = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const currentOpts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
      const updatedOpts = currentOpts.map((opt: any) => {
        if (opt.key === optKey) {
          return { ...opt, imageUrl: uploadRes.data.url };
        }
        return opt;
      });
      await api.put(`/questions/${questionId}`, { options: updatedOpts });
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId
            ? { ...item, options: updatedOpts, optionsJson: JSON.stringify(updatedOpts) }
            : item
        )
      );
      showToast(`✓ Attached image to Option (${optKey})!`);
    } catch (err: any) {
      alert(`Upload option image failed: ${err.message}`);
    }
  };

  // Remove Image from an Option
  const handleRemoveOptionImageFromQuestion = async (questionId: string, optKey: string) => {
    const q = questions.find((item) => item.id === questionId);
    if (!q) return;
    const currentOpts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
    const updatedOpts = currentOpts.map((opt: any) => {
      if (opt.key === optKey) {
        const copy = { ...opt };
        delete copy.imageUrl;
        delete copy.imageWidth;
        delete copy.imageHeight;
        return copy;
      }
      return opt;
    });
    try {
      await api.put(`/questions/${questionId}`, { options: updatedOpts });
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId
            ? { ...item, options: updatedOpts, optionsJson: JSON.stringify(updatedOpts) }
            : item
        )
      );
      showToast(`✓ Removed image from Option (${optKey}).`);
    } catch (err: any) {
      alert(`Failed to remove option image: ${err.message}`);
    }
  };

  // Move image/diagram between Question Body and Options (or between Options)
  const handleMoveImage = async (
    questionId: string,
    fromLocation: string, // 'BODY' or option key (e.g. 'A')
    fromIndex: number,    // diagram index if fromLocation === 'BODY'
    toLocation: string    // 'BODY' or target option key (e.g. 'B')
  ) => {
    if (fromLocation === toLocation) return;
    const q = questions.find((item) => item.id === questionId);
    if (!q) return;

    const currentDiags = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson) : q.diagrams || [];
    const currentOpts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];

    let imageToMoveUrl = '';
    let updatedDiags = [...currentDiags];
    let updatedOpts = currentOpts.map((o: any) => ({ ...o }));

    if (fromLocation === 'BODY') {
      if (fromIndex >= 0 && fromIndex < updatedDiags.length) {
        const item = updatedDiags[fromIndex];
        imageToMoveUrl = typeof item === 'string' ? item : item.relative_url || item.url || '';
        updatedDiags.splice(fromIndex, 1);
      }
    } else {
      const opt = updatedOpts.find((o: any) => o.key === fromLocation);
      if (opt) {
        imageToMoveUrl = opt.imageUrl || '';
        delete opt.imageUrl;
        delete opt.imageWidth;
        delete opt.imageHeight;
      }
    }

    if (!imageToMoveUrl) return;

    if (toLocation === 'BODY') {
      updatedDiags.push({ relative_url: imageToMoveUrl, label: 'Moved Figure' });
      showToast(`✓ Moved image to Question Body!`);
    } else {
      const targetOpt = updatedOpts.find((o: any) => o.key === toLocation);
      if (targetOpt) {
        targetOpt.imageUrl = imageToMoveUrl;
        showToast(`✓ Moved image to Option (${toLocation})!`);
      }
    }

    try {
      await api.put(`/questions/${questionId}`, {
        diagrams: updatedDiags,
        options: updatedOpts,
      });
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId
            ? {
                ...item,
                diagrams: updatedDiags,
                diagramsJson: JSON.stringify(updatedDiags),
                options: updatedOpts,
                optionsJson: JSON.stringify(updatedOpts),
              }
            : item
        )
      );
    } catch (err: any) {
      alert(`Failed to move image: ${err.message}`);
    }
  };

  // Execute upload and attach from the destination modal
  const handleExecuteAttachImage = async (questionId: string, destination: string, file: File) => {
    if (destination === 'BODY') {
      await handleAddDiagramToQuestion(questionId, file);
    } else {
      await handleAddOptionImageToQuestion(questionId, destination, file);
    }
  };

  // Helper to collect all descendant IDs of a folder to avoid circular loops when moving
  const getDescendantIds = (folder: any): string[] => {
    let ids: string[] = [folder.id];
    if (folder.children && folder.children.length > 0) {
      for (const child of folder.children) {
        ids = ids.concat(getDescendantIds(child));
      }
    }
    return ids;
  };

  const excludedMoveFolderIds = folderToMove ? getDescendantIds(folderToMove) : [];

  const renderFolderTree = (nodes: any[], depth = 0) => {
    return (
      <div className="space-y-1">
        {nodes.map((node) => {
          const isSelected = selectedFolderId === node.id;
          return (
            <div key={node.id} className="space-y-1">
              <div
                onClick={() => setSelectedFolderId(isSelected ? null : node.id)}
                style={{ paddingLeft: `${depth * 14 + 10}px` }}
                className={`group flex items-center justify-between py-2 px-2.5 rounded-classic text-xs font-semibold cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-classic-navy text-white shadow-classic font-bold border border-classic-navy'
                    : 'text-classic-text-primary hover:bg-classic-surface-muted bg-white border border-classic-border-light'
                }`}
              >
                <div className="flex items-center space-x-2 truncate min-w-0 pr-2">
                  <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-classic-navy'}`} />
                  <span className="truncate font-bold">{node.name}</span>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded-classic border uppercase font-black ${
                    isSelected ? 'bg-white/20 text-white border-white/40' : 'bg-classic-surface-muted text-classic-text-secondary border-classic-border'
                  }`}>
                    {node.type}
                  </span>

                  {/* Action Icons visible on hover/selected */}
                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    {/* Add Subfolder */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewFolderParentId(node.id);
                        const nextType =
                          node.type === 'CLASS'
                            ? 'SUBJECT'
                            : node.type === 'SUBJECT'
                            ? 'CHAPTER'
                            : 'TOPIC';
                        setNewFolderType(nextType);
                        setNewFolderName('');
                        setIsFolderModalOpen(true);
                      }}
                      className={`p-1 rounded-classic transition-colors ${isSelected ? 'text-white hover:bg-white/20' : 'text-classic-text-secondary hover:text-classic-text-primary hover:bg-classic-surface-muted'}`}
                      title={`Add subfolder inside "${node.name}"`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    {/* Move Folder */}
                    <button
                      type="button"
                      onClick={() => {
                        setFolderToMove(node);
                        setNewParentFolderId(node.parentId || '');
                        setIsMoveModalOpen(true);
                      }}
                      className={`p-1 rounded-classic transition-colors ${isSelected ? 'text-white hover:bg-white/20' : 'text-classic-text-secondary hover:text-amber-800 hover:bg-classic-surface-muted'}`}
                      title={`Move "${node.name}" to another parent`}
                    >
                      <Move className="w-3 h-3" />
                    </button>

                    {/* Rename Folder */}
                    <button
                      type="button"
                      onClick={() => {
                        setFolderToEdit(node);
                        setEditFolderName(node.name);
                        setEditFolderType(node.type);
                        setIsEditFolderModalOpen(true);
                      }}
                      className={`p-1 rounded-classic transition-colors ${isSelected ? 'text-white hover:bg-white/20' : 'text-classic-text-secondary hover:text-classic-navy hover:bg-classic-surface-muted'}`}
                      title={`Rename "${node.name}"`}
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    {/* Delete Folder */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFolder(node, e)}
                      className={`p-1 rounded-classic transition-colors ${isSelected ? 'text-white hover:bg-white/20' : 'text-classic-text-secondary hover:text-rose-700 hover:bg-classic-surface-muted'}`}
                      title={`Delete "${node.name}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {node.children && node.children.length > 0 && renderFolderTree(node.children, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 animate-fade-in border border-emerald-400">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 classic-card p-4 rounded-classic">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-classic bg-classic-navy text-white flex items-center justify-center shadow-classic">
            <FolderTree className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-classic-text-primary">Hierarchical Question Bank</h1>
            <p className="text-xs text-classic-text-muted font-medium">
              Taxonomy folders: Class &rarr; Subject &rarr; Chapter &rarr; Topic &bull; Move & Delete Folders
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Detect Duplicates Button */}
          <button
            type="button"
            onClick={handleCheckDuplicates}
            disabled={isCheckingDuplicates}
            className="classic-button-secondary rounded-classic text-xs font-bold px-3.5 py-2 flex items-center space-x-1.5"
            title="Scan entire Question Bank for duplicate questions"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{isCheckingDuplicates ? 'Scanning Duplicates...' : 'Detect Duplicates'}</span>
            {duplicateSummary && duplicateSummary.total > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-bold text-xs">
                {duplicateSummary.total}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setNewFolderName('');
              setNewFolderParentId('');
              setNewFolderType('CLASS');
              setIsFolderModalOpen(true);
            }}
            className="classic-button-secondary rounded-classic text-xs font-bold px-4 py-2 flex items-center space-x-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5 text-classic-text-secondary" />
            <span>New Folder</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPasteModalTargetFolder(selectedFolderId || '');
              setImportExportModalMode('IMPORT');
              setIsPasteModalOpen(true);
            }}
            className="classic-button-secondary rounded-classic text-xs font-bold px-4 py-2 flex items-center space-x-1.5 border-emerald-600/30 text-emerald-800 hover:bg-emerald-50"
            title="Import & extract questions and answers from Word (.docx), PDF (.pdf), JSON (.json), Image OCR, or raw text"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-700" />
            <span>Import & Extract Questions</span>
          </button>

          {/* Prominent Export Questions Action with Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="classic-button-secondary rounded-classic text-xs font-bold px-4 py-2 flex items-center space-x-1.5 border-indigo-600/30 text-indigo-900 hover:bg-indigo-50"
              title="Export questions to Word, PDF, JSON, or Excel CSV"
            >
              <Download className="w-3.5 h-3.5 text-indigo-700" />
              <span>Export Questions</span>
              {selectedBankQIds.size > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-indigo-600 text-white text-[10px] rounded-full font-bold">
                  {selectedBankQIds.size}
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-indigo-600 ml-0.5" />
            </button>

            {isExportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-72 bg-white border border-classic-border rounded-classic shadow-classic-md z-50 p-2 space-y-1 animate-fade-in text-xs">
                  <div className="px-2.5 py-1.5 border-b border-classic-border-light text-[11px] font-bold text-classic-text-muted flex items-center justify-between">
                    <span>EXPORT SCOPE</span>
                    <span className="text-classic-navy font-semibold">{getExportScopeLabel()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      handleOpenPrintModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-indigo-50 flex items-center space-x-2.5 transition-colors font-medium text-classic-text-primary"
                  >
                    <Printer className="w-4 h-4 text-indigo-700 shrink-0" />
                    <div>
                      <div className="font-bold text-indigo-950">Print / Save PDF (Exact App)</div>
                      <div className="text-[10px] text-classic-text-muted">Exact visual parity with formulas &amp; symbols</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      handleExportWord();
                    }}
                    disabled={exportingFormat !== null}
                    className="w-full text-left px-3 py-2 rounded hover:bg-classic-surface-muted flex items-center space-x-2.5 transition-colors font-medium text-classic-text-primary"
                  >
                    <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                    <div>
                      <div className="font-bold">Word (.doc) Document</div>
                      <div className="text-[10px] text-classic-text-muted">Questions &amp; full Solutions / Diagrams</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      handleExportPdf();
                    }}
                    disabled={exportingFormat !== null}
                    className="w-full text-left px-3 py-2 rounded hover:bg-rose-50 flex items-center space-x-2.5 transition-colors font-medium text-classic-text-primary"
                  >
                    <Download className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <div className="font-bold text-rose-900">PDF (.pdf) Document</div>
                      <div className="text-[10px] text-classic-text-muted">High-def A4 layout with Answer Key</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      handleExportJson();
                    }}
                    disabled={exportingFormat !== null}
                    className="w-full text-left px-3 py-2 rounded hover:bg-classic-surface-muted flex items-center space-x-2.5 transition-colors font-medium text-classic-text-primary"
                  >
                    <FileJson className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <div className="font-bold">Universal JSON (.json)</div>
                      <div className="text-[10px] text-classic-text-muted">Universal Schema v2.0 for LMS &amp; apps</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      handleExportCsv();
                    }}
                    disabled={exportingFormat !== null}
                    className="w-full text-left px-3 py-2 rounded hover:bg-emerald-50 flex items-center space-x-2.5 transition-colors font-medium text-classic-text-primary"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-900">Excel CSV (.csv)</div>
                      <div className="text-[10px] text-classic-text-muted">UTF-8 multi-language spreadsheet</div>
                    </div>
                  </button>

                  <div className="pt-1 border-t border-classic-border-light">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        setPasteModalTargetFolder(selectedFolderId || '');
                        setImportExportModalMode('EXPORT');
                        setIsPasteModalOpen(true);
                      }}
                      className="w-full text-center py-1.5 px-2 text-[11px] font-bold text-classic-navy hover:underline"
                    >
                      Open Universal Export Suite &rarr;
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              setEditingQuestion(null);
              setIsEditorOpen(true);
            }}
            className="classic-button-primary rounded-classic text-xs font-bold px-4 py-2 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Main Bank Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
        {/* Left Column: Hierarchical Taxonomy Tree */}
        <div className="lg:col-span-4 classic-card rounded-classic p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-classic-border-light">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-classic-text-primary">Folders</span>
              <span className="text-xs text-classic-text-muted font-bold">({flatFolders.length})</span>
            </div>
            {selectedFolderId && (
              <button
                onClick={() => setSelectedFolderId(null)}
                className="text-xs text-classic-navy hover:underline font-bold"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-[620px] overflow-y-auto pr-1">
            {folders.length === 0 ? (
              <div className="text-xs text-classic-text-muted py-10 text-center">
                No folders created yet. Click "+ New Folder" above.
              </div>
            ) : (
              renderFolderTree(folders)
            )}
          </div>
        </div>

        {/* Right Column: Question List & Filters */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search and Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-classic-text-muted absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions by text or formula..."
                className="w-full classic-input rounded-classic pl-10 pr-4 py-2 text-xs placeholder:text-classic-text-muted"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Language / Script Filter */}
              <div className="flex items-center space-x-1 bg-white border border-classic-border rounded-classic px-2.5 py-1 shadow-classic">
                <Languages className="w-3.5 h-3.5 text-classic-navy shrink-0" />
                <select
                  value={languageScript}
                  onChange={(e: any) => setLanguageScript(e.target.value)}
                  className="bg-transparent text-xs text-classic-text-primary font-medium focus:outline-none cursor-pointer"
                  title="Filter or format script style for multi-language questions"
                >
                  <option value="all">All Languages</option>
                  <option value="hindi">Hindi (हिन्दी)</option>
                  <option value="sanskrit">Sanskrit (संस्कृतम्)</option>
                  <option value="punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                  <option value="urdu">Urdu (اردو)</option>
                </select>
              </div>

              {/* Difficulty Filter */}
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="classic-input rounded-classic text-xs font-medium px-3 py-2"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>

              {/* Complete Multi-Format Export Suite */}
              <button
                type="button"
                onClick={() => handleOpenPrintModal()}
                className="classic-button-secondary rounded-classic text-xs font-semibold px-3 py-2 flex items-center space-x-1.5 text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                title={`Print or Save PDF with exact web application math rendering for ${getExportScopeLabel()}`}
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>Print / PDF (Exact)</span>
                {selectedBankQIds.size > 0 && (
                  <span className="text-[10px] font-bold text-indigo-800">({selectedBankQIds.size})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleExportWord()}
                disabled={exportingFormat !== null}
                className="classic-button-secondary rounded-classic text-xs font-semibold px-3 py-2 flex items-center space-x-1.5 disabled:opacity-50"
                title={`Export ${getExportScopeLabel()} to Microsoft Word (.doc)`}
              >
                {exportingFormat === 'word' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-classic-text-secondary" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-classic-text-secondary" />
                )}
                <span>Word (.doc)</span>
                {selectedBankQIds.size > 0 && (
                  <span className="text-[10px] font-bold text-classic-navy">({selectedBankQIds.size})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleExportPdf()}
                disabled={exportingFormat !== null}
                className="classic-button-secondary rounded-classic text-xs font-semibold px-3 py-2 flex items-center space-x-1.5 text-rose-700 hover:bg-rose-50 border-rose-200 disabled:opacity-50"
                title={`Download high-definition A4 PDF of ${getExportScopeLabel()} with Answer Key`}
              >
                {exportingFormat === 'pdf' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span>PDF (.pdf)</span>
                {selectedBankQIds.size > 0 && (
                  <span className="text-[10px] font-bold text-rose-800">({selectedBankQIds.size})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleExportJson()}
                disabled={exportingFormat !== null}
                className="classic-button-secondary rounded-classic text-xs font-semibold px-3 py-2 flex items-center space-x-1.5 disabled:opacity-50"
                title={`Export ${getExportScopeLabel()} to standardized portable JSON (v2.0)`}
              >
                {exportingFormat === 'json' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-classic-text-secondary" />
                ) : (
                  <FileJson className="w-3.5 h-3.5 text-classic-text-secondary" />
                )}
                <span>JSON</span>
                {selectedBankQIds.size > 0 && (
                  <span className="text-[10px] font-bold text-classic-navy">({selectedBankQIds.size})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleExportCsv()}
                disabled={exportingFormat !== null}
                className="classic-button-secondary rounded-classic text-xs font-semibold px-3 py-2 flex items-center space-x-1.5 text-emerald-700 hover:bg-emerald-50 border-emerald-200 disabled:opacity-50"
                title={`Export ${getExportScopeLabel()} to Excel CSV with UTF-8 multi-language support`}
              >
                {exportingFormat === 'csv' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>Excel CSV</span>
                {selectedBankQIds.size > 0 && (
                  <span className="text-[10px] font-bold text-emerald-800">({selectedBankQIds.size})</span>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await api.post('/papers/sync-storage');
                    showToast(`💾 Synced to Physical Storage: data/Bank (Questions & Papers)!`);
                  } catch (err: any) {
                    alert(`Sync failed: ${err.message}`);
                  }
                }}
                className="classic-button-secondary rounded-classic text-xs font-semibold px-3 py-2 flex items-center space-x-1.5"
                title="Sync all questions to physical storage"
              >
                <HardDrive className="w-3.5 h-3.5 text-classic-text-secondary" />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* TOP DUPLICATE BANNER IN QUESTION BANK */}
          {duplicateSummary && duplicateSummary.total > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-classic flex flex-wrap items-center justify-between gap-3 text-xs shadow-classic">
              <div className="flex items-center space-x-3 text-amber-950">
                <div className="w-8 h-8 rounded-classic bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 border border-amber-400 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <span className="font-bold text-amber-950 block text-xs">
                    ⚠️ {duplicateSummary.total} Duplicate Question{duplicateSummary.total !== 1 ? 's' : ''} Detected in Question Bank
                  </span>
                  <span className="text-amber-900 font-medium text-xs block">
                    Identical questions with matching text, options, or diagram images found across folders.
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCleanAllDuplicates}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-classic font-bold text-xs shadow-classic flex items-center space-x-1.5 transition-all"
                  title="Automatically remove all duplicate copies and keep canonical originals"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                  <span>Remove All Duplicates</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicatesModal(true)}
                  className="classic-button-secondary rounded-classic px-3.5 py-1.5 text-xs font-bold"
                >
                  Inspect Side-by-Side
                </button>
              </div>
            </div>
          )}

          {/* Multi-Select Questions Action Bar */}
          {questions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 classic-card p-3 rounded-classic border border-classic-border text-xs shadow-classic">
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedBankQIds.size > 0 && selectedBankQIds.size === questions.length}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-classic-navy bg-white border-classic-border focus:ring-classic-navy cursor-pointer"
                />
                <span className="font-bold text-classic-text-primary text-xs">
                  Select All ({questions.length} Questions)
                </span>
                {selectedBankQIds.size > 0 && (
                  <span className="text-white font-bold bg-classic-navy px-2.5 py-0.5 rounded-full text-xs shadow-classic">
                    {selectedBankQIds.size} Selected
                  </span>
                )}
              </label>

              <div className="flex items-center space-x-2">
                {selectedBankQIds.size > 0 && (
                  <div className="flex items-center space-x-2 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setIsBatchMoveModalOpen(true)}
                      className="classic-button-secondary rounded-classic text-xs font-bold px-3 py-1.5 flex items-center space-x-1.5"
                    >
                      <Folder className="w-3.5 h-3.5 text-classic-text-secondary" />
                      <span>Move ({selectedBankQIds.size})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchDeleteQuestions}
                      className="classic-button-danger rounded-classic text-xs font-bold px-3 py-1.5 flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                      <span>Delete ({selectedBankQIds.size})</span>
                    </button>
                  </div>
                )}

                {/* Global Toggle for Options Visibility */}
                {questions.some((q) => {
                  const opts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
                  return opts && opts.length > 0;
                }) && (
                  <button
                    type="button"
                    onClick={handleToggleAllOptions}
                    className="classic-button-secondary rounded-classic text-xs font-semibold px-2.5 py-1.5 flex items-center space-x-1.5 transition-colors border border-classic-border hover:border-classic-navy"
                    title={
                      questions.filter((q) => {
                        const opts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
                        return opts && opts.length > 0;
                      }).every((q) => expandedQuestionOptionIds.has(q.id))
                        ? "Hide options for all questions"
                        : "Display options for all questions"
                    }
                  >
                    {questions.filter((q) => {
                      const opts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
                      return opts && opts.length > 0;
                    }).every((q) => expandedQuestionOptionIds.has(q.id)) ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-classic-navy" />
                        <span>Hide All Options</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-classic-navy" />
                        <span>View All Full Questions / Options</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Questions Grid */}
          <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
            {questions.length === 0 ? (
              <div className="text-center py-20 text-classic-text-muted text-xs">
                {loading ? 'Loading questions...' : 'No questions found in this folder.'}
              </div>
            ) : (
              questions.map((q) => {
                const options = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
                const diagrams = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson) : q.diagrams || [];
                const isSelected = selectedBankQIds.has(q.id);

                const dupMatch = duplicateGroups.find(
                  (g) => g.canonical.id === q.id || g.duplicates.some((d: any) => d.question.id === q.id)
                );
                const isDuplicateCopy = Boolean(dupMatch && dupMatch.canonical.id !== q.id);
                const isCanonical = Boolean(dupMatch && dupMatch.canonical.id === q.id);

                return (
                  <div
                    key={q.id}
                    className={`p-5 rounded-classic transition-all space-y-3 ${
                      isSelected
                        ? 'bg-blue-50/60 border-2 border-classic-navy shadow-classic'
                        : isDuplicateCopy
                        ? 'bg-amber-50/60 border-2 border-amber-500 shadow-classic'
                        : 'classic-card border border-classic-border hover:border-classic-navy/40 shadow-classic'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectQuestion(q.id)}
                          className="w-4 h-4 rounded text-classic-navy bg-white border-classic-border focus:ring-classic-navy cursor-pointer"
                        />
                        <span className={`w-7 h-7 rounded-classic text-xs font-bold flex items-center justify-center font-mono ${
                          isDuplicateCopy
                            ? 'bg-amber-600 text-white font-bold'
                            : isSelected
                            ? 'bg-classic-navy text-white font-bold'
                            : 'bg-classic-surface-muted border border-classic-border text-classic-text-primary font-bold'
                        }`}>
                          Q{q.questionNumber}
                        </span>
                        {q.folder && (
                          <span className="text-xs text-classic-text-primary font-bold">
                            {q.folder.name}
                          </span>
                        )}
                        <span className="text-xs text-classic-text-secondary font-medium">
                          &bull; [{q.marks} Mark{q.marks > 1 ? 's' : ''}]
                        </span>
                        {q.isRestricted && (
                          <span className="flex items-center space-x-1 text-xs text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-classic font-bold">
                            <Lock className="w-3 h-3" />
                            <span>Restricted</span>
                          </span>
                        )}

                        {/* Duplicate Question Badge */}
                        {isDuplicateCopy && (
                          <button
                            type="button"
                            onClick={() => setShowDuplicatesModal(true)}
                            className="flex items-center space-x-1 text-xs text-white bg-amber-600 border border-amber-500 px-2.5 py-0.5 rounded-full font-bold hover:bg-amber-700 transition-colors shadow-classic"
                            title="Click to inspect duplicate conflict"
                          >
                            <AlertTriangle className="w-3 h-3 text-white" />
                            <span>Duplicate Copy</span>
                          </button>
                        )}
                        {isCanonical && (
                          <button
                            type="button"
                            onClick={() => setShowDuplicatesModal(true)}
                            className="flex items-center space-x-1 text-xs text-classic-navy bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold hover:bg-blue-100 transition-colors"
                            title="This is the original question (has duplicates)"
                          >
                            <span>Primary Original</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {isDuplicateCopy && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDuplicate(q.id)}
                            className="classic-button-danger rounded-classic px-2.5 py-1 text-xs font-bold flex items-center space-x-1"
                            title="Permanently delete this duplicate question"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                            <span>Delete Duplicate</span>
                          </button>
                        )}
                        <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold ${
                          q.difficulty === 'EASY'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : q.difficulty === 'HARD'
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {q.difficulty}
                        </span>

                        {/* Quick View Options Toggle in Card Header */}
                        {options.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleToggleQuestionOptions(q.id)}
                            className={`p-1.5 rounded-classic transition-all flex items-center space-x-1 text-xs font-semibold ${
                              expandedQuestionOptionIds.has(q.id)
                                ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                                : 'text-classic-navy bg-blue-50 hover:bg-blue-100 border border-blue-200'
                            }`}
                            title={expandedQuestionOptionIds.has(q.id) ? "Hide options for this question" : "View full question (display options)"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{expandedQuestionOptionIds.has(q.id) ? 'Hide Options' : 'View Options'}</span>
                          </button>
                        )}

                        {/* Quick Attach Picture / Diagram Button in Card Header with Destination Choice */}
                        <button
                          type="button"
                          onClick={() => setAttachImageModal({ question: q, destination: 'BODY' })}
                          className="p-1.5 text-classic-text-secondary hover:text-classic-navy hover:bg-classic-surface-muted rounded-classic transition-colors flex items-center"
                          title="Attach / Add picture or diagram (select Question Body or Option)"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingQuestion(q);
                            setIsEditorOpen(true);
                          }}
                          className="p-1.5 text-classic-text-secondary hover:text-classic-navy hover:bg-classic-surface-muted rounded-classic transition-colors"
                          title="Edit Question"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-classic transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                        </button>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="text-sm text-classic-text-primary font-sans leading-relaxed font-normal">
                      <MathRenderer content={q.questionText} />
                    </div>

                    {/* View Full Question / Toggle Options Button */}
                    {options.length > 0 && (
                      <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionOptions(q.id)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-classic text-xs font-semibold transition-all border shadow-xs ${
                            expandedQuestionOptionIds.has(q.id)
                              ? 'bg-slate-100 text-classic-navy border-classic-border hover:bg-slate-200'
                              : 'bg-blue-50/90 text-classic-navy border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                          }`}
                          title={expandedQuestionOptionIds.has(q.id) ? 'Hide options for this question' : 'View full question (display options)'}
                        >
                          {expandedQuestionOptionIds.has(q.id) ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5 text-classic-navy" />
                              <span>Hide Options ({options.length})</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-classic-navy" />
                              <span>View Full Question &bull; Show Options ({options.length})</span>
                              <ChevronDown className="w-3 h-3 text-classic-navy/70" />
                            </>
                          )}
                        </button>

                        {!expandedQuestionOptionIds.has(q.id) && q.correctAnswer && (
                          <span className="text-xs text-classic-text-muted font-mono font-medium">
                            Correct: <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Option ({q.correctAnswer})</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* MCQ Options with Image and Formula Support (Hidden by default, displayed on click) */}
                    {options.length > 0 && expandedQuestionOptionIds.has(q.id) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-classic-border-light animate-fade-in">
                        {options.map((opt: any, idx: number) => {
                          const isCorrect = q.correctAnswer === opt.key;
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-classic text-xs space-y-1.5 border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium'
                                  : 'bg-classic-surface-muted/50 border-classic-border-light text-classic-text-primary font-normal hover:bg-classic-surface-muted'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-2 flex-1 min-w-0">
                                  <span className={`font-mono font-bold shrink-0 ${isCorrect ? 'text-emerald-700' : 'text-classic-navy'}`}>
                                    ({opt.key})
                                  </span>
                                  {opt.text && (
                                    <span className="flex-1 leading-relaxed text-classic-text-primary font-medium">
                                      <MathRenderer content={opt.text} />
                                    </span>
                                  )}
                                </div>

                                {/* Attach / Replace Option Image Button */}
                                <label
                                  className="ml-1.5 p-1 text-classic-text-muted hover:text-classic-navy hover:bg-classic-surface-muted rounded-classic transition-colors cursor-pointer shrink-0"
                                  title={opt.imageUrl ? `Replace image for Option (${opt.key})` : `Attach picture/image to Option (${opt.key})`}
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleAddOptionImageToQuestion(q.id, opt.key, e.target.files[0]);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </label>
                              </div>

                              {/* Visible Attached Option Image with Resize, Move & Remove Buttons */}
                              {opt.imageUrl && (
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <div className="inline-block">
                                    <ResizableImage
                                      src={opt.imageUrl}
                                      alt={`Option ${opt.key} Diagram`}
                                      initialWidth={opt.imageWidth}
                                      initialHeight={opt.imageHeight || 28}
                                      minHeight={20}
                                      maxHeight={200}
                                      borderStyle="none"
                                      removable={true}
                                      onRemove={() => handleRemoveOptionImageFromQuestion(q.id, opt.key)}
                                    />
                                  </div>

                                  {/* Destination Switcher for Option Image */}
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs text-classic-text-muted font-mono font-bold">Dest:</span>
                                    <select
                                      value={opt.key}
                                      onChange={(e) => handleMoveImage(q.id, opt.key, 0, e.target.value)}
                                      className="bg-white border border-classic-border text-classic-text-primary font-medium text-xs rounded-classic px-1.5 py-0.5 focus:outline-none focus:border-classic-navy cursor-pointer"
                                      title="Move this image to Question Body or another Option"
                                    >
                                      <option value={opt.key}>Option ({opt.key})</option>
                                      <option value="BODY">➔ 📌 Question Body</option>
                                      {options.filter((o: any) => o.key !== opt.key).map((o: any) => (
                                        <option key={o.key} value={o.key}>
                                          ➔ Option ({o.key})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOptionImageFromQuestion(q.id, opt.key)}
                                    className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-classic border border-rose-200 flex items-center space-x-0.5 transition-colors"
                                    title={`Remove image from Option (${opt.key})`}
                                  >
                                    <Trash2 className="w-2.5 h-2.5 text-rose-700" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Attached Diagrams Section */}
                    {diagrams.length > 0 ? (
                      <div className="pt-2.5 space-y-2 border-t border-classic-border-light">
                        <div className="flex items-center justify-between text-xs text-classic-text-primary font-bold">
                          <span className="flex items-center space-x-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-classic-navy" />
                            <span>Attached Pictures &amp; Diagrams ({diagrams.length}):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setAttachImageModal({ question: q, destination: 'BODY' })}
                            className="classic-button-primary rounded-classic text-xs font-semibold px-3 py-1 flex items-center space-x-1 shadow-classic"
                            title="Add / attach picture or diagram (select Question Body or Option)"
                          >
                            <Plus className="w-3 h-3 text-white" />
                            <span>Add Image / Diagram</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-end gap-3 pt-1">
                          {diagrams.map((d: any, idx: number) => {
                            const diagUrl = typeof d === 'string' ? d : d.relative_url || d.url || '';
                            return (
                              <div key={idx} className="p-2 rounded-classic bg-white border border-classic-border shadow-classic space-y-1.5 group/fig">
                                <ResizableImage
                                  src={diagUrl}
                                  alt={`Question Figure ${idx + 1}`}
                                  initialWidth={d.width}
                                  initialHeight={d.height || 90}
                                  minHeight={40}
                                  maxHeight={350}
                                  removable={true}
                                  onRemove={() => handleRemoveDiagramFromQuestion(q.id, idx)}
                                />
                                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-classic-border-light text-xs text-classic-text-secondary font-mono">
                                  <span className="font-bold text-classic-text-primary">Figure {idx + 1}</span>

                                  {/* Destination Selector: Move from Body to Option */}
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs text-classic-text-muted font-mono font-bold">Dest:</span>
                                    <select
                                      value="BODY"
                                      onChange={(e) => handleMoveImage(q.id, 'BODY', idx, e.target.value)}
                                      className="bg-white border border-classic-border text-classic-text-primary font-medium text-xs rounded-classic px-1.5 py-0.5 focus:outline-none focus:border-classic-navy cursor-pointer"
                                      title="Select destination for this diagram (move to Question Body or a specific Option)"
                                    >
                                      <option value="BODY">📌 Question Body</option>
                                      {options.map((opt: any) => (
                                        <option key={opt.key} value={opt.key}>
                                          ➔ Option ({opt.key})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDiagramFromQuestion(q.id, idx)}
                                    className="px-2 py-0.5 text-rose-700 hover:text-white hover:bg-rose-600 rounded-classic flex items-center space-x-1 transition-colors border border-rose-300 font-sans font-bold text-xs"
                                    title={`Delete Figure ${idx + 1} from question`}
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-700 group-hover:text-white" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Inline Add Button Next to Figures */}
                          <button
                            type="button"
                            onClick={() => setAttachImageModal({ question: q, destination: 'BODY' })}
                            className="border border-dashed border-classic-border hover:border-classic-navy bg-classic-surface-muted/50 hover:bg-blue-50/50 rounded-classic px-4 py-6 flex flex-col items-center justify-center text-classic-text-primary hover:text-classic-navy cursor-pointer transition-colors space-y-1 h-[120px]"
                            title="Add another diagram or picture to this question"
                          >
                            <Plus className="w-5 h-5 text-classic-navy" />
                            <span className="text-xs font-bold">+ Add Figure</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setAttachImageModal({ question: q, destination: 'BODY' })}
                          className="inline-flex items-center space-x-1.5 text-classic-text-secondary hover:text-classic-navy hover:bg-classic-surface-muted px-2.5 py-1 rounded-classic border border-dashed border-classic-border hover:border-classic-navy text-xs font-semibold cursor-pointer transition-colors"
                          title="Include picture or diagram in this question (choose body or options)"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-classic-navy" />
                          <span>+ Add Picture / Diagram (Body or Options)</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal for Creating Folders */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-md rounded-classic p-6 space-y-4 shadow-classic-md border border-classic-border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-classic-text-primary flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-classic-navy" />
                <span>Create New Folder</span>
              </h2>
              <button onClick={() => setIsFolderModalOpen(false)} className="text-classic-text-secondary hover:text-classic-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-classic-text-primary mb-1.5">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Kinematics, Thermodynamics, Algebra"
                  required
                  className="w-full classic-input rounded-classic px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-classic-text-primary mb-1.5">Folder Type / Level</label>
                <select
                  value={newFolderType}
                  onChange={(e) => setNewFolderType(e.target.value)}
                  className="w-full classic-input rounded-classic px-3 py-2 text-xs"
                >
                  <option value="CLASS">Class (e.g. Class 11, Class 12, NEET)</option>
                  <option value="SUBJECT">Subject (e.g. Physics, Chemistry, Math)</option>
                  <option value="CHAPTER">Chapter (e.g. Laws of Motion)</option>
                  <option value="TOPIC">Topic (e.g. Friction, Circular Motion)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-classic-text-primary mb-1.5">Parent Folder (Location)</label>
                <select
                  value={newFolderParentId}
                  onChange={(e) => setNewFolderParentId(e.target.value)}
                  className="w-full classic-input rounded-classic px-3 py-2 text-xs"
                >
                  <option value="">None (Top-Level Root Class)</option>
                  {flatFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-classic-border-light">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="classic-button-secondary rounded-classic px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="classic-button-primary rounded-classic px-4 py-2 text-xs font-semibold"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Moving Folder to New Parent */}
      {isMoveModalOpen && folderToMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-md rounded-classic p-6 space-y-4 shadow-classic-md border border-classic-border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-classic-text-primary flex items-center space-x-2">
                <Move className="w-5 h-5 text-classic-navy" />
                <span>Move Folder: "{folderToMove.name}"</span>
              </h2>
              <button onClick={() => setIsMoveModalOpen(false)} className="text-classic-text-secondary hover:text-classic-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-classic-text-muted">
              Select the new parent folder or move this folder to the top-level root.
            </p>

            <form onSubmit={handleMoveFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-classic-text-primary mb-1.5">New Parent Folder</label>
                <select
                  value={newParentFolderId}
                  onChange={(e) => setNewParentFolderId(e.target.value)}
                  className="w-full classic-input rounded-classic px-3 py-2 text-xs"
                >
                  <option value="">[ Move to Root / Top-Level ]</option>
                  {flatFolders
                    .filter((f) => !excludedMoveFolderIds.includes(f.id))
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.type})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-classic-border-light">
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  className="classic-button-secondary rounded-classic px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="classic-button-primary rounded-classic px-4 py-2 text-xs font-semibold"
                >
                  Move Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Renaming / Editing Folder */}
      {isEditFolderModalOpen && folderToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-md rounded-classic p-6 space-y-4 shadow-classic-md border border-classic-border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-classic-text-primary flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-classic-navy" />
                <span>Rename Folder</span>
              </h2>
              <button onClick={() => setIsEditFolderModalOpen(false)} className="text-classic-text-secondary hover:text-classic-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-classic-text-primary mb-1.5">Folder Name</label>
                <input
                  type="text"
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  required
                  className="w-full classic-input rounded-classic px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-classic-border-light">
                <button
                  type="button"
                  onClick={() => setIsEditFolderModalOpen(false)}
                  className="classic-button-secondary rounded-classic px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="classic-button-primary rounded-classic px-4 py-2 text-xs font-semibold"
                >
                  Save Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Questions Inspector Modal */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] flex flex-col rounded-classic p-6 space-y-4 shadow-classic-md border border-classic-border text-classic-text-primary">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-classic-border-light">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-classic bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-classic-text-primary flex items-center space-x-2">
                    <span>Question Bank Duplicate Detector</span>
                    <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-full font-mono font-bold">
                      {duplicateGroups.length} Conflict Group{duplicateGroups.length !== 1 ? 's' : ''}
                    </span>
                  </h2>
                  <p className="text-xs text-classic-text-muted">
                    Scanned {duplicateSummary?.scanned || questions.length} questions across all taxonomy folders &bull; Identified {duplicateSummary?.total || 0} duplicate instances
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {duplicateGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCleanAllDuplicates}
                    className="classic-button-danger rounded-classic px-3 py-1.5 font-bold text-xs flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Auto-Clean All ({duplicateSummary?.total || 0})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDuplicatesModal(false)}
                  className="text-classic-text-secondary hover:text-classic-text-primary p-1.5 rounded-classic hover:bg-classic-surface-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Duplicate Clusters List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[580px]">
              {duplicateGroups.length === 0 ? (
                <div className="p-12 text-center space-y-3 border border-dashed border-classic-border rounded-classic bg-classic-surface-muted/30">
                  <Check className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-classic-text-primary">No Duplicate Questions Found!</p>
                  <p className="text-xs text-classic-text-muted max-w-sm mx-auto">
                    All questions in the Question Bank are unique and deduplicated across all folders.
                  </p>
                </div>
              ) : (
                duplicateGroups.map((group, gIdx) => {
                  const canonicalOpts = typeof group.canonical.optionsJson === 'string' ? JSON.parse(group.canonical.optionsJson) : group.canonical.options || [];
                  const canonicalDiags = typeof group.canonical.diagramsJson === 'string' ? JSON.parse(group.canonical.diagramsJson) : group.canonical.diagrams || [];

                  return (
                    <div key={gIdx} className="p-4 bg-classic-surface-muted/40 rounded-classic border border-classic-border space-y-3 shadow-classic">
                      {/* Cluster Header */}
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-classic-border-light">
                        <span className="font-bold text-amber-900 flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Duplicate Cluster #{gIdx + 1} ({group.duplicates.length + 1} Questions Total)</span>
                        </span>
                        <span className="text-xs text-classic-text-muted font-mono">
                          {group.duplicates[0]?.reason || 'High Similarity Match'}
                        </span>
                      </div>

                      {/* Original / Canonical Question Card */}
                      <div className="p-3.5 bg-white rounded-classic border border-classic-border space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-700 uppercase tracking-wide flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Original / Primary Question</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded-classic bg-blue-50 text-classic-navy border border-blue-200 font-mono text-xs font-semibold">
                              Folder: {group.canonical.folder?.name || 'Unassigned'}
                            </span>
                            <span className="text-classic-text-muted font-mono text-xs">
                              [{group.canonical.marks} Mark{group.canonical.marks > 1 ? 's' : ''}]
                            </span>
                          </div>
                        </div>

                        {group.canonical.questionText && (
                          <div className="text-xs text-classic-text-primary leading-relaxed">
                            <MathRenderer content={group.canonical.questionText} />
                          </div>
                        )}

                        {canonicalDiags.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {canonicalDiags.map((d: any, idx: number) => (
                              <img
                                key={idx}
                                src={d.relative_url}
                                alt={d.label || `Figure ${idx + 1}`}
                                className="max-h-24 rounded-classic border border-classic-border bg-white object-contain"
                              />
                            ))}
                          </div>
                        )}

                        {canonicalOpts.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs text-classic-text-secondary">
                            {canonicalOpts.map((opt: any, optIdx: number) => (
                              <div key={optIdx} className="bg-classic-surface-muted rounded-classic px-2 py-1 border border-classic-border-light flex items-center space-x-1">
                                <span className="font-mono text-classic-navy font-bold">({opt.key || optIdx + 1})</span>
                                <span>{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Duplicate Copies */}
                      <div className="space-y-2 pl-3 border-l-2 border-amber-400">
                        {group.duplicates.map((dup: any, dIdx: number) => {
                          const dupOpts = typeof dup.question.optionsJson === 'string' ? JSON.parse(dup.question.optionsJson) : dup.question.options || [];
                          const dupDiags = typeof dup.question.diagramsJson === 'string' ? JSON.parse(dup.question.diagramsJson) : dup.question.diagrams || [];

                          return (
                            <div key={dIdx} className="p-3.5 bg-amber-50/60 rounded-classic border border-amber-300 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-rose-800 flex items-center space-x-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Duplicate Match ({dup.similarity}% Similarity)</span>
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-0.5 rounded-classic bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs font-semibold">
                                    Folder: {dup.question.folder?.name || 'Unassigned'}
                                  </span>
                                  <span className="text-classic-text-muted font-mono text-xs">
                                    [{dup.question.marks} Mark{dup.question.marks > 1 ? 's' : ''}]
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDuplicate(dup.question.id)}
                                    className="classic-button-danger rounded-classic px-2.5 py-1 text-xs font-bold flex items-center space-x-1"
                                    title="Permanently delete this duplicate question"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-white" />
                                    <span>Delete Duplicate</span>
                                  </button>
                                </div>
                              </div>

                              {dup.question.questionText && (
                                <div className="text-xs text-classic-text-primary leading-relaxed">
                                  <MathRenderer content={dup.question.questionText} />
                                </div>
                              )}

                              {dupDiags.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {dupDiags.map((d: any, idx: number) => (
                                    <img
                                      key={idx}
                                      src={d.relative_url}
                                      alt={d.label || `Figure ${idx + 1}`}
                                      className="max-h-24 rounded-classic border border-classic-border bg-white object-contain"
                                    />
                                  ))}
                                </div>
                              )}

                              {dupOpts.length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs text-classic-text-secondary">
                                  {dupOpts.map((opt: any, optIdx: number) => (
                                    <div key={optIdx} className="bg-white rounded-classic px-2 py-1 border border-classic-border-light flex items-center space-x-1">
                                      <span className="font-mono text-amber-800 font-bold">({opt.key || optIdx + 1})</span>
                                      <span>{opt.text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-classic-border-light text-xs">
              <span className="text-classic-text-muted">
                Tip: Auto-clean removes redundant duplicate copies while preserving the primary original in your Question Bank.
              </span>
              <div className="flex items-center space-x-2">
                {duplicateGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCleanAllDuplicates}
                    className="classic-button-danger rounded-classic px-4 py-2 font-bold text-xs flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Auto-Clean All Duplicates</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDuplicatesModal(false)}
                  className="classic-button-primary rounded-classic px-5 py-2 font-semibold text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Move Questions Modal */}
      {isBatchMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-classic-border rounded-classic max-w-md w-full p-6 space-y-4 shadow-classic-md animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-classic-text-primary flex items-center space-x-2">
                <Folder className="w-5 h-5 text-classic-navy" />
                <span>Move {selectedBankQIds.size} Questions</span>
              </h3>
              <button
                onClick={() => setIsBatchMoveModalOpen(false)}
                className="p-1 rounded-classic text-classic-text-secondary hover:text-classic-text-primary hover:bg-classic-surface-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-classic-text-muted">
              Select the destination taxonomy folder for the {selectedBankQIds.size} selected questions.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-classic-text-primary">Destination Folder</label>
              <select
                value={batchTargetFolderId}
                onChange={(e) => setBatchTargetFolderId(e.target.value)}
                className="w-full classic-input rounded-classic px-3 py-2 text-xs"
              >
                <option value="">-- Select Folder --</option>
                {flatFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-classic-border-light">
              <button
                type="button"
                onClick={() => setIsBatchMoveModalOpen(false)}
                className="classic-button-secondary rounded-classic px-4 py-2 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!batchTargetFolderId}
                onClick={handleBatchMoveQuestions}
                className="classic-button-primary rounded-classic px-4 py-2 text-xs font-bold disabled:opacity-40"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Import & Extract Questions Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-classic-border rounded-classic max-w-4xl w-full p-6 space-y-5 shadow-classic-md animate-fade-in my-8 text-classic-text-primary">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-classic-border-light">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-classic-text-primary flex items-center space-x-2">
                  {importExportModalMode === 'IMPORT' ? (
                    <>
                      <Upload className="w-5 h-5 text-emerald-700" />
                      <span>Universal Import &amp; Extract Questions</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 text-indigo-700" />
                      <span>Universal Question Bank Export Suite</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-classic-text-muted">
                  {importExportModalMode === 'IMPORT'
                    ? 'Import questions, options, answer keys, and solutions from Word (.docx), PDF (.pdf), JSON (.json), Image OCR, or raw text.'
                    : 'Download questions, options, formulas, and verified solutions in multiple publication-grade formats with 1 click.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setParsedFileQuestions([]);
                  setImportErrorMsg('');
                }}
                className="p-2 rounded-classic text-classic-text-secondary hover:text-classic-text-primary hover:bg-classic-surface-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-classic-border">
              <button
                type="button"
                onClick={() => setImportExportModalMode('IMPORT')}
                className={`py-2 px-4 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all ${
                  importExportModalMode === 'IMPORT'
                    ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-classic-text-secondary hover:text-classic-text-primary'
                }`}
              >
                <Upload className="w-4 h-4 text-emerald-700" />
                <span>Import &amp; Extract Questions</span>
              </button>

              <button
                type="button"
                onClick={() => setImportExportModalMode('EXPORT')}
                className={`py-2 px-4 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all ${
                  importExportModalMode === 'EXPORT'
                    ? 'border-indigo-600 text-indigo-900 bg-indigo-50/50'
                    : 'border-transparent text-classic-text-secondary hover:text-classic-text-primary'
                }`}
              >
                <Download className="w-4 h-4 text-indigo-700" />
                <span>Export Question Bank</span>
                {selectedBankQIds.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-indigo-600 text-white text-[10px] rounded-full font-bold">
                    {selectedBankQIds.size} Selected
                  </span>
                )}
              </button>
            </div>

            {importExportModalMode === 'EXPORT' ? (
              <div className="space-y-4">
                {/* Export Scope and Filter */}
                <div className="p-3.5 bg-classic-surface-muted border border-classic-border rounded-classic flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-classic-text-primary">Current Export Scope:</span>{' '}
                    <span className="text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {getExportScopeLabel(pasteModalTargetFolder)}
                    </span>
                    <div className="text-[11px] text-classic-text-muted">
                      {selectedBankQIds.size > 0
                        ? `Export will contain only the ${selectedBankQIds.size} checked question(s).`
                        : pasteModalTargetFolder
                        ? 'Export will include all questions in this folder and its descendant chapters/topics.'
                        : 'Export will include all questions in the entire Question Bank.'}
                    </div>
                  </div>

                  <div className="w-64">
                    <label className="block text-[11px] font-semibold text-classic-text-muted mb-1">
                      Filter by Taxonomy Folder
                    </label>
                    <select
                      value={pasteModalTargetFolder}
                      onChange={(e) => setPasteModalTargetFolder(e.target.value)}
                      className="w-full classic-input rounded-classic px-2.5 py-1.5 text-xs"
                    >
                      <option value="">-- All Folders (Entire Bank) --</option>
                      {flatFolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Multi-Format Export Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Exact App Math Print & PDF Render */}
                  <div className="p-4 border border-indigo-200 bg-indigo-50/30 rounded-classic space-y-3 flex flex-col justify-between hover:border-indigo-400 transition-all shadow-classic-sm col-span-1 md:col-span-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Printer className="w-5 h-5 text-indigo-700" />
                          <h4 className="font-bold text-sm text-indigo-950">Print / Save PDF (Exact App Math Render)</h4>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] rounded font-bold">100% Visual Parity</span>
                      </div>
                      <p className="text-xs text-classic-text-muted leading-relaxed">
                        Directly generates questions with exact application typography: KaTeX math formulas, fractions, radicals, powers, Greek letters, and full option diagrams.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPasteModalOpen(false);
                        handleOpenPrintModal(pasteModalTargetFolder);
                      }}
                      className="bg-indigo-700 hover:bg-indigo-800 text-white rounded-classic py-2.5 px-4 text-xs font-bold flex items-center justify-center space-x-2 w-full transition-all shadow-xs"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Open Print &amp; PDF Preview</span>
                    </button>
                  </div>

                  {/* Word */}
                  <div className="p-4 border border-blue-200 bg-blue-50/20 rounded-classic space-y-3 flex flex-col justify-between hover:border-blue-400 transition-all shadow-classic-sm">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-blue-700" />
                          <h4 className="font-bold text-sm text-classic-text-primary">Microsoft Word (.doc)</h4>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded font-bold">Solutions &amp; Images</span>
                      </div>
                      <p className="text-xs text-classic-text-muted leading-relaxed">
                        Produces an editable Microsoft Word document with formatted questions, option keys, embedded diagrams, and comprehensive Answer Key solutions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportWord(pasteModalTargetFolder)}
                      disabled={exportingFormat !== null}
                      className="classic-button-primary rounded-classic py-2.5 px-4 text-xs font-bold flex items-center justify-center space-x-2 w-full disabled:opacity-50"
                    >
                      {exportingFormat === 'word' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Word Document...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Word (.doc)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* PDF */}
                  <div className="p-4 border border-rose-200 bg-rose-50/20 rounded-classic space-y-3 flex flex-col justify-between hover:border-rose-400 transition-all shadow-classic-sm">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Download className="w-5 h-5 text-rose-600" />
                          <h4 className="font-bold text-sm text-rose-950">Publication PDF (.pdf)</h4>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] rounded font-bold">A4 Print Ready</span>
                      </div>
                      <p className="text-xs text-classic-text-muted leading-relaxed">
                        Generates a crisp, publication-grade A4 PDF exam paper with questions, option layout, and complete Answer Key appendix rendered via offline PyMuPDF AI engine.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportPdf(pasteModalTargetFolder)}
                      disabled={exportingFormat !== null}
                      className="bg-rose-700 hover:bg-rose-800 text-white rounded-classic py-2.5 px-4 text-xs font-bold flex items-center justify-center space-x-2 w-full transition-all disabled:opacity-50"
                    >
                      {exportingFormat === 'pdf' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Rendering PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download PDF (.pdf)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* JSON */}
                  <div className="p-4 border border-amber-200 bg-amber-50/20 rounded-classic space-y-3 flex flex-col justify-between hover:border-amber-400 transition-all shadow-classic-sm">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileJson className="w-5 h-5 text-amber-700" />
                          <h4 className="font-bold text-sm text-classic-text-primary">Universal JSON (.json)</h4>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-bold">Schema v2.0</span>
                      </div>
                      <p className="text-xs text-classic-text-muted leading-relaxed">
                        Exports standardized portable JSON format for cross-app interoperability, external LMS (Moodle, Canvas), automated grading, and cold archive backups.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportJson(pasteModalTargetFolder)}
                      disabled={exportingFormat !== null}
                      className="classic-button-secondary rounded-classic py-2.5 px-4 text-xs font-bold flex items-center justify-center space-x-2 w-full border-amber-300 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {exportingFormat === 'json' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                          <span>Packaging JSON...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-amber-700" />
                          <span>Download JSON (.json)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Excel CSV */}
                  <div className="p-4 border border-emerald-200 bg-emerald-50/20 rounded-classic space-y-3 flex flex-col justify-between hover:border-emerald-400 transition-all shadow-classic-sm">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                          <h4 className="font-bold text-sm text-emerald-950">Excel Spreadsheet (.csv)</h4>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded font-bold">UTF-8 Multi-Lang</span>
                      </div>
                      <p className="text-xs text-classic-text-muted leading-relaxed">
                        Tabular export with explicit UTF-8 BOM encoding so Microsoft Excel properly displays Hindi, Sanskrit, Punjabi, Urdu, and all mathematical formulas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportCsv(pasteModalTargetFolder)}
                      disabled={exportingFormat !== null}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-classic py-2.5 px-4 text-xs font-bold flex items-center justify-center space-x-2 w-full transition-all disabled:opacity-50"
                    >
                      {exportingFormat === 'csv' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Exporting Spreadsheet...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Excel (.csv)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-classic-border-light">
                  <button
                    type="button"
                    onClick={() => setIsPasteModalOpen(false)}
                    className="classic-button-secondary rounded-classic px-5 py-2 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Target Folder Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-classic-text-primary">
                Target Taxonomy Folder
              </label>
              <select
                value={pasteModalTargetFolder}
                onChange={(e) => setPasteModalTargetFolder(e.target.value)}
                className="w-full classic-input rounded-classic px-3 py-2 text-xs"
              >
                <option value="">-- Root / Unassigned --</option>
                {flatFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-classic-surface-muted border border-classic-border rounded-classic">
              <button
                type="button"
                onClick={() => {
                  setImportModalTab('JSON');
                  setImportErrorMsg('');
                }}
                className={`flex-1 py-2 px-3 rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  importModalTab === 'JSON'
                    ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                    : 'text-classic-text-secondary hover:text-classic-text-primary hover:bg-white border border-transparent'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>JSON (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportModalTab('WORD');
                  setImportErrorMsg('');
                }}
                className={`flex-1 py-2 px-3 rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  importModalTab === 'WORD'
                    ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                    : 'text-classic-text-secondary hover:text-classic-text-primary hover:bg-white border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportModalTab('PDF');
                  setImportErrorMsg('');
                }}
                className={`flex-1 py-2 px-3 rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  importModalTab === 'PDF'
                    ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                    : 'text-classic-text-secondary hover:text-classic-text-primary hover:bg-white border border-transparent'
                }`}
              >
                <FileIcon className="w-3.5 h-3.5" />
                <span>PDF (.pdf)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportModalTab('IMAGE');
                  setImportErrorMsg('');
                }}
                className={`flex-1 py-2 px-3 rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  importModalTab === 'IMAGE'
                    ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                    : 'text-classic-text-secondary hover:text-classic-text-primary hover:bg-white border border-transparent'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image (OCR)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportModalTab('TEXT');
                  setImportErrorMsg('');
                }}
                className={`flex-1 py-2 px-3 rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  importModalTab === 'TEXT'
                    ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                    : 'text-classic-text-secondary hover:text-classic-text-primary hover:bg-white border border-transparent'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Raw Text</span>
              </button>
            </div>

            {/* Error Message if any */}
            {importErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-classic flex items-center space-x-2 text-rose-800 text-xs animate-fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{importErrorMsg}</span>
              </div>
            )}

            {/* TAB 1: JSON File or JSON Payload */}
            {importModalTab === 'JSON' && (
              <div className="space-y-3">
                <input
                  ref={jsonFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleParseJsonFile(f);
                  }}
                />

                <div
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="border-2 border-dashed border-classic-border hover:border-classic-navy bg-classic-surface-muted/30 hover:bg-classic-surface-muted/60 rounded-classic p-6 text-center cursor-pointer transition-all space-y-2 group"
                >
                  <FileJson className="w-8 h-8 text-classic-navy mx-auto group-hover:scale-105 transition-transform" />
                  <p className="text-xs text-classic-text-primary font-bold">
                    Click to browse or drop a JSON file from another application or LMS
                  </p>
                  <p className="text-xs text-classic-text-muted">
                    Accepts standard Question schemas, Moodle exports, or arrays of questions with options and answer keys.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-classic-text-secondary">
                    Or paste raw JSON payload here:
                  </label>
                  <textarea
                    rows={4}
                    value={jsonRawInput}
                    onChange={(e) => {
                      setJsonRawInput(e.target.value);
                      try {
                        const parsed = JSON.parse(e.target.value);
                        const list = Array.isArray(parsed) ? parsed : parsed.questions || [];
                        setParsedFileQuestions(list);
                        setImportErrorMsg('');
                      } catch {
                        // Incomplete JSON while typing
                      }
                    }}
                    placeholder='[ { "questionText": "What is 2+2?", "options": [{"key":"A","text":"4"}], "correctAnswer":"A", "marks":1 } ]'
                    className="w-full classic-input rounded-classic p-3 text-xs placeholder-slate-400 font-mono"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Word Document (.docx) */}
            {importModalTab === 'WORD' && (
              <div className="space-y-3">
                <input
                  ref={docFileInputRef}
                  type="file"
                  accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleParseDocOrPdfFile(f);
                  }}
                />

                <div
                  onClick={() => docFileInputRef.current?.click()}
                  className="border-2 border-dashed border-classic-border hover:border-classic-navy bg-classic-surface-muted/30 hover:bg-classic-surface-muted/60 rounded-classic p-6 text-center cursor-pointer transition-all space-y-2 group"
                >
                  {isParsingDoc ? (
                    <Loader2 className="w-8 h-8 text-classic-navy animate-spin mx-auto" />
                  ) : (
                    <FileText className="w-8 h-8 text-classic-navy mx-auto group-hover:scale-105 transition-transform" />
                  )}
                  <p className="text-xs text-classic-text-primary font-bold">
                    {isParsingDoc ? 'Extracting Questions & Answers from Word Document...' : 'Click to choose or drop a Microsoft Word (.docx) Exam Document'}
                  </p>
                  <p className="text-xs text-classic-text-muted">
                    Automatically extracts question stems, MCQ options (A)-(D), correct answers (Ans: A), explanations, and marks.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: PDF Document (.pdf) */}
            {importModalTab === 'PDF' && (
              <div className="space-y-3">
                <input
                  ref={pdfFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleParseDocOrPdfFile(f);
                  }}
                />

                <div
                  onClick={() => pdfFileInputRef.current?.click()}
                  className="border-2 border-dashed border-classic-border hover:border-classic-navy bg-classic-surface-muted/30 hover:bg-classic-surface-muted/60 rounded-classic p-6 text-center cursor-pointer transition-all space-y-2 group"
                >
                  {isParsingDoc ? (
                    <Loader2 className="w-8 h-8 text-classic-navy animate-spin mx-auto" />
                  ) : (
                    <FileIcon className="w-8 h-8 text-classic-navy mx-auto group-hover:scale-105 transition-transform" />
                  )}
                  <p className="text-xs text-classic-text-primary font-bold">
                    {isParsingDoc ? 'Extracting Questions & Answers from PDF...' : 'Click to choose or drop an Exam Question Paper PDF (.pdf)'}
                  </p>
                  <p className="text-xs text-classic-text-muted">
                    High-speed PyMuPDF extractor recognizes multi-page question papers, options, and answer keys.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: Image Document OCR */}
            {importModalTab === 'IMAGE' && (
              <div className="space-y-3">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/tiff,image/bmp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleExtractFromImageFile(file);
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isExtractingImage}
                    onClick={() => imageInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-classic-border hover:border-classic-navy bg-classic-surface-muted/30 hover:bg-classic-surface-muted/60 rounded-classic text-center flex flex-col items-center justify-center space-y-2 transition-all group"
                  >
                    {isExtractingImage ? (
                      <Loader2 className="w-6 h-6 text-classic-navy animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-classic-navy group-hover:scale-105 transition-transform" />
                    )}
                    <span className="text-xs font-bold text-classic-text-primary">
                      {isExtractingImage ? 'Extracting Image...' : 'Upload Exam Image (PNG / JPG)'}
                    </span>
                    <span className="text-xs text-classic-text-muted">RapidOCR ONNX in same language</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const items = await (navigator.clipboard as any).read();
                        let found = false;
                        for (const item of items) {
                          for (const type of item.types) {
                            if (type.startsWith('image/')) {
                              const blob = await item.getType(type);
                              const file = new File([blob], 'clipboard_image.png', { type });
                              handleExtractFromImageFile(file);
                              found = true;
                              break;
                            }
                          }
                          if (found) break;
                        }
                        if (!found) alert('No image found in clipboard. Use Snipping Tool / Win+Shift+S first.');
                      } catch {
                        alert('Could not access clipboard image directly.');
                      }
                    }}
                    className="p-5 border-2 border-dashed border-classic-border hover:border-classic-navy bg-classic-surface-muted/30 hover:bg-classic-surface-muted/60 rounded-classic text-center flex flex-col items-center justify-center space-y-2 transition-all group"
                  >
                    <Clipboard className="w-6 h-6 text-classic-navy group-hover:scale-105 transition-transform" />
                    <span className="text-xs font-bold text-classic-text-primary">Paste Image from Clipboard</span>
                    <span className="text-xs text-classic-text-muted">Works with screenshot snips</span>
                  </button>
                </div>

                {imageOcrMeta && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-classic flex items-center justify-between text-xs text-amber-950 animate-fade-in shadow-classic">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Extracted into <strong>Digital Text ({imageOcrMeta.langName})</strong> &bull; {imageOcrMeta.linesCount} lines recognized
                      </span>
                    </div>
                    <span className="text-xs font-mono bg-amber-100 px-2 py-0.5 rounded-classic text-amber-900 border border-amber-300 font-bold">
                      {imageOcrMeta.confidence}% Confidence
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5 or Raw Text view */}
            {(importModalTab === 'TEXT' || importModalTab === 'IMAGE') && (
              <div className="space-y-2">
                <LanguageTranslatorBar
                  text={pasteModalText}
                  onApplyTranslation={(translated) => setPasteModalText(translated)}
                  compact
                />
                <textarea
                  rows={6}
                  value={pasteModalText}
                  onChange={(e) => setPasteModalText(e.target.value)}
                  placeholder={`Paste questions from an exam, Word document, web page, or notes here...\n\nExample format:\n1. Find the roots of ax^2 + bx + c = 0.\n   (A) x = (-b +- sqrt(D))/(2a)\n   (B) x = (-b +- D)/(2a)\n   Ans: A [3 Marks]\n\n2. Define Newton's second law F = ma.\n   Ans: Force equals mass times acceleration. [2 Marks]`}
                  className="w-full classic-input rounded-classic p-4 text-xs font-mono leading-relaxed"
                />
              </div>
            )}

            {/* Live Detected Questions Preview */}
            {parsedFileQuestions.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                <div className="text-xs font-bold uppercase tracking-wider text-classic-text-secondary flex items-center justify-between">
                  <span>Detected Questions from File ({parsedFileQuestions.length}):</span>
                  <span className="text-emerald-700 text-xs font-mono font-bold">Ready to import</span>
                </div>
                <div className="space-y-2">
                  {parsedFileQuestions.map((pq: any, pIdx: number) => (
                    <div
                      key={pIdx}
                      className="p-3 bg-classic-surface-muted/40 border border-classic-border rounded-classic space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-classic-text-primary">
                        <span className="font-bold text-classic-navy">Q{pq.questionNumber || pIdx + 1}</span>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="bg-white border border-classic-border px-2 py-0.5 rounded-classic text-classic-text-primary font-medium">
                            {pq.marks || 1} Mark{(pq.marks || 1) > 1 ? 's' : ''}
                          </span>
                          {pq.correctAnswer && (
                            <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-classic border border-emerald-300">
                              Ans: {pq.correctAnswer}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-classic-text-primary font-mono text-xs whitespace-pre-wrap">
                        <MathRenderer content={pq.questionText || pq.question || ''} />
                      </div>
                      {pq.options && Array.isArray(pq.options) && pq.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                          {pq.options.map((o: any, oIdx: number) => (
                            <div
                              key={oIdx}
                              className={`px-2 py-1 rounded-classic text-xs font-mono flex items-center space-x-1.5 ${
                                pq.correctAnswer === (o.key || ['A', 'B', 'C', 'D'][oIdx])
                                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold'
                                  : 'bg-white border border-classic-border-light text-classic-text-primary'
                              }`}
                            >
                              <span className="font-bold text-classic-navy">({o.key || ['A', 'B', 'C', 'D'][oIdx]})</span>
                              <span className="truncate"><MathRenderer content={o.text || (typeof o === 'string' ? o : '')} /></span>
                            </div>
                          ))}
                        </div>
                      )}
                      {pq.explanation && (
                        <div className="text-xs text-emerald-900 bg-emerald-50 p-2 rounded-classic border border-emerald-200">
                          <strong>Solution:</strong> <MathRenderer content={pq.explanation} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Detected Questions Preview for Text Mode */}
            {parsedFileQuestions.length === 0 && pasteModalText.trim() && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                <div className="text-xs font-bold uppercase tracking-wider text-classic-text-secondary">
                  Live Detected Questions Preview ({parsePastedQuestionsText(pasteModalText).length}):
                </div>
                <div className="space-y-2">
                  {parsePastedQuestionsText(pasteModalText).map((pq, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3 bg-classic-surface-muted/40 border border-classic-border rounded-classic space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-classic-text-primary">
                        <span className="font-bold text-classic-navy">Q{pq.questionNumber}</span>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="bg-white border border-classic-border px-2 py-0.5 rounded-classic text-classic-text-primary font-medium">
                            {pq.marks} Mark{pq.marks > 1 ? 's' : ''}
                          </span>
                          {pq.correctAnswer && (
                            <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-classic border border-emerald-300">
                              Ans: {pq.correctAnswer}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-classic-text-primary font-mono text-xs whitespace-pre-wrap">
                        <MathRenderer content={pq.questionText} />
                      </div>
                      {pq.options.some((o) => o.text) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                          {pq.options
                            .filter((o) => o.text)
                            .map((o) => (
                              <div
                                key={o.key}
                                className={`px-2 py-1 rounded-classic text-xs font-mono flex items-center space-x-1.5 ${
                                  pq.correctAnswer === o.key
                                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold'
                                    : 'bg-white border border-classic-border-light text-classic-text-primary'
                                }`}
                              >
                                <span className="font-bold text-classic-navy">({o.key})</span>
                                <span className="truncate"><MathRenderer content={o.text} /></span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-classic-border-light">
              <span className="text-xs text-classic-text-muted">
                {parsedFileQuestions.length > 0
                  ? `Ready to import ${parsedFileQuestions.length} questions from ${importModalTab}`
                  : parsePastedQuestionsText(pasteModalText).length > 0
                  ? `Ready to import ${parsePastedQuestionsText(pasteModalText).length} questions from text`
                  : 'Select a file or paste content above'}
              </span>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasteModalOpen(false);
                    setParsedFileQuestions([]);
                    setPasteModalText('');
                    setJsonRawInput('');
                    setImageOcrMeta(null);
                  }}
                  className="classic-button-secondary rounded-classic px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>

                {parsedFileQuestions.length > 0 ? (
                  <button
                    type="button"
                    disabled={isImportingPasted}
                    onClick={() => handleCommitBatchImport(parsedFileQuestions)}
                    className="classic-button-primary rounded-classic px-6 py-2 text-xs font-bold disabled:opacity-40 flex items-center space-x-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isImportingPasted
                        ? 'Importing Questions...'
                        : `Import ${parsedFileQuestions.length} Questions & Answers`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isImportingPasted || parsePastedQuestionsText(pasteModalText).length === 0}
                    onClick={handleImportPastedQuestions}
                    className="classic-button-primary rounded-classic px-6 py-2 text-xs font-bold disabled:opacity-40 flex items-center space-x-2"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>
                      {isImportingPasted
                        ? 'Importing Questions...'
                        : `Import ${parsePastedQuestionsText(pasteModalText).length} Question(s)`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
        </div>
      )}

      {/* Question Editor Modal */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={fetchQuestions}
        question={editingQuestion}
        folderId={selectedFolderId}
        folders={flatFolders}
      />

      {/* Modal for Selecting Image Destination (Question Body vs Option A, B, C, D) */}
      {attachImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-classic p-6 space-y-4 shadow-classic-md border border-classic-border text-classic-text-primary">
            <div className="flex items-center justify-between pb-3 border-b border-classic-border-light">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-classic bg-classic-surface-muted text-classic-navy flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-classic-text-primary">
                    Attach Image / Diagram
                  </h3>
                  <p className="text-xs text-classic-text-muted">
                    Question Q{attachImageModal.question.questionNumber || '1'} &bull; Choose where to place image
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachImageModal(null);
                  setModalUploadFile(null);
                }}
                className="text-classic-text-secondary hover:text-classic-text-primary p-1 rounded-classic hover:bg-classic-surface-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Destination Selection */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-classic-text-primary">
                1. Select Destination:
              </label>

              {/* Option: Question Body */}
              <label
                onClick={() => setAttachImageModal({ ...attachImageModal, destination: 'BODY' })}
                className={`flex items-center space-x-3 p-2.5 rounded-classic border cursor-pointer transition-all ${
                  attachImageModal.destination === 'BODY'
                    ? 'bg-blue-50/70 border-classic-navy text-classic-text-primary ring-1 ring-classic-navy'
                    : 'bg-white border-classic-border text-classic-text-secondary hover:bg-classic-surface-muted'
                }`}
              >
                <input
                  type="radio"
                  name="modalDestination"
                  checked={attachImageModal.destination === 'BODY'}
                  onChange={() => setAttachImageModal({ ...attachImageModal, destination: 'BODY' })}
                  className="text-classic-navy focus:ring-classic-navy"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <span className="text-classic-text-primary">📌 Question Body</span>
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-classic-navy rounded-classic font-mono font-medium">Main Figure</span>
                  </div>
                  <p className="text-xs text-classic-text-muted">Shown with question stem text</p>
                </div>
              </label>

              {/* Options: A, B, C, D */}
              {(() => {
                const qOpts = typeof attachImageModal.question.optionsJson === 'string'
                  ? JSON.parse(attachImageModal.question.optionsJson)
                  : attachImageModal.question.options || [];
                return qOpts.map((opt: any) => (
                  <label
                    key={opt.key}
                    onClick={() => setAttachImageModal({ ...attachImageModal, destination: opt.key })}
                    className={`flex items-center space-x-3 p-2.5 rounded-classic border cursor-pointer transition-all ${
                      attachImageModal.destination === opt.key
                        ? 'bg-emerald-50 border-emerald-600 text-classic-text-primary ring-1 ring-emerald-600'
                        : 'bg-white border-classic-border text-classic-text-secondary hover:bg-classic-surface-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modalDestination"
                      checked={attachImageModal.destination === opt.key}
                      onChange={() => setAttachImageModal({ ...attachImageModal, destination: opt.key })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="text-xs font-bold text-emerald-700 shrink-0 mr-2">
                        Option ({opt.key})
                      </span>
                      <span className="text-xs text-classic-text-primary truncate flex-1">
                        {opt.text || <span className="italic text-classic-text-muted">[Empty text]</span>}
                      </span>
                      {opt.imageUrl && (
                        <span className="ml-2 text-xs text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-classic font-mono shrink-0 font-medium">
                          Has Image
                        </span>
                      )}
                    </div>
                  </label>
                ));
              })()}
            </div>

            {/* File Chooser */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-classic-text-primary">
                2. Choose Picture / Diagram File:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setModalUploadFile(e.target.files[0]);
                  }
                }}
                className="w-full text-xs text-classic-text-primary file:mr-3 file:py-1.5 file:px-3 file:rounded-classic file:border-0 file:text-xs file:font-semibold file:bg-classic-navy file:text-white hover:file:bg-classic-navy-hover cursor-pointer bg-white border border-classic-border rounded-classic p-1"
              />
              {modalUploadFile && (
                <p className="text-xs text-emerald-700 font-mono font-medium">
                  ✓ Selected: {modalUploadFile.name} ({(modalUploadFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-classic-border-light">
              <button
                type="button"
                onClick={() => {
                  setAttachImageModal(null);
                  setModalUploadFile(null);
                }}
                className="classic-button-secondary rounded-classic px-3 py-1.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!modalUploadFile || isSubmittingImageModal}
                onClick={async () => {
                  if (!modalUploadFile) return;
                  setIsSubmittingImageModal(true);
                  try {
                    await handleExecuteAttachImage(
                      attachImageModal.question.id,
                      attachImageModal.destination,
                      modalUploadFile
                    );
                    setAttachImageModal(null);
                    setModalUploadFile(null);
                  } finally {
                    setIsSubmittingImageModal(false);
                  }
                }}
                className="classic-button-primary rounded-classic px-4 py-1.5 text-xs font-bold disabled:opacity-40 flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isSubmittingImageModal ? 'Uploading...' : `Attach to ${attachImageModal.destination === 'BODY' ? 'Question Body' : `Option (${attachImageModal.destination})`}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exact App Math Print & PDF Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in exact-print-portal">
          <div className="bg-white rounded-classic shadow-2xl border border-classic-border w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header (no-print) */}
            <div className="p-4 border-b border-classic-border bg-classic-surface-muted flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-classic bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-classic-text-primary flex items-center space-x-2">
                    <span>Print / Save PDF (Exact Math Render)</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {printQuestionsList.length} Question{printQuestionsList.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  <p className="text-[11px] text-classic-text-muted">
                    Exact visual parity with web app • Vector KaTeX formulas, symbols, and diagrams
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center space-x-1.5 text-xs font-medium text-classic-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printIncludeAnswers}
                    onChange={(e) => setPrintIncludeAnswers(e.target.checked)}
                    className="w-4 h-4 rounded text-classic-navy focus:ring-classic-navy"
                  />
                  <span>Answers</span>
                </label>
                <label className="flex items-center space-x-1.5 text-xs font-medium text-classic-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printIncludeExplanations}
                    onChange={(e) => setPrintIncludeExplanations(e.target.checked)}
                    className="w-4 h-4 rounded text-classic-navy focus:ring-classic-navy"
                  />
                  <span>Explanations</span>
                </label>

                <button
                  type="button"
                  onClick={handleTriggerDirectPrint}
                  className="classic-button-primary rounded-classic px-3.5 py-1.5 text-xs font-bold flex items-center space-x-1.5 bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs cursor-pointer"
                  title="Open browser print dialog to print or Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportWord()}
                  disabled={exportingFormat !== null}
                  className="classic-button-secondary rounded-classic px-3 py-1.5 text-xs font-semibold flex items-center space-x-1.5"
                  title="Download editable Microsoft Word document (.doc) with MathML"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  <span>Word (.doc)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-classic-text-muted hover:text-classic-text-primary hover:bg-classic-border-light rounded-classic transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Sheet Viewport */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible">
              <div className="exact-print-sheet max-w-4xl mx-auto bg-white p-6 sm:p-10 shadow-lg border border-classic-border rounded print:border-none print:shadow-none print:p-0 print:max-w-none">
                {/* Exam / Bank Header */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
                  <h1 className="text-xl font-bold text-slate-950 uppercase tracking-wide">
                    {printScopeTitle}
                  </h1>
                  <div className="flex items-center justify-between text-xs text-slate-600 mt-2 font-medium">
                    <span>Date: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span>Total Questions: {printQuestionsList.length}</span>
                    <span>
                      Total Marks: {printQuestionsList.reduce((acc, q) => acc + (q.marks || 1), 0)}
                    </span>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-6">
                  {printQuestionsList.map((q, idx) => {
                    const options = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
                    const diagrams = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson) : q.diagrams || [];

                    return (
                      <div key={q.id || idx} className="exact-print-question-item space-y-2.5">
                        {/* Question Stem Header & Text */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-950 flex-1 leading-relaxed">
                            <span className="font-bold mr-1.5">Q{idx + 1}.</span>
                            <MathRenderer content={q.questionText} />
                          </div>
                          <div className="text-xs text-slate-500 font-mono shrink-0 font-medium">
                            [{q.marks || 1} M]
                          </div>
                        </div>

                        {/* Question Image if present */}
                        {q.imageUrl && (
                          <div className="my-2">
                            <img
                              src={q.imageUrl}
                              alt={`Q${idx + 1} Diagram`}
                              className="max-h-48 max-w-full object-contain border border-slate-200 rounded p-1"
                            />
                          </div>
                        )}

                        {/* Additional Diagrams if present */}
                        {diagrams.length > 0 && (
                          <div className="flex flex-wrap gap-2 my-2">
                            {diagrams.map((d: any, dIdx: number) => (
                              <img
                                key={dIdx}
                                src={d.url || d}
                                alt={`Diagram ${dIdx + 1}`}
                                className="max-h-40 max-w-full object-contain border border-slate-200 rounded p-1"
                              />
                            ))}
                          </div>
                        )}

                        {/* Options Grid (MCQ) */}
                        {options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-1">
                            {options.map((opt: any, optIdx: number) => {
                              const isCorrect = printIncludeAnswers && q.correctAnswer === opt.key;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded text-xs flex items-start space-x-2 border ${
                                    isCorrect
                                      ? 'border-emerald-600 bg-emerald-50/60 font-semibold text-emerald-950 print:border-emerald-800'
                                      : 'border-slate-200 bg-slate-50/50 text-slate-800'
                                  }`}
                                >
                                  <span className={`font-mono font-bold shrink-0 ${isCorrect ? 'text-emerald-700' : 'text-slate-900'}`}>
                                    ({opt.key})
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <MathRenderer content={opt.text || ''} />
                                    {opt.imageUrl && (
                                      <div className="mt-1">
                                        <img
                                          src={opt.imageUrl}
                                          alt={`Option ${opt.key}`}
                                          className="max-h-24 object-contain border border-slate-200 rounded p-0.5"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  {isCorrect && (
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded shrink-0">
                                      ✓ Correct
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Answer and Explanation Box */}
                        {printIncludeAnswers && (
                          <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-xs space-y-1">
                            {q.correctAnswer && (
                              <div className="font-semibold text-emerald-800 flex items-center space-x-1.5">
                                <span>Answer:</span>
                                <span className="font-bold underline">Option ({q.correctAnswer})</span>
                              </div>
                            )}
                            {printIncludeExplanations && q.explanation && (
                              <div className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 leading-relaxed">
                                <span className="font-bold text-slate-900 mr-1">Explanation / Solution:</span>
                                <MathRenderer content={q.explanation} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Print Footer */}
                <div className="mt-8 pt-4 border-t border-slate-300 text-center text-xs text-slate-500">
                  <p>Question Bank Document &bull; Generated by Paper Generator</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
