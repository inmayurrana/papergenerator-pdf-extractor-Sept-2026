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
} from 'lucide-react';
import { api } from '../lib/api';
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

  // Duplicate Questions Management State
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [duplicateSummary, setDuplicateSummary] = useState<{ total: number; scanned: number } | null>(null);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Universal Import & Export State
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
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

  const handleExportWord = async () => {
    try {
      showToast('📄 Generating Microsoft Word document with solutions...');
      const query = selectedFolderId ? `?folderId=${selectedFolderId}` : '';
      const res = await api.get(`/questions/export/word${query}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/msword; charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const folderName = selectedFolderId ? (flatFolders.find((f) => f.id === selectedFolderId)?.name || 'Folder') : 'Question_Bank';
      const safeTitle = folderName.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}_Questions_and_Answers.doc`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast('✓ Exported Questions & Solutions to Word (.doc)!');
    } catch (err: any) {
      alert(`Word Export failed: ${err.message}`);
    }
  };

  const handleExportPdf = async () => {
    try {
      showToast('📄 Generating A4 PDF of Questions & Answer Key...');
      const query = selectedFolderId ? `?folderId=${selectedFolderId}` : '';
      const res = await api.get(`/questions/export/pdf${query}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const folderName = selectedFolderId ? (flatFolders.find((f) => f.id === selectedFolderId)?.name || 'Folder') : 'Question_Bank';
      const safeTitle = folderName.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}_Questions_and_Answers.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast('✓ Downloaded Question Bank PDF with Solutions!');
    } catch (err: any) {
      alert(`PDF Export failed: ${err.message}`);
    }
  };

  const handleExportJson = async () => {
    try {
      const query = selectedFolderId ? `?folderId=${selectedFolderId}` : '';
      const res = await api.get(`/questions/export/json${query}`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const folderName = selectedFolderId ? (flatFolders.find((f) => f.id === selectedFolderId)?.name || 'Folder') : 'Question_Bank';
      const safeTitle = folderName.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}_Questions_v2.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast('✓ Exported questions to Universal JSON format!');
    } catch (err: any) {
      alert(`JSON Export failed: ${err.message}`);
    }
  };

  const handleExportCsv = async () => {
    try {
      const query = selectedFolderId ? `?folderId=${selectedFolderId}` : '';
      const res = await api.get(`/questions/export/csv${query}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const folderName = selectedFolderId ? (flatFolders.find((f) => f.id === selectedFolderId)?.name || 'Folder') : 'Question_Bank';
      const safeTitle = folderName.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}_Questions.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast('✓ Exported questions to Excel CSV (UTF-8 Multi-Language)!');
    } catch (err: any) {
      alert(`CSV Export failed: ${err.message}`);
    }
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
                className={`group flex items-center justify-between py-2 pr-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center space-x-2 truncate min-w-0 pr-2">
                  <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                  <span className="truncate font-semibold">{node.name}</span>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 uppercase font-semibold">
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
                      className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded"
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
                      className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded"
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
                      className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded"
                      title={`Rename "${node.name}"`}
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    {/* Delete Folder */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFolder(node, e)}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded"
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
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white">Hierarchical Question Bank</h1>
            <p className="text-xs text-slate-400">
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
            className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold px-3.5 py-2 rounded-xl border border-amber-500/40 flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Scan entire Question Bank for duplicate questions"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{isCheckingDuplicates ? 'Scanning Duplicates...' : 'Detect Duplicates'}</span>
            {duplicateSummary && duplicateSummary.total > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-black rounded-full font-bold text-[10px]">
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
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>New Folder</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPasteModalTargetFolder(selectedFolderId || '');
              setIsPasteModalOpen(true);
            }}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold px-4 py-2 rounded-xl border border-emerald-500/40 flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Import & extract questions and answers from Word (.docx), PDF (.pdf), JSON (.json), Image OCR, or raw text"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import & Extract Questions</span>
          </button>

          <button
            onClick={() => {
              setEditingQuestion(null);
              setIsEditorOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Main Bank Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
        {/* Left Column: Hierarchical Taxonomy Tree */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Folders</span>
              <span className="text-[10px] text-slate-400">({flatFolders.length})</span>
            </div>
            {selectedFolderId && (
              <button
                onClick={() => setSelectedFolderId(null)}
                className="text-[11px] text-indigo-400 hover:underline font-semibold"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-[620px] overflow-y-auto pr-1">
            {folders.length === 0 ? (
              <div className="text-xs text-slate-400 py-10 text-center">
                No folders created yet. Click "+ New Folder" above.
              </div>
            ) : (
              renderFolderTree(folders)
            )}
          </div>
        </div>

        {/* Right Column: Question List & Filters */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-5 space-y-5">
          {/* Search and Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions by text or formula..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Language / Script Filter */}
              <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1">
                <Languages className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  value={languageScript}
                  onChange={(e: any) => setLanguageScript(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                  title="Filter or format script style for multi-language questions"
                >
                  <option value="all" className="bg-slate-900">All Languages</option>
                  <option value="hindi" className="bg-slate-900">Hindi (हिन्दी)</option>
                  <option value="sanskrit" className="bg-slate-900">Sanskrit (संस्कृतम्)</option>
                  <option value="punjabi" className="bg-slate-900">Punjabi (ਪੰਜਾਬੀ)</option>
                  <option value="urdu" className="bg-slate-900">Urdu (اردو)</option>
                </select>
              </div>

              {/* Difficulty Filter */}
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>

              {/* Complete Multi-Format Export Suite */}
              <button
                type="button"
                onClick={handleExportWord}
                className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow"
                title="Export Questions and detailed Answer Key / Solutions to Microsoft Word (.doc)"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Word (.doc)</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow"
                title="Download high-definition A4 PDF of Question Bank with Answer Key appendix"
              >
                <Download className="w-3.5 h-3.5 text-rose-400" />
                <span>PDF (.pdf)</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow"
                title="Export Question Bank to standardized portable JSON (v2.0) for external apps, LMS & Moodle"
              >
                <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                <span>JSON</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow"
                title="Export Question Bank to Excel CSV with UTF-8 support for Hindi, Sanskrit, Punjabi, Urdu"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel CSV</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await api.post('/papers/sync-storage');
                    showToast(`💾 Synced to Physical Storage: D:\\...\\data\\Bank (Questions & Papers)!`);
                  } catch (err: any) {
                    alert(`Sync failed: ${err.message}`);
                  }
                }}
                className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 hover:text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow"
                title="Sync all questions to physical storage"
              >
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* TOP DUPLICATE BANNER IN QUESTION BANK */}
          {duplicateSummary && duplicateSummary.total > 0 && (
            <div className="p-3.5 bg-amber-500/15 border border-amber-500/50 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in text-xs shadow-lg shadow-amber-500/10">
              <div className="flex items-center space-x-3 text-amber-300">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-amber-200 block text-xs">
                    ⚠️ {duplicateSummary.total} Duplicate Question{duplicateSummary.total !== 1 ? 's' : ''} Detected in Question Bank
                  </span>
                  <span className="text-slate-300 text-[11px] block">
                    Identical questions with matching text, options, or diagram images found across folders.
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCleanAllDuplicates}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-600/25 flex items-center space-x-1.5 transition-all"
                  title="Automatically remove all duplicate copies and keep canonical originals"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove All Duplicates</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicatesModal(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs border border-slate-700 transition-colors"
                >
                  Inspect Side-by-Side
                </button>
              </div>
            </div>
          )}

          {/* Multi-Select Questions Action Bar */}
          {questions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-xs shadow-md">
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedBankQIds.size > 0 && selectedBankQIds.size === questions.length}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-200">
                  Select All ({questions.length} Questions)
                </span>
                {selectedBankQIds.size > 0 && (
                  <span className="text-indigo-400 font-bold bg-indigo-950/80 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                    {selectedBankQIds.size} Selected
                  </span>
                )}
              </label>

              {selectedBankQIds.size > 0 && (
                <div className="flex items-center space-x-2 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => setIsBatchMoveModalOpen(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/30"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Move ({selectedBankQIds.size})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchDeleteQuestions}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-rose-600/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete ({selectedBankQIds.size})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Questions Grid */}
          <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
            {questions.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">
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
                    className={`p-5 rounded-2xl transition-all space-y-3 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-2 border-indigo-500/90 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-950/40'
                        : isDuplicateCopy
                        ? 'bg-amber-950/25 border-2 border-amber-500/80 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectQuestion(q.id)}
                          className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center font-mono ${
                          isDuplicateCopy
                            ? 'bg-amber-600/40 text-amber-300 border border-amber-500/60'
                            : isSelected
                            ? 'bg-indigo-600 text-white font-black'
                            : 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-300'
                        }`}>
                          Q{q.questionNumber}
                        </span>
                        {q.folder && (
                          <span className="text-xs text-slate-400 font-medium">
                            {q.folder.name}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium">
                          &bull; [{q.marks} Mark{q.marks > 1 ? 's' : ''}]
                        </span>
                        {q.isRestricted && (
                          <span className="flex items-center space-x-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-semibold">
                            <Lock className="w-3 h-3" />
                            <span>Restricted</span>
                          </span>
                        )}

                        {/* Duplicate Question Badge */}
                        {isDuplicateCopy && (
                          <button
                            type="button"
                            onClick={() => setShowDuplicatesModal(true)}
                            className="flex items-center space-x-1 text-[10px] text-amber-300 bg-amber-900/70 border border-amber-500/60 px-2.5 py-0.5 rounded-full font-bold hover:bg-amber-800 transition-colors animate-pulse"
                            title="Click to inspect duplicate conflict"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>Duplicate Copy</span>
                          </button>
                        )}
                        {isCanonical && (
                          <button
                            type="button"
                            onClick={() => setShowDuplicatesModal(true)}
                            className="flex items-center space-x-1 text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 px-2.5 py-0.5 rounded-full font-semibold hover:bg-indigo-900/60 transition-colors"
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
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1 transition-all"
                            title="Permanently delete this duplicate question"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Duplicate</span>
                          </button>
                        )}
                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold ${
                          q.difficulty === 'EASY'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : q.difficulty === 'HARD'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {q.difficulty}
                        </span>

                        {/* Quick Attach Picture / Diagram Button in Card Header with Destination Choice */}
                        <button
                          type="button"
                          onClick={() => setAttachImageModal({ question: q, destination: 'BODY' })}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors flex items-center"
                          title="Attach / Add picture or diagram (select Question Body or Option)"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingQuestion(q);
                            setIsEditorOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Question"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="text-sm text-slate-100 font-sans leading-relaxed">
                      <MathRenderer content={q.questionText} />
                    </div>

                    {/* MCQ Options with Image and Formula Support */}
                    {options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
                        {options.map((opt: any, idx: number) => {
                          const isCorrect = q.correctAnswer === opt.key;
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl text-xs space-y-1.5 border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-2 flex-1 min-w-0">
                                  <span className={`font-mono font-bold shrink-0 ${isCorrect ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                    ({opt.key})
                                  </span>
                                  {opt.text && (
                                    <span className="flex-1 leading-relaxed">
                                      <MathRenderer content={opt.text} />
                                    </span>
                                  )}
                                </div>

                                {/* Attach / Replace Option Image Button */}
                                <label
                                  className="ml-1.5 p-1 text-slate-500 hover:text-indigo-300 hover:bg-slate-800/80 rounded transition-colors cursor-pointer shrink-0"
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
                                    <span className="text-[9px] text-slate-500 font-mono">Dest:</span>
                                    <select
                                      value={opt.key}
                                      onChange={(e) => handleMoveImage(q.id, opt.key, 0, e.target.value)}
                                      className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                                    className="px-1.5 py-0.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-[10px] font-semibold rounded border border-rose-500/40 flex items-center space-x-0.5 transition-colors"
                                    title={`Remove image from Option (${opt.key})`}
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
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
                      <div className="pt-2.5 space-y-2 border-t border-slate-800/60">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                          <span className="flex items-center space-x-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Attached Pictures &amp; Diagrams ({diagrams.length}):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setAttachImageModal({ question: q, destination: 'BODY' })}
                            className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 transition-colors"
                            title="Add / attach picture or diagram (select Question Body or Option)"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Image / Diagram</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-end gap-3 pt-1">
                          {diagrams.map((d: any, idx: number) => {
                            const diagUrl = typeof d === 'string' ? d : d.relative_url || d.url || '';
                            return (
                              <div key={idx} className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 group/fig">
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
                                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                                  <span className="font-semibold text-slate-300">Figure {idx + 1}</span>

                                  {/* Destination Selector: Move from Body to Option */}
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[9px] text-slate-500 font-mono">Dest:</span>
                                    <select
                                      value="BODY"
                                      onChange={(e) => handleMoveImage(q.id, 'BODY', idx, e.target.value)}
                                      className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                                    className="px-2 py-0.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/80 rounded flex items-center space-x-1 transition-colors border border-rose-500/30 font-sans font-semibold"
                                    title={`Delete Figure ${idx + 1} from question`}
                                  >
                                    <Trash2 className="w-3 h-3" />
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
                            className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500 hover:bg-slate-900/50 rounded-xl px-4 py-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-300 cursor-pointer transition-colors space-y-1 h-[120px]"
                            title="Add another diagram or picture to this question"
                          >
                            <Plus className="w-5 h-5 text-indigo-400" />
                            <span className="text-[11px] font-semibold">+ Add Figure</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setAttachImageModal({ question: q, destination: 'BODY' })}
                          className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-900 px-2.5 py-1 rounded-lg border border-dashed border-slate-800 hover:border-indigo-500/50 text-xs cursor-pointer transition-colors"
                          title="Include picture or diagram in this question (choose body or options)"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                <span>Create New Folder</span>
              </h2>
              <button onClick={() => setIsFolderModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Kinematics, Thermodynamics, Algebra"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Folder Type / Level</label>
                <select
                  value={newFolderType}
                  onChange={(e) => setNewFolderType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="CLASS">Class (e.g. Class 11, Class 12, NEET)</option>
                  <option value="SUBJECT">Subject (e.g. Physics, Chemistry, Math)</option>
                  <option value="CHAPTER">Chapter (e.g. Laws of Motion)</option>
                  <option value="TOPIC">Topic (e.g. Friction, Circular Motion)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Parent Folder (Location)</label>
                <select
                  value={newFolderParentId}
                  onChange={(e) => setNewFolderParentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="">None (Top-Level Root Class)</option>
                  {flatFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Move className="w-5 h-5 text-amber-400" />
                <span>Move Folder: "{folderToMove.name}"</span>
              </h2>
              <button onClick={() => setIsMoveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select the new parent folder or move this folder to the top-level root.
            </p>

            <form onSubmit={handleMoveFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Parent Folder</label>
                <select
                  value={newParentFolderId}
                  onChange={(e) => setNewParentFolderId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
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

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <span>Rename Folder</span>
              </h2>
              <button onClick={() => setIsEditFolderModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Folder Name</label>
                <input
                  type="text"
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditFolderModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-700 bg-slate-900/95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Question Bank Duplicate Detector</span>
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-mono">
                      {duplicateGroups.length} Conflict Group{duplicateGroups.length !== 1 ? 's' : ''}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Scanned {duplicateSummary?.scanned || questions.length} questions across all taxonomy folders &bull; Identified {duplicateSummary?.total || 0} duplicate instances
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {duplicateGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCleanAllDuplicates}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow flex items-center space-x-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Auto-Clean All ({duplicateSummary?.total || 0})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDuplicatesModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Duplicate Clusters List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[580px]">
              {duplicateGroups.length === 0 ? (
                <div className="p-12 text-center space-y-3 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <Check className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-bold text-white">No Duplicate Questions Found!</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    All questions in the Question Bank are unique and deduplicated across all folders.
                  </p>
                </div>
              ) : (
                duplicateGroups.map((group, gIdx) => {
                  const canonicalOpts = typeof group.canonical.optionsJson === 'string' ? JSON.parse(group.canonical.optionsJson) : group.canonical.options || [];
                  const canonicalDiags = typeof group.canonical.diagramsJson === 'string' ? JSON.parse(group.canonical.diagramsJson) : group.canonical.diagrams || [];

                  return (
                    <div key={gIdx} className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-3 shadow-md">
                      {/* Cluster Header */}
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                        <span className="font-bold text-amber-300 flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span>Duplicate Cluster #{gIdx + 1} ({group.duplicates.length + 1} Questions Total)</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {group.duplicates[0]?.reason || 'High Similarity Match'}
                        </span>
                      </div>

                      {/* Original / Canonical Question Card */}
                      <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-400 uppercase tracking-wide flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Original / Primary Question</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-semibold">
                              Folder: {group.canonical.folder?.name || 'Unassigned'}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              [{group.canonical.marks} Mark{group.canonical.marks > 1 ? 's' : ''}]
                            </span>
                          </div>
                        </div>

                        {group.canonical.questionText && (
                          <div className="text-xs text-slate-200 leading-relaxed">
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
                                className="max-h-24 rounded-lg border border-slate-700 bg-white object-contain"
                              />
                            ))}
                          </div>
                        )}

                        {canonicalOpts.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-300">
                            {canonicalOpts.map((opt: any, optIdx: number) => (
                              <div key={optIdx} className="bg-slate-950/60 rounded px-2 py-1 border border-slate-800 flex items-center space-x-1">
                                <span className="font-mono text-indigo-400 font-bold">({opt.key || optIdx + 1})</span>
                                <span>{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Duplicate Copies */}
                      <div className="space-y-2 pl-3 border-l-2 border-amber-500/40">
                        {group.duplicates.map((dup: any, dIdx: number) => {
                          const dupOpts = typeof dup.question.optionsJson === 'string' ? JSON.parse(dup.question.optionsJson) : dup.question.options || [];
                          const dupDiags = typeof dup.question.diagramsJson === 'string' ? JSON.parse(dup.question.diagramsJson) : dup.question.diagrams || [];

                          return (
                            <div key={dIdx} className="p-3.5 bg-amber-950/20 rounded-xl border border-amber-500/30 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-rose-300 flex items-center space-x-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Duplicate Match ({dup.similarity}% Similarity)</span>
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono text-[10px] font-semibold">
                                    Folder: {dup.question.folder?.name || 'Unassigned'}
                                  </span>
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    [{dup.question.marks} Mark{dup.question.marks > 1 ? 's' : ''}]
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDuplicate(dup.question.id)}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1 transition-colors"
                                    title="Permanently delete this duplicate question"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Duplicate</span>
                                  </button>
                                </div>
                              </div>

                              {dup.question.questionText && (
                                <div className="text-xs text-slate-200 leading-relaxed">
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
                                      className="max-h-24 rounded-lg border border-slate-700 bg-white object-contain"
                                    />
                                  ))}
                                </div>
                              )}

                              {dupOpts.length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-300">
                                  {dupOpts.map((opt: any, optIdx: number) => (
                                    <div key={optIdx} className="bg-slate-950/60 rounded px-2 py-1 border border-slate-800 flex items-center space-x-1">
                                      <span className="font-mono text-amber-400 font-bold">({opt.key || optIdx + 1})</span>
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
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-400">
                Tip: Auto-clean removes redundant duplicate copies while preserving the primary original in your Question Bank.
              </span>
              <div className="flex items-center space-x-2">
                {duplicateGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCleanAllDuplicates}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-md transition-all text-xs flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Auto-Clean All Duplicates</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDuplicatesModal(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md transition-all text-xs"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Folder className="w-5 h-5 text-indigo-400" />
                <span>Move {selectedBankQIds.size} Questions</span>
              </h3>
              <button
                onClick={() => setIsBatchMoveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select the destination taxonomy folder for the {selectedBankQIds.size} selected questions.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Destination Folder</label>
              <select
                value={batchTargetFolderId}
                onChange={(e) => setBatchTargetFolderId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Select Folder --</option>
                {flatFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBatchMoveModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!batchTargetFolderId}
                onClick={handleBatchMoveQuestions}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs rounded-xl font-bold transition-colors shadow-lg shadow-indigo-600/30"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Import & Extract Questions Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full p-6 space-y-5 shadow-2xl animate-fade-in my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-indigo-400" />
                  <span>Universal Import &amp; Extract Questions</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Import questions, options, answer keys, and solutions from Word (.docx), PDF (.pdf), JSON (.json), Image OCR, or raw text for complete cross-app interoperability.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setParsedFileQuestions([]);
                  setImportErrorMsg('');
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Folder Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Target Taxonomy Folder
              </label>
              <select
                value={pasteModalTargetFolder}
                onChange={(e) => setPasteModalTargetFolder(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
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
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setImportModalTab('JSON');
                  setImportErrorMsg('');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  importModalTab === 'JSON'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  importModalTab === 'WORD'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  importModalTab === 'PDF'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  importModalTab === 'IMAGE'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  importModalTab === 'TEXT'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Raw Text</span>
              </button>
            </div>

            {/* Error Message if any */}
            {importErrorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-2 text-rose-300 text-xs animate-fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
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
                  className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-400/80 bg-indigo-950/20 hover:bg-indigo-950/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
                >
                  <FileJson className="w-8 h-8 text-indigo-400 mx-auto group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-slate-200 font-bold">
                    Click to browse or drop a JSON file from another application or LMS
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Accepts standard Question schemas, Moodle exports, or arrays of questions with options and answer keys.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-400">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
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
                  className="border-2 border-dashed border-blue-500/40 hover:border-blue-400/80 bg-blue-950/20 hover:bg-blue-950/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
                >
                  {isParsingDoc ? (
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                  ) : (
                    <FileText className="w-8 h-8 text-blue-400 mx-auto group-hover:scale-110 transition-transform" />
                  )}
                  <p className="text-xs text-slate-200 font-bold">
                    {isParsingDoc ? 'Extracting Questions & Answers from Word Document...' : 'Click to choose or drop a Microsoft Word (.docx) Exam Document'}
                  </p>
                  <p className="text-[11px] text-slate-400">
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
                  className="border-2 border-dashed border-rose-500/40 hover:border-rose-400/80 bg-rose-950/20 hover:bg-rose-950/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
                >
                  {isParsingDoc ? (
                    <Loader2 className="w-8 h-8 text-rose-400 animate-spin mx-auto" />
                  ) : (
                    <FileIcon className="w-8 h-8 text-rose-400 mx-auto group-hover:scale-110 transition-transform" />
                  )}
                  <p className="text-xs text-slate-200 font-bold">
                    {isParsingDoc ? 'Extracting Questions & Answers from PDF...' : 'Click to choose or drop an Exam Question Paper PDF (.pdf)'}
                  </p>
                  <p className="text-[11px] text-slate-400">
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
                    className="p-5 border-2 border-dashed border-amber-500/40 hover:border-amber-400/80 bg-amber-950/20 hover:bg-amber-950/30 rounded-2xl text-center flex flex-col items-center justify-center space-y-2 transition-all group"
                  >
                    {isExtractingImage ? (
                      <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-xs font-bold text-slate-200">
                      {isExtractingImage ? 'Extracting Image...' : 'Upload Exam Image (PNG / JPG)'}
                    </span>
                    <span className="text-[10px] text-slate-400">RapidOCR ONNX in same language</span>
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
                    className="p-5 border-2 border-dashed border-emerald-500/40 hover:border-emerald-400/80 bg-emerald-950/20 hover:bg-emerald-950/30 rounded-2xl text-center flex flex-col items-center justify-center space-y-2 transition-all group"
                  >
                    <Clipboard className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">Paste Image from Clipboard</span>
                    <span className="text-[10px] text-slate-400">Works with screenshot snips</span>
                  </button>
                </div>

                {imageOcrMeta && (
                  <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center justify-between text-xs text-amber-200 animate-fade-in shadow-inner">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Extracted into <strong>Digital Text ({imageOcrMeta.langName})</strong> &bull; {imageOcrMeta.linesCount} lines recognized
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-amber-900/80 px-2 py-0.5 rounded text-amber-300 border border-amber-500/40">
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
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-4 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 leading-relaxed shadow-inner"
                />
              </div>
            )}

            {/* Live Detected Questions Preview */}
            {parsedFileQuestions.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Detected Questions from File ({parsedFileQuestions.length}):</span>
                  <span className="text-emerald-400 text-[11px] font-mono">Ready to import</span>
                </div>
                <div className="space-y-2">
                  {parsedFileQuestions.map((pq: any, pIdx: number) => (
                    <div
                      key={pIdx}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-bold text-indigo-300">Q{pq.questionNumber || pIdx + 1}</span>
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                            {pq.marks || 1} Mark{(pq.marks || 1) > 1 ? 's' : ''}
                          </span>
                          {pq.correctAnswer && (
                            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                              Ans: {pq.correctAnswer}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-slate-200 font-mono text-[11px] whitespace-pre-wrap">
                        <MathRenderer content={pq.questionText || pq.question || ''} />
                      </div>
                      {pq.options && Array.isArray(pq.options) && pq.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                          {pq.options.map((o: any, oIdx: number) => (
                            <div
                              key={oIdx}
                              className={`px-2 py-1 rounded text-[11px] font-mono flex items-center space-x-1.5 ${
                                pq.correctAnswer === (o.key || ['A', 'B', 'C', 'D'][oIdx])
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                                  : 'bg-slate-900 text-slate-300'
                              }`}
                            >
                              <span className="font-bold text-indigo-400">({o.key || ['A', 'B', 'C', 'D'][oIdx]})</span>
                              <span className="truncate"><MathRenderer content={o.text || (typeof o === 'string' ? o : '')} /></span>
                            </div>
                          ))}
                        </div>
                      )}
                      {pq.explanation && (
                        <div className="text-[11px] text-emerald-300/80 bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/20">
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
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live Detected Questions Preview ({parsePastedQuestionsText(pasteModalText).length}):
                </div>
                <div className="space-y-2">
                  {parsePastedQuestionsText(pasteModalText).map((pq, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-bold text-indigo-300">Q{pq.questionNumber}</span>
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                            {pq.marks} Mark{pq.marks > 1 ? 's' : ''}
                          </span>
                          {pq.correctAnswer && (
                            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                              Ans: {pq.correctAnswer}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-slate-200 font-mono text-[11px] whitespace-pre-wrap">
                        <MathRenderer content={pq.questionText} />
                      </div>
                      {pq.options.some((o) => o.text) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                          {pq.options
                            .filter((o) => o.text)
                            .map((o) => (
                              <div
                                key={o.key}
                                className={`px-2 py-1 rounded text-[11px] font-mono flex items-center space-x-1.5 ${
                                  pq.correctAnswer === o.key
                                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                                    : 'bg-slate-900 text-slate-300'
                                }`}
                              >
                                <span className="font-bold text-indigo-400">({o.key})</span>
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
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400">
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>

                {parsedFileQuestions.length > 0 ? (
                  <button
                    type="button"
                    disabled={isImportingPasted}
                    onClick={() => handleCommitBatchImport(parsedFileQuestions)}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 flex items-center space-x-2 transition-all"
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
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center space-x-2 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-700 bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Attach Image / Diagram
                  </h3>
                  <p className="text-[11px] text-slate-400">
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
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Destination Selection */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-300">
                1. Select Destination:
              </label>

              {/* Option: Question Body */}
              <label
                onClick={() => setAttachImageModal({ ...attachImageModal, destination: 'BODY' })}
                className={`flex items-center space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  attachImageModal.destination === 'BODY'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <input
                  type="radio"
                  name="modalDestination"
                  checked={attachImageModal.destination === 'BODY'}
                  onChange={() => setAttachImageModal({ ...attachImageModal, destination: 'BODY' })}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <span>📌 Question Body</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-mono font-normal">Main Figure</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Shown with question stem text</p>
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
                    className={`flex items-center space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      attachImageModal.destination === opt.key
                        ? 'bg-emerald-950/60 border-emerald-500 text-white ring-1 ring-emerald-500'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
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
                      <span className="text-xs font-bold text-emerald-400 shrink-0 mr-2">
                        Option ({opt.key})
                      </span>
                      <span className="text-xs text-slate-300 truncate flex-1">
                        {opt.text || <span className="italic text-slate-500">[Empty text]</span>}
                      </span>
                      {opt.imageUrl && (
                        <span className="ml-2 text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded font-mono shrink-0">
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
              <label className="block text-xs font-semibold text-slate-300">
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
                className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer bg-slate-950 border border-slate-700 rounded-xl p-1"
              />
              {modalUploadFile && (
                <p className="text-[11px] text-emerald-400 font-mono">
                  ✓ Selected: {modalUploadFile.name} ({(modalUploadFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAttachImageModal(null);
                  setModalUploadFile(null);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
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
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isSubmittingImageModal ? 'Uploading...' : `Attach to ${attachImageModal.destination === 'BODY' ? 'Question Body' : `Option (${attachImageModal.destination})`}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
