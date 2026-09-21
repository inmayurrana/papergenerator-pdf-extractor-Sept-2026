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
} from 'lucide-react';
import { api } from '../lib/api';
import { MathRenderer } from '../components/common/MathRenderer';
import { FormulaEditorModal } from '../components/common/FormulaEditorModal';

export const SnippingWorkspace: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docId = searchParams.get('docId');
  const pageNum = parseInt(searchParams.get('pageNum') || '1', 10);

  const [document, setDocument] = useState<any | null>(null);
  const [pageImageUrl, setPageImageUrl] = useState<string>('');
  const [imgAttempt, setImgAttempt] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [mode, setMode] = useState('AUTO');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [showOverlay, setShowOverlay] = useState(false);

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

  // Drawing crop box
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [snipResult, setSnipResult] = useState<any | null>(null);
  const [snipDestination, setSnipDestination] = useState<string>('BODY');
  const [processing, setProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      if (!docId) return;
      try {
        const res = await api.get(`/documents/${docId}`);
        const doc = res.data.document;
        setDocument(doc);
        const existingPage = doc?.pages?.find((p: any) => p.pageNumber === pageNum);
        if (existingPage?.imageUrl) {
          setPageImageUrl(existingPage.imageUrl);
        }
        // Request page render image
        const pageRes = await api.post(`/documents/${docId}/process-page/${pageNum}`);
        setPageImageUrl(pageRes.data.extracted?.page_image || existingPage?.imageUrl || '');
      } catch (err) {
        console.error(err);
      }
    };

    fetchDoc();
  }, [docId, pageNum]);

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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white">Visual Snipping & Formula Workspace</h1>
            <p className="text-xs text-slate-400">
              Interactive bounding boxes &bull; Structural Math/Physics/Chemistry Recognition &bull; KaTeX Validation
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-indigo-300 font-semibold px-1">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 ml-1 border-l border-slate-800 pl-2"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Selector */}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="AUTO">Auto Detect</option>
            <option value="MATH">Math / Formula (LaTeX)</option>
            <option value="PHYSICS">Physics Recognition</option>
            <option value="CHEMISTRY">Chemistry Recognition</option>
            <option value="TEXT">Printed Text (Normal OCR)</option>
            <option value="DIAGRAM">Diagram / Figure Crop</option>
            <option value="ALL">Run All Appropriate</option>
          </select>

          <button
            onClick={handleProcessSnip}
            disabled={!currentBox || processing}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-md shadow-violet-600/20 transition-all"
          >
            {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Crop className="w-3.5 h-3.5" />}
            <span>Process Crop</span>
          </button>
        </div>
      </div>

      {/* Formula Recognition Action Strip (When Box is Active) */}
      {currentBox && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/90 border border-violet-500/30 rounded-2xl animate-fade-in shadow-lg">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>Targeted Recognition Paths:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleProcessSnipWithMode('TEXT')}
              disabled={processing}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Run Normal OCR</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('MATH')}
              disabled={processing}
              className="px-2.5 py-1.5 bg-violet-950/60 hover:bg-violet-800/80 text-violet-200 rounded-xl text-xs font-medium border border-violet-600/50 flex items-center space-x-1.5 transition-all"
            >
              <Calculator className="w-3.5 h-3.5 text-violet-400" />
              <span>Recognize Mathematics</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('PHYSICS')}
              disabled={processing}
              className="px-2.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-800/80 text-cyan-200 rounded-xl text-xs font-medium border border-cyan-600/50 flex items-center space-x-1.5 transition-all"
            >
              <Atom className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recognize Physics</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('CHEMISTRY')}
              disabled={processing}
              className="px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-800/80 text-amber-200 rounded-xl text-xs font-medium border border-amber-600/50 flex items-center space-x-1.5 transition-all"
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
              <span>Recognize Chemistry</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('DIAGRAM')}
              disabled={processing}
              className="px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-800/80 text-emerald-200 rounded-xl text-xs font-medium border border-emerald-600/50 flex items-center space-x-1.5 transition-all"
            >
              <Crop className="w-3.5 h-3.5 text-emerald-400" />
              <span>Analyze Diagram</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('AUTO')}
              disabled={processing}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Auto Detect</span>
            </button>
            <button
              onClick={() => handleProcessSnipWithMode('ALL')}
              disabled={processing}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-600/20 flex items-center space-x-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-white" />
              <span>Run All Appropriate</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Snipping Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
        {/* Left Snipping Canvas View */}
        <div
          ref={containerRef}
          className="lg:col-span-8 glass-panel rounded-2xl p-4 overflow-auto bg-slate-950 flex items-center justify-center relative select-none border border-slate-900"
        >
          {pageImageUrl ? (
            <div
              className="relative inline-block"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'top center',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <img
                ref={imgRef}
                src={resolveImageUrl(pageImageUrl, imgAttempt)}
                alt="Document page"
                className="max-w-none rounded-lg shadow-xl cursor-crosshair"
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
                  className="absolute border-2 border-dashed border-violet-400 bg-violet-500/20 pointer-events-none"
                  style={{
                    left: `${currentBox.x}px`,
                    top: `${currentBox.y}px`,
                    width: `${currentBox.w}px`,
                    height: `${currentBox.h}px`,
                  }}
                >
                  <div className="absolute -top-6 left-0 bg-violet-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
                    {Math.round(currentBox.w)} x {Math.round(currentBox.h)} px
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-xs text-slate-400">
              No document page loaded. Open a document from Ingestion or Review.
            </div>
          )}
        </div>

        {/* Right Crop Result & Actions Panel */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Localized Crop Recognition
              </span>
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>

            {snipResult ? (
              <div className="space-y-4">
                {/* Crop Image Preview */}
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <img
                    src={snipResult.snip?.imageUrl}
                    alt="Snippet Crop"
                    className="max-h-40 mx-auto rounded-lg"
                  />
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    {snipResult.aiData?.width}x{snipResult.aiData?.height}px &bull; Mode: {mode}
                  </div>
                </div>

                {/* Recognized Content with KaTeX */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">
                      Recognized Formula / Content:
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      className="text-violet-400 hover:text-violet-300 text-[11px] font-medium flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit in Formula Editor</span>
                    </button>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono">
                    <MathRenderer content={snipResult.aiData?.extracted_text || 'No text detected'} />
                  </div>
                </div>

                {/* Multi-Dimensional Confidence Metrics */}
                <div className="space-y-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Overall Confidence:</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {Math.round((snipResult.aiData?.confidence || 0.95) * 100)}%
                    </span>
                  </div>
                  {snipResult.aiData?.scientific_result?.confidence && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                      <div>
                        Recognition: <span className="text-slate-200">{Math.round((snipResult.aiData.scientific_result.confidence.recognition_confidence || 0.95) * 100)}%</span>
                      </div>
                      <div>
                        Visual Match: <span className="text-slate-200">{Math.round((snipResult.aiData.scientific_result.confidence.visual_similarity || 0.90) * 100)}%</span>
                      </div>
                      <div>
                        Structure: <span className="text-slate-200">{Math.round((snipResult.aiData.scientific_result.confidence.structural_confidence || 0.95) * 100)}%</span>
                      </div>
                      <div>
                        Domain Check: <span className="text-slate-200">{Math.round((snipResult.aiData.scientific_result.confidence.domain_validation || 0.92) * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-16 text-center space-y-2">
                <Crop className="w-8 h-8 mx-auto text-slate-600" />
                <p>Click and drag on the page image to select a region, then choose a recognition path above.</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            {snipResult && (
              <div className="space-y-1.5 p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="block text-[11px] font-semibold text-slate-300">
                  Place Image / Diagram in:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSnipDestination('BODY')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left flex items-center space-x-1.5 ${
                      snipDestination === 'BODY'
                        ? 'bg-violet-600 border-violet-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>📌 Question Body</span>
                  </button>
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSnipDestination(opt)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left flex items-center space-x-1.5 ${
                        snipDestination === opt
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>Option ({opt})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleCreateQuestionFromSnip}
              disabled={!snipResult}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-violet-600/20 flex items-center justify-center space-x-1.5 transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create New Question in Bank</span>
            </button>
          </div>
        </div>
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

