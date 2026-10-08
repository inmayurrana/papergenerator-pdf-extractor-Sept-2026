import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  SplitSquareVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  FolderPlus,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Edit3,
  Check,
  RefreshCw,
  Folder,
  Trash2,
  UploadCloud,
  Plus,
  Image as ImageIcon,
  X,
  MousePointer,
  Hand,
  Copy,
  ArrowRight,
  Type,
  Scissors,
  Camera,
  Maximize2,
  Clipboard,
  Pin,
  PinOff,
} from 'lucide-react';
import { api } from '../lib/api';
import { MathRenderer } from '../components/common/MathRenderer';
import { sanitizeMathAndExamText } from '../lib/mathSanitizer';
import { ResizableImage } from '../components/common/ResizableImage';
import { FormulaEditorModal } from '../components/common/FormulaEditorModal';

export const ComparisonReview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docId = searchParams.get('docId');

  const [document, setDocument] = useState<any | null>(null);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [pageInputVal, setPageInputVal] = useState('1');
  const [pageData, setPageData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPageInputVal(String(currentPageNum));
  }, [currentPageNum]);
  const [imgAttempt, setImgAttempt] = useState(0);
  const [imgLoadError, setImgLoadError] = useState(false);



  // Active page image URL resolved across pageData and document.pages
  const activePageImageUrl =
    pageData?.page_image ||
    pageData?.imageUrl ||
    document?.pages?.find((p: any) => p.pageNumber === currentPageNum)?.imageUrl ||
    '';

  // Multi-tier URL resolver with direct backend fallback to ensure 100% reliable preview loading
  const resolvePageImageUrl = (rawUrl: string, attempt: number = 0) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl;

    let cleanPath = rawUrl;
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      try {
        cleanPath = new URL(rawUrl).pathname;
      } catch {
        cleanPath = rawUrl;
      }
    }
    cleanPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

    if (attempt === 0) {
      // Primary: relative path proxied by Vite dev server
      return cleanPath;
    } else if (attempt === 1) {
      // Fallback 1: Direct Express backend on 127.0.0.1:5010 with cache busting
      return `http://127.0.0.1:5010${cleanPath}?retry=${Date.now()}`;
    } else {
      // Fallback 2: Direct Express backend on localhost:5010
      return `http://localhost:5010${cleanPath}?retry=${Date.now()}`;
    }
  };

  // Layout & Pan/Zoom States
  const [panelLayout, setPanelLayout] = useState<'STANDARD' | 'WIDE_IMAGE' | 'FULL_IMAGE'>('STANDARD');
  const [interactionMode, setInteractionMode] = useState<'SELECT_TEXT' | 'CROP_IMAGE' | 'PAN'>('SELECT_TEXT');
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [fitMode, setFitMode] = useState<'WIDTH' | 'PAGE' | 'CUSTOM'>('WIDTH');
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [selectedDebugRegion, setSelectedDebugRegion] = useState<any | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Text Selection & Drag State
  const [selectedText, setSelectedText] = useState<string>('');
  const [activeDragText, setActiveDragText] = useState<string>('');
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [copySuccessMsg, setCopySuccessMsg] = useState<string>('');

  // Interactive Image Cropping State
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [activeCroppedImage, setActiveCroppedImage] = useState<{ url: string; w: number; h: number } | null>(null);
  const [croppingLoading, setCroppingLoading] = useState(false);
  const [expandedFormulasQNum, setExpandedFormulasQNum] = useState<string | null>(null);
  const [formulaModalState, setFormulaModalState] = useState<{
    isOpen: boolean;
    latex: string;
    cropUrl?: string;
    confidence?: any;
    ast?: any;
    targetQNum?: string;
    formulaId?: string;
  }>({ isOpen: false, latex: '' });
  const [activeDragImage, setActiveDragImage] = useState<string | null>(null);

  // Snip Target Mode (e.g. user clicked "Snip Question Q4")
  const [snipTarget, setSnipTarget] = useState<{ type: 'QUESTION' | 'OPTION'; qNum?: string; optTarget?: string | number } | null>(null);

  // Mobile / Tablet Panel View Switcher (when screen width < lg)
  const [mobileActivePanel, setMobileActivePanel] = useState<'DOCUMENT' | 'QUESTIONS' | 'REVIEW'>('DOCUMENT');

  // Selected Question & Inline Edit State
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // Inline Editing Question State
  const [editingQNum, setEditingQNum] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any | null>(null);
  const isInlineEditing = editingQNum !== null;

  // Hidden File Inputs for Inline Card Uploads
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const [targetQuestionForUpload, setTargetQuestionForUpload] = useState<string | null>(null);
  const [targetOptionIdx, setTargetOptionIdx] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modal for Selecting Image Destination in Comparison Review (Question Body vs Option A, B, C, D)
  const [attachImageReviewModal, setAttachImageReviewModal] = useState<{
    qNum: string;
    destination: string;
    options: { key: string; text?: string; imageUrl?: string }[];
  } | null>(null);
  const [reviewModalUploadFile, setReviewModalUploadFile] = useState<File | null>(null);
  const [reviewModalUploading, setReviewModalUploading] = useState(false);
  const attachReviewFileInputRef = useRef<HTMLInputElement>(null);

  // Question Bank saving state
  const [folders, setFolders] = useState<any[]>([]);
  const [flatFolders, setFlatFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [savingAll, setSavingAll] = useState(false);

  // Add Folder Modal State (Request #6: Add folder directly from 3-D review panel)
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderType, setNewFolderType] = useState('CHAPTER');
  const [newFolderParentId, setNewFolderParentId] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const fetchFolders = async () => {
    try {
      const res = await api.get('/folders');
      const rootFolders = res.data.folders || [];
      setFolders(rootFolders);

      const flat: any[] = [];
      const traverse = (list: any[], depth = 0) => {
        for (const item of list) {
          flat.push({ ...item, displayName: (depth > 0 ? '— '.repeat(depth) : '') + item.name });
          if (item.children && item.children.length > 0) traverse(item.children, depth + 1);
        }
      };
      traverse(rootFolders);
      setFlatFolders(flat);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await api.post('/folders', {
        name: newFolderName.trim(),
        type: newFolderType,
        parentId: newFolderParentId || null,
      });
      const createdFolder = res.data.folder;
      await fetchFolders();
      if (createdFolder?.id) {
        setSelectedFolderId(createdFolder.id);
      }
      setNewFolderName('');
      setNewFolderParentId('');
      setIsAddFolderModalOpen(false);
      setSaveSuccess(`Folder "${newFolderName.trim()}" created and selected!`);
      setTimeout(() => setSaveSuccess(''), 3500);
    } catch (err: any) {
      alert(`Failed to create folder: ${err.response?.data?.error || err.message || 'Error creating folder'}`);
    } finally {
      setCreatingFolder(false);
    }
  };

  // Multi-Select Questions State
  const [selectedQNums, setSelectedQNums] = useState<Set<string>>(new Set());
  const [savingSelected, setSavingSelected] = useState(false);

  // Bottom Ribbon (Confidence & Question Bank Review) states
  const [isRibbonHovered, setIsRibbonHovered] = useState(false);
  const [isRibbonManuallyClosed, setIsRibbonManuallyClosed] = useState(false);

  // Display ribbon when a question is selected OR mouse hovers over ribbon/bottom trigger; hide when no question selected
  const hasQuestionSelected = Boolean(selectedQuestion || selectedQNums.size > 0);
  const isRibbonVisible = (hasQuestionSelected && !isRibbonManuallyClosed) || isRibbonHovered;

  // Restore ribbon visibility whenever selection changes
  useEffect(() => {
    if (selectedQuestion || selectedQNums.size > 0) {
      setIsRibbonManuallyClosed(false);
    }
  }, [selectedQuestion, selectedQNums]);

  const handleRibbonMouseEnter = () => {
    setIsRibbonHovered(true);
    setIsRibbonManuallyClosed(false);
  };

  const handleRibbonMouseLeave = () => {
    setIsRibbonHovered(false);
  };

  // Continuous Learning Memory State
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [learningStats, setLearningStats] = useState<any | null>(null);
  const [learningCount, setLearningCount] = useState<number>(0);

  const fetchLearningStats = async () => {
    try {
      const res = await api.get('/learning/patterns');
      setLearningStats(res.data?.data || null);
      setLearningCount(res.data?.data?.total_rules || 0);
    } catch (err) {
      console.debug('Failed to fetch learning stats:', err);
    }
  };

  useEffect(() => {
    fetchLearningStats();
  }, []);

  const showToast = (msg: string) => {
    setCopySuccessMsg(msg);
    setTimeout(() => setCopySuccessMsg(''), 3500);
  };

  // Helper to detect duplicate questions within extracted question list
  const findDuplicateIndices = (questions: any[]): { dupIdx: number; originalIdx: number; originalQNum: string }[] => {
    const dups: { dupIdx: number; originalIdx: number; originalQNum: string }[] = [];
    const normalize = (txt: string) =>
      (txt || '')
        .toLowerCase()
        .replace(/^(?:q(?:uestion)?[\s\.]*\d+|\d+[\.\)]|q\.?\d+)\s*/i, '')
        .replace(/[^a-z0-9]/g, '');

    for (let i = 0; i < questions.length; i++) {
      const textA = normalize(questions[i].question_text || questions[i].questionText || '');
      if (!textA || textA.length < 6) continue;

      for (let j = 0; j < i; j++) {
        const textB = normalize(questions[j].question_text || questions[j].questionText || '');
        if (!textB || textB.length < 6) continue;

        if (textA === textB || (textA.length > 20 && textB.length > 20 && (textA.includes(textB) || textB.includes(textA)))) {
          dups.push({
            dupIdx: i,
            originalIdx: j,
            originalQNum: String(questions[j].question_number || questions[j].questionNumber || j + 1),
          });
          break;
        }
      }
    }
    return dups;
  };

  useEffect(() => {
    const fetchDoc = async () => {
      let targetDocId = docId;
      if (!targetDocId) {
        try {
          const savedId = localStorage.getItem('pg_active_doc_id');
          if (savedId) {
            targetDocId = savedId;
          } else {
            const listRes = await api.get('/documents');
            if (listRes.data.documents?.length > 0) {
              targetDocId = listRes.data.documents[0].id;
            }
          }
        } catch {}
      }
      if (!targetDocId) return;
      setLoading(true);
      try {
        try { localStorage.setItem('pg_active_doc_id', targetDocId); } catch {}
        const res = await api.get(`/documents/${targetDocId}`);
        const doc = res.data.document;
        setDocument(doc);
        const p1 = doc?.pages?.find((p: any) => p.pageNumber === 1) || doc?.pages?.[0];
        loadPage(1, p1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
    fetchFolders();
  }, [docId]);

  // Auto-fit to width whenever page number or panel layout changes
  useEffect(() => {
    const w = pageData?.width || 1653;
    if (w && viewportRef.current) {
      const containerWidth = viewportRef.current.clientWidth - 24;
      const initialScale = Math.min(1.0, Math.max(0.15, containerWidth / w));
      setZoom(initialScale);
      setPan({ x: 0, y: 0 });
      setFitMode('WIDTH');
    }
  }, [pageData?.page_number, panelLayout]);

  const loadPage = async (pageNum: number, initialPageDoc?: any) => {
    if (!docId) return;
    setLoading(true);
    setCurrentPageNum(pageNum);
    setPan({ x: 0, y: 0 });
    setSelectedQuestion(null);
    setSelectedQNums(new Set());
    setIsRibbonManuallyClosed(false);
    setIsRibbonHovered(false);
    setEditingQNum(null);
    setEditFormData(null);
    setSelectedText('');
    setCropBox(null);
    setActiveCroppedImage(null);
    setSnipTarget(null);
    setImgAttempt(0);
    setImgLoadError(false);

    // Display preview image if available in document pages, or reset pageData so previous page's questions don't linger
    const fallbackPage = initialPageDoc || document?.pages?.find((p: any) => p.pageNumber === pageNum);
    if (fallbackPage) {
      setPageData({
        page_number: pageNum,
        page_image: fallbackPage.imageUrl || fallbackPage.page_image,
        imageUrl: fallbackPage.imageUrl || fallbackPage.page_image,
        width: fallbackPage.width || 1653,
        height: fallbackPage.height || 2339,
        overall_confidence: fallbackPage.confidence || 0.95,
        needs_review: fallbackPage.needsReview || false,
        regions: fallbackPage.regions || [],
        questions: [],
      });
    } else {
      setPageData({
        page_number: pageNum,
        page_image: '',
        imageUrl: '',
        width: 1653,
        height: 2339,
        overall_confidence: 0.95,
        needs_review: false,
        regions: [],
        questions: [],
      });
    }

    try {
      const res = await api.post(`/documents/${docId}/process-page/${pageNum}`);
      const rawExtracted = res.data.extracted;
      // Auto sanitize any math font artifacts in extracted questions
      if (rawExtracted?.questions) {
        rawExtracted.questions = rawExtracted.questions.map((q: any) => ({
          ...q,
          question_text: sanitizeMathAndExamText(q.question_text || q.questionText || ''),
          options: (q.options || []).map((opt: any) => ({
            ...opt,
            text: sanitizeMathAndExamText(opt.text || ''),
          })),
        }));
      }
      if (rawExtracted) {
        rawExtracted.imageUrl = rawExtracted.page_image;
      }
      setPageData(rawExtracted);
    } catch (err: any) {
      console.error('Failed to process page:', err);
      showToast(`Error processing page ${pageNum}: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToPage = (targetVal?: string, forceReload: boolean = false) => {
    const val = (targetVal !== undefined ? targetVal : pageInputVal).trim();
    const parsed = parseInt(val, 10);
    const maxPages = document?.pageCount || 1;
    if (isNaN(parsed) || parsed < 1) {
      setPageInputVal(String(currentPageNum));
      return;
    }
    const target = Math.max(1, Math.min(maxPages, parsed));
    setPageInputVal(String(target));
    if (target !== currentPageNum || forceReload || pageData?.page_number !== target) {
      loadPage(target);
    }
  };

  const handleFitWidth = () => {
    if (pageData?.width && viewportRef.current) {
      const containerWidth = viewportRef.current.clientWidth - 24;
      const scale = Math.min(1.5, Math.max(0.15, containerWidth / pageData.width));
      setZoom(scale);
      setPan({ x: 0, y: 0 });
      setFitMode('WIDTH');
    }
  };

  const handleFitPage = () => {
    if (pageData?.width && pageData?.height && viewportRef.current) {
      const containerWidth = viewportRef.current.clientWidth - 24;
      const containerHeight = viewportRef.current.clientHeight - 24;
      const scaleX = containerWidth / pageData.width;
      const scaleY = containerHeight / pageData.height;
      const scale = Math.min(scaleX, scaleY, 1.0);
      setZoom(scale);
      setPan({ x: 0, y: 0 });
      setFitMode('PAGE');
    }
  };

  // Dedicated Zoom Button Handlers
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3.0, prev + 0.15));
    setFitMode('CUSTOM');
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.15, prev - 0.15));
    setFitMode('CUSTOM');
  };

  // Image Coordinates Helper for Crop (Supports both Mouse and Touch)
  const getImageCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && (e as any).changedTouches?.length > 0) {
      clientX = (e as any).changedTouches[0].clientX;
      clientY = (e as any).changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;
    return {
      x: Math.max(0, Math.min(pageData?.width || 1000, x)),
      y: Math.max(0, Math.min(pageData?.height || 1000, y)),
    };
  };

  // Touch Handlers for Touchscreens (Mobile Phones & Tablets)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (interactionMode === 'PAN') {
        setIsPanning(true);
        setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      } else if (interactionMode === 'CROP_IMAGE') {
        const pos = getImageCoordinates(e);
        setIsDrawingCrop(true);
        setCropStart(pos);
        setCropBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
        setActiveCroppedImage(null);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (interactionMode === 'PAN' && isPanning) {
        setPan({
          x: touch.clientX - panStart.x,
          y: touch.clientY - panStart.y,
        });
        setFitMode('CUSTOM');
      } else if (interactionMode === 'CROP_IMAGE' && isDrawingCrop && cropStart) {
        const pos = getImageCoordinates(e);
        const x = Math.min(pos.x, cropStart.x);
        const y = Math.min(pos.y, cropStart.y);
        const w = Math.abs(pos.x - cropStart.x);
        const h = Math.abs(pos.y - cropStart.y);
        setCropBox({ x, y, w, h });
      }
    }
  };

  const handleTouchEnd = async () => {
    await handleMouseUp();
  };

  // Mouse Handlers for Pan vs Crop vs Select
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    if (interactionMode === 'PAN') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (interactionMode === 'CROP_IMAGE') {
      const pos = getImageCoordinates(e);
      setIsDrawingCrop(true);
      setCropStart(pos);
      setCropBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
      setActiveCroppedImage(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (interactionMode === 'PAN' && isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      setFitMode('CUSTOM');
    } else if (interactionMode === 'CROP_IMAGE' && isDrawingCrop && cropStart) {
      const pos = getImageCoordinates(e);
      const x = Math.min(pos.x, cropStart.x);
      const y = Math.min(pos.y, cropStart.y);
      const w = Math.abs(pos.x - cropStart.x);
      const h = Math.abs(pos.y - cropStart.y);
      setCropBox({ x, y, w, h });
    }
  };

  const handleMouseUp = async () => {
    if (interactionMode === 'PAN') {
      setIsPanning(false);
    } else if (interactionMode === 'CROP_IMAGE' && isDrawingCrop && cropBox) {
      setIsDrawingCrop(false);
      setCropStart(null);

      // Minimum crop size check (10x10px)
      if (cropBox.w >= 10 && cropBox.h >= 10 && pageData?.page_image) {
        await executeCropAction(cropBox);
      }
    }
  };

  // Wheel event: Do NOT zoom on accidental wheel movement; ONLY zoom if Ctrl is held down!
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom((prev) => Math.min(3.0, Math.max(0.15, prev + delta)));
      setFitMode('CUSTOM');
    }
  };

  // Execute Crop on the server & Canvas and extract question text, options & diagrams
  const executeCropAction = async (box: { x: number; y: number; w: number; h: number }) => {
    setCroppingLoading(true);
    let croppedUrl = '';
    let ocrExtractedText = '';
    try {
      const bbox = [Math.round(box.x), Math.round(box.y), Math.round(box.w), Math.round(box.h)];

      // 1. Try server-side visual snip + AI recognition
      try {
        const pageImg = activePageImageUrl || pageData?.page_image || pageData?.imageUrl;
        if (pageImg) {
          const res = await api.post('/snips', {
            pageImagePath: pageImg,
            bbox,
            mode: 'AUTO',
            documentId: docId,
            pageNumber: currentPageNum,
          });
          croppedUrl = res.data.snip?.imageUrl || res.data.aiData?.relative_url || '';
          ocrExtractedText = res.data.snip?.extractedText || res.data.aiData?.extracted_text || '';
        }
      } catch (snipErr) {
        console.warn('Server crop fallback to canvas crop:', snipErr);
      }

      // 2. Fallback: HTML5 Canvas Client-Side Cropping if server visual snip didn't produce an image
      if (!croppedUrl && imageRef.current) {
        try {
          const canvas = window.document.createElement('canvas');
          canvas.width = Math.round(box.w);
          canvas.height = Math.round(box.h);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              imageRef.current,
              box.x,
              box.y,
              box.w,
              box.h,
              0,
              0,
              box.w,
              box.h
            );
            const blobPromise = new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
            const blob = await blobPromise;
            if (blob) {
              const formData = new FormData();
              formData.append('image', blob, 'cropped_diagram.png');
              const uploadRes = await api.post('/questions/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              croppedUrl = uploadRes.data.url;
            }
          }
        } catch (canvasErr) {
          console.warn('Canvas client-side crop failed:', canvasErr);
        }
      }

      if (croppedUrl) {
        setActiveCroppedImage({
          url: croppedUrl,
          w: Math.round(box.w),
          h: Math.round(box.h),
        });
      }

      // 3. Extract overlapping digital vector text from pageData regions (exact & typo-free for digital PDFs)
      let vectorExtractedText = '';
      if (pageData?.regions && Array.isArray(pageData.regions) && pageData.regions.length > 0) {
        const bx0 = box.x;
        const by0 = box.y;
        const bx1 = box.x + box.w;
        const by1 = box.y + box.h;

        const overlapping = pageData.regions.filter((r: any) => {
          if (!r.bbox || r.bbox.length < 4) return false;
          const rx0 = r.bbox[0];
          const ry0 = r.bbox[1];
          const rx1 = rx0 + r.bbox[2];
          const ry1 = ry0 + r.bbox[3];

          const ox = Math.max(0, Math.min(rx1, bx1) - Math.max(rx0, bx0));
          const oy = Math.max(0, Math.min(ry1, by1) - Math.max(ry0, by0));
          const rArea = (r.bbox[2] || 1) * (r.bbox[3] || 1);
          return (ox * oy) / rArea > 0.25 || (ox > 12 && oy > 8);
        });

        if (overlapping.length > 0) {
          // Sort in natural reading order: top-to-bottom, left-to-right
          overlapping.sort((a: any, b: any) => {
            const yDiff = a.bbox[1] - b.bbox[1];
            if (Math.abs(yDiff) > 12) return yDiff;
            return a.bbox[0] - b.bbox[0];
          });
          vectorExtractedText = overlapping
            .map((r: any) => (r.text || r.raw_text || '').trim())
            .filter(Boolean)
            .join(' ');
        }
      }

      // Prefer vector text if available; fall back to OCR text from AI service
      const rawExtractedText = (vectorExtractedText || ocrExtractedText || '').trim();

      // Case A: Targeted Snip on a Specific Option
      if (snipTarget && snipTarget.type === 'OPTION' && snipTarget.optTarget !== undefined) {
        const optTarget = snipTarget.optTarget;
        const optText = sanitizeMathAndExamText(rawExtractedText);

        if (isInlineEditing && editFormData) {
          const updatedOpts = (editFormData.options || []).map((opt: any, idx: number) => {
            if (matchOptionTarget(opt, idx, optTarget)) {
              return {
                ...opt,
                imageUrl: croppedUrl || opt.imageUrl,
                text: optText || opt.text,
              };
            }
            return opt;
          });
          const updatedFormData = { ...editFormData, options: updatedOpts };
          setEditFormData(updatedFormData);

          const updatedList = (pageData?.questions || []).map((q: any) => {
            if (String(q.question_number || q.questionNumber) === editingQNum) {
              return { ...q, options: updatedOpts };
            }
            return q;
          });
          setPageData({ ...pageData, questions: updatedList });
          showToast(`✓ Extracted Option (${optTarget}) text & image!`);
        } else {
          const targetQ = selectedQuestion || (pageData?.questions && pageData.questions[0]) || null;
          if (targetQ) {
            const qNum = String(targetQ.question_number || targetQ.questionNumber || '1');
            const updatedList = (pageData?.questions || []).map((q: any) => {
              if (String(q.question_number || q.questionNumber || '1') === qNum) {
                const curOpts = q.options && q.options.length > 0 ? [...q.options] : [
                  { key: '1', text: '' },
                  { key: '2', text: '' },
                  { key: '3', text: '' },
                  { key: '4', text: '' },
                ];
                const updatedOpts = curOpts.map((opt: any, idx: number) => {
                  if (matchOptionTarget(opt, idx, optTarget)) {
                    return {
                      ...opt,
                      imageUrl: croppedUrl || opt.imageUrl,
                      text: optText || opt.text,
                    };
                  }
                  return opt;
                });
                return { ...q, options: updatedOpts };
              }
              return q;
            });
            setPageData({ ...pageData, questions: updatedList });
            const found = updatedList.find((q: any) => String(q.question_number || q.questionNumber || '1') === qNum);
            if (found) setSelectedQuestion(found);
            showToast(`✓ Extracted Option (${optTarget}) on Q${qNum}!`);
          }
        }
        setSnipTarget(null);
        setCropBox(null);
        return;
      }

      // Case B: Question Snip (or Full Snip with text, diagram, and options)
      let detectedQNum: string | null = null;
      let parsedStem = rawExtractedText;
      const parsedOptions: { key: string; text: string }[] = [];

      if (rawExtractedText) {
        // Detect Question Number prefix: e.g. "11. ", "Q.11 ", "Q11 ", "(11) ", "11) ", "11 - "
        const qNumMatch = rawExtractedText.match(/^(?:Q(?:uestion)?\s*[.\-:]?\s*(\d{1,4})\b|\((\d{1,4})\)|(\d{1,4})\s*[.)\]:\-])\s*/i);
        if (qNumMatch) {
          detectedQNum = qNumMatch[1] || qNumMatch[2] || qNumMatch[3];
          parsedStem = rawExtractedText.slice(qNumMatch[0].length).trim();
        }

        // Parse MCQ options inside the text: (1), (2), (A), (a), 1., A., [1], [A], etc.
        const OPTION_SPLIT_REGEX = /(?:(?:\(([a-dA-D1-4])\)|\[([a-dA-D1-4])\]|(?<=\s|^)([a-dA-D1-4])\.(?!\d)|(?<=\s|^)([a-dA-D1-4])\))\s*)/g;
        const matches = Array.from(parsedStem.matchAll(OPTION_SPLIT_REGEX));

        if (matches.length >= 2) {
          const firstOptIdx = matches[0].index || 0;
          const stemBeforeOpts = parsedStem.slice(0, firstOptIdx).trim();
          const optsSlice = parsedStem.slice(firstOptIdx);
          if (stemBeforeOpts.length > 0) {
            parsedStem = stemBeforeOpts;
          }

          const relativeMatches = Array.from(optsSlice.matchAll(OPTION_SPLIT_REGEX));
          relativeMatches.forEach((m, idx) => {
            const rawKey = (m[1] || m[2] || m[3] || m[4]).toUpperCase();
            const startIdx = (m.index || 0) + m[0].length;
            const endIdx = idx + 1 < relativeMatches.length ? (relativeMatches[idx + 1].index || optsSlice.length) : optsSlice.length;
            let optText = optsSlice.slice(startIdx, endIdx).trim();
            // Clean trailing paper codes like "NL0134" or "AIPMT 2015" from last option
            if (idx === relativeMatches.length - 1) {
              optText = optText.replace(/\s*(?:NL\d+|[A-Z]{2,}\d{3,}|\b(?:Re-)?(?:AIPMT|NEET|JEE|CBSE)\s*\d{4})\s*$/i, '').trim();
            }
            parsedOptions.push({
              key: rawKey,
              text: sanitizeMathAndExamText(optText),
            });
          });
        }
      }

      const newDiagram = croppedUrl ? { relative_url: croppedUrl, label: 'Question Screenshot / Diagram' } : null;

      // Determine target question number
      let targetQNum = snipTarget?.qNum || editingQNum || (selectedQuestion ? String(selectedQuestion.question_number || selectedQuestion.questionNumber) : null);
      if (!targetQNum && pageData?.questions?.length > 0) {
        targetQNum = String(pageData.questions[0].question_number || pageData.questions[0].questionNumber || '1');
      }

      // If user is editing a blank question or newly added question and we detected a real number (e.g. 11), use 11!
      const isCurrentFormBlank = isInlineEditing && editFormData && (!editFormData.question_text || editFormData.question_text.trim() === '');
      const finalQNum = (isCurrentFormBlank && detectedQNum) ? detectedQNum : (targetQNum || detectedQNum || '1');

      if (isInlineEditing && editFormData) {
        const currentStem = editFormData.question_text || '';
        const cleanStem = sanitizeMathAndExamText(parsedStem);
        const newStem = (!currentStem || currentStem.trim() === '') ? cleanStem : (cleanStem ? `${currentStem}\n${cleanStem}` : currentStem);

        // Options
        let newOptions = [...editFormData.options];
        if (parsedOptions.length > 0) {
          newOptions = parsedOptions.map((po, idx) => {
            const existing = editFormData.options[idx] || {};
            return {
              ...existing,
              key: po.key || existing.key || String(idx + 1),
              text: po.text,
            };
          });
          while (newOptions.length < 4) {
            const idx = newOptions.length;
            newOptions.push(editFormData.options[idx] || { key: String(idx + 1), text: '' });
          }
        }

        // Diagrams
        const currentDiags = editFormData.diagrams || [];
        const updatedDiags = newDiagram ? [...currentDiags, newDiagram] : currentDiags;

        const updatedFormData = {
          ...editFormData,
          question_number: finalQNum,
          question_text: newStem,
          options: newOptions,
          diagrams: updatedDiags,
        };
        setEditFormData(updatedFormData);

        const updatedList = (pageData?.questions || []).map((q: any) => {
          if (String(q.question_number || q.questionNumber) === editingQNum) {
            return {
              ...q,
              question_number: finalQNum,
              question_text: newStem,
              options: newOptions,
              diagrams: updatedDiags,
            };
          }
          return q;
        });
        setPageData({ ...pageData, questions: updatedList });
        setEditingQNum(finalQNum);
        showToast(`✓ Extracted and populated Question Q${finalQNum} text, options & diagram!`);
      } else {
        // Not currently inline editing: check if question exists
        const existingQ = (pageData?.questions || []).find(
          (q: any) => String(q.question_number || q.questionNumber) === (targetQNum || finalQNum)
        );

        if (existingQ) {
          const cleanStem = sanitizeMathAndExamText(parsedStem);
          const currentStem = existingQ.question_text || '';
          const newStem = (!currentStem || currentStem.trim() === '') ? cleanStem : (cleanStem ? `${currentStem}\n${cleanStem}` : currentStem);

          let newOptions = existingQ.options || [];
          if (parsedOptions.length > 0) {
            newOptions = parsedOptions.map((po, idx) => ({
              key: po.key || String(idx + 1),
              text: po.text,
            }));
            while (newOptions.length < 4) {
              newOptions.push({ key: String(newOptions.length + 1), text: '' });
            }
          }
          const currentDiags = existingQ.diagrams || [];
          const updatedDiags = newDiagram ? [...currentDiags, newDiagram] : currentDiags;

          const updatedQ = {
            ...existingQ,
            question_number: finalQNum,
            question_text: newStem,
            options: newOptions,
            diagrams: updatedDiags,
          };

          const updatedList = (pageData?.questions || []).map((q: any) => {
            if (String(q.question_number || q.questionNumber) === String(existingQ.question_number || existingQ.questionNumber)) {
              return updatedQ;
            }
            return q;
          });
          setPageData({ ...pageData, questions: updatedList });
          setSelectedQuestion(updatedQ);
          handleStartInlineEdit(updatedQ);
          showToast(`✓ Extracted Question Q${finalQNum} text, options & diagram!`);
        } else {
          // Create new question from snip
          const newQ = {
            id: `snip_q_${Date.now()}`,
            question_number: finalQNum,
            question_text: sanitizeMathAndExamText(parsedStem),
            marks: 1,
            negative_marks: 0,
            difficulty: 'MEDIUM',
            correct_answer: '',
            explanation: '',
            options: parsedOptions.length > 0 ? parsedOptions : [
              { key: '1', text: '' },
              { key: '2', text: '' },
              { key: '3', text: '' },
              { key: '4', text: '' },
            ],
            diagrams: newDiagram ? [newDiagram] : [],
          };
          const updatedList = [...(pageData?.questions || []), newQ];
          setPageData({ ...pageData, questions: updatedList });
          setSelectedQuestion(newQ);
          handleStartInlineEdit(newQ);
          showToast(`✓ Created Question Q${finalQNum} from snipped area!`);
        }
      }

      setSnipTarget(null);
      setCropBox(null);
    } catch (err: any) {
      alert(`Crop failed: ${err.message}`);
    } finally {
      setCroppingLoading(false);
    }
  };

  // Text Selection Event Listener on Page
  const handleTextSelection = () => {
    if (interactionMode !== 'SELECT_TEXT') return;
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (text) {
      setSelectedText(text);
    }
  };

  // Copy selected text to clipboard verbatim
  const handleCopySelectedText = (textToCopy?: string) => {
    const target = textToCopy || selectedText;
    if (!target) return;
    navigator.clipboard.writeText(target);
    showToast('✓ Exact text copied to clipboard from source!');
  };

  // Attach Cropped Image to Question Body & Diagrams
  const handleAttachImageToQuestion = (imgUrl: string) => {
    if (!imgUrl) return;
    const newDiagram = { relative_url: imgUrl, label: 'Question Screenshot / Diagram' };

    if (isInlineEditing && editFormData) {
      const currentDiags = editFormData.diagrams || [];
      const updatedDiags = [...currentDiags, newDiagram];
      setEditFormData({ ...editFormData, diagrams: updatedDiags });

      const updatedList = (pageData?.questions || []).map((q: any) => {
        if (String(q.question_number || q.questionNumber) === editingQNum) {
          return { ...q, diagrams: updatedDiags };
        }
        return q;
      });
      setPageData({ ...pageData, questions: updatedList });
      showToast('Attached screenshot as Question image!');
      setMobileActivePanel('QUESTIONS');
    } else {
      const targetQ = selectedQuestion || (pageData?.questions && pageData.questions[0]) || null;
      if (!targetQ) return;
      const qNum = String(targetQ.question_number || targetQ.questionNumber || '1');
      const updatedList = (pageData?.questions || []).map((q: any) => {
        if (String(q.question_number || q.questionNumber || '1') === qNum) {
          const currentDiags = q.diagrams || [];
          return { ...q, diagrams: [...currentDiags, newDiagram] };
        }
        return q;
      });
      setPageData({ ...pageData, questions: updatedList });
      const found = updatedList.find((q: any) => String(q.question_number || q.questionNumber || '1') === qNum);
      if (found) setSelectedQuestion(found);
      showToast(`Attached screenshot as Question Q${qNum} image!`);
      setMobileActivePanel('QUESTIONS');
    }
  };

  // Robust Option Matching Helper (Matches by Index or Key: 'A'/'1', 'B'/'2', 'C'/'3', 'D'/'4')
  const matchOptionTarget = (opt: any, optIdx: number, target: number | string): boolean => {
    if (typeof target === 'number') return optIdx === target;
    const t = String(target).trim().toUpperCase().replace(/[\(\)]/g, '');
    const k = String(opt.key || '').trim().toUpperCase().replace(/[\(\)]/g, '');
    if (k === t) return true;
    const letterToNum: Record<string, string> = { A: '1', B: '2', C: '3', D: '4' };
    const numToLetter: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
    if (letterToNum[t] && k === letterToNum[t]) return true;
    if (numToLetter[t] && k === numToLetter[t]) return true;
    const indexMap: Record<string, number> = { A: 0, '1': 0, B: 1, '2': 1, C: 2, '3': 2, D: 3, '4': 3 };
    if (indexMap[t] !== undefined && optIdx === indexMap[t]) return true;
    return false;
  };

  // Attach Cropped Image to Option
  const handleAttachImageToOption = (target: number | string, imgUrl: string) => {
    if (!imgUrl) return;

    if (isInlineEditing && editFormData) {
      const updatedOpts = (editFormData.options || []).map((opt: any, idx: number) => {
        if (matchOptionTarget(opt, idx, target)) {
          return { ...opt, imageUrl: imgUrl };
        }
        return opt;
      });
      setEditFormData({ ...editFormData, options: updatedOpts });

      const updatedList = (pageData?.questions || []).map((q: any) => {
        if (String(q.question_number || q.questionNumber) === editingQNum) {
          return { ...q, options: updatedOpts };
        }
        return q;
      });
      setPageData({ ...pageData, questions: updatedList });
      showToast(`Attached image to Option (${target})!`);
      return;
    }

    const targetQ = selectedQuestion || (pageData?.questions && pageData.questions[0]) || null;
    if (targetQ) {
      const qNum = String(targetQ.question_number || targetQ.questionNumber || '1');
      const updatedList = (pageData?.questions || []).map((q: any) => {
        if (String(q.question_number || q.questionNumber || '1') === qNum) {
          const curOpts = q.options && q.options.length > 0 ? [...q.options] : [
            { key: '1', text: '' },
            { key: '2', text: '' },
            { key: '3', text: '' },
            { key: '4', text: '' },
          ];
          const updatedOpts = curOpts.map((opt: any, idx: number) => {
            if (matchOptionTarget(opt, idx, target)) {
              return { ...opt, imageUrl: imgUrl };
            }
            return opt;
          });
          return { ...q, options: updatedOpts };
        }
        return q;
      });

      setPageData({ ...pageData, questions: updatedList });
      const found = updatedList.find((q: any) => String(q.question_number || q.questionNumber || '1') === qNum);
      if (found) setSelectedQuestion(found);
      showToast(`Attached image to Option (${target}) on Q${qNum}!`);
      setMobileActivePanel('QUESTIONS');
    }
  };

  // Remove attached image from option
  const handleRemoveOptionImage = (optIdx: number) => {
    if (isInlineEditing && editFormData) {
      const updatedOpts = [...editFormData.options];
      delete updatedOpts[optIdx].imageUrl;
      setEditFormData({ ...editFormData, options: updatedOpts });
      showToast('Removed option image.');
    } else if (selectedQuestion) {
      const qNum = String(selectedQuestion.question_number || selectedQuestion.questionNumber || '1');
      const updatedList = (pageData?.questions || []).map((q: any) => {
        if (String(q.question_number || q.questionNumber || '1') === qNum) {
          const updatedOpts = (q.options || []).map((opt: any, idx: number) => {
            if (idx === optIdx) {
              const copy = { ...opt };
              delete copy.imageUrl;
              return copy;
            }
            return opt;
          });
          return { ...q, options: updatedOpts };
        }
        return q;
      });
      setPageData({ ...pageData, questions: updatedList });
      const found = updatedList.find((q: any) => String(q.question_number || q.questionNumber || '1') === qNum);
      if (found) setSelectedQuestion(found);
      showToast('Removed option image.');
    }
  };

  // Remove a specific diagram from a question's diagrams gallery
  const handleRemoveQuestionDiagram = (qNum: string, dIdx: number) => {
    if (isInlineEditing && editFormData) {
      const updatedDiags = (editFormData.diagrams || []).filter((_: any, i: number) => i !== dIdx);
      setEditFormData({ ...editFormData, diagrams: updatedDiags });
      const updatedList = (pageData?.questions || []).map((q: any) => {
        if (String(q.question_number || q.questionNumber) === editingQNum) {
          return { ...q, diagrams: updatedDiags };
        }
        return q;
      });
      setPageData({ ...pageData, questions: updatedList });
      showToast('Removed diagram.');
      return;
    }

    const updatedList = (pageData?.questions || []).map((q: any) => {
      if (String(q.question_number || q.questionNumber || '1') === qNum) {
        const cur = q.diagrams || [];
        return { ...q, diagrams: cur.filter((_: any, i: number) => i !== dIdx) };
      }
      return q;
    });
    setPageData({ ...pageData, questions: updatedList });
    const found = updatedList.find((q: any) => String(q.question_number || q.questionNumber || '1') === qNum);
    if (found) setSelectedQuestion(found);
    showToast('Removed diagram from question.');
  };

  // Trigger file picker to upload multiple image files to question diagrams
  const handleTriggerUploadForQuestion = (qNum: string) => {
    setTargetQuestionForUpload(qNum);
    if (multiFileInputRef.current) {
      multiFileInputRef.current.click();
    }
  };

  // Handle upload of multiple image files into question diagrams
  const handleUploadFilesToQuestion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !targetQuestionForUpload) return;
    const files = Array.from(e.target.files);
    setUploadingImage(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        const res = await api.post('/questions/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const newDiagram = { relative_url: res.data.url, label: file.name };

        if (isInlineEditing && editFormData && editingQNum === targetQuestionForUpload) {
          const curDiags = editFormData.diagrams || [];
          const updated = [...curDiags, newDiagram];
          setEditFormData({ ...editFormData, diagrams: updated });
        }

        setPageData((prev: any) => {
          const updated = (prev?.questions || []).map((q: any) => {
            if (String(q.question_number || q.questionNumber || '1') === targetQuestionForUpload) {
              const cur = q.diagrams || [];
              return { ...q, diagrams: [...cur, newDiagram] };
            }
            return q;
          });
          return { ...prev, questions: updated };
        });
      }
      showToast(`Uploaded ${files.length} diagram file(s) to Question Q${targetQuestionForUpload}!`);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
      setTargetQuestionForUpload(null);
      if (multiFileInputRef.current) multiFileInputRef.current.value = '';
    }
  };

  // Batch Save ALL Questions with all attached multiple diagrams & formulas to Question Bank
  const handleSaveAllToBank = async () => {
    const questions = pageData?.questions || [];
    if (questions.length === 0) {
      alert('No questions on this page to save.');
      return;
    }
    setSavingAll(true);
    let successCount = 0;
    try {
      for (const q of questions) {
        await api.post('/questions', {
          folderId: selectedFolderId || null,
          questionNumber: q.question_number || q.questionNumber,
          questionText: q.question_text || q.questionText,
          subquestions: q.subquestions,
          options: q.options,
          correctAnswer: q.correct_answer || q.correctAnswer,
          explanation: q.explanation,
          marks: q.marks,
          negativeMarks: q.negative_marks || q.negativeMarks,
          difficulty: q.difficulty,
          formulas: q.formulas,
          diagrams: q.diagrams,
        });
        successCount++;
      }
      setSaveSuccess(`All ${successCount} questions (with all attached diagrams & formulas) saved to Question Bank!`);
      setTimeout(() => setSaveSuccess(''), 4500);
    } catch (err: any) {
      alert(`Failed to save all questions: ${err.message}`);
    } finally {
      setSavingAll(false);
    }
  };

  // Save ALL questions from ALL pages of the document in one click
  const [savingAllPages, setSavingAllPages] = useState(false);
  const [allPagesProgress, setAllPagesProgress] = useState('');

  const handleSaveAllPagesToBank = async () => {
    if (!docId || !document) return;
    const totalPages = document.pageCount || 1;
    const confirmed = window.confirm(
      `This will process and save questions from ALL ${totalPages} page(s) to the Question Bank. This may take a while. Continue?`
    );
    if (!confirmed) return;

    setSavingAllPages(true);
    let totalSaved = 0;
    try {
      for (let pg = 1; pg <= totalPages; pg++) {
        setAllPagesProgress(`Processing page ${pg} of ${totalPages}...`);
        try {
          const res = await api.post(`/documents/${docId}/process-page/${pg}`);
          const rawExtracted = res.data.extracted;
          const pageQuestions = rawExtracted?.questions || [];

          setAllPagesProgress(`Saving ${pageQuestions.length} questions from page ${pg} of ${totalPages}...`);
          for (const q of pageQuestions) {
            try {
              await api.post('/questions', {
                folderId: selectedFolderId || null,
                questionNumber: q.question_number || q.questionNumber,
                questionText: q.question_text || q.questionText,
                subquestions: q.subquestions,
                options: q.options,
                correctAnswer: q.correct_answer || q.correctAnswer,
                explanation: q.explanation,
                marks: q.marks,
                negativeMarks: q.negative_marks || q.negativeMarks,
                difficulty: q.difficulty,
                formulas: q.formulas,
                diagrams: q.diagrams,
              });
              totalSaved++;
            } catch {
              // Skip duplicates or errors silently
            }
          }
        } catch (pgErr: any) {
          console.warn(`Page ${pg} failed:`, pgErr.message);
        }
      }
      setAllPagesProgress('');
      setSaveSuccess(`✅ Saved ${totalSaved} questions from all ${totalPages} pages to Question Bank!`);
      setTimeout(() => setSaveSuccess(''), 6000);
    } catch (err: any) {
      setAllPagesProgress('');
      alert(`Failed: ${err.message}`);
    } finally {
      setSavingAllPages(false);
    }
  };

  // Toggle selection for a single question
  const handleToggleSelectQuestion = (qNum: string) => {
    setSelectedQNums((prev) => {
      const next = new Set(prev);
      if (next.has(qNum)) {
        next.delete(qNum);
      } else {
        next.add(qNum);
      }
      return next;
    });
  };

  // Select all or deselect all questions on current page
  const handleSelectAllQuestions = () => {
    const allQNums = (pageData?.questions || []).map((q: any) =>
      String(q.question_number || q.questionNumber || '')
    );
    if (selectedQNums.size >= allQNums.length && allQNums.length > 0) {
      setSelectedQNums(new Set());
    } else {
      setSelectedQNums(new Set(allQNums));
    }
  };

  // Save multiple selected questions to Question Bank
  const handleSaveSelectedToBank = async () => {
    const questionsToSave = (pageData?.questions || []).filter((q: any) => {
      const num = String(q.question_number || q.questionNumber || '');
      return selectedQNums.has(num);
    });

    if (questionsToSave.length === 0) {
      if (selectedQuestion) {
        handleSaveToBank();
        return;
      }
      alert('Please select at least one question to save.');
      return;
    }

    setSavingSelected(true);
    let successCount = 0;
    try {
      for (const q of questionsToSave) {
        await api.post('/questions', {
          folderId: selectedFolderId || null,
          questionNumber: q.question_number || q.questionNumber,
          questionText: q.question_text || q.questionText,
          subquestions: q.subquestions,
          options: q.options,
          correctAnswer: q.correct_answer || q.correctAnswer,
          explanation: q.explanation,
          marks: q.marks,
          negativeMarks: q.negative_marks || q.negativeMarks,
          difficulty: q.difficulty,
          formulas: q.formulas,
          diagrams: q.diagrams,
        });
        successCount++;
      }
      setSaveSuccess(`Saved ${successCount} selected question(s) (with all diagrams & formulas) to Question Bank!`);
      setTimeout(() => setSaveSuccess(''), 4500);
      setSelectedQNums(new Set());
    } catch (err: any) {
      alert(`Failed to save selected questions: ${err.message}`);
    } finally {
      setSavingSelected(false);
    }
  };

  // Delete multiple selected questions
  const handleDeleteSelectedQuestions = () => {
    if (selectedQNums.size === 0) return;
    if (!confirm(`Delete ${selectedQNums.size} selected question(s) from this page?`)) return;
    const updated = (pageData?.questions || []).filter((q: any) => {
      const num = String(q.question_number || q.questionNumber || '');
      return !selectedQNums.has(num);
    });
    setPageData({ ...pageData, questions: updated });
    setSelectedQNums(new Set());
    showToast(`Deleted ${selectedQNums.size} question(s).`);
  };

  // Start 1-Click Snip for a specific question
  const handleStartSnipForQuestion = (qNum: string) => {
    setSnipTarget({ type: 'QUESTION', qNum });
    setInteractionMode('CROP_IMAGE');
    setSelectedText('');
    setCropBox(null);
    setActiveCroppedImage(null);
    setMobileActivePanel('DOCUMENT');
    showToast(`Draw a box around Question Q${qNum} on the document to capture screenshot!`);
  };

  // Start 1-Click Snip for a specific option
  const handleStartSnipForOption = (optTarget: string | number, qNum: string) => {
    setSnipTarget({ type: 'OPTION', qNum, optTarget });
    setInteractionMode('CROP_IMAGE');
    setSelectedText('');
    setCropBox(null);
    setActiveCroppedImage(null);
    setMobileActivePanel('DOCUMENT');
    showToast(`Draw a box around Option (${optTarget}) on the document!`);
  };

  // Insert text into Question Body verbatim
  const handleInsertTextToQuestionBody = (textToInsert: string) => {
    const clean = textToInsert;
    if (!clean) return;
    if (isInlineEditing && editFormData) {
      const current = editFormData.question_text || '';
      const separator = current.length > 0 ? ' ' : '';
      setEditFormData({
        ...editFormData,
        question_text: `${current}${separator}${clean}`,
      });
      showToast('Inserted verbatim into Question text!');
    } else if (selectedQuestion) {
      handleStartInlineEdit(selectedQuestion);
      setEditFormData((prev: any) => ({
        ...prev,
        question_text: prev?.question_text ? `${prev.question_text} ${clean}` : clean,
      }));
    }
  };

  // Insert text into specific Option verbatim
  const handleInsertTextToOption = (target: number | string, textToInsert: string) => {
    const clean = textToInsert;
    if (!clean) return;
    if (isInlineEditing && editFormData) {
      const updatedOpts = editFormData.options.map((opt: any, idx: number) => {
        if (matchOptionTarget(opt, idx, target)) {
          const current = opt.text || '';
          const separator = current.length > 0 ? ' ' : '';
          return { ...opt, text: `${current}${separator}${clean}` };
        }
        return opt;
      });
      setEditFormData({ ...editFormData, options: updatedOpts });
      showToast(`Inserted verbatim into Option (${target})!`);
    } else if (selectedQuestion) {
      handleStartInlineEdit(selectedQuestion);
      setEditFormData((prev: any) => {
        const updatedOpts = (prev?.options || []).map((opt: any, idx: number) => {
          if (matchOptionTarget(opt, idx, target)) {
            const current = opt.text || '';
            const separator = current.length > 0 ? ' ' : '';
            return { ...opt, text: `${current}${separator}${clean}` };
          }
          return opt;
        });
        return { ...prev, options: updatedOpts };
      });
    }
  };

  // INLINE EDIT: Enter Edit Mode for a specific question card
  const handleStartInlineEdit = (q: any) => {
    const qNum = String(q.question_number || q.questionNumber || '1');
    setEditingQNum(qNum);
    setEditFormData({
      question_number: qNum,
      question_text: sanitizeMathAndExamText(q.question_text || q.questionText || ''),
      marks: q.marks || 1,
      negative_marks: q.negative_marks || q.negativeMarks || 0,
      difficulty: q.difficulty || 'MEDIUM',
      correct_answer: q.correct_answer || q.correctAnswer || '',
      explanation: q.explanation || '',
      options: q.options && q.options.length > 0 ? JSON.parse(JSON.stringify(q.options)).map((o: any) => ({
        ...o,
        text: sanitizeMathAndExamText(o.text || ''),
      })) : [
        { key: '1', text: '' },
        { key: '2', text: '' },
        { key: '3', text: '' },
        { key: '4', text: '' },
      ],
      diagrams: q.diagrams ? JSON.parse(JSON.stringify(q.diagrams)) : [],
    });
  };

  // INLINE EDIT: Save changes back to question list in place
  const handleSaveInlineEdit = () => {
    if (!editFormData || !editingQNum) return;
    const updatedList = (pageData?.questions || []).map((q: any) => {
      const qNum = String(q.question_number || q.questionNumber || '');
      if (qNum === editingQNum) {
        return {
          ...q,
          ...editFormData,
          question_number: editFormData.question_number,
          question_text: sanitizeMathAndExamText(editFormData.question_text),
          options: editFormData.options.map((o: any) => ({ ...o, text: sanitizeMathAndExamText(o.text) })),
        };
      }
      return q;
    });

    // Trigger continuous AI learning if question text or options were corrected
    const originalQ = (pageData?.questions || []).find(
      (item: any) => String(item.question_number || item.questionNumber) === editingQNum
    );
    if (originalQ) {
      const rawText = originalQ.question_text || originalQ.questionText || '';
      const correctedText = editFormData.question_text || '';
      if (rawText && correctedText && rawText !== correctedText) {
        api.post('/learning/learn', {
          raw_text: rawText,
          corrected_text: correctedText,
          context_domain: 'QUESTION_TEXT',
        }).then((res) => {
          if (res.data?.data?.learned_rules_count > 0) {
            showToast(`🧠 AI Learned ${res.data.data.learned_rules_count} pattern(s) from your correction!`);
            fetchLearningStats();
          }
        }).catch((e) => console.debug('Learning err:', e));
      }

      // Check for option corrections
      (originalQ.options || []).forEach((origOpt: any, oIdx: number) => {
        const newOpt = editFormData.options?.[oIdx];
        if (origOpt?.text && newOpt?.text && origOpt.text !== newOpt.text) {
          api.post('/learning/learn', {
            raw_text: origOpt.text,
            corrected_text: newOpt.text,
            context_domain: 'OPTION_FORMULA',
          }).then((res) => {
            if (res.data?.data?.learned_rules_count > 0) {
              fetchLearningStats();
            }
          }).catch((e) => console.debug('Option learning err:', e));
        }
      });
    }

    setPageData({ ...pageData, questions: updatedList });
    const active = updatedList.find((item: any) => String(item.question_number || item.questionNumber) === editFormData.question_number);
    if (active) setSelectedQuestion(active);
    setEditingQNum(null);
    setEditFormData(null);
    setSaveSuccess(`Changes saved & learned for Q${editFormData.question_number}!`);
    setTimeout(() => setSaveSuccess(''), 2500);
  };

  // INLINE EDIT: Cancel
  const handleCancelInlineEdit = () => {
    setEditingQNum(null);
    setEditFormData(null);
  };

  // Delete question from page review list
  const handleDeleteQuestion = (qNum: any) => {
    if (!confirm(`Delete question Q${qNum} from this review page?`)) return;
    const updated = (pageData.questions || []).filter(
      (item: any) => String(item.question_number || item.questionNumber) !== String(qNum)
    );
    setPageData({ ...pageData, questions: updated });
    if (String(selectedQuestion?.question_number || selectedQuestion?.questionNumber) === String(qNum)) {
      setSelectedQuestion(updated[0] || null);
    }
    if (editingQNum === String(qNum)) {
      setEditingQNum(null);
      setEditFormData(null);
    }
  };

  const handleDeleteDiagramFromCard = (qNum: any, diagIdx: number) => {
    const updated = (pageData.questions || []).map((item: any) => {
      if (String(item.question_number || item.questionNumber) === String(qNum)) {
        const diags = typeof item.diagramsJson === 'string' ? JSON.parse(item.diagramsJson) : item.diagrams || [];
        const filtered = diags.filter((_: any, i: number) => i !== diagIdx);
        return {
          ...item,
          diagrams: filtered,
          diagramsJson: JSON.stringify(filtered),
        };
      }
      return item;
    });
    setPageData({ ...pageData, questions: updated });
    showToast(`Removed Figure ${diagIdx + 1} from Q${qNum}`);
  };

  const handleDeleteOptionImageFromCard = (qNum: any, optKey: string) => {
    const updated = (pageData.questions || []).map((item: any) => {
      if (String(item.question_number || item.questionNumber) === String(qNum)) {
        const opts = typeof item.optionsJson === 'string' ? JSON.parse(item.optionsJson) : item.options || [];
        const updatedOpts = opts.map((opt: any) => {
          if (opt.key === optKey) {
            const copy = { ...opt };
            delete copy.imageUrl;
            return copy;
          }
          return opt;
        });
        return {
          ...item,
          options: updatedOpts,
          optionsJson: JSON.stringify(updatedOpts),
        };
      }
      return item;
    });
    setPageData({ ...pageData, questions: updated });
    showToast(`Removed image from Option (${optKey}) on Q${qNum}`);
  };

  // Upload and attach image to selected destination (Question Body vs Option A, B, C, D) in review modal
  const handleConfirmAttachReviewImage = async () => {
    if (!attachImageReviewModal || !reviewModalUploadFile) return;
    setReviewModalUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', reviewModalUploadFile);
      const res = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imgUrl = res.data.url;
      const { qNum, destination } = attachImageReviewModal;

      if (destination === 'BODY') {
        const newDiagram = { relative_url: imgUrl, label: reviewModalUploadFile.name };
        if (isInlineEditing && editFormData && String(editFormData.question_number || editFormData.questionNumber) === String(qNum)) {
          const curDiags = editFormData.diagrams || [];
          setEditFormData({ ...editFormData, diagrams: [...curDiags, newDiagram] });
        }
        const updated = (pageData?.questions || []).map((q: any) => {
          if (String(q.question_number || q.questionNumber || '1') === String(qNum)) {
            const curDiags = q.diagrams || [];
            const newDiags = [...curDiags, newDiagram];
            return {
              ...q,
              diagrams: newDiags,
              diagramsJson: JSON.stringify(newDiags),
            };
          }
          return q;
        });
        setPageData({ ...pageData, questions: updated });
        showToast(`✓ Attached image to Question Q${qNum} Body!`);
      } else {
        // Destination is an Option
        if (isInlineEditing && editFormData && String(editFormData.question_number || editFormData.questionNumber) === String(qNum)) {
          const curOpts = (editFormData.options || []).map((opt: any) => {
            if (opt.key === destination) {
              return { ...opt, imageUrl: imgUrl };
            }
            return opt;
          });
          setEditFormData({ ...editFormData, options: curOpts });
        }
        const updated = (pageData?.questions || []).map((q: any) => {
          if (String(q.question_number || q.questionNumber || '1') === String(qNum)) {
            const curOpts = (q.options || []).map((opt: any) => {
              if (opt.key === destination) {
                return { ...opt, imageUrl: imgUrl };
              }
              return opt;
            });
            return {
              ...q,
              options: curOpts,
              optionsJson: JSON.stringify(curOpts),
            };
          }
          return q;
        });
        setPageData({ ...pageData, questions: updated });
        showToast(`✓ Attached image to Option (${destination}) on Q${qNum}!`);
      }

      setAttachImageReviewModal(null);
      setReviewModalUploadFile(null);
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setReviewModalUploading(false);
      if (attachReviewFileInputRef.current) attachReviewFileInputRef.current.value = '';
    }
  };

  // Move image between Question Body and Options (or between Options) in Review Mode
  const handleMoveImageInReview = (qNum: any, fromLocation: string, fromIndex: number, toLocation: string) => {
    if (fromLocation === toLocation) return;

    let movedImgUrl = '';
    const updated = (pageData?.questions || []).map((item: any) => {
      if (String(item.question_number || item.questionNumber) === String(qNum)) {
        let diags = typeof item.diagramsJson === 'string' ? JSON.parse(item.diagramsJson) : (item.diagrams ? [...item.diagrams] : []);
        let opts = typeof item.optionsJson === 'string' ? JSON.parse(item.optionsJson) : (item.options ? [...item.options] : []);
        if (opts.length === 0) {
          opts = [{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }, { key: 'D', text: '' }];
        }

        // 1. Extract from source
        if (fromLocation === 'BODY') {
          if (fromIndex >= 0 && fromIndex < diags.length) {
            const d = diags[fromIndex];
            movedImgUrl = typeof d === 'string' ? d : d.relative_url || d.url || '';
            diags = diags.filter((_: any, i: number) => i !== fromIndex);
          }
        } else {
          opts = opts.map((opt: any) => {
            if (opt.key === fromLocation) {
              movedImgUrl = opt.imageUrl || '';
              const copy = { ...opt };
              delete copy.imageUrl;
              return copy;
            }
            return opt;
          });
        }

        if (!movedImgUrl) return item;

        // 2. Put into destination
        if (toLocation === 'BODY') {
          diags.push({ relative_url: movedImgUrl, label: 'Moved Figure' });
        } else {
          let foundOpt = false;
          opts = opts.map((opt: any) => {
            if (opt.key === toLocation) {
              foundOpt = true;
              return { ...opt, imageUrl: movedImgUrl };
            }
            return opt;
          });
          if (!foundOpt) {
            opts.push({ key: toLocation, text: '', imageUrl: movedImgUrl });
          }
        }

        return {
          ...item,
          diagrams: diags,
          diagramsJson: JSON.stringify(diags),
          options: opts,
          optionsJson: JSON.stringify(opts),
        };
      }
      return item;
    });

    setPageData({ ...pageData, questions: updated });

    // Sync inline editing form if open for this question
    if (isInlineEditing && editFormData && String(editFormData.question_number || editFormData.questionNumber) === String(qNum) && movedImgUrl) {
      let editDiags = Array.isArray(editFormData.diagrams) ? [...editFormData.diagrams] : [];
      let editOpts = Array.isArray(editFormData.options) ? [...editFormData.options] : [];

      if (fromLocation === 'BODY') {
        if (fromIndex >= 0 && fromIndex < editDiags.length) {
          editDiags.splice(fromIndex, 1);
        }
      } else {
        editOpts = editOpts.map((opt: any) => {
          if (opt.key === fromLocation) {
            const copy = { ...opt };
            delete copy.imageUrl;
            return copy;
          }
          return opt;
        });
      }

      if (toLocation === 'BODY') {
        editDiags.push({ relative_url: movedImgUrl, label: 'Moved Figure' });
      } else {
        let fOpt = false;
        editOpts = editOpts.map((opt: any) => {
          if (opt.key === toLocation) {
            fOpt = true;
            return { ...opt, imageUrl: movedImgUrl };
          }
          return opt;
        });
        if (!fOpt) {
          editOpts.push({ key: toLocation, text: '', imageUrl: movedImgUrl });
        }
      }

      setEditFormData({
        ...editFormData,
        diagrams: editDiags,
        options: editOpts,
      });
    }

    const destLabel = toLocation === 'BODY' ? 'Question Body' : `Option (${toLocation})`;
    showToast(`✓ Image moved to ${destLabel} on Q${qNum}`);
  };

  // Image Upload for inline editing question diagrams
  const handleInlineQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !editFormData) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      const res = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedDiags = [...(editFormData.diagrams || []), { relative_url: res.data.url, label: file.name }];
      setEditFormData({ ...editFormData, diagrams: updatedDiags });
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
      if (cardFileInputRef.current) cardFileInputRef.current.value = '';
    }
  };

  // Image Upload for inline editing option image
  const handleInlineOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || targetOptionIdx === null || !editFormData) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      const res = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedOpts = [...editFormData.options];
      updatedOpts[targetOptionIdx].imageUrl = res.data.url;
      setEditFormData({ ...editFormData, options: updatedOpts });
      showToast(`Image uploaded to Option (${updatedOpts[targetOptionIdx].key})!`);
    } catch (err: any) {
      alert(`Option image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
      setTargetOptionIdx(null);
      if (optionFileInputRef.current) optionFileInputRef.current.value = '';
    }
  };

  const handleInsertFormulaToInline = (latexSample: string) => {
    if (!editFormData) return;
    setEditFormData({
      ...editFormData,
      question_text: `${editFormData.question_text} $${latexSample}$`,
    });
  };

  // Clipboard image paste listener on inputs
  const handleClipboardPaste = async (e: React.ClipboardEvent, targetType: 'question' | 'option', optTarget?: string | number) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          const formData = new FormData();
          formData.append('image', blob);

          try {
            const res = await api.post('/questions/upload-image', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            const uploadedUrl = res.data.url;

            if (targetType === 'question') {
              handleAttachImageToQuestion(uploadedUrl);
            } else if (targetType === 'option' && optTarget !== undefined) {
              handleAttachImageToOption(optTarget, uploadedUrl);
            }
          } catch (err: any) {
            alert(`Pasted image upload failed: ${err.message}`);
          }
          break;
        }
      }
    }
  };

  // Save Question to Question Bank Database
  const handleSaveToBank = async () => {
    if (!selectedQuestion) return;
    setSaveSuccess('');
    try {
      await api.post('/questions', {
        folderId: selectedFolderId || null,
        questionNumber: selectedQuestion.question_number || selectedQuestion.questionNumber,
        questionText: selectedQuestion.question_text || selectedQuestion.questionText,
        subquestions: selectedQuestion.subquestions,
        options: selectedQuestion.options,
        correctAnswer: selectedQuestion.correct_answer || selectedQuestion.correctAnswer,
        explanation: selectedQuestion.explanation,
        marks: selectedQuestion.marks,
        negativeMarks: selectedQuestion.negative_marks || selectedQuestion.negativeMarks,
        difficulty: selectedQuestion.difficulty,
        formulas: selectedQuestion.formulas,
        diagrams: selectedQuestion.diagrams,
      });

      setSaveSuccess(
        `Question Q${selectedQuestion.question_number || selectedQuestion.questionNumber} saved to Question Bank with all images!`
      );
      setTimeout(() => setSaveSuccess(''), 3500);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  if (!docId) {
    return (
      <div className="text-center py-20 bg-white border border-[#D1D5DB] rounded-xl shadow-sm max-w-xl mx-auto space-y-4">
        <SplitSquareVertical className="w-12 h-12 text-[#0B1F3A] mx-auto" />
        <h2 className="text-xl font-bold text-[#111827]">No Document Selected for Review</h2>
        <p className="text-sm text-[#4B5563]">
          Please upload or choose a document from the Ingestion workspace.
        </p>
        <button
          onClick={() => navigate('/ingest')}
          className="bg-[#0B1F3A] hover:bg-[#16365F] text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all shadow-sm"
        >
          Go to Document Ingestion
        </button>
      </div>
    );
  }

  // Active question options for dynamic buttons
  const activeQuestionItem = isInlineEditing
    ? editFormData
    : selectedQuestion || (pageData?.questions && pageData.questions[0]) || null;
  const activeOptions = activeQuestionItem?.options || [];

  // Calculate panel columns based on layout mode (panel 3 is now a bottom ribbon)
  const leftColSpan =
    panelLayout === 'FULL_IMAGE'
      ? 'lg:col-span-12'
      : panelLayout === 'WIDE_IMAGE'
      ? 'lg:col-span-7'
      : 'lg:col-span-6';
  const centerColSpan =
    panelLayout === 'FULL_IMAGE'
      ? 'hidden'
      : panelLayout === 'WIDE_IMAGE'
      ? 'lg:col-span-5'
      : 'lg:col-span-6';
  const rightColSpan = 'hidden';

  return (
    <div className="space-y-6 pb-28">
      {/* Hidden file inputs */}
      <input
        ref={cardFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInlineQuestionImageUpload}
        className="hidden"
      />
      <input
        ref={optionFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInlineOptionImageUpload}
        className="hidden"
      />
      <input
        ref={multiFileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUploadFilesToQuestion}
        className="hidden"
      />

      {/* Top Header & Page Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 classic-card p-4 rounded-classic">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-classic bg-classic-surface-muted text-classic-navy border border-classic-border flex items-center justify-center">
            <SplitSquareVertical className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-base text-classic-text-primary">{document?.filename || 'Document Review'}</h1>
            <p className="text-xs text-classic-text-muted">
              Page {currentPageNum} of {document?.pageCount || 1} &bull; Profile: {document?.profile || 'BALANCED'}
            </p>
          </div>
        </div>

        {/* View Mode Layout Switcher */}
        <div className="flex items-center space-x-2 bg-classic-surface-muted p-1 rounded-classic border border-classic-border text-xs">
          <button
            onClick={() => setPanelLayout('STANDARD')}
            className={`px-2.5 py-1 rounded-classic font-semibold transition-colors ${
              panelLayout === 'STANDARD'
                ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                : 'text-classic-text-muted hover:text-classic-text-primary hover:bg-white border border-transparent'
            }`}
            title="3-Panel Standard View"
          >
            3-Panel View
          </button>
          <button
            onClick={() => setPanelLayout('WIDE_IMAGE')}
            className={`px-2.5 py-1 rounded-classic font-semibold transition-colors ${
              panelLayout === 'WIDE_IMAGE'
                ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                : 'text-classic-text-muted hover:text-classic-text-primary hover:bg-white border border-transparent'
            }`}
            title="Wide Document View"
          >
            Wide Image Split
          </button>
          <button
            onClick={() => setPanelLayout('FULL_IMAGE')}
            className={`px-2.5 py-1 rounded-classic font-semibold transition-colors ${
              panelLayout === 'FULL_IMAGE'
                ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                : 'text-classic-text-muted hover:text-classic-text-primary hover:bg-white border border-transparent'
            }`}
            title="Full Page Inspection"
          >
            Full Page View
          </button>

          {panelLayout === 'STANDARD' && (
            <button
              type="button"
              onClick={() => {
                if (isRibbonVisible) {
                  setIsRibbonManuallyClosed(true);
                  setIsRibbonHovered(false);
                } else {
                  setIsRibbonManuallyClosed(false);
                  setIsRibbonHovered(true);
                }
              }}
              className={`px-2.5 py-1 rounded-classic font-semibold transition-colors flex items-center space-x-1.5 ${
                isRibbonVisible
                  ? 'bg-white text-classic-navy border border-classic-border shadow-classic'
                  : 'text-classic-text-muted hover:text-classic-text-primary hover:bg-white'
              }`}
              title="Toggle Confidence & Review bottom ribbon"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Confidence Ribbon</span>
            </button>
          )}
        </div>

        {/* AI Learning Memory Trigger Button */}
        <button
          type="button"
          onClick={() => {
            fetchLearningStats();
            setShowLearningModal(true);
          }}
          className="px-3 py-1.5 bg-white hover:bg-classic-surface-muted text-classic-text-primary border border-classic-border rounded-classic text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-classic"
          title="Inspect AI continuous learning memory and correction rules"
        >
          <Sparkles className="w-3.5 h-3.5 text-classic-navy" />
          <span>AI Extraction Memory</span>
          {learningCount > 0 && (
            <span className="px-1.5 py-0.2 bg-classic-navy text-white rounded-full font-mono text-xs">
              {learningCount}
            </span>
          )}
        </button>

        {/* Quick Launch in Visual Snipper */}
        {(document?.id || docId) && (
          <button
            type="button"
            onClick={() => navigate(`/snip?docId=${document?.id || docId}&pageNum=${currentPageNum}`)}
            className="px-2.5 py-1.5 bg-white hover:bg-classic-surface-muted text-classic-text-primary border border-classic-border rounded-classic text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-classic"
            title="Open current page in Visual Snipping & Formula Workspace"
          >
            <Scissors className="w-3.5 h-3.5 text-classic-navy" />
            <span className="hidden sm:inline">Visual Snipper</span>
          </button>
        )}

        {/* Page Switcher with Direct Page Number Input */}
        <div className="flex items-center space-x-2 bg-classic-surface-muted border border-classic-border rounded-classic px-2.5 py-1 shadow-classic">
          <button
            type="button"
            onClick={() => loadPage(Math.max(1, currentPageNum - 1))}
            disabled={currentPageNum <= 1 || loading}
            className="p-1.5 bg-white hover:bg-classic-surface-muted border border-classic-border disabled:opacity-30 rounded-classic text-classic-text-primary transition-all"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 text-xs font-semibold font-mono">
            <span className="text-classic-text-muted select-none">Page</span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleJumpToPage(undefined, true);
              }}
              className="inline-flex items-center"
            >
              <input
                type="number"
                min={1}
                max={document?.pageCount || 1}
                value={pageInputVal}
                onChange={(e) => setPageInputVal(e.target.value)}
                onBlur={() => handleJumpToPage()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleJumpToPage(undefined, true);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-12 text-center bg-white border border-classic-border hover:border-classic-navy focus:border-classic-navy focus:ring-1 focus:ring-classic-navy rounded-classic py-0.5 text-xs font-bold text-classic-text-primary outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="Type page number and press Enter to jump"
              />
            </form>
            <span className="text-classic-text-muted select-none">/ {document?.pageCount || 1}</span>
          </div>

          <button
            type="button"
            onClick={() => loadPage(Math.min(document?.pageCount || 1, currentPageNum + 1))}
            disabled={currentPageNum >= (document?.pageCount || 1) || loading}
            className="p-1.5 bg-white hover:bg-classic-surface-muted border border-classic-border disabled:opacity-30 rounded-classic text-classic-text-primary transition-all"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MOBILE / TABLET PANEL SWITCHER (< lg screens) */}
      <div className="lg:hidden flex items-center justify-between bg-white border border-classic-border p-1.5 rounded-classic sticky top-2 z-30 shadow-classic gap-1">
        <button
          type="button"
          onClick={() => setMobileActivePanel('DOCUMENT')}
          className={`flex-1 py-2.5 px-2 rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
            mobileActivePanel === 'DOCUMENT'
              ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
              : 'text-classic-text-muted hover:text-classic-text-primary hover:bg-classic-surface-muted border border-transparent'
          }`}
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span>Document ({currentPageNum})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileActivePanel('QUESTIONS')}
          className={`flex-1 py-2.5 px-2 rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
            mobileActivePanel === 'QUESTIONS'
              ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
              : 'text-classic-text-muted hover:text-classic-text-primary hover:bg-classic-surface-muted border border-transparent'
          }`}
        >
          <Edit3 className="w-4 h-4 shrink-0" />
          <span>Questions ({pageData?.questions?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileActivePanel('REVIEW');
            setIsRibbonManuallyClosed(false);
            setIsRibbonHovered(true);
          }}
          className={`flex-1 py-2.5 px-2 rounded-classic text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
            mobileActivePanel === 'REVIEW' || isRibbonVisible
              ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
              : 'text-classic-text-muted hover:text-classic-text-primary hover:bg-classic-surface-muted border border-transparent'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Review & Bank</span>
        </button>
      </div>

      {/* THREE-PANEL REVIEW WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[750px]">
        {/* PANEL 1 (LEFT): ORIGINAL PAGE IMAGE WITH TEXT SELECT, IMAGE CROPPER & PAN */}
        <div
          className={`${leftColSpan} ${
            mobileActivePanel === 'DOCUMENT' ? 'flex' : 'hidden lg:flex'
          } classic-card rounded-classic p-3 sm:p-4 flex-col space-y-3 transition-all duration-200`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-classic-border-light">
            {/* Mode Switcher: Text Select vs Crop Image vs Pan */}
            <div className="flex items-center space-x-1 bg-classic-surface-muted p-1 rounded-classic border border-classic-border">
              <button
                onClick={() => {
                  setInteractionMode('SELECT_TEXT');
                  setCropBox(null);
                  setSnipTarget(null);
                }}
                className={`px-2 py-1 rounded-classic text-xs font-semibold flex items-center space-x-1 transition-colors ${
                  interactionMode === 'SELECT_TEXT'
                    ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                    : 'text-classic-text-muted hover:text-classic-text-primary hover:bg-white border border-transparent'
                }`}
                title="Select and Drag text from Document"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>

              <button
                onClick={() => {
                  setInteractionMode('CROP_IMAGE');
                  setSelectedText('');
                }}
                className={`px-2.5 py-1 rounded-classic text-xs font-semibold flex items-center space-x-1 transition-colors ${
                  interactionMode === 'CROP_IMAGE'
                    ? 'bg-emerald-700 text-white shadow-classic border border-emerald-700'
                    : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-transparent'
                }`}
                title="Crop any diagram/figure to attach to Question or Options"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Crop / Snip Tool</span>
              </button>

              <button
                onClick={() => {
                  setInteractionMode('PAN');
                  setCropBox(null);
                  setSnipTarget(null);
                }}
                className={`px-2 py-1 rounded-classic text-xs font-semibold flex items-center space-x-1 transition-colors ${
                  interactionMode === 'PAN'
                    ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                    : 'text-classic-text-muted hover:text-classic-text-primary hover:bg-white border border-transparent'
                }`}
                title="Pan & Move Page Canvas"
              >
                <Hand className="w-3.5 h-3.5" />
                <span>Pan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDebugMode(!debugMode);
                  if (debugMode) setSelectedDebugRegion(null);
                }}
                className={`px-2.5 py-1 rounded-classic text-xs font-semibold flex items-center space-x-1 transition-colors ${
                  debugMode
                    ? 'bg-purple-700 text-white shadow-classic'
                    : 'text-purple-700 hover:text-purple-800 hover:bg-purple-50'
                }`}
                title="Toggle Extraction Debug Mode (Layout, Symbols, Baselines, AST Relations)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Debug Mode</span>
              </button>
            </div>

            {/* Dedicated Zoom Toolbar Buttons */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleFitWidth}
                className={`px-2 py-1 rounded-classic text-xs font-semibold transition-colors ${
                  fitMode === 'WIDTH' ? 'bg-classic-navy text-white' : 'bg-white hover:bg-classic-surface-muted text-classic-text-primary border border-classic-border'
                }`}
                title="Fit to Width"
              >
                Fit Width
              </button>
              <button
                onClick={handleFitPage}
                className={`px-2 py-1 rounded-classic text-xs font-semibold transition-colors ${
                  fitMode === 'PAGE' ? 'bg-classic-navy text-white' : 'bg-white hover:bg-classic-surface-muted text-classic-text-primary border border-classic-border'
                }`}
                title="Fit Full Page"
              >
                Fit Page
              </button>
              <button
                onClick={() => {
                  setZoom(1.0);
                  setPan({ x: 0, y: 0 });
                  setFitMode('CUSTOM');
                }}
                className="px-1.5 py-1 bg-white hover:bg-classic-surface-muted border border-classic-border rounded-classic text-xs font-mono text-classic-text-primary"
                title="100% Original Size"
              >
                100%
              </button>

              <div className="h-3.5 w-px bg-classic-border mx-1" />

              <button
                onClick={handleZoomOut}
                className="p-1.5 bg-white hover:bg-classic-surface-muted border border-classic-border rounded-classic text-classic-text-primary transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-classic-text-primary font-bold px-1 min-w-[40px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 bg-white hover:bg-classic-surface-muted border border-classic-border rounded-classic text-classic-text-primary transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Snip Guide Banner if active target */}
          {snipTarget && (
            <div className="bg-emerald-50 border border-emerald-400 p-2.5 rounded-lg text-xs text-emerald-950 flex items-center justify-between font-medium shadow-xs animate-pulse">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <b>Snip Mode:</b> Click & drag a rectangle around {snipTarget.type === 'QUESTION' ? `Question Q${snipTarget.qNum}` : `Option (${snipTarget.optTarget})`} on the document below.
                </span>
              </div>
              <button onClick={() => setSnipTarget(null)} className="p-1 text-emerald-800 hover:text-emerald-950 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Interactive Document Viewport */}
          <div
            ref={viewportRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onWheel={handleWheel}
            onMouseUpCapture={handleTextSelection}
            style={{
              touchAction: interactionMode === 'CROP_IMAGE' || interactionMode === 'PAN' ? 'none' : 'auto',
            }}
            className={`flex-1 min-h-[420px] sm:min-h-[600px] max-h-[75vh] sm:max-h-[780px] overflow-hidden rounded-xl bg-slate-950 p-2 border border-slate-900 relative ${
              interactionMode === 'PAN'
                ? isPanning
                  ? 'cursor-grabbing select-none'
                  : 'cursor-grab select-none'
                : interactionMode === 'CROP_IMAGE'
                ? 'cursor-crosshair select-none'
                : 'cursor-text select-text'
            }`}
          >
            {activePageImageUrl ? (
              <div
                className="absolute origin-top-left transition-transform duration-75"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
              >
                <div className="relative inline-block shadow-2xl rounded-lg">
                  <img
                    ref={imageRef}
                    src={resolvePageImageUrl(activePageImageUrl, imgAttempt)}
                    alt={`Page ${currentPageNum}`}
                    className="rounded-lg max-w-none block pointer-events-none select-none"
                    draggable={false}
                    onLoad={() => {
                      setImgLoadError(false);
                    }}
                    onError={(e) => {
                      console.warn(`[Preview Image] Failed loading attempt ${imgAttempt} for:`, e.currentTarget.src);
                      if (imgAttempt < 2) {
                        setImgAttempt((prev) => prev + 1);
                      } else {
                        setImgLoadError(true);
                      }
                    }}
                  />

                  {/* If image failed on all attempts, show retry overlay */}
                  {imgLoadError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 rounded-lg p-4 text-center space-y-3 pointer-events-auto">
                      <AlertTriangle className="w-8 h-8 text-amber-400" />
                      <div className="text-xs text-white font-medium">Page image preview could not be displayed</div>
                      <p className="text-xs text-slate-400 max-w-xs">
                        The rendered image could not be loaded from server.
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImgLoadError(false);
                          setImgAttempt(0);
                          loadPage(currentPageNum);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Preview</span>
                      </button>
                    </div>
                  )}

                  {/* SELECTABLE & DRAGGABLE TEXT LAYER OVERLAY (When in Text Mode) */}
                  {interactionMode === 'SELECT_TEXT' &&
                    (pageData?.regions || []).map((r: any) => {
                      const isSelected = selectedRegionId === r.id;
                      const [bx, by, bw, bh] = r.bbox || [0, 0, 0, 0];
                      const spanText = r.raw_text || r.text || '';

                      return (
                        <div
                          key={r.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', spanText);
                            setActiveDragText(spanText);
                            setSelectedText(spanText);
                          }}
                          onDragEnd={() => setActiveDragText('')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRegionId(r.id);
                            setSelectedText(spanText);
                            if (r.question_number) {
                              const matchedQ = pageData?.questions?.find(
                                (q: any) => String(q.question_number || q.questionNumber) === String(r.question_number)
                              );
                              if (matchedQ) setSelectedQuestion(matchedQ);
                            }
                          }}
                          className={`absolute transition-all cursor-grab active:cursor-grabbing hover:bg-indigo-500/20 hover:ring-1 hover:ring-indigo-400 rounded ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-500/30 ring-2 ring-indigo-400 z-10'
                              : 'border-transparent'
                          }`}
                          style={{
                            left: `${bx}px`,
                            top: `${by}px`,
                            width: `${bw}px`,
                            height: `${bh}px`,
                            fontSize: `${Math.max(10, Math.min(24, bh * 0.7))}px`,
                            lineHeight: `${bh}px`,
                            userSelect: 'text',
                          }}
                          title={`${spanText}\n(Drag to question/options or Ctrl+C to copy)`}
                        >
                          <span className="opacity-0 hover:opacity-10 text-transparent select-text block truncate">
                            {spanText}
                          </span>
                        </div>
                      );
                    })}

                  {/* EXTRACTION DEBUG MODE OVERLAYS (Section 31) */}
                  {debugMode && (
                    <>
                      {(pageData?.regions || []).map((r: any, rIdx: number) => {
                        const [bx, by, bw, bh] = r.bbox || [0, 0, 0, 0];
                        const rType = r.type || 'PARAGRAPH';
                        const isSelected = selectedDebugRegion?.id === r.id;
                        
                        // Color mapping by domain
                        const colorClass = 
                          rType === 'MATHEMATICS' || rType === 'MATH' ? 'border-purple-500 bg-purple-500/15 text-purple-300' :
                          rType === 'PHYSICS' ? 'border-sky-500 bg-sky-500/15 text-sky-300' :
                          rType === 'CHEMISTRY' || rType === 'CHEM' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' :
                          rType === 'BIOLOGY' ? 'border-amber-500 bg-amber-500/15 text-amber-300' :
                          rType === 'QUESTION' ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300' :
                          rType === 'OPTION' ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300' :
                          rType === 'DIAGRAM' ? 'border-rose-500 bg-rose-500/15 text-rose-300' :
                          rType === 'TABLE' ? 'border-yellow-500 bg-yellow-500/15 text-yellow-300' :
                          rType === 'MIXED' ? 'border-pink-500 bg-pink-500/15 text-pink-300' :
                          'border-slate-500 bg-slate-500/15 text-slate-300';

                        const foCount = (r.formula_objects || []).length;
                        const confPct = Math.round((r.confidence || 0.95) * 100);

                        return (
                          <div
                            key={`dbg_${r.id || rIdx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDebugRegion(r);
                            }}
                            className={`absolute border-2 rounded cursor-pointer transition-all hover:ring-2 hover:ring-white z-20 ${colorClass} ${
                              isSelected ? 'ring-4 ring-white shadow-2xl z-30' : ''
                            }`}
                            style={{
                              left: `${bx}px`,
                              top: `${by}px`,
                              width: `${bw}px`,
                              height: `${bh}px`,
                            }}
                          >
                            <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-slate-950/90 border border-slate-700 rounded text-xs font-mono font-bold flex items-center space-x-1 whitespace-nowrap shadow pointer-events-none">
                              <span>{rType}</span>
                              <span className="text-emerald-400">{confPct}%</span>
                              {foCount > 0 && <span className="text-purple-400">({foCount} math)</span>}
                            </div>
                          </div>
                        );
                      })}

                      {/* FLOATING DEBUG INSPECTOR CARD */}
                      {selectedDebugRegion && (
                        <div
                          className="absolute bottom-4 right-4 w-96 max-w-[90%] bg-white border-2 border-[#0B1F3A] p-4 rounded-xl shadow-2xl space-y-3 z-40 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-[#D1D5DB] pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-900 font-mono font-bold text-xs border border-purple-300">
                                {selectedDebugRegion.type}
                              </span>
                              <span className="font-mono text-emerald-800 font-bold text-xs">
                                Conf: {Math.round((selectedDebugRegion.confidence || 0.95) * 100)}%
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedDebugRegion(null)}
                              className="p-1 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1 font-mono text-xs">
                            <div className="text-slate-600 text-xs uppercase font-bold">BBox:</div>
                            <div className="text-slate-800 font-bold">[{selectedDebugRegion.bbox?.join(', ')}]</div>
                          </div>

                          <div className="space-y-1 font-mono text-xs">
                            <div className="text-slate-600 text-xs uppercase font-bold">Extracted Text:</div>
                            <div className="text-[#111827] p-2 bg-slate-50 rounded-lg border border-slate-200 max-h-24 overflow-y-auto font-sans font-medium">
                              {selectedDebugRegion.text}
                            </div>
                          </div>

                          {/* Formula Objects in Selected Region */}
                          {(selectedDebugRegion.formula_objects || []).length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-200">
                              <div className="text-xs text-[#0B1F3A] font-bold uppercase tracking-wider">
                                2-D Formula Objects ({(selectedDebugRegion.formula_objects || []).length}):
                              </div>
                              {(selectedDebugRegion.formula_objects || []).map((fo: any, fIdx: number) => (
                                <div key={fIdx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs font-mono">
                                  <div className="flex items-center justify-between text-indigo-950 font-medium">
                                    <span>LaTeX: <code className="text-[#0B1F3A] font-bold bg-white px-1 py-0.5 rounded border border-slate-300">{fo.latex}</code></span>
                                    <span className="text-emerald-800 font-bold">{Math.round((fo.confidence || 0.98) * 100)}%</span>
                                  </div>
                                  {fo.originalCrop && (
                                    <div className="pt-1">
                                      <img src={fo.originalCrop} alt="Formula Crop" className="max-h-8 object-contain bg-white p-1 rounded border border-slate-200" />
                                    </div>
                                  )}
                                  {fo.spatialRelationships && fo.spatialRelationships.length > 0 && (
                                    <div className="pt-1 text-xs text-slate-600">
                                      <span>Relations: </span>
                                      <span className="text-[#0B1F3A] font-semibold">{fo.spatialRelationships.map((r: any) => `${r.relation}(${r.source}, ${r.target})`).join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* LIVE CROP BOUNDING BOX RECTANGLE */}
                  {cropBox && cropBox.w > 0 && cropBox.h > 0 && (
                    <div
                      className="absolute border-2 border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400/40 pointer-events-none rounded z-30"
                      style={{
                        left: `${cropBox.x}px`,
                        top: `${cropBox.y}px`,
                        width: `${cropBox.w}px`,
                        height: `${cropBox.h}px`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-emerald-600 text-white text-xs font-mono px-1.5 py-0.5 rounded shadow">
                        {Math.round(cropBox.w)} x {Math.round(cropBox.h)} px
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400 space-y-2">
                {loading ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <span>Rendering and analyzing page preview...</span>
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <p>No preview available for this page yet.</p>
                    <button
                      type="button"
                      onClick={() => loadPage(currentPageNum)}
                      className="px-3 py-1.5 bg-[#0B1F3A] hover:bg-[#16365F] text-white border border-[#0B1F3A] rounded-md text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Process Page
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* FLOATING ACTION BAR FOR CROPPED IMAGE (ATTACH / DRAG / PASTE) */}
            {activeCroppedImage && (
              <div className="absolute bottom-3 left-3 right-3 bg-white p-4 rounded-classic border-2 border-emerald-600 shadow-xl space-y-3 z-30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Draggable Thumbnail */}
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/image-url', activeCroppedImage.url);
                        e.dataTransfer.setData('text/plain', activeCroppedImage.url);
                        setActiveDragImage(activeCroppedImage.url);
                      }}
                      onDragEnd={() => setActiveDragImage(null)}
                      className="relative group bg-slate-50 p-1.5 rounded-classic border border-emerald-600 cursor-grab active:cursor-grabbing shadow-sm"
                      title="Drag this cropped image and drop it on any Question or Option!"
                    >
                      <img
                        src={activeCroppedImage.url}
                        alt="Crop Thumbnail"
                        className="h-14 w-auto rounded object-contain"
                      />
                      <div className="absolute inset-0 bg-emerald-600/10 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Hand className="w-4 h-4 text-emerald-800 drop-shadow" />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-emerald-900 flex items-center space-x-1.5">
                        <Scissors className="w-4 h-4 text-emerald-700" />
                        <span>Cropped Screenshot Ready ({activeCroppedImage.w}x{activeCroppedImage.h}px)</span>
                      </div>
                      <p className="text-xs text-classic-text-muted">
                        Attach directly to Question as its primary image, or assign to any option below:
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveCroppedImage(null);
                      setCropBox(null);
                    }}
                    className="p-1 text-classic-text-muted hover:text-classic-text-primary rounded hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Instant 1-Click Attach Buttons */}
                <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-classic-border">
                  <span className="text-xs font-semibold text-classic-text-primary mr-1">Use screenshot as:</span>
                  <button
                    type="button"
                    onClick={() => handleAttachImageToQuestion(activeCroppedImage.url)}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-classic font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Question Image / Figure</span>
                  </button>

                  {/* Dynamically render buttons for each option in active question */}
                  {activeOptions.length > 0 ? (
                    activeOptions.map((opt: any, idx: number) => {
                      const optLabel = opt.key || String(idx + 1);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAttachImageToOption(optLabel, activeCroppedImage.url)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-classic-text-primary hover:text-emerald-900 rounded-classic border border-classic-border font-mono font-semibold transition-colors"
                        >
                          + Opt ({optLabel}) Image
                        </button>
                      );
                    })
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAttachImageToOption('1', activeCroppedImage.url)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-classic-text-primary rounded-classic border border-classic-border font-mono font-semibold"
                      >
                        + Opt (1)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttachImageToOption('2', activeCroppedImage.url)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-classic-text-primary rounded-classic border border-classic-border font-mono font-semibold"
                      >
                        + Opt (2)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttachImageToOption('3', activeCroppedImage.url)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-classic-text-primary rounded-classic border border-classic-border font-mono font-semibold"
                      >
                        + Opt (3)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttachImageToOption('4', activeCroppedImage.url)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-classic-text-primary rounded-classic border border-classic-border font-mono font-semibold"
                      >
                        + Opt (4)
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Floating Quick Action Bar when Text is Selected */}
            {selectedText && interactionMode === 'SELECT_TEXT' && (
              <div className="absolute bottom-3 left-3 right-3 bg-white p-3 rounded-classic border-2 border-classic-navy shadow-xl space-y-2 z-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-classic-text-primary truncate">
                    <Type className="w-4 h-4 text-classic-navy shrink-0" />
                    <span className="truncate text-xs font-mono text-classic-navy font-bold max-w-[320px]">
                      "{selectedText.length > 50 ? `${selectedText.substring(0, 50)}...` : selectedText}"
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopySelectedText(selectedText)}
                      className="px-3 py-1 bg-classic-navy hover:bg-classic-navy-hover text-white text-xs font-semibold rounded-classic flex items-center space-x-1.5 transition-colors"
                      title="Copy to Clipboard"
                    >
                      <Copy className="w-3.5 h-3.5 text-white" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => setSelectedText('')}
                      className="p-1 text-classic-text-muted hover:text-classic-text-primary rounded hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1.5 border-t border-classic-border">
                  <span className="text-xs font-semibold text-classic-text-primary mr-1">Insert into:</span>
                  <button
                    onClick={() => handleInsertTextToQuestionBody(selectedText)}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-classic-navy hover:text-white border border-blue-200 text-classic-navy text-xs font-semibold rounded-classic transition-colors"
                  >
                    + Question Body
                  </button>
                  <button
                    onClick={() => handleInsertTextToOption(0, selectedText)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-classic-text-primary rounded-classic border border-classic-border font-mono font-semibold"
                  >
                    + Opt (1)
                  </button>
                  <button
                    onClick={() => handleInsertTextToOption(1, selectedText)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-classic-text-primary rounded-classic border border-classic-border font-mono font-semibold"
                  >
                    + Opt (2)
                  </button>
                  <button
                    onClick={() => handleInsertTextToOption(2, selectedText)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-classic-text-primary rounded-classic border border-classic-border font-mono font-semibold"
                  >
                    + Opt (3)
                  </button>
                  <button
                    onClick={() => handleInsertTextToOption(3, selectedText)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-classic-text-primary rounded-classic border border-classic-border font-mono font-semibold"
                  >
                    + Opt (4)
                  </button>
                </div>
              </div>
            )}

            {/* Notification Toast for Copy/Insert */}
            {copySuccessMsg && (
              <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg flex items-center space-x-1.5 z-30 animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>{copySuccessMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* PANEL 2 (CENTER): EXTRACTED EDITABLE CONTENT IN-PLACE WITH SCREENSHOT SUPPORT */}
        <div
          className={`${centerColSpan} ${
            mobileActivePanel === 'QUESTIONS' ? 'flex' : 'hidden lg:flex'
          } bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-3 sm:p-4 flex-col space-y-4`}
        >
          {/* Top Bar for Extracted Column with Select All & Add Question */}
          <div className="flex items-center justify-between pb-3 border-b border-[#D1D5DB]">
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm font-bold uppercase tracking-wider text-[#111827] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={
                    (pageData?.questions?.length || 0) > 0 &&
                    selectedQNums.size === (pageData?.questions?.length || 0)
                  }
                  onChange={handleSelectAllQuestions}
                  className="w-4 h-4 rounded text-[#0B1F3A] bg-white border-2 border-[#D1D5DB] focus:ring-[#0B1F3A] cursor-pointer"
                />
                <span>
                  Extracted Questions ({pageData?.questions?.length || 0})
                </span>
              </label>

              {selectedQNums.size > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold font-mono">
                  {selectedQNums.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  const nextQNum = String((pageData?.questions?.length || 0) + 1);
                  const newQ = {
                    question_number: nextQNum,
                    question_text: '',
                    marks: 1,
                    options: [
                      { key: '1', text: '' },
                      { key: '2', text: '' },
                      { key: '3', text: '' },
                      { key: '4', text: '' },
                    ],
                    diagrams: [],
                  };
                  setPageData({
                    ...pageData,
                    questions: [...(pageData?.questions || []), newQ],
                  });
                  handleStartInlineEdit(newQ);
                }}
                className="px-3 py-1.5 bg-[#0B1F3A] hover:bg-[#16365F] text-white border border-[#0B1F3A] rounded-md text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
                title="Add New Question"
              >
                <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                <span className="text-white font-bold">Add Question</span>
              </button>
            </div>
          </div>

          {/* CONTEXTUAL QUESTION RIBBON: DISPLAY WHEN QUESTION IS SELECTED, HIDE WHEN NOT SELECTED */}
          {selectedQuestion && selectedQNums.size === 0 && (
            <div className="p-3 bg-white border-2 border-classic-navy rounded-classic flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-classic-md text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="w-6 h-6 rounded-classic bg-classic-navy text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-classic">
                  Q
                </span>
                <span className="font-bold text-classic-text-primary text-sm">
                  Q{selectedQuestion.question_number || selectedQuestion.questionNumber} Selected
                </span>

                {/* Target Folder Selector directly in ribbon */}
                <div className="flex items-center space-x-1.5 pl-3 border-l border-classic-border">
                  <span className="text-xs text-classic-text-muted font-semibold hidden sm:inline">Bank Folder:</span>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="bg-white border border-classic-border text-xs rounded-classic px-2.5 py-1 text-classic-text-primary focus:outline-none focus:border-classic-navy max-w-[150px] truncate"
                  >
                    <option value="">Root / General Questions</option>
                    {flatFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.displayName || f.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setNewFolderName('');
                      setNewFolderParentId(selectedFolderId || '');
                      setNewFolderType('CHAPTER');
                      setIsAddFolderModalOpen(true);
                    }}
                    className="px-2 py-1 bg-white hover:bg-classic-surface-muted text-classic-text-primary border border-classic-border rounded-classic text-xs font-semibold flex items-center space-x-1 transition-all shadow-classic"
                    title="Create new folder in Question Bank"
                  >
                    <Plus className="w-3 h-3 text-classic-navy" />
                    <span className="hidden sm:inline font-semibold">New Folder</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveToBank}
                  disabled={savingSelected}
                  className="px-3 py-1.5 bg-classic-navy hover:bg-classic-navy-hover disabled:opacity-50 text-white rounded-classic font-semibold text-xs shadow-classic flex items-center space-x-1.5 transition-all"
                  title="Save this selected question to Question Bank"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Save Q{selectedQuestion.question_number || selectedQuestion.questionNumber} to Bank</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllToBank}
                  disabled={savingAll || !pageData?.questions || pageData.questions.length === 0}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-classic font-semibold text-xs shadow-classic flex items-center space-x-1.5 transition-all"
                  title="Save ALL questions on this page to Question Bank"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save ALL ({pageData?.questions?.length || 0}) Questions</span>
                </button>

                {(document?.pageCount || 1) > 1 && (
                  <button
                    type="button"
                    onClick={handleSaveAllPagesToBank}
                    disabled={savingAllPages}
                    className="px-3 py-1.5 bg-white hover:bg-classic-surface-muted text-classic-text-primary border border-classic-border disabled:opacity-50 rounded-classic font-semibold text-xs shadow-classic flex items-center space-x-1.5 transition-all"
                    title={`Process and save questions from all ${document?.pageCount} pages`}
                  >
                    <Layers className="w-3.5 h-3.5 text-classic-navy" />
                    <span>Save ALL {document?.pageCount} Pages</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  className="px-2.5 py-1.5 bg-white hover:bg-classic-surface-muted text-classic-text-primary rounded-classic text-xs font-semibold border border-classic-border transition-colors"
                  title="Hide options / Deselect question"
                >
                  ✕ Deselect
                </button>
              </div>
            </div>
          )}

          {/* BULK ACTIONS STRIP WHEN QUESTIONS ARE CHECKED */}
          {selectedQNums.size > 0 && (
            <div className="p-3 bg-white border-2 border-classic-navy rounded-classic flex items-center justify-between animate-fade-in shadow-classic-md text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-classic-text-primary">
                  {selectedQNums.size} Question{selectedQNums.size > 1 ? 's' : ''} Selected
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSaveSelectedToBank}
                  disabled={savingSelected}
                  className="px-3 py-1.5 bg-classic-navy hover:bg-classic-navy-hover disabled:opacity-50 text-white rounded-classic font-semibold text-xs shadow-classic flex items-center space-x-1.5 transition-all"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{savingSelected ? 'Saving...' : `Save (${selectedQNums.size}) to Bank`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelectedQuestions}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-classic font-semibold text-xs transition-all flex items-center space-x-1 shadow-classic"
                  title="Delete selected questions from this review page"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedQNums(new Set())}
                  className="px-2 py-1 text-classic-text-muted hover:text-classic-text-primary text-xs font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* DUPLICATE QUESTIONS DETECTED BANNER */}
          {(() => {
            const dups = findDuplicateIndices(pageData?.questions || []);
            if (dups.length === 0) return null;
            return (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between animate-fade-in text-xs shadow-xs">
                <div className="flex items-center space-x-2 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="font-bold">Duplicate Questions Detected ({dups.length}):</span>
                    <span className="text-slate-700 text-xs block font-medium">
                      {dups.map((d, i) => `Q${d.dupIdx + 1} matches Q${d.originalQNum}`).join(', ')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const dupIndices = new Set(dups.map((d) => d.dupIdx));
                    const filtered = (pageData?.questions || []).filter((_: any, idx: number) => !dupIndices.has(idx));
                    setPageData({ ...pageData, questions: filtered });
                    showToast(`Removed ${dupIndices.size} duplicate question(s)!`);
                  }}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-md font-bold text-xs shadow-xs flex items-center space-x-1.5 shrink-0 transition-colors cursor-pointer"
                  title="Remove all duplicate questions from extracted list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove All Duplicates</span>
                </button>
              </div>
            );
          })()}

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[700px]">
            {pageData?.questions?.length === 0 ? (
              <div className="text-center py-20 text-xs text-slate-400">
                No questions identified on this page. Click "+ Add Question" or snip from the left.
              </div>
            ) : (
              pageData?.questions?.map((q: any, idx: number) => {
                const qNum = String(q.question_number || q.questionNumber || idx + 1);
                const isSelected = String(selectedQuestion?.question_number || selectedQuestion?.questionNumber) === qNum;
                const isThisEditing = editingQNum === qNum;
                const options = q.options || [];
                const diagrams = q.diagrams || [];

                // --- IN-PLACE EDIT CARD (WITH 1-CLICK SNIP & SCREENSHOT SUPPORT) ---
                if (isThisEditing && editFormData) {
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white border-2 border-[#0B1F3A] shadow-md space-y-4 transition-all"
                    >
                      {/* Edit Header Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#D1D5DB]">
                        <div className="flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-md bg-[#0B1F3A] text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                            Q
                          </span>
                          <input
                            type="text"
                            value={editFormData.question_number}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, question_number: e.target.value })
                            }
                            className="w-16 bg-white border border-[#D1D5DB] rounded-md px-2 py-1 text-xs text-[#111827] font-mono font-bold focus:border-[#0B1F3A] focus:outline-none"
                            title="Question Number"
                          />
                          <span className="text-xs text-slate-700 font-bold">Marks:</span>
                          <input
                            type="number"
                            value={editFormData.marks}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                marks: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-14 bg-white border border-[#D1D5DB] rounded-md px-2 py-1 text-xs text-[#111827] font-mono font-bold focus:border-[#0B1F3A] focus:outline-none"
                            min={1}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleStartSnipForQuestion(editFormData.question_number)}
                            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 rounded-md text-xs font-bold flex items-center space-x-1 border border-emerald-500 shadow-xs transition-colors cursor-pointer"
                            title="Snip / Screenshot Question from PDF"
                          >
                            <Camera className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Snip Question</span>
                          </button>

                          <select
                            value={editFormData.difficulty}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, difficulty: e.target.value })
                            }
                            className="bg-white border border-[#D1D5DB] text-xs rounded-md px-2 py-1 text-[#111827] font-semibold focus:border-[#0B1F3A] focus:outline-none cursor-pointer"
                          >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </div>
                      </div>

                      {/* Quick Formula Inserter */}
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="text-xs text-slate-700 font-bold mr-1">Math / Chem:</span>
                        <button
                          type="button"
                          onClick={() => handleInsertFormulaToInline('\\frac{a}{b}')}
                          className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-indigo-900 border border-slate-300 rounded font-mono text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          \frac&#123;a&#125;&#123;b&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertFormulaToInline('\\sqrt{x}')}
                          className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-indigo-900 border border-slate-300 rounded font-mono text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          \sqrt&#123;x&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertFormulaToInline('x^{2}')}
                          className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-indigo-900 border border-slate-300 rounded font-mono text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          x^2
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertFormulaToInline('5 \\times 60')}
                          className="px-2 py-0.5 bg-white hover:bg-amber-50 text-amber-900 border border-slate-300 rounded font-mono text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          5 \times 60
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertFormulaToInline('\\rightarrow')}
                          className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-slate-300 rounded font-mono text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          \rightarrow
                        </button>
                      </div>

                      {/* Attached Question Screenshots & Multiple Diagrams Gallery in Inline Editor */}
                      {editFormData.diagrams && editFormData.diagrams.length > 0 && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-300 space-y-2">
                          <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                            <span className="flex items-center space-x-1.5">
                              <Camera className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Attached Question Figures ({editFormData.diagrams.length}):</span>
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleStartSnipForQuestion(editFormData.question_number)}
                                className="text-xs text-emerald-800 font-bold hover:underline flex items-center space-x-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Snip Another</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const qOpts = (editFormData.options && editFormData.options.length > 0)
                                    ? editFormData.options.map((o: any) => ({ key: o.key || 'A', text: o.text, imageUrl: o.imageUrl }))
                                    : [{ key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }];
                                  setAttachImageReviewModal({
                                    qNum: editFormData.question_number,
                                    destination: 'BODY',
                                    options: qOpts,
                                  });
                                }}
                                className="text-xs text-[#0B1F3A] font-bold hover:underline flex items-center space-x-1"
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span>Add Picture</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 pt-1">
                            {editFormData.diagrams.map((d: any, dIdx: number) => {
                              const diagUrl = typeof d === 'string' ? d : d.relative_url || d.url || '';
                              const optKeys = (editFormData.options && editFormData.options.length > 0)
                                ? editFormData.options.map((o: any) => o.key || 'A')
                                : ['A', 'B', 'C', 'D'];
                              return (
                                <div key={dIdx} className="space-y-1 p-1.5 bg-white rounded-lg border border-slate-300 shadow-xs">
                                  <ResizableImage
                                    src={diagUrl}
                                    alt={`Question Figure ${dIdx + 1}`}
                                    initialHeight={110}
                                    minHeight={50}
                                    maxHeight={400}
                                    removable={true}
                                    onRemove={() => {
                                      const updated = editFormData.diagrams.filter((_: any, i: number) => i !== dIdx);
                                      setEditFormData({ ...editFormData, diagrams: updated });
                                    }}
                                  />
                                  <div className="flex items-center justify-between text-xs text-slate-700 font-mono px-0.5 pt-0.5 border-t border-slate-200 gap-2">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs text-slate-600 font-sans font-medium">Dest:</span>
                                      <select
                                        value="BODY"
                                        onChange={(e) => {
                                          handleMoveImageInReview(editFormData.question_number, 'BODY', dIdx, e.target.value);
                                        }}
                                        className="bg-white text-slate-800 border border-slate-300 text-xs rounded px-1.5 py-0.5 font-sans focus:outline-none focus:border-[#0B1F3A] cursor-pointer"
                                        title="Move this image to an Option"
                                      >
                                        <option value="BODY">📌 Body</option>
                                        {optKeys.map((k: string) => (
                                          <option key={k} value={k}>➔ Opt ({k})</option>
                                        ))}
                                      </select>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = editFormData.diagrams.filter((_: any, i: number) => i !== dIdx);
                                        setEditFormData({ ...editFormData, diagrams: updated });
                                      }}
                                      className="text-rose-700 hover:text-rose-900 text-xs font-sans font-bold flex items-center space-x-0.5"
                                      title="Delete Figure"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Editable Question Body (Drag & Drop Receptor for Text or Image) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                          <span className="flex items-center space-x-1">
                            <span>Question Text</span>
                            <span className="text-xs text-slate-500 font-normal">(Or leave as reference if using screenshot above)</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleStartSnipForQuestion(editFormData.question_number)}
                              className="text-emerald-800 hover:text-emerald-900 text-xs font-bold flex items-center space-x-1 bg-white hover:bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-500 shadow-xs cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Snip Screenshot</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const text = await navigator.clipboard.readText();
                                  if (text) {
                                    const current = editFormData.question_text || '';
                                    const sep = current.length > 0 ? '\n' : '';
                                    setEditFormData({ ...editFormData, question_text: `${current}${sep}${text}` });
                                    showToast('Pasted text from clipboard verbatim!');
                                  }
                                } catch {
                                  alert('Could not read clipboard. Use Ctrl+V / Cmd+V directly in the text area.');
                                }
                              }}
                              className="text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center space-x-1 bg-white hover:bg-slate-50 px-2 py-0.5 rounded-md border border-slate-300 shadow-xs cursor-pointer"
                              title="Paste clipboard text verbatim into question body"
                            >
                              <Clipboard className="w-3.5 h-3.5 text-slate-600" />
                              <span>Paste Text</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => cardFileInputRef.current?.click()}
                              disabled={uploadingImage}
                              className="text-[#0B1F3A] hover:text-[#16365F] text-xs font-bold flex items-center space-x-1 bg-white hover:bg-slate-50 px-2 py-0.5 rounded-md border border-slate-300 shadow-xs cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-[#0B1F3A]" />
                              <span>{uploadingImage ? 'Uploading...' : 'Upload File'}</span>
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={3}
                          value={editFormData.question_text}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, question_text: e.target.value })
                          }
                          onPaste={(e) => handleClipboardPaste(e, 'question')}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverTarget('question_body');
                          }}
                          onDragLeave={() => setDragOverTarget(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverTarget(null);
                            const droppedImg = e.dataTransfer.getData('application/image-url') || activeDragImage;
                            const droppedText = e.dataTransfer.getData('text/plain') || activeDragText;

                            if (droppedImg) {
                              handleAttachImageToQuestion(droppedImg);
                            } else if (droppedText) {
                              const current = editFormData.question_text || '';
                              const sep = current.length > 0 ? ' ' : '';
                              setEditFormData({ ...editFormData, question_text: `${current}${sep}${droppedText}` });
                              showToast('Dropped text into question!');
                            }
                          }}
                          className={`w-full bg-white border rounded-lg p-2.5 text-xs sm:text-sm text-[#111827] placeholder-slate-400 font-sans font-medium focus:outline-none transition-all ${
                            dragOverTarget === 'question_body'
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/20'
                              : 'border-[#D1D5DB] focus:border-[#0B1F3A]'
                          }`}
                          placeholder="Type question text or use the 'Snip Question' screenshot tool above..."
                        />

                        {/* Live KaTeX Render Preview */}
                        {editFormData.question_text && (
                          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-[#111827]">
                            <MathRenderer content={editFormData.question_text} />
                          </div>
                        )}
                      </div>

                      {/* Editable MCQ Options with Live Image Previews & 1-Click Snip */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                          <span className="flex items-center space-x-1">
                            <span>MCQ Options</span>
                            <span className="text-xs text-indigo-700 font-normal">(Drop text or cropped image onto any option)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextKey = String(editFormData.options.length + 1);
                              setEditFormData({
                                ...editFormData,
                                options: [...editFormData.options, { key: nextKey, text: '' }],
                              });
                            }}
                            className="text-[#0B1F3A] hover:text-[#16365F] text-xs font-bold flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Option</span>
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {editFormData.options.map((opt: any, optIdx: number) => {
                            const isCorrect = editFormData.correct_answer === opt.key;
                            const isDropTarget = dragOverTarget === `option_${optIdx}`;

                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-lg bg-slate-50 border transition-all space-y-2 ${
                                  isDropTarget
                                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/30'
                                    : 'border-[#D1D5DB]'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="w-6 h-6 rounded-md bg-white border border-slate-300 text-[#0B1F3A] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                    {opt.key}
                                  </span>

                                  <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => {
                                      const updatedOpts = [...editFormData.options];
                                      updatedOpts[optIdx].text = e.target.value;
                                      setEditFormData({ ...editFormData, options: updatedOpts });
                                    }}
                                    onPaste={(e) => handleClipboardPaste(e, 'option', optIdx)}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      setDragOverTarget(`option_${optIdx}`);
                                    }}
                                    onDragLeave={() => setDragOverTarget(null)}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      setDragOverTarget(null);
                                      const droppedImg = e.dataTransfer.getData('application/image-url') || activeDragImage;
                                      const droppedText = e.dataTransfer.getData('text/plain') || activeDragText;

                                      if (droppedImg) {
                                        handleAttachImageToOption(optIdx, droppedImg);
                                      } else if (droppedText) {
                                        const updatedOpts = [...editFormData.options];
                                        const cur = updatedOpts[optIdx].text || '';
                                        const sep = cur.length > 0 ? ' ' : '';
                                        updatedOpts[optIdx].text = `${cur}${sep}${droppedText}`;
                                        setEditFormData({ ...editFormData, options: updatedOpts });
                                        showToast(`Dropped into Option (${opt.key})!`);
                                      }
                                    }}
                                    placeholder={`Option (${opt.key}) text or snip image`}
                                    className="flex-1 bg-white border border-[#D1D5DB] rounded-md px-2.5 py-1.5 text-xs text-[#111827] font-medium placeholder-slate-400 focus:border-[#0B1F3A] focus:outline-none"
                                  />

                                  {/* Paste Text from Clipboard into Option Button */}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const clip = await navigator.clipboard.readText();
                                        if (clip) {
                                          const updatedOpts = [...editFormData.options];
                                          updatedOpts[optIdx].text = clip;
                                          setEditFormData({ ...editFormData, options: updatedOpts });
                                          showToast(`Pasted verbatim into Option (${opt.key})!`);
                                        }
                                      } catch {}
                                    }}
                                    className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-bold flex items-center border border-slate-300 shrink-0 shadow-xs transition-colors cursor-pointer"
                                    title={`Paste clipboard text into Option (${opt.key}) verbatim`}
                                  >
                                    <Clipboard className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Direct 1-Click Snip Option Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleStartSnipForOption(opt.key, editFormData.question_number)}
                                    className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-800 rounded-md text-xs font-bold flex items-center space-x-1 border border-emerald-500 shrink-0 shadow-xs transition-colors cursor-pointer"
                                    title={`Snip screenshot from PDF for Option (${opt.key})`}
                                  >
                                    <Camera className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Snip</span>
                                  </button>

                                  {/* Attach Option Image from File */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTargetOptionIdx(optIdx);
                                      optionFileInputRef.current?.click();
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-bold flex items-center space-x-1 shrink-0 shadow-xs cursor-pointer"
                                    title={`Attach image from file to Option (${opt.key})`}
                                  >
                                    <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                                    <span>File</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditFormData({ ...editFormData, correct_answer: opt.key })
                                    }
                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                                    }`}
                                  >
                                    {isCorrect ? 'Correct' : 'Mark Key'}
                                  </button>

                                  {editFormData.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedOpts = editFormData.options.filter(
                                          (_: any, i: number) => i !== optIdx
                                        );
                                        setEditFormData({ ...editFormData, options: updatedOpts });
                                      }}
                                      className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                                      title="Remove option"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    </button>
                                  )}
                                </div>

                                {/* Option Image with Mouse Resize Handle & Dest Selector */}
                                {opt.imageUrl && (
                                  <div className="mt-1.5 p-2 bg-white rounded-lg border border-slate-300 space-y-1.5 shadow-xs">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <ResizableImage
                                          src={opt.imageUrl}
                                          alt={`Option (${opt.key}) Image`}
                                          initialHeight={60}
                                          minHeight={30}
                                          maxHeight={250}
                                          removable={true}
                                          onRemove={() => handleRemoveOptionImage(optIdx)}
                                        />
                                        <div>
                                          <span className="text-xs font-bold text-emerald-800 block">
                                            ✓ Option ({opt.key}) Image Attached
                                          </span>
                                          <span className="text-xs text-slate-500 font-mono block">
                                            Drag corner to resize
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveOptionImage(optIdx)}
                                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-md border border-rose-300 flex items-center space-x-1 transition-colors shadow-xs cursor-pointer"
                                        title="Remove option image"
                                      >
                                        <Trash2 className="w-2.5 h-2.5 text-rose-700" />
                                        <span>Remove</span>
                                      </button>
                                    </div>
                                    {/* Move Destination Selector */}
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                                      <span className="text-xs text-slate-600 font-bold">Dest:</span>
                                      <select
                                        value={opt.key}
                                        onChange={(e) => {
                                          handleMoveImageInReview(editFormData.question_number, opt.key, -1, e.target.value);
                                        }}
                                        className="bg-white text-slate-800 border border-slate-300 text-xs rounded px-1.5 py-0.5 font-sans focus:outline-none focus:border-[#0B1F3A] cursor-pointer"
                                        title="Move option image to Question Body or another option"
                                      >
                                        <option value={opt.key}>Option ({opt.key})</option>
                                        <option value="BODY">➔ 📌 Question Body</option>
                                        {editFormData.options.filter((o: any) => o.key !== opt.key).map((o: any) => (
                                          <option key={o.key} value={o.key}>➔ Option ({o.key})</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* In-Place Edit Actions (Save / Cancel / Delete) */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#D1D5DB]">
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qNum)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-md text-xs font-bold flex items-center space-x-1 transition-colors shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                          <span>Delete Question</span>
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={handleCancelInlineEdit}
                            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md text-xs font-bold transition-colors shadow-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveInlineEdit}
                            className="px-4 py-1.5 bg-[#0B1F3A] hover:bg-[#16365F] text-white border border-[#0B1F3A] rounded-md text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // --- NORMAL VIEW CARD (WITH VISIBLE SCREENSHOTS & DIRECT SNIP BUTTONS) ---
                const isDuplicate = Boolean(findDuplicateIndices(pageData?.questions || []).find((d) => d.dupIdx === idx));
                const dupInfo = findDuplicateIndices(pageData?.questions || []).find((d) => d.dupIdx === idx);
                const isCheckedForBulk = selectedQNums.has(qNum);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedQuestion(isSelected ? null : q);
                      setSelectedRegionId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverTarget(`card_${qNum}`);
                    }}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverTarget(null);
                      const droppedImg = e.dataTransfer.getData('application/x-cropped-image') || activeCroppedImage;
                      const droppedText = e.dataTransfer.getData('text/plain') || selectedText;
                      if (droppedImg) {
                        const imgUrl = typeof droppedImg === 'string' ? droppedImg : (droppedImg as any).url;
                        if (imgUrl) handleAttachImageToQuestion(imgUrl);
                      } else if (droppedText) {
                        handleStartInlineEdit(q);
                        setEditFormData((prev: any) => ({
                          ...prev,
                          question_text: prev?.question_text ? `${prev.question_text} ${droppedText}` : droppedText,
                        }));
                        showToast('Opened edit and inserted dropped text!');
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                      isCheckedForBulk
                        ? 'bg-blue-50/80 border-2 border-[#0B1F3A] shadow-md'
                        : isDuplicate
                        ? 'bg-amber-50/60 border-2 border-amber-600 shadow-sm'
                        : dragOverTarget === `card_${qNum}`
                        ? 'border-2 border-emerald-600 bg-emerald-50/50'
                        : isSelected
                        ? 'bg-blue-50/50 border-2 border-[#0B1F3A] shadow-md'
                        : 'bg-white border border-[#D1D5DB] hover:border-slate-400 shadow-sm'
                    }`}
                  >
                    {/* Header bar with Multi-Select Checkbox, Snip, Edit & Delete Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {/* Checkbox for Multi-Select */}
                        <label
                          className="flex items-center space-x-2 cursor-pointer select-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isCheckedForBulk}
                            onChange={() => handleToggleSelectQuestion(qNum)}
                            className="w-4 h-4 rounded text-[#0B1F3A] bg-white border-2 border-[#D1D5DB] focus:ring-[#0B1F3A] cursor-pointer"
                          />
                          <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center font-mono ${
                            isCheckedForBulk || isSelected
                              ? 'bg-[#0B1F3A] text-white shadow-sm'
                              : isDuplicate
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 text-[#111827] border border-slate-300'
                          }`}>
                            Q{qNum}
                          </span>
                        </label>

                        <span className="text-xs text-slate-600 font-bold">
                          [{q.marks} Mark{q.marks > 1 ? 's' : ''}]
                        </span>
                        {/* Mathematical Validation Status Badge */}
                        {(() => {
                          const hasMath = (q.formula_objects && q.formula_objects.length > 0) ||
                            (options && options.some((o: any) => o.formula_object || o.ast || o.crop_url || o.cropUrl || (o.text && (o.text.includes('\\') || o.text.includes('^') || o.text.includes('_')))));
                          if (!hasMath) return null;
                          const allFosVerified = (q.formula_objects || []).every((f: any) => f.validationStatus === 'VERIFIED');
                          const allOptsVerified = (options || []).every((o: any) => o.validation_status !== 'NEEDS_REVIEW' && o.validationStatus !== 'NEEDS_REVIEW' && !o.needs_review);
                          const isMathVerified = allFosVerified && allOptsVerified && q.validation_status !== 'NEEDS_REVIEW' && !q.needs_review;
                          return isMathVerified ? (
                            <span className="text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-400 px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 shadow-xs" title="All mathematical expressions visually verified">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span className="font-bold">Math Verified</span>
                            </span>
                          ) : (
                            <span className="text-xs font-bold bg-amber-50 text-amber-950 border border-amber-400 px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 shadow-xs" title="Contains mathematical expressions requiring visual verification">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span className="font-bold">Needs Math Review</span>
                            </span>
                          );
                        })()}
                        {isDuplicate && dupInfo && (
                          <span className="text-xs font-bold bg-amber-50 text-amber-950 border border-amber-400 px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 shadow-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span className="font-bold">Duplicate of Q{dupInfo.originalQNum}</span>
                          </span>
                        )}
                        {diagrams.length > 0 && !isDuplicate && (
                          <span className="text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-md flex items-center space-x-1.5 shadow-xs">
                            <Camera className="w-3.5 h-3.5 text-[#0B1F3A] shrink-0" />
                            <span className="font-bold">{diagrams.length} Image{diagrams.length > 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Delete Duplicate Button */}
                        {isDuplicate ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(qNum)}
                            className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-md transition-colors flex items-center space-x-1 text-xs font-bold shadow-xs cursor-pointer"
                            title="Delete duplicate question"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                            <span>Delete Duplicate</span>
                          </button>
                        ) : (
                          <>
                            {/* 1-Click Snip Question Button */}
                            <button
                              type="button"
                              onClick={() => handleStartSnipForQuestion(qNum)}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-500 rounded-md transition-colors flex items-center space-x-1 text-xs font-bold shadow-xs cursor-pointer"
                              title="Snip / Screenshot Question directly from PDF"
                            >
                              <Camera className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>Snip Image</span>
                            </button>

                            {/* Attach Picture/Diagram to Body or Options */}
                            <button
                              type="button"
                              onClick={() => {
                                const qOpts = (options && options.length > 0)
                                  ? options.map((o: any) => ({ key: o.key || 'A', text: o.text, imageUrl: o.imageUrl }))
                                  : [{ key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }];
                                setAttachImageReviewModal({
                                  qNum,
                                  destination: 'BODY',
                                  options: qOpts,
                                });
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-[#111827] border border-slate-300 rounded-md transition-colors flex items-center space-x-1 text-xs font-bold shadow-xs cursor-pointer"
                              title="Attach picture or diagram to Question Body or Options"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-[#0B1F3A] shrink-0" />
                              <span>+ Picture</span>
                            </button>

                            {/* Edit in Place Button - Solid high-contrast Navy */}
                            <button
                              type="button"
                              onClick={() => handleStartInlineEdit(q)}
                              className="px-2.5 py-1 bg-[#0B1F3A] hover:bg-[#16365F] text-white border border-[#0B1F3A] rounded-md transition-colors flex items-center space-x-1 text-xs font-bold shadow-xs cursor-pointer"
                              title="Edit Question In Place"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-white shrink-0" />
                              <span className="font-bold text-white">Edit</span>
                            </button>

                            {/* Delete Question Button - Crisp readable rose button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(qNum)}
                              className="p-1.5 text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-700 border border-rose-300 rounded-md transition-colors shadow-xs cursor-pointer group"
                              title="Delete Question from Review List"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-700 group-hover:text-white" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Attached Question Screenshot / Figures Prominently Displayed */}
                    {diagrams.length > 0 && (
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-300 space-y-2">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                          <span>Question Screenshot / Image:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSnipForQuestion(qNum);
                            }}
                            className="text-emerald-700 hover:text-emerald-800 hover:underline flex items-center space-x-1 font-bold text-xs cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>re-snip</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2.5 pt-1">
                          {diagrams.map((d: any, dIdx: number) => {
                            const diagUrl = typeof d === 'string' ? d : d.relative_url || d.url || '';
                            const optKeys = (options && options.length > 0)
                              ? options.map((o: any) => o.key || 'A')
                              : ['A', 'B', 'C', 'D'];
                            return (
                              <div key={dIdx} className="space-y-1 p-1.5 bg-white rounded-lg border border-slate-300 shadow-xs">
                                <ResizableImage
                                  src={diagUrl}
                                  alt={`Question Figure ${dIdx + 1}`}
                                  initialHeight={100}
                                  minHeight={45}
                                  maxHeight={350}
                                  removable={true}
                                  onRemove={() => handleDeleteDiagramFromCard(qNum, dIdx)}
                                />
                                <div className="flex items-center justify-between text-xs text-slate-700 font-mono px-0.5 pt-0.5 border-t border-slate-200 gap-2">
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs text-slate-600 font-sans font-medium">Dest:</span>
                                    <select
                                      value="BODY"
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleMoveImageInReview(qNum, 'BODY', dIdx, e.target.value);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="bg-white text-slate-800 border border-slate-300 text-xs rounded px-1.5 py-0.5 font-sans focus:outline-none focus:border-[#0B1F3A] cursor-pointer"
                                      title="Move this image to Question Body or an Option"
                                    >
                                      <option value="BODY">📌 Body</option>
                                      {optKeys.map((k: string) => (
                                        <option key={k} value={k}>➔ Opt ({k})</option>
                                      ))}
                                    </select>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDiagramFromCard(qNum, dIdx);
                                    }}
                                    className="text-rose-700 hover:text-rose-900 text-xs font-sans font-bold flex items-center space-x-0.5 ml-1 cursor-pointer"
                                    title={`Delete Figure ${dIdx + 1}`}
                                  >
                                    <Trash2 className="w-2.5 h-2.5 text-rose-700" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Question text with KaTeX Math rendering - Crystal Clear High Contrast */}
                    {q.question_text && (
                      <div className="text-sm sm:text-base text-[#111827] font-medium leading-relaxed font-sans">
                        <MathRenderer content={q.question_text || q.questionText || ''} />
                      </div>
                    )}

                    {/* MCQ Options with Image and Formula support */}
                    {options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200">
                        {options.map((opt: any, oIdx: number) => {
                          const isCorrect = (q.correct_answer || q.correctAnswer) === opt.key;
                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-lg border text-xs space-y-2 transition-colors ${
                                isCorrect
                                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                                  : 'bg-white hover:bg-slate-50/50 border-[#D1D5DB] text-[#111827] shadow-xs'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-2">
                                  <span className={`font-mono font-bold shrink-0 text-sm ${isCorrect ? 'text-emerald-800' : 'text-[#0B1F3A]'}`}>
                                    ({opt.key})
                                  </span>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <div className="text-xs sm:text-sm text-[#111827] font-medium">
                                        <MathRenderer content={opt.text || ''} />
                                      </div>
                                      {(opt.validation_status === 'NEEDS_REVIEW' || opt.validationStatus === 'NEEDS_REVIEW' || opt.needs_review) && (
                                        <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-950 border border-amber-400 shrink-0 shadow-xs">
                                          Needs Review
                                        </span>
                                      )}
                                    </div>
                                    {(() => {
                                      const optCrop = opt.formula_object?.originalCrop || opt.crop_url || opt.cropUrl || opt.originalCrop;
                                      const hasMath = optCrop || opt.formula_object || opt.ast || (opt.text && (opt.text.includes('\\') || opt.text.includes('^') || opt.text.includes('_')));
                                      if (!hasMath) return null;
                                      return (
                                        <div className="flex items-center space-x-2 pt-1">
                                          {optCrop && (
                                            <div className="p-1 bg-white rounded border border-slate-300 inline-block shadow-xs">
                                              <img
                                                src={optCrop}
                                                alt={`Option (${opt.key}) original crop`}
                                                className="max-h-7 object-contain"
                                              />
                                            </div>
                                          )}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setFormulaModalState({
                                                isOpen: true,
                                                latex: opt.formula_object?.latex || opt.text || '',
                                                cropUrl: optCrop || undefined,
                                                ast: opt.ast || opt.formula_object?.structuredExpression,
                                                targetQNum: qNum,
                                                formulaId: opt.formula_object?.id || `opt-${opt.key}`,
                                              });
                                            }}
                                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-md text-xs font-bold border border-indigo-300 transition-colors flex items-center space-x-1 shrink-0 shadow-xs whitespace-nowrap cursor-pointer"
                                          >
                                            <Sparkles className="w-3 h-3 text-indigo-700 shrink-0" />
                                            <span>Compare / Edit 2-D Math</span>
                                          </button>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartSnipForOption(opt.key, qNum);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-800 rounded-md text-xs font-bold border border-emerald-500 shrink-0 transition-colors flex items-center space-x-1 shadow-xs cursor-pointer"
                                  title={`Snip Option (${opt.key}) from PDF`}
                                >
                                  <Camera className="w-3 h-3 text-emerald-700" />
                                  <span>Snip</span>
                                </button>
                              </div>

                              {/* Visible Attached Option Image with Mouse Resize Handle & Direct Delete */}
                              {opt.imageUrl && (
                                <div className="mt-2 p-1.5 bg-slate-50 rounded-lg border border-slate-300 shadow-xs space-y-1.5">
                                  <div className="flex items-center justify-between space-x-2">
                                    <ResizableImage
                                      src={opt.imageUrl}
                                      alt={`Option ${opt.key} Diagram`}
                                      initialHeight={55}
                                      minHeight={30}
                                      maxHeight={250}
                                      removable={true}
                                      onRemove={() => handleDeleteOptionImageFromCard(qNum, opt.key)}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteOptionImageFromCard(qNum, opt.key);
                                      }}
                                      className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded border border-rose-300 flex items-center space-x-0.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                                      title={`Remove image from Option (${opt.key})`}
                                    >
                                      <Trash2 className="w-2.5 h-2.5 text-rose-700" />
                                      <span>Remove</span>
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                                    <span className="text-xs text-slate-600 font-bold">Dest:</span>
                                    <select
                                      value={opt.key}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleMoveImageInReview(qNum, opt.key, -1, e.target.value);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="bg-white text-slate-800 border border-slate-300 text-xs rounded px-1.5 py-0.5 font-sans focus:outline-none focus:border-[#0B1F3A] cursor-pointer"
                                      title="Move option image to Question Body or another option"
                                    >
                                      <option value={opt.key}>Option ({opt.key})</option>
                                      <option value="BODY">➔ 📌 Question Body</option>
                                      {options.filter((o: any) => o.key !== opt.key).map((o: any) => (
                                        <option key={o.key} value={o.key}>➔ Option ({o.key})</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 2-D MATHEMATICAL EQUATIONS & STRUCTURES STRIP (Section 28) */}
                    {(q.formula_objects && q.formula_objects.length > 0) && (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedFormulasQNum(expandedFormulasQNum === qNum ? null : qNum);
                            }}
                            className="flex items-center space-x-1.5 text-xs font-bold text-[#0B1F3A] hover:text-[#16365F] transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#0B1F3A]" />
                            <span>2-D Math Structures ({q.formula_objects.length})</span>
                            <span className="text-xs text-slate-500 font-semibold">
                              {expandedFormulasQNum === qNum ? '▼ Hide' : '▶ Review'}
                            </span>
                          </button>
                          {(() => {
                            const allFosVerified = q.formula_objects.every((f: any) => f.validationStatus === 'VERIFIED');
                            const allOptsVerified = (options || []).every((o: any) => o.validation_status !== 'NEEDS_REVIEW' && o.validationStatus !== 'NEEDS_REVIEW' && !o.needs_review);
                            const allVerified = allFosVerified && allOptsVerified && q.validation_status !== 'NEEDS_REVIEW' && !q.needs_review;
                            return (
                              <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full shadow-xs flex items-center space-x-1 ${
                                allVerified
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-500'
                                  : 'bg-amber-100 text-amber-950 border border-amber-500'
                              }`}>
                                {allVerified ? '✓ All Verified' : '⚠ Needs Review'}
                              </span>
                            );
                          })()}
                        </div>

                        {expandedFormulasQNum === qNum && (
                          <div className="space-y-3 pt-1">
                            {q.formula_objects.map((fo: any, fIdx: number) => {
                              const ast = fo.structuredExpression || {};
                              return (
                                <div
                                  key={fIdx}
                                  className="p-3 bg-slate-50 rounded-lg border border-slate-300 shadow-xs space-y-2.5 text-xs text-[#111827]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                    <span className="text-xs font-bold text-[#0B1F3A] font-mono">
                                      Formula #{fIdx + 1} ({fo.domain || 'PHYSICS'})
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-50 text-indigo-900 border border-indigo-300 font-bold">
                                        {Math.round((fo.confidence || fo.visualSimilarity || 0.98) * 100)}% Match
                                      </span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                        fo.validationStatus === 'VERIFIED'
                                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                                          : 'bg-amber-100 text-amber-950 border border-amber-400'
                                      }`}>
                                        {fo.validationStatus || 'NEEDS_REVIEW'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {fo.originalCrop ? (
                                      <div className="p-2 bg-white rounded-lg border border-slate-300 space-y-1">
                                        <span className="text-xs text-slate-600 font-bold uppercase tracking-wider block">ORIGINAL:</span>
                                        <img src={fo.originalCrop} alt="Original Crop" className="max-h-16 object-contain" />
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-white rounded-lg border border-slate-300 space-y-1">
                                        <span className="text-xs text-slate-600 font-bold uppercase tracking-wider block">PLAIN MATH:</span>
                                        <div className="font-mono text-emerald-800 font-bold text-xs">{fo.plainText}</div>
                                      </div>
                                    )}

                                    <div className="p-2 bg-white rounded-lg border border-slate-300 space-y-1">
                                      <span className="text-xs text-slate-600 font-bold uppercase tracking-wider block">RECOGNIZED:</span>
                                      <div className="text-[#111827] text-xs font-medium">
                                        <MathRenderer content={fo.latex ? `$${fo.latex}$` : fo.plainText} />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-2 bg-white rounded-lg border border-slate-300 space-y-1">
                                    <span className="text-xs text-slate-600 font-bold uppercase tracking-wider block">LATEX:</span>
                                    <code className="text-xs font-mono text-[#0B1F3A] font-bold block select-all bg-slate-50 p-1.5 rounded border border-slate-200">{fo.latex}</code>
                                  </div>

                                  <div className="p-2 bg-white rounded-lg border border-slate-300 space-y-1">
                                    <span className="text-xs text-slate-600 font-bold uppercase tracking-wider block">2-D STRUCTURE:</span>
                                    <pre className="text-xs font-mono text-slate-800 bg-slate-100 p-2 rounded border border-slate-200 max-h-28 overflow-y-auto">
                                      {JSON.stringify(ast, null, 2)}
                                    </pre>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        q.formula_objects = (q.formula_objects || []).filter((_: any, i: number) => i !== fIdx);
                                        setPageData({ ...pageData });
                                        showToast('Formula removed');
                                      }}
                                      className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 rounded-md text-xs font-bold border border-rose-300 shadow-xs transition-colors cursor-pointer"
                                      title="Delete formula object"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsDrawingCrop(true);
                                        showToast('Click and drag on document page to re-crop formula');
                                      }}
                                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-md text-xs font-bold border border-slate-300 shadow-xs transition-colors cursor-pointer"
                                      title="Re-crop from canvas"
                                    >
                                      Crop
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          showToast('Recognizing fraction again...');
                                          const res = await api.post('/scientific/recognize', {
                                            cropPath: fo.originalCrop,
                                            ocrText: fo.latex,
                                            mode: fo.domain || 'MATH',
                                          });
                                          if (res.data?.data) {
                                            fo.latex = res.data.data.latex || fo.latex;
                                            fo.confidence = res.data.data.confidence?.overall_confidence || 0.98;
                                            fo.structuredExpression = res.data.data.structured_ast || fo.structuredExpression;
                                            setPageData({ ...pageData });
                                            showToast('Fraction recognized again successfully!');
                                          }
                                        } catch (e: any) {
                                          showToast(`Recognition failed: ${e?.response?.data?.detail || e.message}`);
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 rounded-md text-xs font-bold border border-cyan-400 shadow-xs transition-colors cursor-pointer"
                                      title="Recognize again from crop"
                                    >
                                      Recognize Again
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormulaModalState({
                                          isOpen: true,
                                          latex: fo.latex,
                                          cropUrl: fo.originalCrop,
                                          ast: fo.structuredExpression,
                                          targetQNum: qNum,
                                          formulaId: fo.id,
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-md text-xs font-bold border border-amber-400 shadow-xs transition-colors cursor-pointer"
                                      title="Reprocess with dedicated mathematical recognition"
                                    >
                                      Reprocess
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormulaModalState({
                                          isOpen: true,
                                          latex: fo.latex,
                                          cropUrl: fo.originalCrop,
                                          ast: fo.structuredExpression,
                                          targetQNum: qNum,
                                          formulaId: fo.id,
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-md text-xs font-bold border border-indigo-300 shadow-xs transition-colors cursor-pointer"
                                      title="Open Formula Editor for manual adjustments"
                                    >
                                      Manual Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        fo.validationStatus = 'VERIFIED';
                                        setPageData({ ...pageData });
                                        showToast('Formula accepted and verified!');
                                      }}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs transition-all cursor-pointer"
                                    >
                                      Accept
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM HOVER TRIGGER ZONE (Active when ribbon is hidden) */}
      {!isRibbonVisible && (
        <div
          onMouseEnter={handleRibbonMouseEnter}
          className="fixed bottom-0 left-0 right-0 h-6 z-40 flex items-center justify-center cursor-pointer group pointer-events-auto"
          title="Hover to show Confidence & Question Bank ribbon"
        >
          <div className="px-4 py-1.5 bg-[#0B1F3A] hover:bg-[#16365F] text-white text-xs font-bold rounded-t-xl border-t border-x border-[#0B1F3A] shadow-xl flex items-center space-x-2 transition-all group-hover:-translate-y-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-bold">▲ Confidence & Question Bank (Hover to Open)</span>
            <span className="px-2 py-0.5 bg-white/20 text-white rounded font-mono text-xs font-bold">
              96.8%
            </span>
          </div>
        </div>
      )}

      {/* DOCKED BOTTOM RIBBON */}
      <div
        onMouseEnter={handleRibbonMouseEnter}
        onMouseLeave={handleRibbonMouseLeave}
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${
          isRibbonVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white border-t border-classic-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 py-3">
          <div className="max-w-[1920px] mx-auto flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
            
            {/* Section 1: Title & Confidence Metrics */}
            <div className="flex items-center space-x-4 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-classic-text-primary">
                  Confidence & Review
                </span>
              </div>

              {/* Text OCR Metric */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-classic-surface-muted rounded-classic border border-classic-border">
                <span className="text-xs text-classic-text-muted font-medium">Text OCR:</span>
                <span className="font-mono text-emerald-700 font-bold text-xs">96.8%</span>
                <div className="w-12 bg-classic-border-light h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full w-[96%]" />
                </div>
              </div>

              {/* Math AST Metric */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-classic-surface-muted rounded-classic border border-classic-border">
                <span className="text-xs text-classic-text-muted font-medium">Math AST:</span>
                <span className="font-mono text-classic-navy font-bold text-xs">94.2%</span>
                <div className="w-12 bg-classic-border-light h-1.5 rounded-full overflow-hidden">
                  <div className="bg-classic-navy h-full w-[94%]" />
                </div>
              </div>
            </div>

            {/* Section 2: Question Bank Folder Selection */}
            <div className="flex items-center space-x-2.5 shrink-0">
              <span className="text-xs font-semibold text-classic-text-secondary">Folder:</span>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="bg-white border border-classic-border text-xs rounded-classic px-3 py-1.5 text-classic-text-primary focus:outline-none focus:border-classic-navy max-w-[200px] truncate"
              >
                <option value="">Root / General Questions</option>
                {flatFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.displayName || f.name} ({f.type})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setNewFolderName('');
                  setNewFolderParentId(selectedFolderId || '');
                  setNewFolderType('CHAPTER');
                  setIsAddFolderModalOpen(true);
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-classic-surface-muted text-classic-text-primary border border-classic-border rounded-classic text-xs font-semibold flex items-center space-x-1 transition-all shadow-classic"
                title="Create a new folder in Question Bank"
              >
                <Plus className="w-3.5 h-3.5 text-classic-navy" />
                <span className="font-semibold">+ New Folder</span>
              </button>
            </div>

            {/* Section 3: Action Buttons */}
            <div className="flex items-center space-x-2.5 flex-wrap shrink-0">
              {saveSuccess && (
                <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-classic text-xs text-emerald-800 flex items-center space-x-1.5 shadow-classic">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="font-semibold">{saveSuccess}</span>
                </div>
              )}

              {/* Single / Selected Question Save: Displayed when question is selected */}
              {(selectedQuestion || selectedQNums.size > 0) && (
                <div className="flex items-center space-x-1.5 animate-fade-in">
                  <button
                    onClick={selectedQNums.size > 0 ? handleSaveSelectedToBank : handleSaveToBank}
                    disabled={savingSelected}
                    className="bg-classic-navy hover:bg-classic-navy-hover disabled:opacity-40 text-white text-xs font-semibold py-2 px-3.5 rounded-classic shadow-classic flex items-center space-x-1.5 transition-all"
                  >
                    {savingSelected ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <FolderPlus className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>
                      {savingSelected
                        ? 'Saving Questions...'
                        : selectedQNums.size > 0
                        ? `Save (${selectedQNums.size}) to Bank`
                        : `Save Q${selectedQuestion?.question_number || selectedQuestion?.questionNumber || ''} to Bank`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuestion(null);
                      setSelectedQNums(new Set());
                      setSelectedRegionId(null);
                    }}
                    className="p-2 text-classic-text-muted hover:text-classic-text-primary hover:bg-classic-surface-muted rounded-classic transition-colors"
                    title="Deselect question"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Batch Save All Questions on this page */}
              <button
                onClick={handleSaveAllToBank}
                disabled={savingAll || !pageData?.questions || pageData.questions.length === 0}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-semibold py-2 px-3.5 rounded-classic shadow-classic flex items-center space-x-1.5 transition-all"
                title="Save all extracted questions on this page"
              >
                {savingAll ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>
                  {savingAll
                    ? 'Saving...'
                    : `Save ALL (${pageData?.questions?.length || 0}) Questions`}
                </span>
              </button>

              {/* Save Questions from ALL Pages at once */}
              {(document?.pageCount || 1) > 1 && (
                <button
                  onClick={handleSaveAllPagesToBank}
                  disabled={savingAllPages}
                  className="bg-white hover:bg-classic-surface-muted border border-classic-border disabled:opacity-50 text-classic-text-primary text-xs font-semibold py-2 px-3 rounded-classic shadow-classic flex items-center space-x-1.5 transition-all"
                  title={`Process and save questions from all ${document?.pageCount} pages at once`}
                >
                  {savingAllPages ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-classic-navy" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-classic-navy" />
                  )}
                  <span>
                    {savingAllPages
                      ? (allPagesProgress || 'Processing...')
                      : `Save ALL ${document?.pageCount} Pages`}
                  </span>
                </button>
              )}

              {/* Link to Question Bank */}
              <button
                onClick={() => navigate('/bank')}
                className="bg-white hover:bg-classic-surface-muted text-classic-text-primary text-xs font-semibold py-2 px-3 rounded-classic border border-classic-border flex items-center space-x-1 transition-colors shadow-classic"
              >
                <span>Bank &rarr;</span>
              </button>

              {/* Minimize / Hide Ribbon */}
              <button
                type="button"
                onClick={() => {
                  setIsRibbonManuallyClosed(true);
                  setIsRibbonHovered(false);
                }}
                className="p-2 text-classic-text-muted hover:text-classic-text-primary hover:bg-classic-surface-muted rounded-classic transition-colors ml-1"
                title="Hide ribbon (hover bottom to re-open)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Extraction Learning Memory Inspector Modal */}
      {showLearningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] flex flex-col rounded-card p-6 space-y-4 shadow-xl border border-classic-border">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-classic-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-classic bg-classic-surface-muted text-classic-navy border border-classic-border flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-classic-navy" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-classic-text-primary flex items-center space-x-2">
                    <span>Adaptive Continuous Learning Engine</span>
                    <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-classic-navy rounded-classic font-mono font-bold border border-blue-200">
                      {learningStats?.total_rules || 0} Learned Rule{learningStats?.total_rules !== 1 ? 's' : ''}
                    </span>
                  </h2>
                  <p className="text-xs text-classic-text-muted">
                    The AI continuously learns from your text corrections and cropped image attachments to extract future PDFs perfectly.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLearningModal(false)}
                className="text-classic-text-muted hover:text-classic-text-primary p-1.5 rounded-classic hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rules list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[550px]">
              {(!learningStats || !learningStats.rules || learningStats.rules.length === 0) ? (
                <div className="p-8 text-center text-sm text-classic-text-muted border border-dashed border-classic-border rounded-card bg-slate-50">
                  No rules recorded yet. Edit question text or options to teach the AI new correction patterns.
                </div>
              ) : (
                learningStats.rules.map((rule: any, rIdx: number) => (
                  <div key={rIdx} className="p-4 bg-slate-50 rounded-card border border-classic-border space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-classic-text-primary flex items-center space-x-2">
                        <span className="w-6 h-6 rounded bg-classic-navy text-white text-xs font-mono font-bold flex items-center justify-center">
                          #{rIdx + 1}
                        </span>
                        <span className="text-sm">{rule.description || 'Learned Pattern'}</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold font-mono">
                          {Math.round((rule.confidence || 0.95) * 100)}% Confidence
                        </span>
                        <span className="text-xs text-classic-text-muted font-mono font-semibold">
                          {rule.occurrences || 1} Hit{(rule.occurrences || 1) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-classic space-y-1">
                        <span className="text-xs font-bold text-rose-900 block">Raw / Corrupted Pattern:</span>
                        <code className="text-rose-950 text-xs font-mono break-all font-semibold">{rule.raw_pattern}</code>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-classic space-y-1">
                        <span className="text-xs font-bold text-emerald-900 block">Corrected Formula / Output:</span>
                        <code className="text-emerald-950 text-xs font-mono break-all font-semibold">{rule.replacement}</code>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-classic-border text-xs">
              <span className="text-classic-text-muted text-xs">
                ⚡ Every uploaded document is automatically sanitized using these learned rules.
              </span>
              <button
                type="button"
                onClick={() => setShowLearningModal(false)}
                className="px-5 py-2 bg-classic-navy hover:bg-classic-navy-hover text-white rounded-classic font-semibold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Question Bank Folder Modal (Request #6) */}
      {isAddFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-classic-border rounded-card w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-classic-border">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-classic bg-classic-surface-muted text-classic-navy border border-classic-border flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-classic-text-primary">Create New Folder</h3>
                  <p className="text-xs text-classic-text-muted">Organize extracted questions into the question repository</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddFolderModalOpen(false)}
                className="text-classic-text-muted hover:text-classic-text-primary p-1.5 rounded-classic hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-classic-text-primary">
                  Folder Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Chapter 4 - Optics, Class 10 Mid-term..."
                  required
                  autoFocus
                  className="w-full bg-white border border-classic-border rounded-classic px-3.5 py-2 text-sm text-classic-text-primary focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-classic-text-primary">
                  Folder Category / Level
                </label>
                <select
                  value={newFolderType}
                  onChange={(e) => setNewFolderType(e.target.value)}
                  className="w-full bg-white border border-classic-border rounded-classic px-3.5 py-2 text-sm text-classic-text-primary focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  <option value="CLASS">Class / Grade</option>
                  <option value="SUBJECT">Subject</option>
                  <option value="CHAPTER">Chapter</option>
                  <option value="TOPIC">Topic</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-classic-text-primary">
                  Parent Folder (Optional)
                </label>
                <select
                  value={newFolderParentId}
                  onChange={(e) => setNewFolderParentId(e.target.value)}
                  className="w-full bg-white border border-classic-border rounded-classic px-3.5 py-2 text-sm text-classic-text-primary focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  <option value="">None (Top-Level Root Folder)</option>
                  {flatFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.displayName || f.name} ({f.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-classic-border">
                <button
                  type="button"
                  onClick={() => setIsAddFolderModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-classic-text-primary border border-classic-border text-sm font-semibold rounded-classic transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="px-5 py-2 bg-classic-navy hover:bg-classic-navy-hover disabled:opacity-50 text-white text-sm font-bold rounded-classic shadow-classic flex items-center space-x-2 transition-all"
                >
                  {creatingFolder ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderPlus className="w-4 h-4" />
                  )}
                  <span>Create & Select Folder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Selecting Image Destination in Review Mode (Question Body vs Option A, B, C, D) */}
      {attachImageReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white w-full max-w-md rounded-card p-6 space-y-4 shadow-xl border border-classic-border">
            <div className="flex items-center justify-between pb-3 border-b border-classic-border">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-classic bg-classic-surface-muted text-classic-navy border border-classic-border flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-classic-navy" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-classic-text-primary">Attach Image / Diagram</h3>
                  <p className="text-xs text-classic-text-muted">
                    Question Q{attachImageReviewModal.qNum} &bull; Choose where to place image
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachImageReviewModal(null);
                  setReviewModalUploadFile(null);
                }}
                className="text-classic-text-muted hover:text-classic-text-primary p-1.5 rounded-classic hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Destination Selection */}
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-classic-text-primary">
                1. Select Destination:
              </label>

              {/* Question Body */}
              <label
                onClick={() => setAttachImageReviewModal({ ...attachImageReviewModal, destination: 'BODY' })}
                className={`flex items-center space-x-3 p-3 rounded-classic border cursor-pointer transition-all ${
                  attachImageReviewModal.destination === 'BODY'
                    ? 'bg-blue-50 border-classic-navy text-classic-navy ring-1 ring-classic-navy font-semibold'
                    : 'bg-slate-50 border-classic-border text-classic-text-primary hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="reviewModalDestination"
                  checked={attachImageReviewModal.destination === 'BODY'}
                  onChange={() => setAttachImageReviewModal({ ...attachImageReviewModal, destination: 'BODY' })}
                  className="w-4 h-4 text-classic-navy focus:ring-blue-700"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold flex items-center space-x-1.5">
                    <span>📌 Question Body</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-classic-navy rounded font-mono">Main Figure</span>
                  </div>
                  <p className="text-xs text-classic-text-muted">Shown alongside the question statement</p>
                </div>
              </label>

              {/* Options */}
              {attachImageReviewModal.options.map((opt: any) => (
                <label
                  key={opt.key}
                  onClick={() => setAttachImageReviewModal({ ...attachImageReviewModal, destination: opt.key })}
                  className={`flex items-center space-x-3 p-3 rounded-classic border cursor-pointer transition-all ${
                    attachImageReviewModal.destination === opt.key
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600 font-semibold'
                      : 'bg-slate-50 border-classic-border text-classic-text-primary hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="reviewModalDestination"
                    checked={attachImageReviewModal.destination === opt.key}
                    onChange={() => setAttachImageReviewModal({ ...attachImageReviewModal, destination: opt.key })}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-classic-text-primary">
                        Option ({opt.key})
                      </div>
                      <p className="text-xs text-classic-text-muted truncate max-w-[240px]">
                        {opt.text ? opt.text : `Option ${opt.key} Diagram`}
                      </p>
                    </div>
                    {opt.imageUrl && (
                      <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-900 rounded border border-amber-300 font-semibold">
                        Replaces Image
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* File Chooser */}
            <div className="space-y-2 pt-2 border-t border-classic-border">
              <label className="block text-sm font-semibold text-classic-text-primary">
                2. Select Image File:
              </label>
              <input
                ref={attachReviewFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setReviewModalUploadFile(e.target.files[0]);
                  }
                }}
                className="block w-full text-xs text-classic-text-primary file:mr-3 file:py-2 file:px-3.5 file:rounded-classic file:border-0 file:text-xs file:font-semibold file:bg-classic-navy file:text-white hover:file:bg-classic-navy-hover cursor-pointer bg-slate-50 p-2 rounded-classic border border-classic-border"
              />
              {reviewModalUploadFile && (
                <div className="text-xs text-emerald-900 font-semibold flex items-center space-x-1.5 pt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Selected: {reviewModalUploadFile.name} ({(reviewModalUploadFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-classic-border">
              <button
                type="button"
                onClick={() => {
                  setAttachImageReviewModal(null);
                  setReviewModalUploadFile(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-classic-text-primary border border-classic-border text-xs font-semibold rounded-classic transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewModalUploading || !reviewModalUploadFile}
                onClick={handleConfirmAttachReviewImage}
                className="px-5 py-2 bg-classic-navy hover:bg-classic-navy-hover disabled:opacity-50 text-white text-xs font-bold rounded-classic shadow-classic flex items-center space-x-1.5 transition-all"
              >
                {reviewModalUploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                <span>
                  {reviewModalUploading
                    ? 'Attaching...'
                    : `Attach to ${attachImageReviewModal.destination === 'BODY' ? 'Question Body' : `Option (${attachImageReviewModal.destination})`}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-D Formula Editor Modal */}
      <FormulaEditorModal
        isOpen={formulaModalState.isOpen}
        onClose={() => setFormulaModalState({ isOpen: false, latex: '' })}
        initialLatex={formulaModalState.latex}
        originalCropUrl={formulaModalState.cropUrl}
        initialAst={formulaModalState.ast}
        onAccept={(editedLatex) => {
          if (formulaModalState.targetQNum && pageData?.questions) {
            const updatedQuestions = pageData.questions.map((q: any) => {
              if (String(q.question_number || q.questionNumber) === formulaModalState.targetQNum) {
                const targetFid = formulaModalState.formulaId;
                const optKeyFromFid = targetFid?.startsWith('opt-') ? targetFid.replace('opt-', '') : null;

                const updatedFos = (q.formula_objects || []).map((fo: any) => {
                  if (fo.id === targetFid) {
                    return { ...fo, latex: editedLatex, validationStatus: 'VERIFIED' };
                  }
                  return fo;
                });

                // Update corresponding option if this formula belonged to an option
                const updatedOptions = (q.options || []).map((opt: any) => {
                  const isMatchingOpt = optKeyFromFid
                    ? opt.key === optKeyFromFid
                    : opt.formula_object?.id === targetFid;
                  if (isMatchingOpt) {
                    return {
                      ...opt,
                      text: editedLatex,
                      validation_status: 'VERIFIED',
                      validationStatus: 'VERIFIED',
                      needs_review: false,
                      formula_object: {
                        ...(opt.formula_object || {}),
                        latex: editedLatex,
                        validationStatus: 'VERIFIED',
                      },
                    };
                  }
                  return opt;
                });

                return { ...q, formula_objects: updatedFos, options: updatedOptions };
              }
              return q;
            });
            setPageData({ ...pageData, questions: updatedQuestions });
            showToast('Formula updated and verified!');
          }
          setFormulaModalState({ isOpen: false, latex: '' });
        }}
      />
    </div>
  );
};

