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
} from 'lucide-react';
import { api } from '../lib/api';
import { MathRenderer } from '../components/common/MathRenderer';
import { FormulaEditorModal } from '../components/common/FormulaEditorModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfidenceBadge } from '../components/ui/Badge';

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

  const handleCreateQuestionFromSnip = async () => {
    if (!snipResult) return;
    try {
      const imgUrl = snipResult.snip?.imageUrl;
      const questionData: any = {
        questionText: snipResult.aiData?.extracted_text || 'Snippet Question',
        marks: 1,
      };

      if (snipDestination === 'BODY') {
        questionData.diagrams = [
          {
            relative_url: imgUrl,
            width: snipResult.aiData?.width,
            height: snipResult.aiData?.height,
          },
        ];
      } else {
        questionData.options = [
          { key: 'A', text: '', imageUrl: snipDestination === 'A' ? imgUrl : undefined },
          { key: 'B', text: '', imageUrl: snipDestination === 'B' ? imgUrl : undefined },
          { key: 'C', text: '', imageUrl: snipDestination === 'C' ? imgUrl : undefined },
          { key: 'D', text: '', imageUrl: snipDestination === 'D' ? imgUrl : undefined },
        ];
      }

      await api.post('/questions', questionData);
      alert(`New question created in Question Bank with image in ${snipDestination === 'BODY' ? 'Question Body' : `Option (${snipDestination})`}!`);
      navigate('/bank');
    } catch (err: any) {
      alert(`Error saving question: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
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
          className="lg:col-span-8 bg-slate-100 rounded-lg p-4 overflow-auto flex items-center justify-center relative select-none border border-[#CBD5E1] shadow-xs"
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
        <Card className="lg:col-span-4 p-5 flex flex-col justify-between space-y-6 border-[#D1D5DB]">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <span className="text-sm font-bold uppercase tracking-wider text-[#111827]">Localized Crop Recognition</span>
              <Sparkles className="w-5 h-5 text-[#0B1F3A]" />
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
              </div>
            ) : (
              <div className="text-sm text-[#4B5563] py-20 text-center space-y-3">
                <Crop className="w-10 h-10 mx-auto text-[#6B7280]" />
                <p>Click and drag on the document page image to select a region, then select a recognition path above.</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
            {snipResult && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-md border border-[#E5E7EB]">
                <span className="block text-xs font-bold text-[#111827]">
                  Place Image / Diagram in:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSnipDestination('BODY')}
                    className={`px-3 py-2 rounded-md text-xs font-bold border transition-all text-left flex items-center space-x-1.5 ${
                      snipDestination === 'BODY'
                        ? 'bg-[#0B1F3A] border-[#0B1F3A] text-white shadow-xs'
                        : 'bg-white border-[#D1D5DB] text-[#111827] hover:bg-slate-100'
                    }`}
                  >
                    <span>📌 Question Body</span>
                  </button>
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSnipDestination(opt)}
                      className={`px-3 py-2 rounded-md text-xs font-bold border transition-all text-left flex items-center space-x-1.5 ${
                        snipDestination === opt
                          ? 'bg-emerald-800 border-emerald-800 text-white shadow-xs'
                          : 'bg-white border-[#D1D5DB] text-[#111827] hover:bg-slate-100'
                      }`}
                    >
                      <span>Option ({opt})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleCreateQuestionFromSnip}
              disabled={!snipResult}
              className="w-full"
              icon={<FolderPlus className="w-4 h-4" />}
            >
              Create New Question in Bank
            </Button>
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
