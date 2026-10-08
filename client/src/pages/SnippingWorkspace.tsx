import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Scissors,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Crop,
  Sparkles,
  FolderPlus,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  Edit3,
  Sliders,
  Calculator,
  Atom,
  FlaskConical,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  FileUp,
  Image as ImageIcon,
  Check,
  Save,
  Trash2,
  Plus,
  Pin,
  ExternalLink,
  CheckCircle2,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { MathRenderer } from '../components/common/MathRenderer';
import { FormulaEditorModal } from '../components/common/FormulaEditorModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfidenceBadge } from '../components/ui/Badge';

export interface WorkingOption {
  key: string;
  text: string;
  imageUrl?: string;
}

export interface WorkingQuestionDraft {
  questionNumber: string;
  questionText: string;
  marks: number;
  diagrams: Array<{ relative_url: string; width?: number; height?: number }>;
  options: WorkingOption[];
  correctAnswer: string;
  explanation: string;
  folderId?: string;
}

export const SnippingWorkspace: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docId = searchParams.get('docId');
  const pageNum = parseInt(searchParams.get('pageNum') || '1', 10);

  const [document, setDocument] = useState<any | null>(null);
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [pageImageUrl, setPageImageUrl] = useState<string>('');
  const [imgAttempt, setImgAttempt] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [mode, setMode] = useState('AUTO');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [showOverlay, setShowOverlay] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolveImageUrl = (rawUrl: string, attempt: number = 0) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl;
    let path = rawUrl;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        path = new URL(rawUrl).pathname;
      } catch {
        path = rawUrl;
      }
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (attempt === 0) return cleanPath;
    if (attempt === 1) return `http://127.0.0.1:5010${cleanPath}?retry=${Date.now()}`;
    return `http://localhost:5010${cleanPath}?retry=${Date.now()}`;
  };

  // Fetch list of documents for switching
  const fetchDocsList = async () => {
    try {
      const res = await api.get('/documents');
      const docs = res.data.documents || [];
      setAllDocs(docs);
      return docs;
    } catch (e) {
      console.error('Error fetching documents list:', e);
      return [];
    }
  };

  // Load a document and render/fetch its page image
  const loadDocumentPage = async (targetDocId: string, targetPageNum: number) => {
    if (!targetDocId) return;
    setLoadingDoc(true);
    setImgAttempt(0);
    setCurrentBox(null);
    setSnipResult(null);
    try {
      try { localStorage.setItem('pg_active_doc_id', targetDocId); } catch {}
      const res = await api.get(`/documents/${targetDocId}`);
      const doc = res.data.document;
      setDocument(doc);

      const existingPage = doc?.pages?.find((p: any) => p.pageNumber === targetPageNum);
      if (existingPage?.imageUrl) {
        setPageImageUrl(existingPage.imageUrl);
      }

      // Ensure page is rendered by calling process-page
      try {
        const pageRes = await api.post(`/documents/${targetDocId}/process-page/${targetPageNum}`);
        const rendered =
          pageRes.data.extracted?.page_image ||
          pageRes.data.page?.imageUrl ||
          pageRes.data.page_image ||
          existingPage?.imageUrl ||
          '';
        if (rendered) {
          setPageImageUrl(rendered);
        }
      } catch (procErr: any) {
        console.warn('Process-page request non-fatal error:', procErr.message);
        if (existingPage?.imageUrl) {
          setPageImageUrl(existingPage.imageUrl);
        }
      }
    } catch (err) {
      console.error('Error loading document:', err);
    } finally {
      setLoadingDoc(false);
    }
  };

  // Initialization: auto-load docId from URL, localStorage, or latest available document
  useEffect(() => {
    const init = async () => {
      const docs = await fetchDocsList();
      let targetId = docId;

      if (!targetId) {
        try {
          const savedId = localStorage.getItem('pg_active_doc_id');
          if (savedId && docs.some((d: any) => d.id === savedId)) {
            targetId = savedId;
          } else if (docs.length > 0) {
            targetId = docs[0].id;
          }
        } catch {
          if (docs.length > 0) targetId = docs[0].id;
        }
      }

      if (targetId) {
        if (targetId !== docId) {
          navigate(`/snip?docId=${targetId}&pageNum=${pageNum}`, { replace: true });
        }
        await loadDocumentPage(targetId, pageNum);
      }
    };

    init();
  }, [docId, pageNum]);

  // Handle document switch from dropdown
  const handleSelectDoc = (newDocId: string) => {
    if (!newDocId) return;
    navigate(`/snip?docId=${newDocId}&pageNum=1`);
  };

  // Handle page pagination
  const handlePageChange = (newPageNum: number) => {
    const total = document?.pageCount || 1;
    if (newPageNum < 1 || newPageNum > total) return;
    navigate(`/snip?docId=${docId || document?.id}&pageNum=${newPageNum}`);
  };

  // Direct upload of a document or page image
  const handleUploadFile = async (file: File) => {
    if (!file) return;
    setUploadingFile(true);
    setUploadProgress(`Uploading ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('profile', 'BALANCED');
      formData.append('sourceType', 'FILE');

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newDoc = res.data.document;
      try { localStorage.setItem('pg_active_doc_id', newDoc.id); } catch {}

      setUploadProgress('Rendering page 1 for visual snipping...');
      const pageRes = await api.post(`/documents/${newDoc.id}/process-page/1`);
      const img =
        pageRes.data.extracted?.page_image ||
        pageRes.data.page?.imageUrl ||
        pageRes.data.page_image ||
        '';

      setDocument(newDoc);
      setPageImageUrl(img);
      await fetchDocsList();
      navigate(`/snip?docId=${newDoc.id}&pageNum=1`, { replace: true });
    } catch (err: any) {
      alert(`Upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploadingFile(false);
      setUploadProgress('');
    }
  };

  // Drawing crop box
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [snipResult, setSnipResult] = useState<any | null>(null);
  const [snipDestination, setSnipDestination] = useState<string>('BODY');
  const [processing, setProcessing] = useState(false);

  // Working Question Draft State
  const [workingQuestion, setWorkingQuestion] = useState<WorkingQuestionDraft>({
    questionNumber: '1',
    questionText: '',
    marks: 1,
    diagrams: [],
    options: [
      { key: 'A', text: '', imageUrl: '' },
      { key: 'B', text: '', imageUrl: '' },
      { key: 'C', text: '', imageUrl: '' },
      { key: 'D', text: '', imageUrl: '' },
    ],
    correctAnswer: '',
    explanation: '',
    folderId: '',
  });

  const [toastMessage, setToastMessage] = useState<string>('');
  const [savedQuestionsOnPage, setSavedQuestionsOnPage] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [flatFolders, setFlatFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [savingToBank, setSavingToBank] = useState<boolean>(false);
  const [savingToDoc, setSavingToDoc] = useState<boolean>(false);

  const getSavedPageQuestionsKey = (dId?: string, pNum?: number) => {
    const effectiveDocId = dId || docId || document?.id || 'default';
    const effectivePage = pNum || pageNum || 1;
    return `pg_doc_${effectiveDocId}_p${effectivePage}_questions`;
  };

  const loadSavedQuestionsForPage = () => {
    try {
      const key = getSavedPageQuestionsKey();
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setSavedQuestionsOnPage(parsed);
          return parsed;
        }
      }
    } catch {}
    setSavedQuestionsOnPage([]);
    return [];
  };

  const fetchFolders = async () => {
    try {
      const res = await api.get('/folders');
      const rootFolders = res.data.folders || [];
      setFolders(rootFolders);

      const flat: any[] = [];
      const traverse = (list: any[], depth = 0) => {
        for (const item of list) {
          flat.push({
            ...item,
            displayName: (depth > 0 ? '— '.repeat(depth) : '') + item.name,
          });
          if (item.children && item.children.length > 0) traverse(item.children, depth + 1);
        }
      };
      traverse(rootFolders);
      setFlatFolders(flat);
      if (flat.length > 0 && !selectedFolderId) {
        setSelectedFolderId(flat[0].id);
      }
    } catch (err) {
      console.error('Failed to load folders in SnippingWorkspace:', err);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    const list = loadSavedQuestionsForPage();
    if (list.length > 0) {
      const nextNum = list.length + 1;
      setWorkingQuestion((prev) => ({
        ...prev,
        questionNumber: prev.questionText ? prev.questionNumber : String(nextNum),
      }));
    }
  }, [docId, pageNum, document?.id]);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imgRef.current || e.touches.length !== 1) return;
    const rect = imgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) / zoom;
    const y = (touch.clientY - rect.top) / zoom;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
    setSnipResult(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing || !startPos || !imgRef.current || e.touches.length !== 1) return;
    const rect = imgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const curX = (touch.clientX - rect.left) / zoom;
    const curY = (touch.clientY - rect.top) / zoom;

    const x = Math.min(startPos.x, curX);
    const y = Math.min(startPos.y, curY);
    const w = Math.abs(curX - startPos.x);
    const h = Math.abs(curY - startPos.y);

    setCurrentBox({ x, y, w, h });
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
    setSnipResult(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const curX = (e.clientX - rect.left) / zoom;
    const curY = (e.clientY - rect.top) / zoom;

    const x = Math.min(startPos.x, curX);
    const y = Math.min(startPos.y, curY);
    const w = Math.abs(curX - startPos.x);
    const h = Math.abs(curY - startPos.y);

    setCurrentBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleProcessSnipWithMode = async (targetMode: string) => {
    if (!currentBox || !pageImageUrl || currentBox.w < 10 || currentBox.h < 10) return;
    setMode(targetMode);
    setProcessing(true);

    try {
      const bbox = [
        Math.round(currentBox.x),
        Math.round(currentBox.y),
        Math.round(currentBox.w),
        Math.round(currentBox.h),
      ];

      const res = await api.post('/snips', {
        pageImagePath: pageImageUrl,
        bbox,
        mode: targetMode,
        documentId: docId,
        pageNumber: pageNum,
      });

      setSnipResult(res.data);
    } catch (err: any) {
      alert(`Snippet extraction failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessSnip = () => handleProcessSnipWithMode(mode);

  const handleAcceptFormula = (editedLatex: string, meta?: any) => {
    if (!snipResult) return;
    setSnipResult({
      ...snipResult,
      aiData: {
        ...snipResult.aiData,
        extracted_text: editedLatex,
        confidence: meta?.confidence?.overall_confidence || snipResult.aiData?.confidence,
        scientific_result: {
          ...snipResult.aiData?.scientific_result,
          latex: editedLatex,
          confidence: meta?.confidence,
          structured_ast: meta?.ast,
        },
      },
    });
    setIsEditorOpen(false);
  };

  const extractQuestionNumberFromText = (text: string): string | null => {
    if (!text) return null;
    const match = text.match(/^\s*(?:Q(?:uestion)?[\s\.]*|)(\d+)(?:[\.\):]|\s+)/i);
    return match ? match[1] : null;
  };

  const handleSaveToBody = () => {
    if (!snipResult) return;
    const rawText = (snipResult.aiData?.extracted_text || '').trim();
    const imgUrl = snipResult.snip?.imageUrl;

    setWorkingQuestion((prev) => {
      let newText = prev.questionText;
      if (rawText) {
        newText = prev.questionText ? `${prev.questionText}\n${rawText}` : rawText;
      }

      const newDiagrams = [...prev.diagrams];
      if (imgUrl && !newDiagrams.some((d) => d.relative_url === imgUrl)) {
        newDiagrams.push({
          relative_url: imgUrl,
          width: snipResult.aiData?.width,
          height: snipResult.aiData?.height,
        });
      }

      let newQNum = prev.questionNumber;
      const detectedNum = extractQuestionNumberFromText(rawText);
      if (detectedNum && (!prev.questionText || prev.questionNumber === '1')) {
        newQNum = detectedNum;
      }

      return {
        ...prev,
        questionNumber: newQNum,
        questionText: newText,
        diagrams: newDiagrams,
      };
    });

    setToastMessage('✓ Snippet saved to Question Body!');
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleSaveToOption = (optKey: string) => {
    if (!snipResult) return;
    const rawText = (snipResult.aiData?.extracted_text || '').trim();
    const imgUrl = snipResult.snip?.imageUrl;

    const cleanedText = rawText.replace(new RegExp(`^\\(?\\s*${optKey}\\s*[\\)\\.:\\-]\\s*`, 'i'), '').trim();

    setWorkingQuestion((prev) => {
      const newOptions = prev.options.map((opt) => {
        if (opt.key === optKey) {
          return {
            ...opt,
            text: cleanedText || (rawText || opt.text),
            imageUrl: imgUrl || opt.imageUrl || '',
          };
        }
        return opt;
      });

      return {
        ...prev,
        options: newOptions,
      };
    });

    setToastMessage(`✓ Snippet saved to Option (${optKey})!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleRemoveDiagram = (idx: number) => {
    setWorkingQuestion((prev) => ({
      ...prev,
      diagrams: prev.diagrams.filter((_, i) => i !== idx),
    }));
  };

  const handleRemoveOptionImage = (optKey: string) => {
    setWorkingQuestion((prev) => ({
      ...prev,
      options: prev.options.map((opt) =>
        opt.key === optKey ? { ...opt, imageUrl: '' } : opt
      ),
    }));
  };

  const handleResetWorkingQuestion = () => {
    const nextNum = savedQuestionsOnPage.length > 0 ? String(savedQuestionsOnPage.length + 1) : '1';
    setWorkingQuestion({
      questionNumber: nextNum,
      questionText: '',
      marks: 1,
      diagrams: [],
      options: [
        { key: 'A', text: '', imageUrl: '' },
        { key: 'B', text: '', imageUrl: '' },
        { key: 'C', text: '', imageUrl: '' },
        { key: 'D', text: '', imageUrl: '' },
      ],
      correctAnswer: '',
      explanation: '',
      folderId: selectedFolderId || '',
    });
    setToastMessage('Draft reset to new question');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleLoadSavedQuestion = (q: any) => {
    setWorkingQuestion({
      questionNumber: String(q.questionNumber || q.question_number || '1'),
      questionText: q.questionText || q.question_text || '',
      marks: q.marks || 1,
      diagrams: q.diagrams || [],
      options: q.options && q.options.length > 0 ? q.options : [
        { key: 'A', text: '', imageUrl: '' },
        { key: 'B', text: '', imageUrl: '' },
        { key: 'C', text: '', imageUrl: '' },
        { key: 'D', text: '', imageUrl: '' },
      ],
      correctAnswer: q.correctAnswer || q.correct_answer || '',
      explanation: q.explanation || '',
      folderId: q.folderId || selectedFolderId || '',
    });
    setToastMessage(`Loaded Question Q.${q.questionNumber || q.question_number} into editor`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleDeleteSavedQuestion = (qNum: string) => {
    const effectiveDocId = docId || document?.id || 'default';
    const effectivePage = pageNum || 1;
    const key = getSavedPageQuestionsKey(effectiveDocId, effectivePage);
    const existing: any[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = existing.filter((q: any) => String(q.questionNumber || q.question_number) !== String(qNum));
    localStorage.setItem(key, JSON.stringify(updated));
    setSavedQuestionsOnPage(updated);
    setToastMessage(`Removed Question Q.${qNum} from page questions`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSaveToQuestion = async () => {
    const hasBody = Boolean(workingQuestion.questionText.trim() || workingQuestion.diagrams.length > 0);
    const hasOptions = workingQuestion.options.some((o) => o.text.trim() || o.imageUrl);
    if (!hasBody && !hasOptions) {
      alert('Please snip or enter question content before saving.');
      return;
    }

    setSavingToDoc(true);
    try {
      const qNum = workingQuestion.questionNumber.trim() || '1';
      const effectiveDocId = docId || document?.id || 'default';
      const effectivePage = pageNum || 1;

      const questionItem = {
        id: `snip_q_${Date.now()}`,
        question_number: qNum,
        questionNumber: qNum,
        question_text: workingQuestion.questionText.trim(),
        questionText: workingQuestion.questionText.trim(),
        marks: workingQuestion.marks || 1,
        options: workingQuestion.options,
        correct_answer: workingQuestion.correctAnswer || '',
        correctAnswer: workingQuestion.correctAnswer || '',
        explanation: workingQuestion.explanation || '',
        diagrams: workingQuestion.diagrams,
        folderId: selectedFolderId || workingQuestion.folderId || null,
        documentId: effectiveDocId,
        pageNumber: effectivePage,
        savedAt: new Date().toISOString(),
      };

      const key = getSavedPageQuestionsKey(effectiveDocId, effectivePage);
      const existing: any[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [
        ...existing.filter((q: any) => String(q.questionNumber || q.question_number) !== String(qNum)),
        questionItem,
      ];
      localStorage.setItem(key, JSON.stringify(updated));
      setSavedQuestionsOnPage(updated);

      const nextNum = String(parseInt(qNum, 10) + 1 || (updated.length + 1));
      setWorkingQuestion({
        questionNumber: nextNum,
        questionText: '',
        marks: 1,
        diagrams: [],
        options: [
          { key: 'A', text: '', imageUrl: '' },
          { key: 'B', text: '', imageUrl: '' },
          { key: 'C', text: '', imageUrl: '' },
          { key: 'D', text: '', imageUrl: '' },
        ],
        correctAnswer: '',
        explanation: '',
        folderId: selectedFolderId || '',
      });

      setSnipResult(null);
      setCurrentBox(null);
      setToastMessage(`✓ Question Q.${qNum} saved to Document Page ${effectivePage}!`);
      setTimeout(() => setToastMessage(''), 4500);
    } catch (err: any) {
      alert(`Error saving question: ${err.message}`);
    } finally {
      setSavingToDoc(false);
    }
  };

  const handleAddToQuestionBank = async () => {
    const hasBody = Boolean(workingQuestion.questionText.trim() || workingQuestion.diagrams.length > 0);
    const hasOptions = workingQuestion.options.some((o) => o.text.trim() || o.imageUrl);
    if (!hasBody && !hasOptions) {
      alert('Please snip or enter question content before adding to Question Bank.');
      return;
    }

    setSavingToBank(true);
    try {
      const qNum = workingQuestion.questionNumber.trim() || '1';
      const effectiveDocId = docId || document?.id || 'default';
      const effectivePage = pageNum || 1;

      const payload = {
        folderId: selectedFolderId || workingQuestion.folderId || null,
        questionNumber: qNum,
        questionText: workingQuestion.questionText.trim() || `Snippet Question Q.${qNum}`,
        options: workingQuestion.options.map((o) => ({
          key: o.key,
          text: o.text || '',
          imageUrl: o.imageUrl || undefined,
        })),
        correctAnswer: workingQuestion.correctAnswer || '',
        explanation: workingQuestion.explanation || '',
        marks: workingQuestion.marks || 1,
        difficulty: 'MEDIUM',
        diagrams: workingQuestion.diagrams,
        tags: [
          document?.filename ? `Doc: ${document.filename}` : `Doc: ${effectiveDocId}`,
          `Page: ${effectivePage}`,
          'Visual Snip',
        ],
      };

      const res = await api.post('/questions', payload);

      const questionItem = {
        ...payload,
        id: res.data?.question?.id || `snip_q_${Date.now()}`,
        question_number: qNum,
        questionNumber: qNum,
        question_text: payload.questionText,
        documentId: effectiveDocId,
        pageNumber: effectivePage,
        savedAt: new Date().toISOString(),
      };
      const key = getSavedPageQuestionsKey(effectiveDocId, effectivePage);
      const existing: any[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [
        ...existing.filter((q: any) => String(q.questionNumber || q.question_number) !== String(qNum)),
        questionItem,
      ];
      localStorage.setItem(key, JSON.stringify(updated));
      setSavedQuestionsOnPage(updated);

      const nextNum = String(parseInt(qNum, 10) + 1 || (updated.length + 1));
      setWorkingQuestion({
        questionNumber: nextNum,
        questionText: '',
        marks: 1,
        diagrams: [],
        options: [
          { key: 'A', text: '', imageUrl: '' },
          { key: 'B', text: '', imageUrl: '' },
          { key: 'C', text: '', imageUrl: '' },
          { key: 'D', text: '', imageUrl: '' },
        ],
        correctAnswer: '',
        explanation: '',
        folderId: selectedFolderId || '',
      });

      setSnipResult(null);
      setCurrentBox(null);
      setToastMessage(`✓ Question Q.${qNum} added to Question Bank!`);
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: any) {
      alert(`Failed to add question to Question Bank: ${err.response?.data?.error || err.message}`);
    } finally {
      setSavingToBank(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 bg-[#0B1F3A] text-white px-4 py-3 rounded-lg shadow-xl border border-blue-400/40 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Direct Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleUploadFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
        accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#D1D5DB] rounded-lg shadow-xs p-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#0B1F3A] text-white flex items-center justify-center shrink-0">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl sm:text-2xl text-[#111827]">Visual Snipping &amp; Formula Extraction</h1>
            <p className="text-sm text-[#374151]">
              Interactive drag-to-select regions &bull; Formula/Diagram OCR &bull; KaTeX Mathematical Validation
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Document Picker Dropdown */}
          {allDocs.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-[#4B5563] hidden xl:inline">Doc:</span>
              <select
                value={document?.id || docId || ''}
                onChange={(e) => handleSelectDoc(e.target.value)}
                className="bg-white border border-[#D1D5DB] text-xs font-semibold rounded-md px-3 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-700 max-w-[200px] truncate"
                title="Select document to snip from"
              >
                {allDocs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename} ({d.pageCount || 1} pg)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Page Navigation Switcher */}
          {document && (
            <div className="flex items-center space-x-1 bg-slate-50 px-2.5 py-1 rounded-md border border-[#D1D5DB] text-xs">
              <button
                type="button"
                disabled={pageNum <= 1 || loadingDoc}
                onClick={() => handlePageChange(pageNum - 1)}
                className="p-1 hover:bg-slate-200 disabled:opacity-30 rounded text-[#111827] transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-[#0B1F3A] font-bold px-2 select-none">
                Page {pageNum} of {document.pageCount || 1}
              </span>
              <button
                type="button"
                disabled={pageNum >= (document.pageCount || 1) || loadingDoc}
                onClick={() => handlePageChange(pageNum + 1)}
                className="p-1 hover:bg-slate-200 disabled:opacity-30 rounded text-[#111827] transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Direct Upload Button */}
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            loading={uploadingFile}
            icon={<UploadCloud className="w-4 h-4" />}
          >
            Upload Page / Doc
          </Button>

          {/* Zoom & Rotate Controls */}
          <div className="flex items-center space-x-1 bg-slate-50 px-2 py-1 rounded-md border border-[#D1D5DB] text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
              className="p-1.5 hover:bg-slate-200 rounded text-[#111827]"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[#111827] font-bold px-1.5">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="p-1.5 hover:bg-slate-200 rounded text-[#111827]"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 hover:bg-slate-200 rounded text-[#111827] ml-1 border-l border-[#D1D5DB] pl-2"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Selector */}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="bg-white border border-[#D1D5DB] text-xs font-semibold rounded-md px-3 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-700"
          >
            <option value="AUTO">Auto Detect</option>
            <option value="MATH">Math / Formula (LaTeX)</option>
            <option value="PHYSICS">Physics Recognition</option>
            <option value="CHEMISTRY">Chemistry Recognition</option>
            <option value="TEXT">Printed Text (Normal OCR)</option>
            <option value="DIAGRAM">Diagram / Figure Crop</option>
            <option value="ALL">Run All Appropriate</option>
          </select>

          <Button
            variant="primary"
            onClick={handleProcessSnip}
            disabled={!currentBox || processing}
            loading={processing}
            icon={<Crop className="w-4 h-4" />}
          >
            Process Crop
          </Button>
        </div>
      </div>

      {/* Formula Recognition Action Strip (When Box is Active) */}
      {currentBox && (
        <Card className="p-4 border-[#D1D5DB] flex flex-wrap items-center justify-between gap-3 bg-blue-50/50">
          <div className="flex items-center space-x-2 text-sm font-bold text-[#0B1F3A]">
            <Sparkles className="w-4 h-4 text-[#0B1F3A]" />
            <span>Targeted Recognition Paths:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleProcessSnipWithMode('TEXT')}
              disabled={processing}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#111827] rounded-md text-xs font-bold border border-[#D1D5DB] flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <FileText className="w-4 h-4 text-[#4B5563]" />
              <span>Normal OCR</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('MATH')}
              disabled={processing}
              className="px-3 py-1.5 bg-white hover:bg-blue-50 text-[#0B1F3A] rounded-md text-xs font-bold border border-blue-300 flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Calculator className="w-4 h-4 text-[#0B1F3A]" />
              <span>Mathematics</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('PHYSICS')}
              disabled={processing}
              className="px-3 py-1.5 bg-white hover:bg-cyan-50 text-cyan-950 rounded-md text-xs font-bold border border-cyan-300 flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Atom className="w-4 h-4 text-cyan-800" />
              <span>Physics</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('CHEMISTRY')}
              disabled={processing}
              className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-950 rounded-md text-xs font-bold border border-amber-300 flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <FlaskConical className="w-4 h-4 text-amber-800" />
              <span>Chemistry</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('DIAGRAM')}
              disabled={processing}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-950 rounded-md text-xs font-bold border border-emerald-300 flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Crop className="w-4 h-4 text-emerald-800" />
              <span>Analyze Diagram</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('AUTO')}
              disabled={processing}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#111827] rounded-md text-xs font-bold border border-[#D1D5DB] flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Sparkles className="w-4 h-4 text-[#0B1F3A]" />
              <span>Auto Detect</span>
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleProcessSnipWithMode('ALL')}
              disabled={processing}
              icon={<Layers className="w-4 h-4" />}
            >
              Run All
            </Button>
          </div>
        </Card>
      )}

      {/* Main Snipping Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
        {/* Left Snipping Canvas View */}
        <div
          ref={containerRef}
          className="lg:col-span-7 bg-slate-100 rounded-lg p-4 overflow-auto flex items-center justify-center relative select-none border border-[#CBD5E1] shadow-xs min-h-[600px]"
        >
          {pageImageUrl ? (
            <div
              className="relative inline-block"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'top center',
                touchAction: 'none',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <img
                ref={imgRef}
                src={resolveImageUrl(pageImageUrl, imgAttempt)}
                alt="Document page"
                className="max-w-none rounded shadow-md cursor-crosshair border border-slate-300 bg-white"
                draggable={false}
                onError={(e) => {
                  console.warn(`[Snipping Preview] Image load attempt ${imgAttempt} failed:`, e.currentTarget.src);
                  if (imgAttempt < 2) {
                    setImgAttempt((prev) => prev + 1);
                  }
                }}
              />

              {/* Current Active Crop Box */}
              {currentBox && (
                <div
                  className="absolute border-2 border-[#0B1F3A] bg-blue-500/25 pointer-events-none"
                  style={{
                    left: `${currentBox.x}px`,
                    top: `${currentBox.y}px`,
                    width: `${currentBox.w}px`,
                    height: `${currentBox.h}px`,
                  }}
                >
                  <div className="absolute -top-7 left-0 bg-[#0B1F3A] text-white text-xs font-mono font-bold px-2 py-0.5 rounded shadow">
                    {Math.round(currentBox.w)} × {Math.round(currentBox.h)} px
                  </div>
                </div>
              )}
            </div>
          ) : loadingDoc || uploadingFile ? (
            <div className="text-center py-24 space-y-4">
              <RefreshCw className="w-10 h-10 text-[#0B1F3A] animate-spin mx-auto" />
              <div className="space-y-1.5">
                <p className="text-base font-bold text-[#111827]">
                  {uploadingFile ? (uploadProgress || 'Uploading and rendering document...') : 'Rendering document page for snipping...'}
                </p>
                <p className="text-sm text-[#4B5563]">
                  Preparing high-resolution canvas with formula &amp; diagram recognition...
                </p>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files?.[0]) {
                  handleUploadFile(e.dataTransfer.files[0]);
                }
              }}
              className={`text-center py-16 px-6 max-w-lg mx-auto rounded-lg border-2 border-dashed transition-all bg-white shadow-xs ${
                isDraggingOver
                  ? 'border-[#0B1F3A] bg-blue-50'
                  : 'border-[#D1D5DB] hover:border-[#0B1F3A]'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-slate-100 border border-[#D1D5DB] flex items-center justify-center mx-auto mb-4 text-[#0B1F3A]">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#111827] mb-1">
                Upload a Page or Document to Snip
              </h3>
              <p className="text-sm text-[#4B5563] mb-6 leading-relaxed">
                Drag and drop your question paper PDF or scanned page image here, or upload from your device to begin localized formula &amp; diagram recognition.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  icon={<FileUp className="w-4 h-4" />}
                >
                  Choose File to Upload
                </Button>

                {allDocs.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (allDocs[0]?.id) handleSelectDoc(allDocs[0].id);
                    }}
                  >
                    Open Latest ({allDocs[0].filename})
                  </Button>
                )}
              </div>

              {allDocs.length > 0 && (
                <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-left">
                  <span className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block mb-2">
                    Or select an existing ingested document:
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {allDocs.slice(0, 6).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectDoc(d.id)}
                        className="w-full text-left p-3 rounded-md bg-slate-50 hover:bg-blue-50 border border-[#E5E7EB] hover:border-blue-300 flex items-center justify-between text-xs text-[#111827] transition-all"
                      >
                        <span className="truncate max-w-[260px] font-semibold text-sm">
                          {d.filename}
                        </span>
                        <span className="text-xs text-[#6B7280] font-mono shrink-0 ml-2">
                          {d.pageCount || 1} pg
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Crop Result & Actions Panel */}
        <Card className="lg:col-span-5 p-5 flex flex-col space-y-5 border-[#D1D5DB] max-h-[960px] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <span className="text-sm font-bold uppercase tracking-wider text-[#111827]">Localized Crop Recognition</span>
              <div className="flex items-center space-x-2">
                {snipResult && (
                  <button
                    type="button"
                    onClick={() => {
                      setSnipResult(null);
                      setCurrentBox(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 hover:underline flex items-center space-x-1"
                    title="Clear current crop"
                  >
                    <span>Clear Crop</span>
                  </button>
                )}
                <Sparkles className="w-5 h-5 text-[#0B1F3A]" />
              </div>
            </div>

            {snipResult ? (
              <div className="space-y-4">
                {/* Crop Image Preview */}
                <div className="p-3 bg-slate-50 rounded-md border border-[#E5E7EB] text-center">
                  <img
                    src={snipResult.snip?.imageUrl}
                    alt="Snippet Crop"
                    className="max-h-44 mx-auto rounded border border-slate-200 bg-white p-1"
                  />
                  <div className="text-xs text-[#6B7280] font-mono mt-1.5 font-semibold">
                    {snipResult.aiData?.width} × {snipResult.aiData?.height} px &bull; Mode: {mode}
                  </div>
                </div>

                {/* Recognized Content with KaTeX */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-[#111827]">
                      Recognized Formula / Content:
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      className="text-[#0B1F3A] hover:underline text-xs font-bold flex items-center space-x-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit in Formula Editor</span>
                    </button>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-md border border-[#E5E7EB] text-sm text-[#111827] font-mono overflow-x-auto">
                    <MathRenderer content={snipResult.aiData?.extracted_text || 'No text detected'} />
                  </div>
                </div>

                {/* Multi-Dimensional Confidence Metrics */}
                <div className="space-y-2 p-3.5 bg-slate-50 rounded-md border border-[#E5E7EB] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#4B5563] font-semibold">Overall Confidence:</span>
                    <ConfidenceBadge confidence={snipResult.aiData?.confidence || 0.95} />
                  </div>
                  {snipResult.aiData?.scientific_result?.confidence && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E7EB] text-xs font-mono text-[#4B5563]">
                      <div>
                        Recognition: <span className="text-[#111827] font-bold">{Math.round((snipResult.aiData.scientific_result.confidence.recognition_confidence || 0.95) * 100)}%</span>
                      </div>
                      <div>
                        Visual Match: <span className="text-[#111827] font-bold">{Math.round((snipResult.aiData.scientific_result.confidence.visual_similarity || 0.90) * 100)}%</span>
                      </div>
                      <div>
                        Structure: <span className="text-[#111827] font-bold">{Math.round((snipResult.aiData.scientific_result.confidence.structural_confidence || 0.95) * 100)}%</span>
                      </div>
                      <div>
                        Domain Validation: <span className="text-[#111827] font-bold">{Math.round((snipResult.aiData.scientific_result.confidence.domain_validation || 0.92) * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Destination Save Buttons */}
                <div className="space-y-2 p-3.5 bg-blue-50/70 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wide flex items-center space-x-1.5">
                      <Pin className="w-3.5 h-3.5 text-blue-700" />
                      <span>Insert Snippet Content Into:</span>
                    </span>
                    <span className="text-[11px] text-blue-800 font-bold bg-white px-2 py-0.5 rounded border border-blue-300">
                      Click to Save
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveToBody}
                    className="w-full px-3.5 py-2.5 rounded-md text-xs font-bold border transition-all text-left flex items-center justify-between bg-[#0B1F3A] hover:bg-[#163660] text-white shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <Pin className="w-3.5 h-3.5 text-amber-300" />
                      <span>Save to Question Body</span>
                    </div>
                    {workingQuestion.questionText && (
                      <span className="text-[10px] bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded border border-blue-400/40 font-mono">
                        Body has content
                      </span>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {['A', 'B', 'C', 'D'].map((opt) => {
                      const optData = workingQuestion.options.find((o) => o.key === opt);
                      const hasContent = Boolean(optData?.text || optData?.imageUrl);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSaveToOption(opt)}
                          className={`px-3 py-2 rounded-md text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                            hasContent
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 hover:bg-emerald-100'
                              : 'bg-white border-[#D1D5DB] text-[#111827] hover:bg-slate-100'
                          }`}
                        >
                          <span>Save to Option ({opt})</span>
                          {hasContent && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#4B5563] py-8 text-center space-y-3 bg-slate-50 rounded-lg border border-dashed border-[#D1D5DB] p-4">
                <Crop className="w-9 h-9 mx-auto text-[#6B7280]" />
                <p className="text-xs">
                  Click and drag on the document page image to select a question, formula, or diagram region, then click <strong>Process Crop</strong> above.
                </p>
              </div>
            )}
          </div>

          {/* Current Working Question Draft Assembly */}
          <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[#0B1F3A]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                  Current Assembled Question Draft
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetWorkingQuestion}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center space-x-1 hover:underline cursor-pointer"
                title="Start a fresh question draft"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Draft</span>
              </button>
            </div>

            {/* Q Num & Marks Row */}
            <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 rounded-md border border-[#E5E7EB] text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Question Number:
                </label>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-slate-600">Q.</span>
                  <input
                    type="text"
                    value={workingQuestion.questionNumber}
                    onChange={(e) =>
                      setWorkingQuestion((prev) => ({ ...prev, questionNumber: e.target.value }))
                    }
                    className="w-full font-bold px-2 py-1 bg-white border border-slate-300 rounded text-xs text-[#111827] focus:ring-1 focus:ring-blue-700"
                    placeholder="3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Marks:
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={1}
                    value={workingQuestion.marks}
                    onChange={(e) =>
                      setWorkingQuestion((prev) => ({
                        ...prev,
                        marks: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    className="w-full font-bold px-2 py-1 bg-white border border-slate-300 rounded text-xs text-[#111827] focus:ring-1 focus:ring-blue-700"
                  />
                  <span className="text-slate-600 font-medium">mark(s)</span>
                </div>
              </div>
            </div>

            {/* Question Body Input & Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#111827]">
                  Question Body Text / LaTeX:
                </label>
                {workingQuestion.questionText && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {workingQuestion.questionText.length} chars
                  </span>
                )}
              </div>
              <textarea
                value={workingQuestion.questionText}
                onChange={(e) =>
                  setWorkingQuestion((prev) => ({ ...prev, questionText: e.target.value }))
                }
                placeholder="Snippet text or LaTeX will appear here when you click 'Save to Question Body'..."
                rows={3}
                className="w-full text-xs font-mono p-2.5 rounded-md border border-[#D1D5DB] focus:ring-2 focus:ring-blue-700 bg-white"
              />

              {workingQuestion.questionText.trim() && (
                <div className="p-2.5 bg-slate-50 rounded-md border border-[#E5E7EB] text-xs font-mono overflow-x-auto">
                  <MathRenderer content={workingQuestion.questionText} />
                </div>
              )}

              {/* Attached Question Body Diagrams */}
              {workingQuestion.diagrams.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-slate-600">
                    Attached Question Diagram(s):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {workingQuestion.diagrams.map((diag, dIdx) => (
                      <div
                        key={dIdx}
                        className="relative group border border-slate-200 rounded p-1 bg-white inline-block shadow-xs"
                      >
                        <img
                          src={diag.relative_url}
                          alt="Question Diagram"
                          className="max-h-20 max-w-[180px] rounded object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDiagram(dIdx)}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow-sm cursor-pointer"
                          title="Remove diagram"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* MCQ Options A, B, C, D */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111827]">
                  Options (A, B, C, D):
                </span>
                <span className="text-[10px] text-slate-500">
                  Select radio button for correct answer
                </span>
              </div>

              <div className="space-y-2">
                {workingQuestion.options.map((opt) => (
                  <div
                    key={opt.key}
                    className={`p-2.5 rounded-md border text-xs space-y-1.5 transition-all ${
                      workingQuestion.correctAnswer === opt.key
                        ? 'bg-emerald-50/70 border-emerald-400'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 font-bold text-[#111827] cursor-pointer">
                        <input
                          type="radio"
                          name="working_correct_answer"
                          checked={workingQuestion.correctAnswer === opt.key}
                          onChange={() =>
                            setWorkingQuestion((prev) => ({ ...prev, correctAnswer: opt.key }))
                          }
                          className="text-emerald-700 focus:ring-emerald-700 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span>Option ({opt.key})</span>
                        {workingQuestion.correctAnswer === opt.key && (
                          <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
                            Correct Choice
                          </span>
                        )}
                      </label>
                      {opt.imageUrl && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionImage(opt.key)}
                          className="text-[10px] text-red-600 hover:underline flex items-center space-x-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Remove Image</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWorkingQuestion((prev) => ({
                          ...prev,
                          options: prev.options.map((o) =>
                            o.key === opt.key ? { ...o, text: val } : o
                          ),
                        }));
                      }}
                      placeholder={`Option (${opt.key}) text or LaTeX...`}
                      className="w-full text-xs font-mono px-2.5 py-1.5 rounded border border-[#D1D5DB] bg-white focus:ring-1 focus:ring-blue-700"
                    />

                    {opt.imageUrl && (
                      <div className="pt-1">
                        <img
                          src={opt.imageUrl}
                          alt={`Option ${opt.key}`}
                          className="max-h-16 rounded border border-slate-200 bg-white p-0.5 object-contain"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Folder Selector for Bank */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#111827]">
                Question Bank Destination Folder:
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] text-xs font-semibold rounded-md px-3 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                <option value="">Universal / Root Folder</option>
                {flatFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.displayName} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons: Save to Question & Add to Question Bank */}
            <div className="space-y-2 pt-3 border-t border-[#E5E7EB]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveToQuestion}
                  loading={savingToDoc}
                  className="w-full justify-center font-bold text-xs shadow-xs"
                  icon={<Save className="w-4 h-4 text-[#0B1F3A]" />}
                >
                  Save to Question
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddToQuestionBank}
                  loading={savingToBank}
                  className="w-full justify-center font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800 shadow-xs"
                  icon={<FolderPlus className="w-4 h-4" />}
                >
                  Add to Question Bank
                </Button>
              </div>
            </div>

            {/* Saved Questions On This Page Chips */}
            {savedQuestionsOnPage.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
                  <span>Saved on Page {pageNum} ({savedQuestionsOnPage.length}):</span>
                  {docId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/review?docId=${docId}`)}
                      className="text-[11px] text-blue-700 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Review Document</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {savedQuestionsOnPage.map((q: any, qIdx: number) => {
                    const num = q.questionNumber || q.question_number || String(qIdx + 1);
                    const isCurrent = String(workingQuestion.questionNumber) === String(num);
                    return (
                      <div
                        key={q.id || qIdx}
                        className={`inline-flex items-center rounded-md border text-xs px-2 py-0.5 space-x-1 font-bold ${
                          isCurrent
                            ? 'bg-blue-100 border-blue-400 text-blue-900'
                            : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleLoadSavedQuestion(q)}
                          className="hover:underline cursor-pointer"
                          title="Click to load into editor"
                        >
                          Q.{num}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedQuestion(num)}
                          className="text-slate-400 hover:text-red-600 pl-1 cursor-pointer"
                          title="Delete question"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Formula Editor Modal */}
      <FormulaEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onAccept={handleAcceptFormula}
        initialLatex={snipResult?.aiData?.extracted_text || ''}
        originalCropUrl={snipResult?.snip?.imageUrl}
        cropBbox={currentBox ? [currentBox.x, currentBox.y, currentBox.w, currentBox.h] : undefined}
        initialConfidence={snipResult?.aiData?.scientific_result?.confidence}
        initialAst={snipResult?.aiData?.scientific_result?.structured_ast}
        initialMode={mode}
      />
    </div>
  );
};
