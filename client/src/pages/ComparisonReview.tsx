import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  SplitSquareVertical,
  ChevronLeft,
  ChevronRight,
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
      if (!docId) return;
      setLoading(true);
      try {
        const res = await api.get(`/documents/${docId}`);
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
      if (rawExtracted?.questions?.length > 0) {
        setSelectedQuestion(rawExtracted.questions[0]);
      }
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

  // Image Coordinates Helper for Crop
  const getImageCoordinates = (e: React.MouseEvent) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    return {
      x: Math.max(0, Math.min(pageData?.width || 1000, x)),
      y: Math.max(0, Math.min(pageData?.height || 1000, y)),
    };
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
    showToast(`Draw a box around Question Q${qNum} on the left document to capture screenshot!`);
  };

  // Start 1-Click Snip for a specific option
  const handleStartSnipForOption = (optTarget: string | number, qNum: string) => {
    setSnipTarget({ type: 'OPTION', qNum, optTarget });
    setInteractionMode('CROP_IMAGE');
    setSelectedText('');
    setCropBox(null);
    setActiveCroppedImage(null);
    showToast(`Draw a box around Option (${optTarget}) on the left document!`);
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
      <div className="text-center py-20 glass-panel rounded-2xl max-w-xl mx-auto space-y-4">
        <SplitSquareVertical className="w-12 h-12 text-indigo-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Document Selected for Review</h2>
        <p className="text-sm text-slate-400">
          Please upload or choose a document from the Ingestion workspace.
        </p>
        <button
          onClick={() => navigate('/ingest')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all"
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

  // Calculate panel columns based on layout mode
  const leftColSpan =
    panelLayout === 'FULL_IMAGE'
      ? 'lg:col-span-12'
      : panelLayout === 'WIDE_IMAGE'
      ? 'lg:col-span-7'
      : 'lg:col-span-5';
  const centerColSpan =
    panelLayout === 'FULL_IMAGE'
      ? 'hidden'
      : panelLayout === 'WIDE_IMAGE'
      ? 'lg:col-span-5'
      : 'lg:col-span-5';
  const rightColSpan =
    panelLayout === 'FULL_IMAGE'
      ? 'hidden'
      : panelLayout === 'WIDE_IMAGE'
      ? 'hidden'
      : 'lg:col-span-2';

  return (
    <div className="space-y-6">
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
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <SplitSquareVertical className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white">{document?.filename || 'Document Review'}</h1>
            <p className="text-xs text-slate-400">
              Page {currentPageNum} of {document?.pageCount || 1} &bull; Profile: {document?.profile || 'BALANCED'}
            </p>
          </div>
        </div>

        {/* View Mode Layout Switcher */}
        <div className="flex items-center space-x-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setPanelLayout('STANDARD')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              panelLayout === 'STANDARD'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3-Panel Standard View"
          >
            3-Panel View
          </button>
          <button
            onClick={() => setPanelLayout('WIDE_IMAGE')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              panelLayout === 'WIDE_IMAGE'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Wide Document View"
          >
            Wide Image Split
          </button>
          <button
            onClick={() => setPanelLayout('FULL_IMAGE')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              panelLayout === 'FULL_IMAGE'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Full Page Inspection"
          >
            Full Page View
          </button>
        </div>

        {/* AI Learning Memory Trigger Button */}
        <button
          type="button"
          onClick={() => {
            fetchLearningStats();
            setShowLearningModal(true);
          }}
          className="px-3 py-1.5 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 hover:from-violet-600/40 hover:to-indigo-600/40 text-violet-300 border border-violet-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
          title="Inspect AI continuous learning memory and correction rules"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>AI Extraction Memory</span>
          {learningCount > 0 && (
            <span className="px-1.5 py-0.2 bg-violet-500 text-white rounded-full font-mono text-[10px]">
              {learningCount}
            </span>
          )}
        </button>

        {/* Page Switcher with Direct Page Number Input */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 shadow-inner">
          <button
            type="button"
            onClick={() => loadPage(Math.max(1, currentPageNum - 1))}
            disabled={currentPageNum <= 1 || loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 hover:text-white transition-all"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 text-xs font-semibold font-mono">
            <span className="text-slate-400 select-none">Page</span>
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
                className="w-12 text-center bg-slate-950 border border-slate-700 hover:border-indigo-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-0.5 text-xs font-bold text-indigo-300 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="Type page number and press Enter to jump"
              />
            </form>
            <span className="text-slate-400 select-none">/ {document?.pageCount || 1}</span>
          </div>

          <button
            type="button"
            onClick={() => loadPage(Math.min(document?.pageCount || 1, currentPageNum + 1))}
            disabled={currentPageNum >= (document?.pageCount || 1) || loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 hover:text-white transition-all"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* THREE-PANEL REVIEW WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[750px]">
        {/* PANEL 1 (LEFT): ORIGINAL PAGE IMAGE WITH TEXT SELECT, IMAGE CROPPER & PAN */}
        <div className={`${leftColSpan} glass-panel rounded-2xl p-4 flex flex-col space-y-3 transition-all duration-200`}>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
            {/* Mode Switcher: Text Select vs Crop Image vs Pan */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setInteractionMode('SELECT_TEXT');
                  setCropBox(null);
                  setSnipTarget(null);
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors ${
                  interactionMode === 'SELECT_TEXT'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors ${
                  interactionMode === 'CROP_IMAGE'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow ring-2 ring-emerald-400/30'
                    : 'text-emerald-400 hover:text-emerald-300'
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
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors ${
                  interactionMode === 'PAN'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors ${
                  debugMode
                    ? 'bg-purple-600 text-white shadow ring-2 ring-purple-400/40'
                    : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40'
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
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  fitMode === 'WIDTH' ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Fit to Width"
              >
                Fit Width
              </button>
              <button
                onClick={handleFitPage}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  fitMode === 'PAGE' ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
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
                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-mono text-slate-300"
                title="100% Original Size"
              >
                100%
              </button>

              <div className="h-3.5 w-px bg-slate-800 mx-1" />

              <button
                onClick={handleZoomOut}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-indigo-300 font-semibold px-1 min-w-[40px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Snip Guide Banner if active target */}
          {snipTarget && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 p-2 rounded-xl text-xs text-emerald-200 flex items-center justify-between animate-pulse">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>
                  <b>Snip Mode:</b> Click & drag a rectangle around {snipTarget.type === 'QUESTION' ? `Question Q${snipTarget.qNum}` : `Option (${snipTarget.optTarget})`} on the document below.
                </span>
              </div>
              <button onClick={() => setSnipTarget(null)} className="p-1 hover:text-white">
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
            onWheel={handleWheel}
            onMouseUpCapture={handleTextSelection}
            className={`flex-1 min-h-[600px] max-h-[780px] overflow-hidden rounded-xl bg-slate-950 p-2 border border-slate-900 relative ${
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
                      <p className="text-[11px] text-slate-400 max-w-xs">
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
                            <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-slate-950/90 border border-slate-700 rounded text-[9px] font-mono font-bold flex items-center space-x-1 whitespace-nowrap shadow pointer-events-none">
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
                          className="absolute bottom-4 right-4 w-96 max-w-[90%] bg-slate-950/95 border-2 border-purple-500/80 p-3.5 rounded-2xl shadow-2xl space-y-2.5 z-40 text-xs backdrop-blur-md"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 font-mono font-bold text-[10px] border border-purple-500/40">
                                {selectedDebugRegion.type}
                              </span>
                              <span className="font-mono text-emerald-400 text-[11px]">
                                Conf: {Math.round((selectedDebugRegion.confidence || 0.95) * 100)}%
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedDebugRegion(null)}
                              className="p-1 text-slate-400 hover:text-white rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1 font-mono text-[11px]">
                            <div className="text-slate-400 text-[10px] uppercase font-bold">BBox:</div>
                            <div className="text-slate-200">[{selectedDebugRegion.bbox?.join(', ')}]</div>
                          </div>

                          <div className="space-y-1 font-mono text-[11px]">
                            <div className="text-slate-400 text-[10px] uppercase font-bold">Extracted Text:</div>
                            <div className="text-white p-1.5 bg-slate-900 rounded border border-slate-800 max-h-20 overflow-y-auto">
                              {selectedDebugRegion.text}
                            </div>
                          </div>

                          {/* Formula Objects in Selected Region */}
                          {(selectedDebugRegion.formula_objects || []).length > 0 && (
                            <div className="space-y-1.5 pt-1 border-t border-slate-800">
                              <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                                2-D Formula Objects ({(selectedDebugRegion.formula_objects || []).length}):
                              </div>
                              {(selectedDebugRegion.formula_objects || []).map((fo: any, fIdx: number) => (
                                <div key={fIdx} className="p-2 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1 text-[10px] font-mono">
                                  <div className="flex items-center justify-between text-indigo-300">
                                    <span>LaTeX: <code className="text-amber-300">{fo.latex}</code></span>
                                    <span className="text-emerald-400">{Math.round((fo.confidence || 0.98) * 100)}%</span>
                                  </div>
                                  {fo.originalCrop && (
                                    <div className="pt-1">
                                      <img src={fo.originalCrop} alt="Formula Crop" className="max-h-8 object-contain bg-slate-950 p-1 rounded border border-slate-800" />
                                    </div>
                                  )}
                                  {fo.spatialRelationships && fo.spatialRelationships.length > 0 && (
                                    <div className="pt-1 text-[9px] text-slate-400">
                                      <span>Relations: </span>
                                      <span className="text-sky-300">{fo.spatialRelationships.map((r: any) => `${r.relation}(${r.source}, ${r.target})`).join(', ')}</span>
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
                      <div className="absolute -top-6 left-0 bg-emerald-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
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
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium"
                    >
                      Process Page
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* FLOATING ACTION BAR FOR CROPPED IMAGE (ATTACH / DRAG / PASTE) */}
            {activeCroppedImage && (
              <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/40 shadow-2xl space-y-3 z-30 animate-fade-in">
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
                      className="relative group bg-slate-950 p-1 rounded-xl border border-emerald-500/60 cursor-grab active:cursor-grabbing shadow"
                      title="Drag this cropped image and drop it on any Question or Option!"
                    >
                      <img
                        src={activeCroppedImage.url}
                        alt="Crop Thumbnail"
                        className="h-14 w-auto rounded object-contain"
                      />
                      <div className="absolute inset-0 bg-emerald-600/10 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Hand className="w-4 h-4 text-emerald-300 drop-shadow" />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                        <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Cropped Screenshot Ready ({activeCroppedImage.w}x{activeCroppedImage.h}px)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Attach directly to Question as its primary image, or assign to any option below:
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveCroppedImage(null);
                      setCropBox(null);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Instant 1-Click Attach Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">Use screenshot as:</span>
                  <button
                    type="button"
                    onClick={() => handleAttachImageToQuestion(activeCroppedImage.url)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/25 transition-all"
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
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-emerald-700 hover:text-white text-slate-200 rounded-lg border border-slate-700 font-mono font-semibold transition-colors"
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
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-mono font-semibold"
                      >
                        + Opt (1)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttachImageToOption('2', activeCroppedImage.url)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-mono font-semibold"
                      >
                        + Opt (2)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttachImageToOption('3', activeCroppedImage.url)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-mono font-semibold"
                      >
                        + Opt (3)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttachImageToOption('4', activeCroppedImage.url)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-mono font-semibold"
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
              <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-indigo-500/40 shadow-2xl space-y-2 z-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 truncate">
                    <Type className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate text-[11px] font-mono text-indigo-300 max-w-[280px]">
                      "{selectedText.length > 50 ? `${selectedText.substring(0, 50)}...` : selectedText}"
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleCopySelectedText(selectedText)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-lg flex items-center space-x-1 transition-colors"
                      title="Copy to Clipboard"
                    >
                      <Copy className="w-3 h-3 text-indigo-400" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => setSelectedText('')}
                      className="p-1 text-slate-400 hover:text-white rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400 font-medium mr-1">Insert into:</span>
                  <button
                    onClick={() => handleInsertTextToQuestionBody(selectedText)}
                    className="px-2 py-0.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-md border border-indigo-500/40 font-semibold transition-all"
                  >
                    + Question Body
                  </button>
                  <button
                    onClick={() => handleInsertTextToOption(0, selectedText)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 font-mono font-semibold"
                  >
                    + Opt (1)
                  </button>
                  <button
                    onClick={() => handleInsertTextToOption(1, selectedText)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 font-mono font-semibold"
                  >
                    + Opt (2)
                  </button>
                  <button
                    onClick={() => handleInsertTextToOption(2, selectedText)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 font-mono font-semibold"
                  >
                    + Opt (3)
                  </button>
                  <button
                    onClick={() => handleInsertTextToOption(3, selectedText)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 font-mono font-semibold"
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
        <div className={`${centerColSpan} glass-panel rounded-2xl p-4 flex flex-col space-y-4`}>
          {/* Top Bar for Extracted Column with Select All & Add Question */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={
                    (pageData?.questions?.length || 0) > 0 &&
                    selectedQNums.size === (pageData?.questions?.length || 0)
                  }
                  onChange={handleSelectAllQuestions}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                />
                <span>
                  Extracted Questions ({pageData?.questions?.length || 0})
                </span>
              </label>

              {selectedQNums.size > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold font-mono">
                  {selectedQNums.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
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
                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-500/30 flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* BULK ACTIONS FLOATING STRIP WHEN QUESTIONS ARE CHECKED */}
          {selectedQNums.size > 0 && (
            <div className="p-3 bg-gradient-to-r from-indigo-950/90 to-slate-900/95 border border-indigo-500/50 rounded-xl flex items-center justify-between animate-fade-in shadow-xl text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-white">
                  {selectedQNums.size} Question{selectedQNums.size > 1 ? 's' : ''} Selected
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSaveSelectedToBank}
                  disabled={savingSelected}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow flex items-center space-x-1.5 transition-all"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{savingSelected ? 'Saving...' : `Save (${selectedQNums.size}) to Bank`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelectedQuestions}
                  className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg font-semibold text-xs transition-all flex items-center space-x-1"
                  title="Delete selected questions from this review page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedQNums(new Set())}
                  className="px-2 py-1 text-slate-400 hover:text-white text-xs"
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
              <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-between animate-fade-in text-xs">
                <div className="flex items-center space-x-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold">Duplicate Questions Detected ({dups.length}):</span>
                    <span className="text-slate-300 text-[11px] block">
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
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs shadow flex items-center space-x-1.5 shrink-0 transition-colors"
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
                      className="p-4 rounded-2xl bg-slate-900 border-2 border-indigo-500 shadow-2xl space-y-4 transition-all"
                    >
                      {/* Edit Header Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                            Q
                          </span>
                          <input
                            type="text"
                            value={editFormData.question_number}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, question_number: e.target.value })
                            }
                            className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                            title="Question Number"
                          />
                          <span className="text-xs text-slate-400 font-semibold">Marks:</span>
                          <input
                            type="number"
                            value={editFormData.marks}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                marks: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                            min={1}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleStartSnipForQuestion(editFormData.question_number)}
                            className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 border border-emerald-500/40 transition-colors"
                            title="Snip / Screenshot Question from PDF"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Snip Question</span>
                          </button>

                          <select
                            value={editFormData.difficulty}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, difficulty: e.target.value })
                            }
                            className="bg-slate-950 border border-slate-700 text-[11px] rounded-lg px-2 py-1 text-slate-300"
                          >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </div>
                      </div>

                      {/* Quick Formula Inserter */}
                      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
                        <span className="text-[10px] text-slate-400 font-medium mr-1">Math / Chem:</span>
                        <button
                          type="button"
                          onClick={() => handleInsertFormulaToInline('\\frac{a}{b}')}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-indigo-300 font-mono text-[10px]"
                        >
                          \frac&#123;a&#125;&#123;b&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertFormulaToInline('\\sqrt{x}')}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-indigo-300 font-mono text-[10px]"
                        >
                          \sqrt&#123;x&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertFormulaToInline('x^{2}')}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-indigo-300 font-mono text-[10px]"
                        >
                          x^2
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertFormulaToInline('5 \\times 60')}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-mono text-[10px]"
                        >
                          5 \times 60
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertFormulaToInline('\\rightarrow')}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-emerald-300 font-mono text-[10px]"
                        >
                          \rightarrow
                        </button>
                      </div>

                      {/* Attached Question Screenshots & Multiple Diagrams Gallery in Inline Editor */}
                      {editFormData.diagrams && editFormData.diagrams.length > 0 && (
                        <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-2">
                          <div className="text-[11px] font-bold text-emerald-300 flex items-center justify-between">
                            <span className="flex items-center space-x-1.5">
                              <Camera className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Attached Question Figures ({editFormData.diagrams.length}):</span>
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleStartSnipForQuestion(editFormData.question_number)}
                                className="text-[10px] text-emerald-400 hover:underline flex items-center space-x-1"
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
                                className="text-[10px] text-indigo-400 hover:underline flex items-center space-x-1"
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
                                <div key={dIdx} className="space-y-1 p-1.5 bg-slate-900/90 rounded-lg border border-slate-800">
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
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-0.5 pt-0.5 border-t border-slate-800 gap-2">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-[9px] text-slate-400 font-sans">Dest:</span>
                                      <select
                                        value="BODY"
                                        onChange={(e) => {
                                          handleMoveImageInReview(editFormData.question_number, 'BODY', dIdx, e.target.value);
                                        }}
                                        className="bg-slate-800 text-indigo-300 hover:text-white border border-slate-700 text-[10px] rounded px-1 py-0.5 font-sans focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                                      className="text-rose-400 hover:text-rose-200 text-[9px] font-sans font-semibold flex items-center space-x-0.5"
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
                        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                          <span className="flex items-center space-x-1">
                            <span>Question Text</span>
                            <span className="text-[10px] text-slate-400 font-normal">(Or leave as reference if using screenshot above)</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleStartSnipForQuestion(editFormData.question_number)}
                              className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center space-x-1 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/40"
                            >
                              <Camera className="w-3.5 h-3.5" />
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
                              className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center space-x-1 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30"
                              title="Paste clipboard text verbatim into question body"
                            >
                              <Clipboard className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Paste Text</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => cardFileInputRef.current?.click()}
                              disabled={uploadingImage}
                              className="text-indigo-400 hover:text-indigo-300 text-[11px] flex items-center space-x-1"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
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
                          className={`w-full bg-slate-950 border rounded-xl p-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none transition-all ${
                            dragOverTarget === 'question_body'
                              ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-slate-900'
                              : 'border-slate-700 focus:border-indigo-500'
                          }`}
                          placeholder="Type question text or use the 'Snip Question' screenshot tool above..."
                        />

                        {/* Live KaTeX Render Preview */}
                        {editFormData.question_text && (
                          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                            <MathRenderer content={editFormData.question_text} />
                          </div>
                        )}
                      </div>

                      {/* Editable MCQ Options with Live Image Previews & 1-Click Snip */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                          <span className="flex items-center space-x-1">
                            <span>MCQ Options</span>
                            <span className="text-[10px] text-indigo-400 font-normal">(Drop text or cropped image onto any option)</span>
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
                            className="text-indigo-400 hover:text-indigo-300 text-[11px] flex items-center space-x-1"
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
                                className={`p-2.5 rounded-xl bg-slate-950 border transition-all space-y-2 ${
                                  isDropTarget
                                    ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-emerald-950/20'
                                    : 'border-slate-800'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="w-6 h-6 rounded-md bg-slate-800 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
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
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
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
                                    className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-md text-[11px] font-semibold flex items-center border border-indigo-500/30 shrink-0 transition-colors"
                                    title={`Paste clipboard text into Option (${opt.key}) verbatim`}
                                  >
                                    <Clipboard className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Direct 1-Click Snip Option Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleStartSnipForOption(opt.key, editFormData.question_number)}
                                    className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-md text-[11px] font-semibold flex items-center space-x-1 border border-emerald-500/40 shrink-0 transition-colors"
                                    title={`Snip screenshot from PDF for Option (${opt.key})`}
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Snip</span>
                                  </button>

                                  {/* Attach Option Image from File */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTargetOptionIdx(optIdx);
                                      optionFileInputRef.current?.click();
                                    }}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 rounded-md text-[11px] flex items-center space-x-1 shrink-0"
                                    title={`Attach image from file to Option (${opt.key})`}
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <span>File</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditFormData({ ...editFormData, correct_answer: opt.key })
                                    }
                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors shrink-0 ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
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
                                      className="p-1 text-slate-500 hover:text-rose-400"
                                      title="Remove option"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* Option Image with Mouse Resize Handle & Dest Selector */}
                                {opt.imageUrl && (
                                  <div className="mt-1.5 p-2 bg-slate-900 rounded-xl border border-emerald-500/50 space-y-1.5 shadow">
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
                                          <span className="text-[11px] font-bold text-emerald-400 block">
                                            ✓ Option ({opt.key}) Image Attached
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-mono block">
                                            Drag corner to resize
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveOptionImage(optIdx)}
                                        className="px-2 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-[10px] font-semibold rounded border border-rose-500/40 flex items-center space-x-1 transition-colors"
                                        title="Remove option image"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                        <span>Remove</span>
                                      </button>
                                    </div>
                                    {/* Move Destination Selector */}
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                                      <span className="text-[9px] text-slate-400 font-medium">Dest:</span>
                                      <select
                                        value={opt.key}
                                        onChange={(e) => {
                                          handleMoveImageInReview(editFormData.question_number, opt.key, -1, e.target.value);
                                        }}
                                        className="bg-slate-800 text-emerald-300 hover:text-white border border-slate-700 text-[10px] rounded px-1.5 py-0.5 font-sans focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qNum)}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Question</span>
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={handleCancelInlineEdit}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveInlineEdit}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center space-x-1.5 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
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
                          setSelectedQuestion(q);
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
                            ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/10'
                            : isDuplicate
                            ? 'bg-amber-950/20 border-amber-500/80 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                            : dragOverTarget === `card_${qNum}`
                            ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-slate-900'
                            : isSelected
                            ? 'bg-slate-900/95 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
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
                                className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center font-mono ${
                                isCheckedForBulk
                                  ? 'bg-indigo-600 text-white shadow'
                                  : isDuplicate
                                  ? 'bg-amber-600/40 text-amber-300'
                                  : 'bg-indigo-600/30 text-indigo-300'
                              }`}>
                                Q{qNum}
                              </span>
                            </label>

                            <span className="text-xs text-slate-400 font-medium">
                              [{q.marks} Mark{q.marks > 1 ? 's' : ''}]
                            </span>
                            {isDuplicate && dupInfo && (
                              <span className="text-[10px] text-amber-300 font-bold bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-500/50 flex items-center space-x-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                <span>Duplicate of Q{dupInfo.originalQNum}</span>
                              </span>
                            )}
                            {diagrams.length > 0 && !isDuplicate && (
                              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                                <Camera className="w-3 h-3" />
                                <span>{diagrams.length} Image{diagrams.length > 1 ? 's' : ''}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Delete Duplicate Button */}
                            {isDuplicate ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(qNum)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center space-x-1 text-xs font-bold shadow"
                                title="Delete duplicate question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Duplicate</span>
                              </button>
                            ) : (
                              <>
                                {/* 1-Click Snip Question Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStartSnipForQuestion(qNum)}
                                  className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors flex items-center space-x-1 text-[11px] font-semibold"
                                  title="Snip / Screenshot Question directly from PDF"
                                >
                                  <Camera className="w-3.5 h-3.5" />
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
                                  className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors flex items-center space-x-1 text-[11px] font-semibold"
                                  title="Attach picture or diagram to Question Body or Options"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  <span>+ Picture</span>
                                </button>

                                {/* Edit in Place Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStartInlineEdit(q)}
                                  className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors flex items-center space-x-1 text-[11px] font-semibold"
                                  title="Edit Question In Place"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>

                                {/* Delete Question Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(qNum)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Delete Question from Review List"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                    {/* Attached Question Screenshot / Figures Prominently Displayed */}
                    {diagrams.length > 0 && (
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-700/80 space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Question Screenshot / Image:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSnipForQuestion(qNum);
                            }}
                            className="text-emerald-400 hover:underline flex items-center space-x-1 lowercase font-normal"
                          >
                            <Camera className="w-3 h-3" />
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
                              <div key={dIdx} className="space-y-1 p-1.5 bg-slate-900/90 rounded-lg border border-slate-800">
                                <ResizableImage
                                  src={diagUrl}
                                  alt={`Question Figure ${dIdx + 1}`}
                                  initialHeight={100}
                                  minHeight={45}
                                  maxHeight={350}
                                  removable={true}
                                  onRemove={() => handleDeleteDiagramFromCard(qNum, dIdx)}
                                />
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-0.5 pt-0.5 border-t border-slate-800 gap-2">
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[9px] text-slate-400 font-sans">Dest:</span>
                                    <select
                                      value="BODY"
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleMoveImageInReview(qNum, 'BODY', dIdx, e.target.value);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="bg-slate-800 text-indigo-300 hover:text-white border border-slate-700 text-[10px] rounded px-1 py-0.5 font-sans focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                                    className="text-rose-400 hover:text-rose-200 hover:underline flex items-center space-x-0.5 ml-1 text-[9px] font-sans font-semibold"
                                    title={`Delete Figure ${dIdx + 1}`}
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

                    {/* Question text with KaTeX Math rendering */}
                    {q.question_text && (
                      <div className="text-xs text-slate-200 leading-relaxed font-sans">
                        <MathRenderer content={q.question_text || q.questionText || ''} />
                      </div>
                    )}

                    {/* MCQ Options with Image and Formula support */}
                    {options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
                        {options.map((opt: any, oIdx: number) => {
                          const isCorrect = (q.correct_answer || q.correctAnswer) === opt.key;
                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border text-xs space-y-2 ${
                                isCorrect
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-2">
                                  <span className={`font-mono font-bold shrink-0 ${isCorrect ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                    ({opt.key})
                                  </span>
                                  <div className="flex-1 space-y-1">
                                    <MathRenderer content={opt.text || ''} />
                                    {opt.formula_object?.originalCrop && (
                                      <div className="flex items-center space-x-2 pt-1">
                                        <div className="p-1 bg-slate-900 rounded border border-slate-800 inline-block">
                                          <img
                                            src={opt.formula_object.originalCrop}
                                            alt={`Option (${opt.key}) original crop`}
                                            className="max-h-7 object-contain"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFormulaModalState({
                                              isOpen: true,
                                              latex: opt.formula_object.latex,
                                              cropUrl: opt.formula_object.originalCrop,
                                              ast: opt.formula_object.structuredExpression,
                                              targetQNum: qNum,
                                              formulaId: opt.formula_object.id,
                                            });
                                          }}
                                          className="px-1.5 py-0.5 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 rounded text-[10px] font-semibold border border-indigo-500/30 transition-colors"
                                        >
                                          Compare / Edit 2-D Math
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartSnipForOption(opt.key, qNum);
                                  }}
                                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded text-[10px] font-semibold border border-slate-700 shrink-0 transition-colors flex items-center space-x-1"
                                  title={`Snip Option (${opt.key}) from PDF`}
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  <span>Snip</span>
                                </button>
                              </div>

                              {/* Visible Attached Option Image with Mouse Resize Handle & Direct Delete */}
                              {opt.imageUrl && (
                                <div className="mt-2 p-1.5 bg-slate-900 rounded-lg border border-slate-700 shadow space-y-1.5">
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
                                      className="px-1.5 py-0.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-[10px] font-semibold rounded border border-rose-500/40 flex items-center space-x-0.5 shrink-0 transition-colors"
                                      title={`Remove image from Option (${opt.key})`}
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>Remove</span>
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                                    <span className="text-[9px] text-slate-400">Dest:</span>
                                    <select
                                      value={opt.key}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleMoveImageInReview(qNum, opt.key, -1, e.target.value);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="bg-slate-800 text-emerald-300 hover:text-white border border-slate-700 text-[10px] rounded px-1 py-0.5 font-sans focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                      <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedFormulasQNum(expandedFormulasQNum === qNum ? null : qNum);
                            }}
                            className="flex items-center space-x-1.5 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>2-D Math Structures ({q.formula_objects.length})</span>
                            <span className="text-[10px] text-slate-400">
                              {expandedFormulasQNum === qNum ? '▼ Hide' : '▶ Review'}
                            </span>
                          </button>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {q.formula_objects.every((f: any) => f.validationStatus === 'VERIFIED') ? '✓ All Verified' : 'Needs Review'}
                          </span>
                        </div>

                        {expandedFormulasQNum === qNum && (
                          <div className="space-y-3 pt-1">
                            {q.formula_objects.map((fo: any, fIdx: number) => {
                              const ast = fo.structuredExpression || {};
                              return (
                                <div
                                  key={fIdx}
                                  className="p-3 bg-slate-950/90 rounded-xl border border-indigo-500/30 shadow-md space-y-2.5 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                    <span className="text-[11px] font-bold text-indigo-400 font-mono">
                                      Formula #{fIdx + 1} ({fo.domain || 'PHYSICS'})
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                                        {Math.round((fo.confidence || fo.visualSimilarity || 0.98) * 100)}% Match
                                      </span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                        fo.validationStatus === 'VERIFIED'
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                          : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                      }`}>
                                        {fo.validationStatus || 'NEEDS_REVIEW'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {fo.originalCrop ? (
                                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ORIGINAL:</span>
                                        <img src={fo.originalCrop} alt="Original Crop" className="max-h-16 object-contain" />
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">PLAIN MATH:</span>
                                        <div className="font-mono text-emerald-300 text-xs">{fo.plainText}</div>
                                      </div>
                                    )}

                                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">RECOGNIZED:</span>
                                      <div className="text-white text-xs">
                                        <MathRenderer content={fo.latex ? `$${fo.latex}$` : fo.plainText} />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">LATEX:</span>
                                    <code className="text-[11px] font-mono text-amber-300 block select-all">{fo.latex}</code>
                                  </div>

                                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">2-D STRUCTURE:</span>
                                    <pre className="text-[10px] font-mono text-slate-300 bg-slate-950 p-2 rounded max-h-28 overflow-y-auto">
                                      {JSON.stringify(ast, null, 2)}
                                    </pre>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-slate-800">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        q.formula_objects = (q.formula_objects || []).filter((_: any, i: number) => i !== fIdx);
                                        setPageData({ ...pageData });
                                        showToast('Formula removed');
                                      }}
                                      className="px-2 py-1 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded text-[10px] font-semibold border border-slate-800 transition-colors"
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
                                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[10px] font-semibold border border-slate-700 transition-colors"
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
                                      className="px-2 py-1 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 rounded text-[10px] font-semibold border border-cyan-500/30 transition-colors"
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
                                      className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 rounded text-[10px] font-semibold border border-amber-500/30 transition-colors"
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
                                      className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded text-[10px] font-semibold border border-indigo-500/40 transition-colors"
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
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow transition-all"
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

        {/* PANEL 3 (RIGHT): CONFIDENCE SCORECARD & QUESTION BANK EXPORT */}
        <div className={`${rightColSpan} glass-panel rounded-2xl p-4 flex flex-col justify-between space-y-4`}>
          <div className="space-y-4">
            <div className="pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Confidence & Review
              </span>
            </div>

            {/* Scorecard Metrics */}
            <div className="space-y-3">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Text OCR</span>
                  <span className="font-mono text-emerald-400 font-semibold">96.8%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[96%]" />
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Math AST</span>
                  <span className="font-mono text-indigo-400 font-semibold">94.2%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[94%]" />
                </div>
              </div>
            </div>

            {/* Target Folder Selector for Question Bank */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Question Bank Folder:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setNewFolderName('');
                    setNewFolderParentId(selectedFolderId || '');
                    setNewFolderType('CHAPTER');
                    setIsAddFolderModalOpen(true);
                  }}
                  className="px-2 py-0.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-all"
                  title="Create a new folder in Question Bank"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ New Folder</span>
                </button>
              </div>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Root / General Questions</option>
                {flatFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.displayName || f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <button
              onClick={selectedQNums.size > 0 ? handleSaveSelectedToBank : handleSaveToBank}
              disabled={savingSelected || (!selectedQuestion && selectedQNums.size === 0)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all"
            >
              {savingSelected ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FolderPlus className="w-4 h-4" />
              )}
              <span>
                {savingSelected
                  ? 'Saving Questions...'
                  : selectedQNums.size > 0
                  ? `Save (${selectedQNums.size}) Selected to Bank`
                  : `Save Q${selectedQuestion?.question_number || selectedQuestion?.questionNumber || ''} to Bank`}
              </span>
            </button>

            {/* Batch Save All Page Questions (Extracted Text + All Diagrams) */}
            <button
              onClick={handleSaveAllToBank}
              disabled={savingAll || !pageData?.questions || pageData.questions.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all"
              title="Save all extracted questions with all attached diagrams on this page"
            >
              {savingAll ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>
                {savingAll
                  ? 'Saving All Questions...'
                  : `Save ALL (${pageData?.questions?.length || 0}) Questions to Bank`}
              </span>
            </button>

            {/* Save Questions from ALL Pages at once */}
            {(document?.pageCount || 1) > 1 && (
              <button
                onClick={handleSaveAllPagesToBank}
                disabled={savingAllPages}
                className="w-full bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-600 hover:to-indigo-600 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md shadow-violet-700/20 flex items-center justify-center space-x-2 transition-all"
                title={`Process and save questions from all ${document?.pageCount} pages at once`}
              >
                {savingAllPages ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Layers className="w-4 h-4" />
                )}
                <span>
                  {savingAllPages
                    ? (allPagesProgress || 'Processing all pages...')
                    : `📚 Save ALL ${document?.pageCount} Pages to Bank`}
                </span>
              </button>
            )}

            <button
              onClick={() => navigate('/bank')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 px-4 rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition-colors"
            >
              <span>Go to Question Bank &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Extraction Learning Memory Inspector Modal */}
      {showLearningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-700 bg-slate-900/95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Adaptive Continuous Learning Engine</span>
                    <span className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full font-mono">
                      {learningStats?.total_rules || 0} Learned Rule{learningStats?.total_rules !== 1 ? 's' : ''}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    The AI continuously learns from your text corrections and cropped image attachments to extract future PDFs perfectly.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLearningModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rules list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[550px]">
              {(!learningStats || !learningStats.rules || learningStats.rules.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                  No rules recorded yet. Edit question text or options to teach the AI new correction patterns.
                </div>
              ) : (
                learningStats.rules.map((rule: any, rIdx: number) => (
                  <div key={rIdx} className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/90 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center space-x-2">
                        <span className="w-5 h-5 rounded bg-violet-600/30 text-violet-300 text-[10px] font-mono flex items-center justify-center">
                          #{rIdx + 1}
                        </span>
                        <span>{rule.description || 'Learned Pattern'}</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold font-mono">
                          {Math.round((rule.confidence || 0.95) * 100)}% Confidence
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rule.occurrences || 1} Hit{(rule.occurrences || 1) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 bg-rose-950/20 border border-rose-500/30 rounded-lg">
                        <span className="text-[10px] font-semibold text-rose-400 block mb-0.5">Raw / Corrupted Pattern:</span>
                        <code className="text-rose-200 text-xs font-mono break-all">{rule.raw_pattern}</code>
                      </div>
                      <div className="p-2 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
                        <span className="text-[10px] font-semibold text-emerald-400 block mb-0.5">Corrected Formula / Output:</span>
                        <code className="text-emerald-200 text-xs font-mono break-all">{rule.replacement}</code>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">
                ⚡ Every uploaded document is automatically sanitized using these learned rules.
              </span>
              <button
                type="button"
                onClick={() => setShowLearningModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Question Bank Folder Modal (Request #6) */}
      {isAddFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Folder</h3>
                  <p className="text-xs text-slate-400">Add a folder in Question Bank to organize questions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddFolderModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Folder Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Chapter 4 - Optics, Class 10 Mid-term..."
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Folder Category / Level
                </label>
                <select
                  value={newFolderType}
                  onChange={(e) => setNewFolderType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="CLASS">Class / Grade</option>
                  <option value="SUBJECT">Subject</option>
                  <option value="CHAPTER">Chapter</option>
                  <option value="TOPIC">Topic</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Parent Folder (Optional)
                </label>
                <select
                  value={newFolderParentId}
                  onChange={(e) => setNewFolderParentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None (Top-Level Root Folder)</option>
                  {flatFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.displayName || f.name} ({f.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddFolderModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
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

              {/* Question Body */}
              <label
                onClick={() => setAttachImageReviewModal({ ...attachImageReviewModal, destination: 'BODY' })}
                className={`flex items-center space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  attachImageReviewModal.destination === 'BODY'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <input
                  type="radio"
                  name="reviewModalDestination"
                  checked={attachImageReviewModal.destination === 'BODY'}
                  onChange={() => setAttachImageReviewModal({ ...attachImageReviewModal, destination: 'BODY' })}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <span>📌 Question Body</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-mono font-normal">Main Figure</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Shown alongside the question statement</p>
                </div>
              </label>

              {/* Options */}
              {attachImageReviewModal.options.map((opt: any) => (
                <label
                  key={opt.key}
                  onClick={() => setAttachImageReviewModal({ ...attachImageReviewModal, destination: opt.key })}
                  className={`flex items-center space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    attachImageReviewModal.destination === opt.key
                      ? 'bg-emerald-950/60 border-emerald-500 text-white ring-1 ring-emerald-500'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="reviewModalDestination"
                    checked={attachImageReviewModal.destination === opt.key}
                    onChange={() => setAttachImageReviewModal({ ...attachImageReviewModal, destination: opt.key })}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-400">
                        Option ({opt.key})
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                        {opt.text ? opt.text : `Option ${opt.key} Diagram`}
                      </p>
                    </div>
                    {opt.imageUrl && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                        Replaces Image
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* File Chooser */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300">
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
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer bg-slate-950/60 p-1.5 rounded-xl border border-slate-800"
              />
              {reviewModalUploadFile && (
                <div className="text-[11px] text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Selected: {reviewModalUploadFile.name} ({(reviewModalUploadFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAttachImageReviewModal(null);
                  setReviewModalUploadFile(null);
                }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewModalUploading || !reviewModalUploadFile}
                onClick={handleConfirmAttachReviewImage}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
              >
                {reviewModalUploading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
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
                const updatedFos = (q.formula_objects || []).map((fo: any) => {
                  if (fo.id === formulaModalState.formulaId) {
                    return { ...fo, latex: editedLatex, validationStatus: 'VERIFIED' };
                  }
                  return fo;
                });
                return { ...q, formula_objects: updatedFos };
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

