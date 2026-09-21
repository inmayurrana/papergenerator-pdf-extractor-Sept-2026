import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  HelpCircle,
  QrCode,
  CheckCircle,
  ArrowUpRight,
  SplitSquareVertical,
  Scissors,
  FileSpreadsheet,
  Cpu,
  Clock,
  ChevronRight,
  ShieldCheck,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    documentsCount: 0,
    questionsCount: 0,
    papersCount: 0,
    omrCount: 0,
  });
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{ id: string; filename: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [docsRes, questionsRes, papersRes, omrRes] = await Promise.all([
        api.get('/documents'),
        api.get('/questions'),
        api.get('/papers'),
        api.get('/omr/evaluations'),
      ]);

      setStats({
        documentsCount: docsRes.data?.documents?.length || 0,
        questionsCount: questionsRes.data?.questions?.length || 0,
        papersCount: papersRes.data?.papers?.length || 0,
        omrCount: omrRes.data?.evaluations?.length || 0,
      });

      setRecentDocs((docsRes.data?.documents || []).slice(0, 8));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmDoc) return;
    try {
      setDeleting(true);
      await api.delete(`/documents/${deleteConfirmDoc.id}`);
      setRecentDocs((prev) => prev.filter((d) => d.id !== deleteConfirmDoc.id));
      setStats((prev) => ({ ...prev, documentsCount: Math.max(0, prev.documentsCount - 1) }));
      setDeleteConfirmDoc(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Ingested Documents',
      value: stats.documentsCount,
      icon: FileText,
      color: 'from-blue-600 to-indigo-600',
      link: '/ingest',
    },
    {
      title: 'Question Bank',
      value: stats.questionsCount,
      icon: HelpCircle,
      color: 'from-indigo-600 to-violet-600',
      link: '/bank',
    },
    {
      title: 'Question Papers',
      value: stats.papersCount,
      icon: FileSpreadsheet,
      color: 'from-violet-600 to-purple-600',
      link: '/designer',
    },
    {
      title: 'OMR Evaluated',
      value: stats.omrCount,
      icon: QrCode,
      color: 'from-emerald-600 to-teal-600',
      link: '/omr-eval',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-3xl relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/40 border border-slate-800">
        <div className="relative z-10 max-w-4xl space-y-3">
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">
            Dashboard, Welcome {user?.fullName || 'User'}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Extract mathematics, physics formulas, chemistry structures, diagrams, and questions from multi-format PDFs with confidence escalation. Design interactive papers and evaluate OMR sheets with OpenCV precision.
          </p>
          <div className="pt-2 flex items-center space-x-4">
            <button
              onClick={() => navigate('/ingest')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Ingest New Document</span>
            </button>
            <button
              onClick={() => navigate('/designer')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium px-5 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Paper Designer Canvas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.link}
              className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between group"
            >
              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{card.title}</div>
                <div className="text-3xl font-extrabold text-white font-mono">{card.value}</div>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Launchers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => navigate('/review')}
          className="glass-panel glass-panel-hover p-6 rounded-2xl cursor-pointer space-y-3 border border-indigo-500/20"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <SplitSquareVertical className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-white">Three-Panel Review</h3>
          <p className="text-xs text-slate-400">
            Compare original page images side-by-side with extracted LaTeX formulas, options, and confidence metrics.
          </p>
        </div>

        <div
          onClick={() => navigate('/snip')}
          className="glass-panel glass-panel-hover p-6 rounded-2xl cursor-pointer space-y-3 border border-violet-500/20"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
            <Scissors className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-white">Visual Snipping Workspace</h3>
          <p className="text-xs text-slate-400">
            Draw crops over diagrams or formulas, run localized recognition without reprocessing the entire file.
          </p>
        </div>

        <div
          onClick={() => navigate('/omr-eval')}
          className="glass-panel glass-panel-hover p-6 rounded-2xl cursor-pointer space-y-3 border border-emerald-500/20"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-white">High-Precision OMR Scoring</h3>
          <p className="text-xs text-slate-400">
            Perspective warp, bubble darkness analysis, automatic scoring, and manual teacher review override.
          </p>
        </div>
      </div>

      {/* Recent Ingested Documents Pipeline */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-bold text-lg text-white">Recent Document Pipeline</h2>
            <p className="text-xs text-slate-400">Sequential page processing status and extraction confidence</p>
          </div>
          <Link
            to="/ingest"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
          >
            <span>View All Documents</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentDocs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No documents ingested yet. Upload your first PDF to begin.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="py-4 flex items-center justify-between hover:bg-slate-900/40 px-2 rounded-xl transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-200">{doc.filename}</div>
                    <div className="text-xs text-slate-400 flex items-center space-x-3 mt-0.5">
                      <span>{doc.pageCount} Pages</span>
                      <span>&bull;</span>
                      <span className="font-mono">{doc.isDigital ? 'Digital PDF' : 'Scanned Document'}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-[11px] text-slate-400">{doc.sha256.substring(0, 10)}...</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    doc.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : doc.status === 'PROCESSING'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {doc.status}
                  </span>

                  <button
                    onClick={() => navigate(`/review?docId=${doc.id}`)}
                    className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 rounded-lg border border-indigo-500/20 text-xs font-medium flex items-center space-x-1 transition-colors"
                    title="Review document in 3-Panel Review"
                  >
                    <span>Review</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmDoc({ id: doc.id, filename: doc.filename })}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-500/20 text-xs font-medium flex items-center space-x-1 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
