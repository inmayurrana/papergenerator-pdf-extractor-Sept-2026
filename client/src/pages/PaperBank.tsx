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
} from 'lucide-react';
import { api } from '../lib/api';

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
  const [modalSchoolName, setModalSchoolName] = useState('DELHI PUBLIC SCHOOL');
  const [modalMaxMarks, setModalMaxMarks] = useState(70);
  const [modalDuration, setModalDuration] = useState(180);
  const paperFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportWord = async (paperId: string, title: string) => {
    try {
      const res = await api.get(`/papers/${paperId}/export/word`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/msword; charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (title || 'Question_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}.doc`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast(`📄 Exported "${title}" as editable Microsoft Word document (.doc)!`);
    } catch (err: any) {
      alert(`Word Export failed: ${err.message}`);
    }
  };

  const handleExportExcel = async (paperId: string, title: string) => {
    try {
      const res = await api.get(`/papers/${paperId}/export/excel`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv; charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (title || 'Question_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast(`📊 Exported "${title}" as Excel CSV (.csv)!`);
    } catch (err: any) {
      alert(`Excel Export failed: ${err.message}`);
    }
  };

  const handleExportJson = async (paperId: string, title: string) => {
    try {
      const res = await api.get(`/papers/${paperId}/export/json`);
      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json; charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (title || 'Question_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast(`📦 Exported "${title}" as portable JSON (.json)!`);
    } catch (err: any) {
      alert(`JSON Export failed: ${err.message}`);
    }
  };

  const handleExportOfficialPdf = async (paperId: string, title: string, withAnswers = false) => {
    try {
      showToast(`📄 Generating official A4 PDF ${withAnswers ? 'with Marking Scheme' : ''}...`);
      const res = await api.get(`/papers/${paperId}/export/pdf?withAnswers=${withAnswers}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (title || 'Question_Paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeTitle}${withAnswers ? '_With_Answers' : ''}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast(`📄 Downloaded official PDF ${withAnswers ? 'with Marking Scheme' : ''}!`);
    } catch (err: any) {
      console.warn('Backend PDF endpoint error, falling back to print view:', err.message);
      handleDownloadPDF(paperId, title);
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
  const handleDownloadPDF = async (paperId: string, title: string) => {
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
            <div class="school-name">${paper.schoolName || 'DELHI PUBLIC SCHOOL'}</div>
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
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center space-x-2.5">
            <FolderTree className="w-7 h-7 text-indigo-400" />
            <span>Question Paper Bank</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
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
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-teal-500/40 text-teal-300 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow"
            title="Import an entire Question Paper from standard JSON (.json) format"
          >
            <Upload className="w-4 h-4 text-teal-400" />
            <span>📥 Import Paper (JSON)</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                const res = await api.post('/papers/sync-storage');
                showToast(`💾 Synced all Question Papers & Question Bank to D:\\...\\data\\Bank!`);
              } catch (err: any) {
                alert(`Sync failed: ${err.message}`);
              }
            }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow"
            title="Sync all papers and questions to storage"
          >
            <HardDrive className="w-4 h-4 text-indigo-400" />
            <span>💾 Sync to Storage</span>
          </button>

          <button
            onClick={() => {
              setEditingPaper(null);
              setModalTitle(`EXAMINATION - ${new Date().getFullYear()}`);
              setModalExamCode(`EXAM-${Math.floor(100 + Math.random() * 900)}`);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center space-x-2 text-xs py-2.5 px-4 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create New Question Paper</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Taxonomy & Archive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Class & Subject Hierarchy Tree (col-span-3) */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-4 space-y-4 max-h-[750px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Folder className="w-4 h-4 text-indigo-400" />
              <span>Taxonomy Folders</span>
            </span>
            {(selectedClass !== 'ALL' || selectedSubject !== 'ALL') && (
              <button
                onClick={() => {
                  setSelectedClass('ALL');
                  setSelectedSubject('ALL');
                }}
                className="text-[11px] text-indigo-400 hover:underline font-semibold"
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
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4" />
              <span>All Question Papers</span>
            </div>
            <span className="text-[10px] font-mono opacity-80">({papers.length})</span>
          </button>

          {/* Classes & Sub-Subjects Hierarchy */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
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
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Folder className="w-3.5 h-3.5 text-amber-400" />
                      <span>{cls}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">({papersInClass.length})</span>
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
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                            isSubjSelected
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <ChevronRight className="w-3 h-3 text-slate-500" />
                            <span>{subj}</span>
                          </div>
                          {papersInSubj.length > 0 && (
                            <span className="text-[10px] font-mono opacity-75">({papersInSubj.length})</span>
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
        <div className="lg:col-span-9 glass-panel rounded-2xl p-5 space-y-5">
          {/* Search, Status & Action Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search paper by name, exam code, subject..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
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
              <span className="text-slate-400">Current Folder Filter:</span>
              <span className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full font-semibold">
                📁 {selectedClass} &gt; {selectedSubject}
              </span>
            </div>
          )}

          {/* Paper Cards Grid */}
          <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-20 text-xs text-slate-400">Loading paper archive...</div>
            ) : filteredPapers.length === 0 ? (
              <div className="text-center py-20 text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl space-y-2">
                <p>No question papers found in this folder filter.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-indigo-400 hover:underline font-semibold"
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
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-md group"
                  >
                    {/* Header Row: Title, Exam Code & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2.5">
                          <h3 className="text-base font-bold text-white font-display group-hover:text-indigo-300 transition-colors">
                            {p.title}
                          </h3>
                          <span className="font-mono text-xs text-indigo-400 bg-indigo-950/80 border border-indigo-500/40 px-2 py-0.5 rounded-md font-semibold">
                            {p.examCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === 'FINALIZED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {p.status === 'FINALIZED' ? '✓ FINALIZED' : 'DRAFT'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center space-x-3">
                          <span>🏫 {p.schoolName || 'DELHI PUBLIC SCHOOL'}</span>
                          <span>&bull;</span>
                          <span className="text-indigo-300 font-semibold">
                            📁 {meta.className} &gt; {meta.subjectName}
                          </span>
                        </div>
                      </div>

                      {/* Primary Open Button */}
                      <button
                        onClick={() => handleOpenPaperInDesigner(p)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/25 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Open in Designer</span>
                      </button>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center space-x-1.5">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>Max Marks: <strong>{p.maxMarks}</strong></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-teal-400" />
                        <span>Duration: <strong>{p.durationMinutes} Mins</strong></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span>Questions: <strong>{meta.questionCount}</strong></span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>Updated: {new Date(p.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Multi-Format Export Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400 mr-1">Export:</span>

                        {/* Export to Word with Marking Scheme */}
                        <button
                          type="button"
                          onClick={() => handleExportWord(p.id, p.title)}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
                          title="Download styled Microsoft Word document (.doc) with complete layout & Marking Scheme appendix"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Word (.doc)</span>
                        </button>

                        {/* Export Official PDF */}
                        <button
                          type="button"
                          onClick={() => handleExportOfficialPdf(p.id, p.title, false)}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
                          title="Download publication-ready A4 PDF Question Paper"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        {/* Export PDF with Answers */}
                        <button
                          type="button"
                          onClick={() => handleExportOfficialPdf(p.id, p.title, true)}
                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
                          title="Download A4 PDF Exam Paper with Official Marking Scheme & Solutions Appendix"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF + Answers</span>
                        </button>

                        {/* Export Portable JSON */}
                        <button
                          type="button"
                          onClick={() => handleExportJson(p.id, p.title)}
                          className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
                          title="Download portable JSON (.json) format for LMS and external apps"
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>JSON (.json)</span>
                        </button>

                        {/* Export to Excel */}
                        <button
                          type="button"
                          onClick={() => handleExportExcel(p.id, p.title)}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
                          title="Download Excel spreadsheet (.csv) with UTF-8 support for all languages"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Excel (.csv)</span>
                        </button>
                      </div>

                      {/* Clone & Delete Controls */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleClonePaper(p.id, p.title)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors"
                          title="Clone this paper to create an alternate Set (Set B)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Clone Set</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePaper(p.id, p.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
                          title="Delete paper"
                        >
                          <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              <span>Create New Examination Paper</span>
            </h3>

            <form onSubmit={handleCreateNewPaper} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Paper Name / Exam Title</label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Annual Examination - 2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Class Folder</label>
                  <input
                    type="text"
                    required
                    value={modalClass}
                    onChange={(e) => setModalClass(e.target.value)}
                    placeholder="e.g. Class 12, Class 10"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subject Subfolder</label>
                  <input
                    type="text"
                    required
                    value={modalSubject}
                    onChange={(e) => setModalSubject(e.target.value)}
                    placeholder="e.g. Physics, Mathematics"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Exam Code</label>
                  <input
                    type="text"
                    required
                    value={modalExamCode}
                    onChange={(e) => setModalExamCode(e.target.value)}
                    placeholder="e.g. PHY-101"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Max Marks</label>
                  <input
                    type="number"
                    required
                    value={modalMaxMarks}
                    onChange={(e) => setModalMaxMarks(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">School / Institute Name</label>
                <input
                  type="text"
                  required
                  value={modalSchoolName}
                  onChange={(e) => setModalSchoolName(e.target.value)}
                  placeholder="e.g. DELHI PUBLIC SCHOOL"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-600/30"
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
