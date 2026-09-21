import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Zap,
  Layers,
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles,
  Trash2,
  Clipboard,
  Copy,
  Check,
  AlignLeft,
  FileSpreadsheet,
  FileCode,
  Globe,
  Languages,
  ArrowRightLeft,
  Eye,
  FileUp,
  Image as ImageIcon,
  ScanLine,
  Download,
  Upload,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  LanguageTranslatorBar,
  SUPPORTED_LANGUAGES,
} from '../components/common/LanguageTranslatorBar';

export const Ingestion: React.FC = () => {
  const navigate = useNavigate();
  const [ingestionMode, setIngestionMode] = useState<'FILE' | 'PASTE' | 'IMAGE_OCR' | 'TRANSLATE'>('FILE');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');
  const [pasteSuccessNotice, setPasteSuccessNotice] = useState(false);
  const [profile, setProfile] = useState('BALANCED');
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);
  const [activeDoc, setActiveDoc] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{ id: string; filename: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Dedicated Translation Suite State
  const [studioSourceText, setStudioSourceText] = useState('');
  const [studioTargetLang, setStudioTargetLang] = useState('hi');
  const [studioSourceLang, setStudioSourceLang] = useState('auto');
  const [studioDetected, setStudioDetected] = useState<any | null>(null);
  const [studioTranslatedText, setStudioTranslatedText] = useState('');
  const [isStudioDetecting, setIsStudioDetecting] = useState(false);
  const [isStudioTranslating, setIsStudioTranslating] = useState(false);
  const [studioCopied, setStudioCopied] = useState(false);
  const translationFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingTranslationFile, setIsLoadingTranslationFile] = useState(false);

  // Dedicated Image OCR Extractor State
  const [ocrImageFile, setOcrImageFile] = useState<File | null>(null);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [ocrProgressMsg, setOcrProgressMsg] = useState('');
  const [ocrResult, setOcrResult] = useState<{
    extracted_text: string;
    detected_language: string;
    language_name: string;
    confidence: number;
    lines_count: number;
    words_count: number;
    chars_count: number;
    spans_count?: number;
    script?: string;
  } | null>(null);
  const [ocrCopied, setOcrCopied] = useState(false);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmDoc) return;
    try {
      setDeleting(true);
      await api.delete(`/documents/${deleteConfirmDoc.id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteConfirmDoc.id));
      setDeleteConfirmDoc(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip && clip.trim()) {
        setPastedText(clip);
        setPasteSuccessNotice(true);
        setTimeout(() => setPasteSuccessNotice(false), 2500);
      } else {
        alert('Clipboard is empty. Please copy text from your source document or website first.');
      }
    } catch {
      alert('Could not read clipboard automatically. Please press Ctrl+V / Cmd+V directly in the text box below.');
    }
  };

  const handleIngestPastedText = async () => {
    if (!pastedText.trim()) return;
    setUploading(true);
    setProgressMsg('Generating high-fidelity document preserving exact source text...');
    setDuplicateWarning(null);

    try {
      const defaultTitle = `Pasted_Document_${new Date().toISOString().slice(0, 10)}`;
      const res = await api.post('/documents/paste-text', {
        title: pastedTitle.trim() || defaultTitle,
        rawText: pastedText,
        profile,
      });

      if (res.data.isDuplicate) {
        setDuplicateWarning(res.data);
        setActiveDoc(res.data.document);
        setUploading(false);
        return;
      }

      const doc = res.data.document;
      setActiveDoc(doc);
      const totalPages = doc.pageCount || 1;

      // Process ALL pages sequentially
      for (let pg = 1; pg <= totalPages; pg++) {
        setProgressMsg(`Processing Page ${pg} of ${totalPages}...`);
        try {
          await api.post(`/documents/${doc.id}/process-page/${pg}`);
        } catch (pgErr: any) {
          console.warn(`Page ${pg} processing error:`, pgErr.message);
        }
      }

      setProgressMsg(`All ${totalPages} page(s) processed! Loading review...`);
      fetchDocs();

      setTimeout(() => {
        navigate(`/review?docId=${doc.id}`);
      }, 800);
    } catch (err: any) {
      alert(`Pasted text ingestion failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgressMsg('Hashing file and checking for duplicates...');
    setDuplicateWarning(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('profile', profile);

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.isDuplicate) {
        setDuplicateWarning(res.data);
        setActiveDoc(res.data.document);
        setUploading(false);
        return;
      }

      const doc = res.data.document;
      setActiveDoc(doc);
      const totalPages = doc.pageCount || 1;

      // Process ALL pages sequentially so every question is extracted
      for (let pg = 1; pg <= totalPages; pg++) {
        setProgressMsg(`Processing Page ${pg} of ${totalPages}...`);
        try {
          await api.post(`/documents/${doc.id}/process-page/${pg}`);
        } catch (pgErr: any) {
          console.warn(`Page ${pg} processing error:`, pgErr.message);
        }
      }

      setProgressMsg(`✅ All ${totalPages} page(s) extracted! Loading review...`);
      fetchDocs();

      setTimeout(() => {
        navigate(`/review?docId=${doc.id}`);
      }, 800);
    } catch (err: any) {
      alert(`Upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Dedicated Translation Studio Handlers
  const handleStudioDetect = async () => {
    if (!studioSourceText.trim()) return;
    setIsStudioDetecting(true);
    try {
      const res = await api.post('/documents/detect-language', { text: studioSourceText });
      setStudioDetected(res.data);
      setStudioSourceLang(res.data.language);
      if (res.data.language === studioTargetLang) {
        setStudioTargetLang(res.data.language === 'en' ? 'hi' : 'en');
      }
    } catch (err: any) {
      alert(`Language detection error: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsStudioDetecting(false);
    }
  };

  const handleStudioTranslate = async () => {
    if (!studioSourceText.trim()) return;
    setIsStudioTranslating(true);
    try {
      const res = await api.post('/documents/translate', {
        text: studioSourceText,
        target_lang: studioTargetLang,
        source_lang: studioSourceLang === 'auto' ? undefined : studioSourceLang,
      });
      setStudioTranslatedText(res.data.translated_text);
      if (res.data.source_lang && !studioDetected) {
        const match = SUPPORTED_LANGUAGES.find((l) => l.code === res.data.source_lang);
        setStudioDetected({
          language: res.data.source_lang,
          language_name: match ? match.name : res.data.source_lang,
          script: '',
          confidence: 1.0,
        });
      }
    } catch (err: any) {
      alert(`Translation error: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsStudioTranslating(false);
    }
  };

  const handleTransferStudioToIngestion = () => {
    if (!studioTranslatedText && !studioSourceText) return;
    setPastedText(studioTranslatedText || studioSourceText);
    setPastedTitle(`Translated_Exam_${studioTargetLang.toUpperCase()}_${new Date().toISOString().slice(0, 10)}`);
    setIngestionMode('PASTE');
  };

  const handleExportTextContent = async (
    text: string,
    title: string,
    format: 'word' | 'pdf' | 'json' | 'txt',
    language?: string
  ) => {
    if (!text || !text.trim()) {
      alert('No text content available to export');
      return;
    }
    try {
      const res = await api.post(
        '/documents/export-text',
        {
          text,
          title,
          format,
          language,
        },
        { responseType: 'blob' }
      );

      const mimeTypes: Record<string, string> = {
        word: 'application/msword; charset=utf-8',
        pdf: 'application/pdf',
        json: 'application/json; charset=utf-8',
        txt: 'text/plain; charset=utf-8',
      };
      const extensions: Record<string, string> = {
        word: 'doc',
        pdf: 'pdf',
        json: 'json',
        txt: 'txt',
      };

      const blob = new Blob([res.data], { type: mimeTypes[format] || 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (title || 'Exported_Text').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}.${extensions[format] || 'txt'}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleLoadTranslationFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoadingTranslationFile(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'txt' || ext === 'json' || ext === 'csv') {
        const content = await file.text();
        setStudioSourceText(content);
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/documents/extract-raw-text', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setStudioSourceText(res.data.text || '');
      }
    } catch (err: any) {
      alert(`Failed to load file: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsLoadingTranslationFile(false);
      if (translationFileInputRef.current) translationFileInputRef.current.value = '';
    }
  };

  // Image OCR Handlers
  const handleOcrFileSelect = (f: File) => {
    setOcrImageFile(f);
    setOcrResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      setOcrImagePreview(reader.result as string);
    };
    reader.readAsDataURL(f);
  };

  const handlePasteImageFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const pastedFile = new File([blob], `clipboard_image_${Date.now()}.png`, { type });
            handleOcrFileSelect(pastedFile);
            return;
          }
        }
      }
      alert('No image found on clipboard. Please copy an image or take a screenshot (e.g. Win+Shift+S) first.');
    } catch {
      alert('Clipboard image access not supported or permission denied. Please select an image file directly.');
    }
  };

  const handleRunOcrExtraction = async (fileToExtract?: File) => {
    const targetFile = fileToExtract || ocrImageFile;
    if (!targetFile) {
      alert('Please select or paste an image document first');
      return;
    }

    setIsExtractingOcr(true);
    setOcrProgressMsg('Analyzing layout and running high-accuracy multilingual OCR in same language...');
    try {
      const formData = new FormData();
      formData.append('image', targetFile);

      const res = await api.post('/documents/ocr-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setOcrResult(res.data);
      setOcrProgressMsg('Text extracted successfully in same language!');
    } catch (err: any) {
      alert(`OCR text extraction failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsExtractingOcr(false);
    }
  };

  const handleTransferOcrToIngestion = () => {
    if (!ocrResult?.extracted_text) return;
    setPastedText(ocrResult.extracted_text);
    setPastedTitle(`OCR_Extracted_${(ocrResult.language_name || 'Document').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`);
    setIngestionMode('PASTE');
  };

  const handleTransferOcrToTranslate = () => {
    if (!ocrResult?.extracted_text) return;
    setStudioSourceText(ocrResult.extracted_text);
    if (ocrResult.detected_language) {
      setStudioSourceLang(ocrResult.detected_language);
      setStudioDetected({
        language: ocrResult.detected_language,
        language_name: ocrResult.language_name,
        confidence: ocrResult.confidence,
      });
      setStudioTargetLang(ocrResult.detected_language === 'en' ? 'hi' : 'en');
    }
    setIngestionMode('TRANSLATE');
  };

  const profiles = [
    {
      id: 'FAST',
      name: 'Fast Mode',
      desc: 'Embedded digital PDF text extraction + basic OCR. Fastest processing time.',
      badge: 'Lightweight',
      icon: Zap,
    },
    {
      id: 'BALANCED',
      name: 'Balanced Mode (Default)',
      desc: 'Primary OCR + layout analysis + confidence scoring + secondary validation.',
      badge: 'Recommended',
      icon: Layers,
    },
    {
      id: 'HIGH_ACCURACY',
      name: 'High Accuracy Mode',
      desc: 'Specialized math & chemistry AST validation + secondary verification.',
      badge: 'High Precision',
      icon: Cpu,
    },
    {
      id: 'MAXIMUM_ACCURACY',
      name: 'Maximum Accuracy Mode',
      desc: 'Cross-engine comparison + full region escalation + human review flag.',
      badge: 'Thorough',
      icon: Sparkles,
    },
  ];

  const pastedLines = pastedText ? pastedText.split('\n').length : 0;
  const pastedWords = pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0;
  const pastedChars = pastedText.length;

  const getFileTypeInfo = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'docx' || ext === 'doc') {
      return {
        label: 'Microsoft Word Document',
        sublabel: 'Auto-converted to crisp multi-page PDF layout preserving paragraphs, bullets & headings',
        badge: 'Word (.docx/.doc)',
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        icon: FileText,
      };
    }
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      return {
        label: 'Excel / CSV Spreadsheet',
        sublabel: 'Auto-converted to structured PDF table grid preserving rows & columns',
        badge: 'Excel (.xlsx/.xls/.csv)',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        icon: FileSpreadsheet,
      };
    }
    if (ext === 'pdf') {
      return {
        label: 'PDF Document',
        sublabel: 'Embedded digital text stream + multi-engine OCR fallback',
        badge: 'PDF',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        icon: FileText,
      };
    }
    return {
      label: 'Scanned Image Document',
      sublabel: 'High-accuracy OCR with automatic deskew and noise removal',
      badge: 'Image (PNG/JPG/TIFF)',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      icon: FileCode,
    };
  };

  return (
    <div className="space-y-6 w-full">
      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">Document Ingestion</h1>
        <p className="text-sm text-slate-400">
          Upload PDF, Word (<code className="text-indigo-300">.docx, .doc</code>), Excel (<code className="text-indigo-300">.xlsx, .xls, .csv</code>), Images, extract text from images to digital text in the same language, or copy &amp; paste text with multi-language detection and translation.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setIngestionMode('FILE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            ingestionMode === 'FILE'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload File (PDF / Word / Excel / Images)</span>
        </button>

        <button
          type="button"
          onClick={() => setIngestionMode('PASTE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            ingestionMode === 'PASTE'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Clipboard className="w-4 h-4" />
          <span>Copy &amp; Paste Text (Direct Ingestion)</span>
        </button>

        <button
          type="button"
          onClick={() => setIngestionMode('IMAGE_OCR')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            ingestionMode === 'IMAGE_OCR'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <span>Extract Text from Image (OCR in Same Language)</span>
        </button>

        <button
          type="button"
          onClick={() => setIngestionMode('TRANSLATE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            ingestionMode === 'TRANSLATE'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Languages className="w-4 h-4" />
          <span>Live Translation &amp; Language Detector</span>
        </button>
      </div>

      {/* Ingestion Content Box */}
      <div className="glass-panel p-8 rounded-3xl space-y-6">
        {ingestionMode === 'FILE' && (
          /* File Upload Zone */
          <div className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                file
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-900/40'
              }`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.tiff,.tif';
                input.onchange = (e: any) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0]);
                };
                input.click();
              }}
            >
              {file ? (
                (() => {
                  const info = getFileTypeInfo(file.name);
                  const Icon = info.icon;
                  const ext = file.name.toLowerCase().split('.').pop() || '';
                  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif'].includes(ext);
                  return (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                        <Icon className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-base font-semibold text-white">{file.name}</div>
                        <div className="flex items-center justify-center space-x-2 text-xs">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${info.color}`}>
                            {info.badge}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to ingest
                          </span>
                        </div>
                        <div className="text-xs text-indigo-300/80 pt-1">{info.sublabel}</div>

                        {/* Instant OCR Quick Action for Images */}
                        {isImage && (
                          <div className="pt-3 flex justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOcrFileSelect(file);
                                setIngestionMode('IMAGE_OCR');
                                handleRunOcrExtraction(file);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg flex items-center space-x-1.5 transition-all"
                            >
                              <ScanLine className="w-4 h-4" />
                              <span>Extract Text from this Image (Same Language OCR)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-semibold text-slate-200">
                      Drag and drop your question paper or document here
                    </div>
                    <div className="text-xs text-slate-400">
                      Click to browse or drop any document up to 100MB
                    </div>
                  </div>

                  {/* Format Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF (.pdf)</span>
                    </span>
                    <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl text-xs flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Word (.docx, .doc)</span>
                    </span>
                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-center space-x-1">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx, .xls, .csv)</span>
                    </span>
                    <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex items-center space-x-1">
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Images (PNG, JPG, TIFF)</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {ingestionMode === 'PASTE' && (
          /* Direct Text Paste Zone */
          <div className="space-y-4">
            {/* Title & Clipboard Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[260px]">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Document / Exam Title
                </label>
                <input
                  type="text"
                  value={pastedTitle}
                  onChange={(e) => setPastedTitle(e.target.value)}
                  placeholder={`e.g. Physics Final Exam - ${new Date().toISOString().slice(0, 10)}`}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-5">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-md ${
                    pasteSuccessNotice
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  }`}
                  title="Reads text from clipboard and pastes verbatim"
                >
                  {pasteSuccessNotice ? <Check className="w-3.5 h-3.5 text-white" /> : <Clipboard className="w-3.5 h-3.5" />}
                  <span>{pasteSuccessNotice ? 'Pasted from Clipboard!' : 'Paste from Clipboard'}</span>
                </button>

                {pastedText && (
                  <button
                    type="button"
                    onClick={() => setPastedText('')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Clear Text
                  </button>
                )}
              </div>
            </div>

            {/* Verbatim Source Preservation Notice */}
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5 text-indigo-300">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  <strong>Verbatim Source Fidelity Active:</strong> Pasted text is collected and preserved exactly as copied from your source without altered whitespace, distorted characters, or lost math equations.
                </span>
              </div>
              <div className="text-[11px] font-mono text-indigo-300/80 shrink-0 ml-3">
                {pastedLines} lines &bull; {pastedWords} words &bull; {pastedChars} chars
              </div>
            </div>

            {/* Embedded Language Detection & Translation Toolbar */}
            <LanguageTranslatorBar
              text={pastedText}
              onApplyTranslation={(translated) => setPastedText(translated)}
            />

            {/* Textarea */}
            <div className="relative">
              <textarea
                rows={12}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-4 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
                placeholder={`Paste exam paper or question text directly from your source document, webpage, Word file, or notes...\n\nSupports any language (Hindi, Punjabi, Gujarati, Urdu, Sanskrit, Bengali, Marathi, etc.) with KaTeX math equations preserved:\n\n1. Find the roots of the quadratic equation ax^2 + bx + c = 0.\n   (A) x = (-b +- sqrt(D))/(2a)\n   (B) x = (-b +- D)/(2a)\n   (C) x = (b +- sqrt(D))/(a)\n   (D) x = -b / (2a)\n   Ans: A [3 Marks]\n\n2. Define Newton's second law of motion F = ma.\n   [2 Marks]`}
              />
            </div>
          </div>
        )}

        {ingestionMode === 'IMAGE_OCR' && (
          /* Dedicated Image to Digital Text (Same Language) Extractor */
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-amber-950/30 to-orange-950/30 border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <ScanLine className="w-4 h-4 text-amber-400" />
                  <span>Image Document to Digital Text Extractor (Same Language OCR)</span>
                </div>
                <p className="text-xs text-slate-300">
                  Upload, drop, or paste any exam paper photo, scanned worksheet, or screenshot. The offline OCR engine extracts the text verbatim in its <strong>original language</strong> (Hindi, Gujarati, English, Punjabi, Urdu, etc.) with questions, options, and marks preserved!
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePasteImageFromClipboard}
                  className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
                  title="Paste screenshot or copied image from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste Image from Clipboard</span>
                </button>
              </div>
            </div>

            {/* Drop / Selector Card if no image or to change image */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleOcrFileSelect(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.png,.jpg,.jpeg,.webp,.tiff,.tif,.bmp';
                input.onchange = (e: any) => {
                  if (e.target.files?.[0]) handleOcrFileSelect(e.target.files[0]);
                };
                input.click();
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                ocrImageFile
                  ? 'border-amber-500/50 bg-amber-500/5'
                  : 'border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-900/40'
              }`}
            >
              {ocrImageFile ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 text-left">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{ocrImageFile.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {(ocrImageFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for OCR extraction
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunOcrExtraction();
                      }}
                      disabled={isExtractingOcr}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg flex items-center space-x-1.5 transition-all disabled:opacity-50"
                    >
                      {isExtractingOcr ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>{isExtractingOcr ? 'Extracting Digital Text...' : 'Extract Text (Same Language)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOcrImageFile(null);
                        setOcrImagePreview(null);
                        setOcrResult(null);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                    >
                      Change Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-200">
                      Drag &amp; drop an image document here, or click to browse
                    </div>
                    <div className="text-xs text-slate-400">
                      Supports PNG, JPG, JPEG, WEBP, TIFF, BMP (Question papers, textbook pages, worksheets)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Extraction Progress Message */}
            {ocrProgressMsg && (
              <div className="flex items-center space-x-2 text-xs text-amber-300 font-medium">
                {isExtractingOcr && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{ocrProgressMsg}</span>
              </div>
            )}

            {/* Side-by-side: Left Image Preview / Right Extracted Text */}
            {(ocrImagePreview || ocrResult) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
                {/* Left Column: Image Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Original Image Document</span>
                    </span>
                    {ocrImageFile && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {ocrImageFile.name}
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2 max-h-[460px] overflow-auto flex items-center justify-center shadow-inner">
                    {ocrImagePreview ? (
                      <img
                        src={ocrImagePreview}
                        alt="Uploaded document preview"
                        className="max-w-full h-auto object-contain rounded-lg"
                      />
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500">Image preview not available</div>
                    )}
                  </div>
                </div>

                {/* Right Column: Extracted Digital Text */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Extracted Digital Text (Same Language)</span>
                    </span>

                    {ocrResult?.extracted_text && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(ocrResult.extracted_text);
                            setOcrCopied(true);
                            setTimeout(() => setOcrCopied(false), 2000);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center space-x-1 transition-colors"
                        >
                          {ocrCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{ocrCopied ? 'Copied' : 'Copy Text'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Language & Stats Badge */}
                  {ocrResult && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-wrap items-center justify-between text-[11px] gap-2">
                      <div className="flex items-center space-x-1.5 text-emerald-300 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>
                          Language: <strong>{ocrResult.language_name || ocrResult.detected_language}</strong>
                          {ocrResult.script ? ` (${ocrResult.script})` : ''} &bull; Same Language Extracted
                        </span>
                      </div>
                      <div className="font-mono text-emerald-300/80">
                        Conf: {(ocrResult.confidence * 100).toFixed(1)}% &bull; {ocrResult.lines_count} lines &bull; {ocrResult.words_count} words
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={15}
                    value={ocrResult ? ocrResult.extracted_text : ''}
                    onChange={(e) => {
                      if (ocrResult) {
                        setOcrResult({ ...ocrResult, extracted_text: e.target.value });
                      }
                    }}
                    placeholder={
                      isExtractingOcr
                        ? 'Extracting digital text from image in same language...'
                        : 'Click "Extract Text (Same Language)" above to read digital text from the image...'
                    }
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-4 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 leading-relaxed shadow-inner"
                  />

                  {/* Action & Export Buttons for Extracted Text */}
                  {ocrResult?.extracted_text && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                      {/* Export Suite */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-400 mr-1">Export:</span>
                        <button
                          type="button"
                          onClick={() => handleExportTextContent(ocrResult.extracted_text, `OCR_${(ocrResult.language_name || 'Extracted').replace(/\s+/g, '_')}`, 'word', ocrResult.language_name)}
                          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                          title="Export extracted text as Word document (.doc)"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Word (.doc)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportTextContent(ocrResult.extracted_text, `OCR_${(ocrResult.language_name || 'Extracted').replace(/\s+/g, '_')}`, 'pdf', ocrResult.language_name)}
                          className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                          title="Export extracted text as formatted A4 PDF (.pdf)"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF (.pdf)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportTextContent(ocrResult.extracted_text, `OCR_${(ocrResult.language_name || 'Extracted').replace(/\s+/g, '_')}`, 'json', ocrResult.language_name)}
                          className="px-2.5 py-1 bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                          title="Export extracted text as structured JSON (.json)"
                        >
                          <FileCode className="w-3 h-3" />
                          <span>JSON (.json)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportTextContent(ocrResult.extracted_text, `OCR_${(ocrResult.language_name || 'Extracted').replace(/\s+/g, '_')}`, 'txt', ocrResult.language_name)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                          title="Export extracted text as Plain Text (.txt)"
                        >
                          <AlignLeft className="w-3 h-3" />
                          <span>TXT (.txt)</span>
                        </button>
                      </div>

                      {/* Pipeline Transfer Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTransferOcrToTranslate}
                          className="px-3.5 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
                        >
                          <Languages className="w-3.5 h-3.5" />
                          <span>Translate this Text</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleTransferOcrToIngestion}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 transition-all"
                        >
                          <FileUp className="w-3.5 h-3.5" />
                          <span>Ingest as Document</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {ingestionMode === 'TRANSLATE' && (
          /* Dedicated Language Detection & Translation Studio */
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-indigo-900/30 to-violet-900/30 border border-indigo-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <Languages className="w-4 h-4 text-indigo-400" />
                  <span>Exam Paper &amp; Question Translation Studio</span>
                </div>
                <p className="text-xs text-slate-300">
                  Translate questions, instructions, and entire exam papers across 17+ languages. KaTeX math formulas (<code className="text-indigo-300">$...$</code>), option markers <code className="text-indigo-300">(A)-(D)</code>, and marks brackets <code className="text-indigo-300">[X Marks]</code> are strictly preserved!
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleTransferStudioToIngestion}
                  disabled={!studioTranslatedText && !studioSourceText}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 transition-all disabled:opacity-40"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Transfer to Ingestion Pipeline</span>
                </button>
              </div>
            </div>

            {/* Translation Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleStudioDetect}
                  disabled={isStudioDetecting || !studioSourceText.trim()}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-40"
                >
                  {isStudioDetecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  <span>{isStudioDetecting ? 'Detecting Language...' : 'Detect Source Language'}</span>
                </button>

                {studioDetected && (
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Detected: <strong>{studioDetected.language_name}</strong> ({studioDetected.language.toUpperCase()})
                      {studioDetected.script ? ` &bull; ${studioDetected.script}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-semibold">Target Language:</span>
                <select
                  value={studioTargetLang}
                  onChange={(e) => setStudioTargetLang(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleStudioTranslate}
                  disabled={isStudioTranslating || !studioSourceText.trim()}
                  className="px-5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md flex items-center space-x-1.5 transition-all disabled:opacity-40"
                >
                  {isStudioTranslating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isStudioTranslating ? 'Translating...' : 'Translate'}</span>
                </button>
              </div>
            </div>

            {/* Split Screen Editor: Left Source / Right Translated */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Source */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Source Text (Original)</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      ref={translationFileInputRef}
                      accept=".txt,.docx,.doc,.pdf,.json"
                      onChange={handleLoadTranslationFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => translationFileInputRef.current?.click()}
                      disabled={isLoadingTranslationFile}
                      className="text-violet-400 hover:text-violet-300 text-[11px] font-medium flex items-center space-x-1"
                      title="Load questions or text from Word (.docx), PDF (.pdf), or Text (.txt)"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{isLoadingTranslationFile ? 'Loading...' : 'Load File'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const clip = await navigator.clipboard.readText();
                          if (clip) setStudioSourceText(clip);
                        } catch {
                          alert('Could not paste from clipboard automatically');
                        }
                      }}
                      className="text-indigo-400 hover:text-indigo-300 text-[11px] font-medium"
                    >
                      Paste Clipboard
                    </button>
                    {studioSourceText && (
                      <button
                        type="button"
                        onClick={() => setStudioSourceText('')}
                        className="text-slate-400 hover:text-white text-[11px]"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  rows={14}
                  value={studioSourceText}
                  onChange={(e) => setStudioSourceText(e.target.value)}
                  placeholder="Paste questions or text to detect and translate..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-4 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
                />
                <div className="text-[11px] font-mono text-slate-400 text-right">
                  {studioSourceText.length} characters &bull; {studioSourceText.trim() ? studioSourceText.trim().split(/\s+/).length : 0} words
                </div>
              </div>

              {/* Right Column: Translated */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Translated Text (
                      {SUPPORTED_LANGUAGES.find((l) => l.code === studioTargetLang)?.name || studioTargetLang}
                      )
                    </span>
                  </span>
                  {studioTranslatedText && (
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(studioTranslatedText);
                        setStudioCopied(true);
                        setTimeout(() => setStudioCopied(false), 2000);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 text-[11px] font-medium flex items-center space-x-1"
                    >
                      {studioCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{studioCopied ? 'Copied' : 'Copy Result'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={14}
                  value={studioTranslatedText}
                  readOnly
                  placeholder="Translated text will appear here with formulas ($...$), options (A)-(D), and marks brackets intact..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-4 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none leading-relaxed shadow-inner"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-medium">✓ Formulas &amp; Options Preserved</span>
                  <span className="font-mono">
                    {studioTranslatedText.length} characters &bull; {studioTranslatedText.trim() ? studioTranslatedText.trim().split(/\s+/).length : 0} words
                  </span>
                </div>

                {/* Export Translation Action Ribbon */}
                {studioTranslatedText && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 mr-1">Export:</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleExportTextContent(
                            studioTranslatedText,
                            `Translated_${studioTargetLang.toUpperCase()}`,
                            'word',
                            studioTargetLang
                          )
                        }
                        className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                        title="Export translated text as Word document (.doc)"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Word (.doc)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleExportTextContent(
                            studioTranslatedText,
                            `Translated_${studioTargetLang.toUpperCase()}`,
                            'pdf',
                            studioTargetLang
                          )
                        }
                        className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                        title="Export translated text as publication-ready A4 PDF (.pdf)"
                      >
                        <Download className="w-3 h-3" />
                        <span>PDF (.pdf)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleExportTextContent(
                            studioTranslatedText,
                            `Translated_${studioTargetLang.toUpperCase()}`,
                            'json',
                            studioTargetLang
                          )
                        }
                        className="px-2.5 py-1 bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                        title="Export translated text as structured JSON (.json)"
                      >
                        <FileCode className="w-3 h-3" />
                        <span>JSON (.json)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleExportTextContent(
                            studioTranslatedText,
                            `Translated_${studioTargetLang.toUpperCase()}`,
                            'txt',
                            studioTargetLang
                          )
                        }
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                        title="Export translated text as Plain Text (.txt)"
                      >
                        <AlignLeft className="w-3 h-3" />
                        <span>TXT (.txt)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Alert Banner if duplicate SHA-256 found */}
        {duplicateWarning && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-amber-300">Exact Duplicate Document Detected</div>
                <div className="text-xs text-slate-300">
                  {duplicateWarning.message} This file was previously uploaded as{' '}
                  <span className="font-semibold text-white">{duplicateWarning.document.filename}</span>.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/review?docId=${duplicateWarning.document.id}`)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs px-4 py-2 rounded-xl transition-colors shrink-0"
            >
              Open Existing Document
            </button>
          </div>
        )}

        {/* Processing Profile Selector (for File and Paste modes) */}
        {(ingestionMode === 'FILE' || ingestionMode === 'PASTE') && (
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Select Processing Strategy Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profiles.map((p) => {
                const Icon = p.icon;
                const isSelected = profile === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setProfile(p.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 font-semibold text-sm text-slate-100">
                        <Icon className="w-4 h-4 text-indigo-400" />
                        <span>{p.name}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload Button & Progress Message (for File and Paste modes) */}
        {(ingestionMode === 'FILE' || ingestionMode === 'PASTE') && (
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
            <div className="text-xs text-slate-400">
              {progressMsg && (
                <span className="flex items-center space-x-2 text-indigo-400 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{progressMsg}</span>
                </span>
              )}
            </div>

            <button
              onClick={ingestionMode === 'FILE' ? handleUpload : handleIngestPastedText}
              disabled={
                uploading ||
                (ingestionMode === 'FILE' && !file) ||
                (ingestionMode === 'PASTE' && !pastedText.trim())
              }
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>
                {uploading
                  ? 'Processing Sequentially...'
                  : ingestionMode === 'FILE'
                  ? 'Start Ingestion Pipeline'
                  : 'Ingest & Process Pasted Text'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Document Library Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h2 className="font-bold text-lg text-white">Ingested Document Library</h2>
        <div className="divide-y divide-slate-800">
          {documents.map((doc) => {
            const info = getFileTypeInfo(doc.filename);
            const Icon = info.icon;
            return (
              <div key={doc.id} className="py-3.5 flex items-center justify-between hover:bg-slate-900/40 px-2 rounded-xl transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl border ${info.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-200">{doc.filename}</div>
                    <div className="text-xs text-slate-400">
                      {doc.pageCount} Pages &bull; Profile: <span className="font-mono text-indigo-300">{doc.profile}</span> &bull; {info.badge}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigate(`/review?docId=${doc.id}`)}
                    className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-colors"
                  >
                    Review &amp; Compare
                  </button>
                  <button
                    onClick={() => setDeleteConfirmDoc({ id: doc.id, filename: doc.filename })}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-500/20 text-xs font-medium flex items-center space-x-1 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Document Confirmation Modal */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400 pb-2 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Delete Document?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete <strong className="text-white">"{deleteConfirmDoc.filename}"</strong>?
              All extracted pages and bounding regions will be removed.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmDoc(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
