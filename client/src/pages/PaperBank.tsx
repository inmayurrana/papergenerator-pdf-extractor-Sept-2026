import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder,
  FolderTree,
  FileSpreadsheet,
  FileText,
  Printer,
  Plus,
  Search,
  Trash2,
  Edit3,
  Copy,
  Clock,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Download,
  School,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  HardDrive,
  Upload,
  Code,
  Lock,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { triggerFileDownload, extractErrorMessage } from '../lib/downloadHelper';

export const PaperBank: React.FC = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FINALIZED'>('ALL');
  const [toastMsg, setToastMsg] = useState('');

  // Create / Rename Paper Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<any | null>(null);
  const [modalTitle, setModalTitle] = useState('ANNUAL EXAMINATION 2026');
  const [modalExamCode, setModalExamCode] = useState('EXAM-101');
  const [modalClass, setModalClass] = useState('Class 12');
  const [modalSubject, setModalSubject] = useState('Physics');
  const [modalSchoolName, setModalSchoolName] = useState('CAMBRIDGE INTERNATIONAL SCHOOL MANDI');
  const [modalMaxMarks, setModalMaxMarks] = useState(70);
  const [modalDuration, setModalDuration] = useState(180);
  const paperFileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();

  const canExportPaper = (p: any) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    return p.creatorId === user.id;
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/papers');
      setPapers(res.data.papers || []);
    } catch (err: any) {
      console.error('Fetch papers error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  // Parse Class and Subject from paper layout settings
  const getPaperMeta = (paper: any) => {
    try {
      const layout = JSON.parse(paper.canvasLayoutJson || '{}');
      const settings = layout.settings || {};
      const questions = layout.questions || [];
      return {
        className: settings.className || 'Class 12',
        subjectName: settings.subjectName || 'Physics',
        questionCount: questions.length,
      };
    } catch {
      return { className: 'Class 12', subjectName: 'General', questionCount: 0 };
    }
  };

  // Derive unique Classes and Subjects for taxonomy folder navigation
  const classList = Array.from(new Set(papers.map((p) => getPaperMeta(p).className))).filter(Boolean);
  if (classList.length === 0) classList.push('Class 12', 'Class 11', 'Class 10', 'Class 9');

  const subjectList = Array.from(
    new Set(
      papers
        .filter((p) => selectedClass === 'ALL' || getPaperMeta(p).className === selectedClass)
        .map((p) => getPaperMeta(p).subjectName)
    )
  ).filter(Boolean);
  if (subjectList.length === 0) subjectList.push('Physics', 'Chemistry', 'Mathematics', 'Biology', 'Hindi', 'English');

  // Filtered papers
  const filteredPapers = papers.filter((p) => {
    const meta = getPaperMeta(p);
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.examCode.toLowerCase().includes(search.toLowerCase()) ||
      p.schoolName?.toLowerCase().includes(search.toLowerCase()) ||
      meta.subjectName.toLowerCase().includes(search.toLowerCase());

    const matchesClass = selectedClass === 'ALL' || meta.className === selectedClass;
    const matchesSubject = selectedSubject === 'ALL' || meta.subjectName === selectedSubject;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesClass && matchesSubject && matchesStatus;
  });

  const handleOpenPaperInDesigner = (paper: any) => {
    navigate(`/designer?id=${paper.id}`);
  };

  const handleCreateNewPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/papers', {
        title: modalTitle,
        examCode: modalExamCode,
        schoolName: modalSchoolName,
        maxMarks: modalMaxMarks,
        currentMarks: 0,
        durationMinutes: modalDuration,
        canvasLayout: {
          questions: [],
          settings: {
            className: modalClass,
            subjectName: modalSubject,
            fontFamily: 'serif',
            fontSize: '10pt',
            lineSpacing: 'tight',
            spacingPreset: 'zero',
            borderStyle: 'divider',
            optionLayout: 'inline',
            imageAlignment: 'inline',
          },
        },
      });
      setIsModalOpen(false);
      showToast(`Created "${modalTitle}" in ${modalClass} > ${modalSubject}!`);
      fetchPapers();
      navigate(`/designer?id=${res.data.paper.id}`);
    } catch (err: any) {
      alert(`Create paper failed: ${err.message}`);
    }
  };

  const handleClonePaper = async (paperId: string, title: string) => {
    try {
      await api.post(`/papers/${paperId}/clone`);
      showToast(`⚡ Duplicated "${title}" (Created alternate Set)!`);
      fetchPapers();
    } catch (err: any) {
      alert(`Clone failed: ${err.message}`);
    }
  };

  const handleDeletePaper = async (paperId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete question paper "${title}"?`)) return;
    try {
      await api.delete(`/papers/${paperId}`);
      showToast(`Deleted paper "${title}"`);
      fetchPapers();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleExportWord = async (paperId: string, title: string, creatorId?: string) => {
    if (creatorId && !canExportPaper({ id: paperId, creatorId })) {
      showToast('🔒 Access Restricted: You can only export or print papers assigned to your account.');
      return;
    }
    try {
      showToast(`📄 Preparing Microsoft Word export for "${title}"...`);
      const res = await api.get(`/papers/${paperId}/export/word`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/msword; charset=utf-8;' });
      const safeTitle = (title || 'Question_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerFileDownload(blob, `${safeTitle}.doc`);
      showToast(`📄 Exported "${title}" as editable Microsoft Word document (.doc)!`);
    } catch (err: any) {
      const msg = await extractErrorMessage(err);
      alert(`Word Export failed: ${msg}`);
    }
  };

  const handleExportExcel = async (paperId: string, title: string, creatorId?: string) => {
    if (creatorId && !canExportPaper({ id: paperId, creatorId })) {
      showToast('🔒 Access Restricted: You can only export or print papers assigned to your account.');
      return;
    }
    try {
      showToast(`📊 Preparing Excel CSV export for "${title}"...`);
      const res = await api.get(`/papers/${paperId}/export/excel`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv; charset=utf-8;' });
      const safeTitle = (title || 'Question_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerFileDownload(blob, `${safeTitle}.csv`);
      showToast(`📊 Exported "${title}" as Excel CSV (.csv)!`);
    } catch (err: any) {
      const msg = await extractErrorMessage(err);
      alert(`Excel Export failed: ${msg}`);
    }
  };

  const handleExportJson = async (paperId: string, title: string, creatorId?: string) => {
    if (creatorId && !canExportPaper({ id: paperId, creatorId })) {
      showToast('🔒 Access Restricted: You can only export or print papers assigned to your account.');
      return;
    }
    try {
      showToast(`📦 Preparing JSON backup for "${title}"...`);
      const res = await api.get(`/papers/${paperId}/export/json`);
      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json; charset=utf-8;' });
      const safeTitle = (title || 'Question_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerFileDownload(blob, `${safeTitle}.json`);
      showToast(`📦 Exported "${title}" as portable JSON (.json)!`);
    } catch (err: any) {
      const msg = await extractErrorMessage(err);
      alert(`JSON Export failed: ${msg}`);
    }
  };

  const handleExportOfficialPdf = async (paperId: string, title: string, withAnswers = false, creatorId?: string) => {
    if (creatorId && !canExportPaper({ id: paperId, creatorId })) {
      showToast('🔒 Access Restricted: You can only export or print papers assigned to your account.');
      return;
    }
    try {
      showToast(`📄 Generating official A4 PDF ${withAnswers ? 'with Marking Scheme' : ''}...`);
      const res = await api.get(`/papers/${paperId}/export/pdf?withAnswers=${withAnswers}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const safeTitle = (title || 'Question_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerFileDownload(blob, `${safeTitle}${withAnswers ? '_With_Answers' : ''}.pdf`);
      showToast(`📄 Downloaded official PDF ${withAnswers ? 'with Marking Scheme' : ''}!`);
    } catch (err: any) {
      console.warn('Backend PDF endpoint error, falling back to print view:', err.message);
      handleDownloadPDF(paperId, title, creatorId);
    }
  };

  const handleImportPaperJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await api.post('/papers/import/json', parsed);
      showToast(`✅ Successfully imported "${res.data.paper.title}" with ${res.data.paper.questionCount} questions!`);
      fetchPapers();
    } catch (err: any) {
      alert(`Import paper failed: ${err.response?.data?.error || err.message}`);
    } finally {
      if (paperFileInputRef.current) paperFileInputRef.current.value = '';
    }
  };

  // Direct PDF Download / Print from Paper Bank
  const handleDownloadPDF = async (paperId: string, title: string, creatorId?: string) => {
    if (creatorId && !canExportPaper({ id: paperId, creatorId })) {
      showToast('🔒 Access Restricted: You can only export or print papers assigned to your account.');
      return;
    }
    try {
      showToast(`📄 Preparing A4 PDF for "${title}"...`);
      const res = await api.get(`/papers/${paperId}`);
      const paper = res.data.paper;
      if (!paper) throw new Error('Paper not found');

      const layout = JSON.parse(paper.canvasLayoutJson || '{}');
      const settings = layout.settings || {};
      const questions: any[] = layout.questions || [];
      const schoolLogoUrl = paper.schoolLogoUrl || settings.schoolLogoUrl;

      const printDoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title> </title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              font-family: 'Cambria', 'Georgia', 'Times New Roman', serif;
              font-size: 10.5pt;
              line-height: 1.35;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
            }
            .header-wrap {
              text-align: center;
              margin-bottom: 8pt;
              padding-bottom: 6pt;
              border-bottom: 1.5pt solid #000;
            }
            .logo-wrap {
              margin-bottom: 4pt;
            }
            .logo-img {
              max-height: 50pt;
              max-width: 140pt;
              object-fit: contain;
            }
            .school-name {
              font-size: 16pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2pt;
            }
            .exam-name {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 4pt;
            }
            .meta-grid {
              display: flex;
              justify-content: space-between;
              font-size: 9.5pt;
              font-weight: bold;
              font-family: 'Courier New', monospace;
              padding: 2pt 4pt;
            }
            .candidate-box {
              border: 1pt solid #000;
              padding: 6pt 8pt;
              margin-bottom: 10pt;
              font-size: 9.5pt;
              background: #fdfdfd;
            }
            .candidate-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 4pt;
            }
            .roll-boxes {
              display: inline-flex;
              gap: 2pt;
            }
            .roll-box {
              width: 15pt;
              height: 15pt;
              border: 1pt solid #000;
              display: inline-block;
            }
            .instructions {
              font-size: 8.5pt;
              border-top: 0.5pt solid #aaa;
              padding-top: 3pt;
              color: #222;
              white-space: pre-line;
            }
            .question-item {
              margin-bottom: 8pt;
              page-break-inside: avoid;
              border-bottom: 0.5pt solid #e5e5e5;
              padding-bottom: 6pt;
            }
            .q-header {
              display: flex;
              justify-content: space-between;
              font-size: 10.5pt;
            }
            .q-stem {
              flex: 1;
              margin-right: 8pt;
            }
            .q-num {
              font-weight: bold;
              margin-right: 4pt;
            }
            .q-marks {
              font-weight: bold;
              font-family: monospace;
              font-size: 9.5pt;
              white-space: nowrap;
            }
            .diagram-row {
              margin: 4pt 0;
              display: flex;
              flex-wrap: wrap;
              gap: 6pt;
            }
            .diagram-img {
              max-height: 180pt;
              max-width: 100%;
              object-fit: contain;
              border: 0.5pt solid #ddd;
            }
            .options-wrap {
              display: flex;
              flex-wrap: wrap;
              gap: 8pt 16pt;
              margin-top: 4pt;
              margin-left: 12pt;
              font-size: 9.5pt;
            }
            .option-item {
              display: inline-flex;
              align-items: center;
              gap: 4pt;
            }
            .opt-key {
              font-weight: bold;
              color: #111;
            }
            .opt-img {
              max-height: 35pt;
              object-fit: contain;
              vertical-align: middle;
            }
          </style>
        </head>
        <body>
          <div class="header-wrap">
            ${schoolLogoUrl ? `<div class="logo-wrap"><img src="${schoolLogoUrl}" class="logo-img" /></div>` : ''}
            <div class="school-name">${paper.schoolName || 'CAMBRIDGE INTERNATIONAL SCHOOL MANDI'}</div>
            <div class="exam-name">${paper.title}</div>
            <div class="meta-grid">
              <span>EXAM CODE: ${paper.examCode}</span>
              <span>TIME: ${paper.durationMinutes} MINS</span>
              <span>MAX MARKS: ${paper.maxMarks}</span>
            </div>
          </div>

          <div class="candidate-box">
            <div class="candidate-row">
              <span>Candidate Name: ____________________________________</span>
              <span>
                Roll No:
                <span class="roll-boxes">
                  <span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span>
                </span>
              </span>
            </div>
            ${paper.instructions ? `<div class="instructions"><strong>General Instructions:</strong><br/>${paper.instructions}</div>` : ''}
          </div>

          <div class="questions-list">
            ${questions.map((q, idx) => {
              const opts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
              const diagrams = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson) : q.diagrams || [];
              return `
                <div class="question-item">
                  <div class="q-header">
                    <div class="q-stem">
                      <span class="q-num">Q${idx + 1}.</span>
                      <span>${q.questionText || q.question_text || ''}</span>
                    </div>
                    <span class="q-marks">[${q.marks || 1} Mark${(q.marks || 1) > 1 ? 's' : ''}]</span>
                  </div>

                  ${diagrams.length > 0 ? `
                    <div class="diagram-row">
                      ${diagrams.map((d: any) => {
                        const img = typeof d === 'string' ? d : d.relative_url || d.url || '';
                        return img ? `<img src="${img}" class="diagram-img" />` : '';
                      }).join('')}
                    </div>
                  ` : ''}

                  ${opts.length > 0 ? `
                    <div class="options-wrap">
                      ${opts.map((opt: any) => `
                        <div class="option-item">
                          <span class="opt-key">(${opt.key})</span>
                          <span>${opt.text || ''}</span>
                          ${opt.imageUrl ? `<img src="${opt.imageUrl}" class="opt-img" />` : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank', 'width=900,height=950');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(printDoc);
        printWindow.document.close();
      } else {
        alert('Popup blocker prevented opening PDF export window. Please allow popups for this site.');
      }
    } catch (err: any) {
      alert(`PDF Export failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-indigo-600 border border-indigo-400 text-white px-5 py-3 rounded-2xl shadow-2xl animate-fade-in flex items-center space-x-2 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-indigo-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#D1D5DB] p-4 sm:p-5 rounded-xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold font-display text-[#111827] flex items-center space-x-2.5">
            <FolderTree className="w-6 h-6 text-[#0B1F3A]" />
            <span>Question Paper Bank</span>
          </h1>
          <p className="text-xs text-[#4B5563] mt-1">
            Organized examination archive. Save, browse, and export papers by Class and Subject in Word, Excel, and PDF formats.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={paperFileInputRef}
            accept=".json"
            onChange={handleImportPaperJson}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => paperFileInputRef.current?.click()}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#D1D5DB] text-[#111827] rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-xs"
            title="Import an entire Question Paper from standard JSON (.json) format"
          >
            <Upload className="w-4 h-4 text-teal-600" />
            <span>Import Paper (JSON)</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                const res = await api.post('/papers/sync-storage');
                showToast(`💾 Synced all Question Papers & Question Bank to storage (data/Bank)!`);
              } catch (err: any) {
                alert(`Sync failed: ${err.message}`);
              }
            }}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#D1D5DB] text-[#111827] rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-xs"
            title="Sync all papers and questions to storage"
          >
            <HardDrive className="w-4 h-4 text-[#0B1F3A]" />
            <span>Sync to Storage</span>
          </button>

          <button
            onClick={() => {
              setEditingPaper(null);
              setModalTitle(`EXAMINATION - ${new Date().getFullYear()}`);
              setModalExamCode(`EXAM-${Math.floor(100 + Math.random() * 900)}`);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 text-xs py-2 px-4 bg-[#0B1F3A] hover:bg-[#152e52] text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Question Paper</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Taxonomy & Archive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Class & Subject Hierarchy Tree (col-span-3) */}
        <div className="lg:col-span-3 bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-4 space-y-4 max-h-[750px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center space-x-1.5">
              <Folder className="w-4 h-4 text-[#0B1F3A]" />
              <span>Taxonomy Folders</span>
            </span>
            {(selectedClass !== 'ALL' || selectedSubject !== 'ALL') && (
              <button
                onClick={() => {
                  setSelectedClass('ALL');
                  setSelectedSubject('ALL');
                }}
                className="text-xs text-[#0B1F3A] hover:underline font-semibold"
              >
                Reset
              </button>
            )}
          </div>

          {/* All Papers Selector */}
          <button
            onClick={() => {
              setSelectedClass('ALL');
              setSelectedSubject('ALL');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              selectedClass === 'ALL' && selectedSubject === 'ALL'
                ? 'bg-[#0B1F3A] text-white shadow-xs'
                : 'text-[#4B5563] hover:bg-slate-100 hover:text-[#111827]'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4" />
              <span>All Question Papers</span>
            </div>
            <span className="text-xs font-mono opacity-80">({papers.length})</span>
          </button>

          {/* Classes & Sub-Subjects Hierarchy */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280] px-1">
              Select Class & Subject
            </span>

            {classList.map((cls) => {
              const papersInClass = papers.filter((p) => getPaperMeta(p).className === cls);
              const isClassSelected = selectedClass === cls;

              return (
                <div key={cls} className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedClass(cls);
                      setSelectedSubject('ALL');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      isClassSelected && selectedSubject === 'ALL'
                        ? 'bg-[#0B1F3A]/10 text-[#0B1F3A] border border-[#0B1F3A]/30'
                        : 'text-[#111827] hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Folder className="w-3.5 h-3.5 text-amber-600" />
                      <span>{cls}</span>
                    </div>
                    <span className="text-xs font-mono text-[#6B7280]">({papersInClass.length})</span>
                  </button>

                  {/* Sub-Subjects */}
                  <div className="pl-6 space-y-1">
                    {subjectList.map((subj) => {
                      const papersInSubj = papers.filter(
                        (p) => getPaperMeta(p).className === cls && getPaperMeta(p).subjectName === subj
                      );
                      const isSubjSelected = isClassSelected && selectedSubject === subj;

                      return (
                        <button
                          key={subj}
                          onClick={() => {
                            setSelectedClass(cls);
                            setSelectedSubject(subj);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isSubjSelected
                              ? 'bg-[#0B1F3A] text-white font-bold shadow-xs'
                              : 'text-[#4B5563] hover:text-[#111827] hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <ChevronRight className="w-3 h-3 text-[#6B7280]" />
                            <span>{subj}</span>
                          </div>
                          {papersInSubj.length > 0 && (
                            <span className="text-xs font-mono opacity-75">({papersInSubj.length})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Question Paper Cards & Export Actions (col-span-9) */}
        <div className="lg:col-span-9 bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-5 space-y-5">
          {/* Search, Status & Action Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search paper by name, exam code, subject..."
                className="w-full bg-white border border-[#D1D5DB] rounded-xl pl-10 pr-4 py-2 text-xs text-[#111827] placeholder-[#6B7280] focus:outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]/20"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-white border border-[#D1D5DB] text-xs rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft Papers</option>
                <option value="FINALIZED">Finalized Snapshots</option>
              </select>
            </div>
          </div>

          {/* Active Filter Pill Display */}
          {(selectedClass !== 'ALL' || selectedSubject !== 'ALL') && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#6B7280]">Current Folder Filter:</span>
              <span className="bg-[#0B1F3A]/10 text-[#0B1F3A] border border-[#0B1F3A]/30 px-2.5 py-0.5 rounded-full font-semibold">
                📁 {selectedClass} &gt; {selectedSubject}
              </span>
            </div>
          )}

          {/* Paper Cards Grid */}
          <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-20 text-xs text-[#6B7280]">Loading paper archive...</div>
            ) : filteredPapers.length === 0 ? (
              <div className="text-center py-20 text-xs text-[#6B7280] border border-dashed border-[#D1D5DB] rounded-xl space-y-2">
                <p>No question papers found in this folder filter.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-[#0B1F3A] hover:underline font-semibold"
                >
                  + Create your first question paper here
                </button>
              </div>
            ) : (
              filteredPapers.map((p) => {
                const meta = getPaperMeta(p);

                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-xl bg-white border border-[#D1D5DB] hover:border-[#0B1F3A]/40 transition-all space-y-4 shadow-sm group"
                  >
                    {/* Header Row: Title, Exam Code & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2.5">
                          <h3 className="text-base font-bold text-[#111827] font-display group-hover:text-[#0B1F3A] transition-colors">
                            {p.title}
                          </h3>
                          <span className="font-mono text-xs text-[#0B1F3A] bg-[#0B1F3A]/5 border border-[#0B1F3A]/20 px-2 py-0.5 rounded-md font-semibold">
                            {p.examCode}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              p.status === 'FINALIZED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {p.status === 'FINALIZED' ? '✓ FINALIZED' : 'DRAFT'}
                          </span>
                        </div>
                        <div className="text-xs text-classic-text-secondary flex items-center space-x-3 font-medium">
                          <span className="flex items-center space-x-1.5 text-classic-navy font-semibold">
                            <School className="w-3.5 h-3.5 text-classic-navy shrink-0" />
                            <span>{p.schoolName || 'CAMBRIDGE INTERNATIONAL SCHOOL MANDI'}</span>
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="flex items-center space-x-1.5 text-classic-navy font-bold">
                            <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{meta.className} &gt; {meta.subjectName}</span>
                          </span>
                        </div>
                      </div>

                      {/* Primary Open Button */}
                      <button
                        onClick={() => handleOpenPaperInDesigner(p)}
                        className="px-4 py-2 bg-[#0B1F3A] hover:bg-[#152e52] text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-white" />
                        <span>Open in Designer</span>
                      </button>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#111827] bg-slate-50 p-3 rounded-xl border border-[#E5E7EB]">
                      <div className="flex items-center space-x-1.5">
                        <Award className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Max Marks: <strong>{p.maxMarks}</strong></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>Duration: <strong>{p.durationMinutes} Mins</strong></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-[#0B1F3A] shrink-0" />
                        <span>Questions: <strong>{meta.questionCount}</strong></span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[#374151]">
                        <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Updated: <strong>{new Date(p.updatedAt).toLocaleDateString()}</strong></span>
                      </div>
                    </div>

                    {/* Multi-Format Export Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#E5E7EB]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-classic-text-primary mr-1">Export:</span>

                        {!canExportPaper(p) && (
                          <span className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center space-x-1 mr-1" title="Only assigned users or admins can download or export this paper">
                            <Lock className="w-3 h-3 text-amber-700" />
                            <span>Assigned Access Only</span>
                          </span>
                        )}

                        {/* Export to Word with Marking Scheme */}
                        <button
                          type="button"
                          onClick={() => handleExportWord(p.id, p.title, p.creatorId)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
                          title="Download styled Microsoft Word document (.doc) with complete layout & Marking Scheme appendix"
                        >
                          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                          <span>Word (.doc)</span>
                        </button>

                        {/* Export Official PDF */}
                        <button
                          type="button"
                          onClick={() => handleExportOfficialPdf(p.id, p.title, false, p.creatorId)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
                          title="Download publication-ready A4 PDF Question Paper"
                        >
                          <Download className="w-4 h-4 text-rose-700 shrink-0" />
                          <span>PDF</span>
                        </button>

                        {/* Export PDF with Answers */}
                        <button
                          type="button"
                          onClick={() => handleExportOfficialPdf(p.id, p.title, true, p.creatorId)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
                          title="Download A4 PDF Exam Paper with Official Marking Scheme & Solutions Appendix"
                        >
                          <Download className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>PDF + Answers</span>
                        </button>

                        {/* Export Portable JSON */}
                        <button
                          type="button"
                          onClick={() => handleExportJson(p.id, p.title, p.creatorId)}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
                          title="Download portable JSON (.json) format for LMS and external apps"
                        >
                          <Code className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>JSON (.json)</span>
                        </button>

                        {/* Export to Excel */}
                        <button
                          type="button"
                          onClick={() => handleExportExcel(p.id, p.title, p.creatorId)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
                          title="Download Excel spreadsheet (.csv) with UTF-8 support for all languages"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Excel (.csv)</span>
                        </button>
                      </div>

                      {/* Clone & Delete Controls */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleClonePaper(p.id, p.title)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#111827] border border-[#D1D5DB] rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors"
                          title="Clone this paper to create an alternate Set (Set B)"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-700" />
                          <span>Clone Set</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePaper(p.id, p.title)}
                          className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
                          title="Delete paper"
                        >
                          <Trash2 className="w-4 h-4 text-rose-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create New Question Paper Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50  z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D1D5DB] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-[#111827] flex items-center space-x-2">
              <Plus className="w-5 h-5 text-[#0B1F3A]" />
              <span>Create New Examination Paper</span>
            </h3>

            <form onSubmit={handleCreateNewPaper} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#4B5563] font-semibold mb-1">Paper Name / Exam Title</label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Annual Examination - 2026"
                  className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4B5563] font-semibold mb-1">Class Folder</label>
                  <input
                    type="text"
                    required
                    value={modalClass}
                    onChange={(e) => setModalClass(e.target.value)}
                    placeholder="e.g. Class 12, Class 10"
                    className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]/20"
                  />
                </div>
                <div>
                  <label className="block text-[#4B5563] font-semibold mb-1">Subject Subfolder</label>
                  <input
                    type="text"
                    required
                    value={modalSubject}
                    onChange={(e) => setModalSubject(e.target.value)}
                    placeholder="e.g. Physics, Mathematics"
                    className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4B5563] font-semibold mb-1">Exam Code</label>
                  <input
                    type="text"
                    required
                    value={modalExamCode}
                    onChange={(e) => setModalExamCode(e.target.value)}
                    placeholder="e.g. PHY-101"
                    className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-[#111827] font-mono focus:outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]/20"
                  />
                </div>
                <div>
                  <label className="block text-[#4B5563] font-semibold mb-1">Target Max Marks</label>
                  <input
                    type="number"
                    required
                    value={modalMaxMarks}
                    onChange={(e) => setModalMaxMarks(parseInt(e.target.value, 10))}
                    className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4B5563] font-semibold mb-1">School / Institute Name</label>
                <input
                  type="text"
                  required
                  value={modalSchoolName}
                  onChange={(e) => setModalSchoolName(e.target.value)}
                  placeholder="e.g. CAMBRIDGE INTERNATIONAL SCHOOL MANDI"
                  className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-[#111827] uppercase focus:outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]/20"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#111827] border border-[#D1D5DB] rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B1F3A] hover:bg-[#152e52] text-white rounded-xl font-bold transition-colors shadow-sm"
                >
                  Create & Open Designer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
