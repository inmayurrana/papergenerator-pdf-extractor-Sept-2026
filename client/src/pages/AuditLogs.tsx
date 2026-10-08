import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Filter,
  Search,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Download,
  AlertTriangle,
  Globe,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Code,
  FileText,
  Layers,
  User,
  ArrowRight,
  Maximize2,
  Minimize2,
  X,
  Tag,
  Eye,
  FileQuestion,
  Columns,
  LayoutList,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { triggerFileDownload } from '../lib/downloadHelper';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';

// Safe JSON parser
const parseJsonSafely = (str: string | undefined | null) => {
  if (!str) return {};
  try {
    return typeof str === 'object' ? str : JSON.parse(str);
  } catch {
    return {};
  }
};

// Relative time calculation
const getRelativeTime = (timestamp: string | Date) => {
  if (!timestamp) return 'N/A';
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return past.toLocaleDateString();
};

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Inspector & View states
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'split' | 'full'>('split');
  const [detailTab, setDetailTab] = useState<'diff' | 'raw'>('diff');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/audit-logs/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load audit stats:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (resourceFilter) params.resourceType = resourceFilter;
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/audit-logs', { params });
      const fetchedLogs = res.data.logs || [];
      setLogs(fetchedLogs);

      // Auto-select first log or preserve current selection
      setSelectedLog((prev: any) => {
        if (prev && fetchedLogs.find((l: any) => l.id === prev.id)) {
          return fetchedLogs.find((l: any) => l.id === prev.id);
        }
        return fetchedLogs.length > 0 ? fetchedLogs[0] : null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, resourceFilter, statusFilter, searchQuery]);

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/audit-logs/export', { responseType: 'blob' });
      triggerFileDownload(new Blob([res.data], { type: 'text/csv; charset=utf-8;' }), `audit_trail_report_${Date.now()}.csv`);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const handleCopy = (text: string, type: 'id' | 'json') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  // Navigation between logs in inspector
  const currentLogIndex = selectedLog ? logs.findIndex((l) => l.id === selectedLog.id) : -1;
  const hasPrev = currentLogIndex > 0;
  const hasNext = currentLogIndex !== -1 && currentLogIndex < logs.length - 1;

  const goToPrev = () => {
    if (hasPrev) setSelectedLog(logs[currentLogIndex - 1]);
  };

  const goToNext = () => {
    if (hasNext) setSelectedLog(logs[currentLogIndex + 1]);
  };

  // Helper to extract diffs from parsed details
  const extractDiffs = (details: any) => {
    const diffEntries: Array<{ field: string; from: any; to: any }> = [];

    if (details?.changes && typeof details.changes === 'object') {
      for (const [field, val] of Object.entries(details.changes)) {
        const v = val as any;
        diffEntries.push({
          field,
          from: v?.from !== undefined ? v.from : 'N/A',
          to: v?.to !== undefined ? v.to : 'N/A',
        });
      }
    } else if (details?.prev && details?.new && typeof details.prev === 'object' && typeof details.new === 'object') {
      const allKeys = Array.from(new Set([...Object.keys(details.prev), ...Object.keys(details.new)]));
      for (const k of allKeys) {
        if (details.prev[k] !== details.new[k]) {
          diffEntries.push({
            field: k,
            from: details.prev[k],
            to: details.new[k],
          });
        }
      }
    }

    return diffEntries;
  };

  // Helper to format payload summary badge in table row
  const renderRowSummary = (detailsJson: string, action: string) => {
    const details = parseJsonSafely(detailsJson);
    const diffs = extractDiffs(details);

    return (
      <div className="flex items-center justify-end space-x-2 flex-wrap gap-y-1">
        {diffs.length > 0 && (
          <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-300 text-amber-900 font-mono text-xs font-semibold flex items-center space-x-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-800" />
            <span>{diffs.length} change{diffs.length > 1 ? 's' : ''}</span>
          </span>
        )}

        {details?.title && (
          <span
            className="px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-[#0B1F3A] text-xs font-medium truncate max-w-[150px]"
            title={details.title}
          >
            "{details.title}"
          </span>
        )}

        {details?.examCode && (
          <span className="px-2 py-0.5 rounded bg-slate-100 border border-[#D1D5DB] text-[#111827] text-xs font-mono font-bold">
            {details.examCode}
          </span>
        )}

        {details?.questionNumber && (
          <span className="px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-900 text-xs font-mono font-bold">
            Q#{details.questionNumber}
          </span>
        )}

        {details?.marks !== undefined && (
          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono font-bold">
            {details.marks}M
          </span>
        )}

        {details?.filename && (
          <span
            className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-900 text-xs truncate max-w-[130px]"
            title={details.filename}
          >
            {details.filename}
          </span>
        )}

        {details?.email && (
          <span
            className="px-2 py-0.5 rounded bg-slate-100 border border-[#D1D5DB] text-[#374151] text-xs truncate max-w-[140px]"
            title={details.email}
          >
            {details.email}
          </span>
        )}

        {details?.updates && Object.keys(details.updates).length > 0 && (
          <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            {Object.keys(details.updates).length} updates
          </span>
        )}

        <span className="text-[#6B7280] group-hover:text-[#0B1F3A] flex items-center pl-1 group-hover:translate-x-0.5 transition-transform">
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    );
  };

  // Helper for badge color based on action type
  const getActionBadgeClass = (action: string, isBlocked: boolean, isFailed: boolean) => {
    if (isBlocked) return 'text-amber-900 bg-amber-50 border-amber-300';
    if (isFailed) return 'text-rose-900 bg-rose-50 border-rose-300';
    if (action?.startsWith('CREATE') || action?.startsWith('UPLOAD')) {
      return 'text-emerald-900 bg-emerald-50 border-emerald-300';
    }
    if (action?.startsWith('DELETE')) {
      return 'text-rose-900 bg-rose-50 border-rose-300';
    }
    if (action?.startsWith('UPDATE')) {
      return 'text-[#0B1F3A] bg-blue-50 border-blue-300';
    }
    if (action?.startsWith('LOGIN')) {
      return 'text-sky-900 bg-sky-50 border-sky-300';
    }
    return 'text-[#111827] bg-slate-100 border-[#D1D5DB]';
  };

  const parsedDetails = selectedLog ? parseJsonSafely(selectedLog.detailsJson) : {};
  const activeDiffs = selectedLog ? extractDiffs(parsedDetails) : [];

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#D1D5DB] p-5 rounded-lg shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#0B1F3A] text-white flex items-center justify-center shrink-0">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl sm:text-2xl text-[#111827]">Security & Activity Audit Trail</h1>
            <p className="text-sm text-[#374151]">
              Immutable audit ledger of user authentications, document ingestions, question updates, and security events
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* View mode toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 border border-[#D1D5DB] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'split'
                  ? 'bg-[#0B1F3A] text-white shadow-xs'
                  : 'text-[#374151] hover:text-[#111827]'
              }`}
              title="Split View: Event stream + Right details inspector"
            >
              <Columns className="w-4 h-4" />
              <span>Inspector View</span>
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'full'
                  ? 'bg-[#0B1F3A] text-white shadow-xs'
                  : 'text-[#374151] hover:text-[#111827]'
              }`}
              title="Full Table View"
            >
              <LayoutList className="w-4 h-4" />
              <span>Full Ledger</span>
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              fetchStats();
              fetchLogs();
            }}
            loading={loading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={handleExportCsv}
            icon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-[#D1D5DB]">
            <div className="text-xs text-[#4B5563] uppercase font-bold tracking-wider">Total Audited Events</div>
            <div className="text-2xl font-black text-[#111827] font-mono mt-1">{stats.totalEvents}</div>
            <div className="text-xs text-[#6B7280] mt-0.5">All user & system actions</div>
          </Card>

          <Card className="p-4 border-[#D1D5DB]">
            <div className="text-xs text-[#0B1F3A] uppercase font-bold tracking-wider flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-[#0B1F3A]" />
              <span>Auth & Security (24h)</span>
            </div>
            <div className="text-2xl font-black text-[#0B1F3A] font-mono mt-1">{stats.securityEvents24h}</div>
            <div className="text-xs text-[#6B7280] mt-0.5">Logins, challenges, policy changes</div>
          </Card>

          <Card className="p-4 border-[#D1D5DB]">
            <div className="text-xs text-amber-900 uppercase font-bold tracking-wider flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <span>Blocked Threats (24h)</span>
            </div>
            <div className="text-2xl font-black text-amber-800 font-mono mt-1">{stats.blockedEvents24h}</div>
            <div className="text-xs text-[#6B7280] mt-0.5">Account lockouts & security blocks</div>
          </Card>

          <Card className="p-4 border-[#D1D5DB]">
            <div className="text-xs text-rose-900 uppercase font-bold tracking-wider flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <span>Failed Logins (24h)</span>
            </div>
            <div className="text-2xl font-black text-rose-800 font-mono mt-1">{stats.failedEvents24h}</div>
            <div className="text-xs text-[#6B7280] mt-0.5">Invalid credential attempts</div>
          </Card>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card className="p-4 border-[#D1D5DB] flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[240px]">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, email, actor name, IP, resource ID..."
            icon={<Search className="w-4 h-4 text-[#6B7280]" />}
          />
        </div>

        {/* Status Filter */}
        <div className="w-44">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { label: 'All Statuses', value: '' },
              { label: 'SUCCESS', value: 'SUCCESS' },
              { label: 'FAILED', value: 'FAILED' },
              { label: 'BLOCKED / LOCKED', value: 'BLOCKED' },
            ]}
          />
        </div>

        {/* Action Filter */}
        <div className="w-56">
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={[
              { label: 'All Actions', value: '' },
              { label: 'LOGIN_SUCCESS', value: 'LOGIN_SUCCESS' },
              { label: 'LOGIN_FAILED', value: 'LOGIN_FAILED' },
              { label: 'ACCOUNT_LOCKED', value: 'ACCOUNT_LOCKED' },
              { label: 'LOGIN_LOCKED_ATTEMPT', value: 'LOGIN_LOCKED_ATTEMPT' },
              { label: 'LOGIN_CHALLENGE_FAILED', value: 'LOGIN_CHALLENGE_FAILED' },
              { label: 'UPDATE_SECURITY_SETTINGS', value: 'UPDATE_SECURITY_SETTINGS' },
              { label: 'UNLOCK_USER', value: 'UNLOCK_USER' },
              { label: 'CREATE_PAPER', value: 'CREATE_PAPER' },
              { label: 'UPDATE_PAPER', value: 'UPDATE_PAPER' },
              { label: 'DELETE_PAPER', value: 'DELETE_PAPER' },
              { label: 'FINALIZE_PAPER', value: 'FINALIZE_PAPER' },
              { label: 'CREATE_QUESTION', value: 'CREATE_QUESTION' },
              { label: 'UPDATE_QUESTION', value: 'UPDATE_QUESTION' },
              { label: 'DELETE_QUESTION', value: 'DELETE_QUESTION' },
              { label: 'UPLOAD_DOCUMENT', value: 'UPLOAD_DOCUMENT' },
              { label: 'EVALUATE_OMR', value: 'EVALUATE_OMR' },
            ]}
          />
        </div>

        {/* Resource Filter */}
        <div className="w-48">
          <Select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            options={[
              { label: 'All Resources', value: '' },
              { label: 'AUTH', value: 'AUTH' },
              { label: 'SECURITY', value: 'SECURITY' },
              { label: 'USER', value: 'USER' },
              { label: 'QUESTION', value: 'QUESTION' },
              { label: 'PAPER', value: 'PAPER' },
              { label: 'PAPER_SNAPSHOT', value: 'PAPER_SNAPSHOT' },
              { label: 'OMR_EVALUATION', value: 'OMR_EVALUATION' },
              { label: 'DOCUMENT', value: 'DOCUMENT' },
              { label: 'SYSTEM', value: 'SYSTEM' },
            ]}
          />
        </div>
      </Card>

      {/* Main Content Area: Split View or Full View */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Side: Audit Event Stream */}
        <Card
          className={`${
            viewMode === 'split' ? 'col-span-12 lg:col-span-7 xl:col-span-7' : 'col-span-12'
          } p-5 border-[#D1D5DB] space-y-4`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-base text-[#111827]">Audit Event Stream ({logs.length})</h2>
              {viewMode === 'split' && (
                <span className="text-xs bg-[#0B1F3A]/10 border border-[#0B1F3A]/20 text-[#0B1F3A] px-2.5 py-0.5 rounded font-medium">
                  Click any row to inspect details
                </span>
              )}
            </div>
            <span className="text-xs text-[#6B7280]">Showing newest records first</span>
          </div>

          <div className="divide-y divide-[#E5E7EB]">
            {/* Table Header */}
            <div className="grid grid-cols-12 py-2 text-[#374151] font-bold uppercase tracking-wider text-xs">
              <div className={viewMode === 'split' ? 'col-span-3' : 'col-span-2'}>Timestamp</div>
              <div className={viewMode === 'split' ? 'col-span-3' : 'col-span-2'}>User / Actor</div>
              <div className={viewMode === 'split' ? 'col-span-3' : 'col-span-3'}>Action & Resource</div>
              {viewMode === 'full' && <div className="col-span-2">Network & IP</div>}
              <div className={`${viewMode === 'split' ? 'col-span-3' : 'col-span-3'} text-right`}>
                Changes & Details
              </div>
            </div>

            {/* Table Rows */}
            {logs.length === 0 ? (
              <EmptyState
                title="No audit records found"
                description={loading ? 'Retrieving audit events from secure ledger...' : 'No events match the current filter query.'}
                icon={<ScrollText className="w-10 h-10 text-[#0B1F3A]" />}
              />
            ) : (
              logs.map((log) => {
                const isBlocked = log.status === 'BLOCKED' || log.action?.includes('LOCKED');
                const isFailed = log.status === 'FAILED';
                const isSelected = selectedLog?.id === log.id;

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`grid grid-cols-12 py-3.5 items-center px-3 rounded-lg transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-[#0B1F3A] shadow-xs'
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    {/* Timestamp */}
                    <div className={`${viewMode === 'split' ? 'col-span-3' : 'col-span-2'} font-mono text-[#111827] text-xs`}>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                        <span className="truncate font-semibold">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-xs text-[#6B7280] block pl-5 mt-0.5">
                        {getRelativeTime(log.timestamp)}
                      </span>
                    </div>

                    {/* Actor */}
                    <div className={`${viewMode === 'split' ? 'col-span-3' : 'col-span-2'} text-[#111827] pr-2`}>
                      <div className="truncate text-sm font-bold text-[#111827]">{log.user?.fullName || 'Anonymous / System'}</div>
                      <span className="text-xs text-[#4B5563] block font-mono truncate">
                        {log.user?.email || 'N/A'}
                      </span>
                    </div>

                    {/* Action & Status */}
                    <div className={`${viewMode === 'split' ? 'col-span-3' : 'col-span-3'} flex flex-col space-y-1 pr-2`}>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs border ${getActionBadgeClass(
                            log.action,
                            isBlocked,
                            isFailed
                          )}`}
                        >
                          {log.action}
                        </span>

                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                            isBlocked
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isFailed
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {log.status || 'SUCCESS'}
                        </span>
                      </div>

                      <span className="text-xs font-mono text-[#4B5563] truncate">
                        [{log.resourceType}] {log.resourceId ? `ID: ${log.resourceId.slice(0, 8)}...` : ''}
                      </span>
                    </div>

                    {/* Network & IP (Shown in Full View) */}
                    {viewMode === 'full' && (
                      <div className="col-span-2 text-xs font-mono text-[#111827]">
                        <div className="flex items-center space-x-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                          <span className="truncate font-semibold">{log.ipAddress || '127.0.0.1 (Local)'}</span>
                        </div>
                        {log.userAgent && (
                          <span className="text-xs text-[#6B7280] truncate block max-w-[150px] mt-0.5" title={log.userAgent}>
                            {log.userAgent}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Right-Side Details & Payload Summary */}
                    <div className={`${viewMode === 'split' ? 'col-span-3' : 'col-span-3'} text-right`}>
                      {renderRowSummary(log.detailsJson, log.action)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Side: Detailed Event & Changes Inspector */}
        {viewMode === 'split' && (
          <div className="col-span-12 lg:col-span-5 xl:col-span-5 sticky top-6 self-start max-h-[calc(100vh-6rem)] overflow-y-auto space-y-4">
            {selectedLog ? (
              <Card className="p-5 border-[#D1D5DB] space-y-4">
                {/* Inspector Header & Controls */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-[#0B1F3A] text-white flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#111827]">Event Details & Changes</h3>
                      <p className="text-xs text-[#6B7280]">
                        Record #{currentLogIndex + 1} of {logs.length}
                      </p>
                    </div>
                  </div>

                  {/* Navigation & Controls */}
                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goToPrev}
                      disabled={!hasPrev}
                      title="Previous audit record"
                      icon={<ChevronLeft className="w-4 h-4" />}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goToNext}
                      disabled={!hasNext}
                      title="Next audit record"
                      icon={<ChevronRight className="w-4 h-4" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>

                {/* Event Identity Card */}
                <div className="p-4 bg-slate-50 rounded-lg border border-[#E5E7EB] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span
                      className={`font-mono font-bold px-3 py-1 rounded text-xs border ${getActionBadgeClass(
                        selectedLog.action,
                        selectedLog.status === 'BLOCKED',
                        selectedLog.status === 'FAILED'
                      )}`}
                    >
                      {selectedLog.action}
                    </span>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded uppercase flex items-center space-x-1.5 ${
                        selectedLog.status === 'BLOCKED'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : selectedLog.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {selectedLog.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{selectedLog.status || 'SUCCESS'}</span>
                    </span>
                  </div>

                  {/* Resource Info */}
                  <div className="flex items-center justify-between text-xs pt-1 text-[#374151] border-t border-[#E5E7EB]">
                    <span className="text-[#4B5563] flex items-center space-x-1.5">
                      <Tag className="w-4 h-4 text-[#0B1F3A]" />
                      <span className="font-semibold">Target Resource:</span>
                    </span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#D1D5DB] text-[#0B1F3A] text-xs">
                      {selectedLog.resourceType}
                    </span>
                  </div>

                  {selectedLog.resourceId && (
                    <div className="flex items-center justify-between text-xs text-[#4B5563]">
                      <span className="font-semibold">Resource ID:</span>
                      <div className="flex items-center space-x-1 font-mono text-xs text-[#111827]">
                        <span className="truncate max-w-[170px]" title={selectedLog.resourceId}>
                          {selectedLog.resourceId}
                        </span>
                        <button
                          onClick={() => handleCopy(selectedLog.resourceId, 'id')}
                          className="p-1 hover:text-[#0B1F3A] transition-colors"
                          title="Copy Resource ID"
                        >
                          {copiedId ? (
                            <Check className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Copy className="w-4 h-4 text-[#6B7280] hover:text-[#111827]" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center justify-between text-xs text-[#4B5563]">
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-[#6B7280]" />
                      <span className="font-semibold">Timestamp:</span>
                    </span>
                    <div className="text-right">
                      <span className="font-mono text-[#111827] block text-xs font-bold">
                        {new Date(selectedLog.timestamp).toLocaleString()}
                      </span>
                      <span className="text-xs text-[#0B1F3A] font-medium">
                        {getRelativeTime(selectedLog.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actor & Environment Card */}
                <div className="p-4 bg-slate-50 rounded-lg border border-[#E5E7EB] text-xs space-y-2.5">
                  <div className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-[#0B1F3A]" />
                    <span>Actor & Environment Origin</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#6B7280] block font-medium">Actor Name</span>
                      <span className="font-bold text-[#111827] truncate block text-sm">
                        {selectedLog.user?.fullName || 'Anonymous / System'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#6B7280] block font-medium">User Role</span>
                      <span className="font-mono font-bold text-[#0B1F3A] block text-xs">
                        {selectedLog.user?.role || 'SYSTEM'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#6B7280] block font-medium">Email</span>
                      <span className="font-mono text-[#111827] truncate block text-xs" title={selectedLog.user?.email}>
                        {selectedLog.user?.email || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#6B7280] block font-medium">Network IP</span>
                      <span className="font-mono text-[#111827] flex items-center space-x-1 font-semibold text-xs">
                        <Globe className="w-3.5 h-3.5 text-[#6B7280]" />
                        <span>{selectedLog.ipAddress || '127.0.0.1'}</span>
                      </span>
                    </div>
                  </div>

                  {selectedLog.userAgent && (
                    <div className="pt-2 border-t border-[#E5E7EB] text-xs text-[#6B7280] truncate" title={selectedLog.userAgent}>
                      Client: {selectedLog.userAgent}
                    </div>
                  )}
                </div>

                {/* View Tabs: Visual Changes vs Raw JSON */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setDetailTab('diff')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                          detailTab === 'diff'
                            ? 'bg-[#0B1F3A] text-white shadow-xs'
                            : 'text-[#374151] hover:text-[#111827]'
                        }`}
                      >
                        <Layers className="w-4 h-4" />
                        <span>Detailed Changes</span>
                      </button>

                      <button
                        onClick={() => setDetailTab('raw')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                          detailTab === 'raw'
                            ? 'bg-[#0B1F3A] text-white shadow-xs'
                            : 'text-[#374151] hover:text-[#111827]'
                        }`}
                      >
                        <Code className="w-4 h-4" />
                        <span>Raw JSON</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopy(JSON.stringify(parsedDetails, null, 2), 'json')}
                      className="flex items-center space-x-1.5 text-xs text-[#4B5563] hover:text-[#0B1F3A] font-semibold transition-colors"
                      title="Copy JSON Payload"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-700" />
                          <span className="text-emerald-800">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Payload</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Tab 1: Detailed Visual Changes & Attributes */}
                  {detailTab === 'diff' && (
                    <div className="space-y-3">
                      {/* Field-by-Field Diff Comparison */}
                      {activeDiffs.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                            <ArrowUpDown className="w-4 h-4 text-amber-800" />
                            <span>Modified Fields ({activeDiffs.length})</span>
                          </div>

                          <div className="space-y-2">
                            {activeDiffs.map((diff, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-slate-50 rounded-lg border border-[#E5E7EB] space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs font-bold text-amber-950">
                                    {diff.field}
                                  </span>
                                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                                    Modified
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {/* Previous Value */}
                                  <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                                    <span className="text-xs uppercase font-bold text-rose-800 block">
                                      Before
                                    </span>
                                    <div className="font-mono text-xs break-words line-clamp-4">
                                      {typeof diff.from === 'object'
                                        ? JSON.stringify(diff.from)
                                        : String(diff.from)}
                                    </div>
                                  </div>

                                  {/* New Value */}
                                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                                    <span className="text-xs uppercase font-bold text-emerald-800 block">
                                      After
                                    </span>
                                    <div className="font-mono text-xs break-words line-clamp-4">
                                      {typeof diff.to === 'object'
                                        ? JSON.stringify(diff.to)
                                        : String(diff.to)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Updated Settings Section */}
                      {parsedDetails?.updates && typeof parsedDetails.updates === 'object' && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider flex items-center space-x-1.5">
                            <Shield className="w-4 h-4 text-[#0B1F3A]" />
                            <span>Security Policy Updates</span>
                          </div>

                          <div className="space-y-1.5">
                            {Object.entries(parsedDetails.updates).map(([k, v], idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-[#E5E7EB] text-xs"
                              >
                                <span className="font-mono text-[#111827] font-semibold">{k}</span>
                                <span className="font-mono font-bold text-emerald-900 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                                  {String(v)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Question Text Preview Box */}
                      {(parsedDetails?.questionText || parsedDetails?.questionSnippet) && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center space-x-1.5">
                            <FileQuestion className="w-4 h-4 text-purple-800" />
                            <span>Question Content</span>
                          </div>

                          <div className="p-3.5 bg-purple-50 rounded-lg border border-purple-200 text-xs text-purple-950 leading-relaxed font-sans italic">
                            "{parsedDetails.questionText || parsedDetails.questionSnippet}"
                          </div>
                        </div>
                      )}

                      {/* Question Paper Details */}
                      {parsedDetails?.title && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider flex items-center space-x-1.5">
                            <BookOpen className="w-4 h-4 text-[#0B1F3A]" />
                            <span>Question Paper Details</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-lg border border-[#E5E7EB] space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[#4B5563] font-semibold">Title:</span>
                              <span className="font-bold text-[#111827] text-right max-w-[200px]">
                                {parsedDetails.title}
                              </span>
                            </div>

                            {parsedDetails.examCode && (
                              <div className="flex items-center justify-between">
                                <span className="text-[#4B5563] font-semibold">Exam Code:</span>
                                <span className="font-mono text-[#0B1F3A] font-bold">
                                  {parsedDetails.examCode}
                                </span>
                              </div>
                            )}

                            {(parsedDetails.maxMarks || parsedDetails.marks) && (
                              <div className="flex items-center justify-between">
                                <span className="text-[#4B5563] font-semibold">Max Marks:</span>
                                <span className="font-mono text-emerald-900 font-bold">
                                  {parsedDetails.maxMarks || parsedDetails.marks} Marks
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Document Details */}
                      {parsedDetails?.filename && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center space-x-1.5">
                            <FileText className="w-4 h-4 text-blue-800" />
                            <span>Document Artifact</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-lg border border-[#E5E7EB] space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[#4B5563] font-semibold">Filename:</span>
                              <span className="font-bold text-[#111827] truncate max-w-[200px]">
                                {parsedDetails.filename}
                              </span>
                            </div>

                            {parsedDetails.chunks !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-[#4B5563] font-semibold">Extracted Chunks:</span>
                                <span className="font-mono text-blue-900 font-bold">
                                  {parsedDetails.chunks} chunks
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Other Arbitrary Key-Value Attributes */}
                      {Object.keys(parsedDetails).filter(
                        (k) =>
                          ![
                            'changes',
                            'prev',
                            'new',
                            'updates',
                            'questionText',
                            'questionSnippet',
                            'title',
                            'examCode',
                            'filename',
                            'chunks',
                          ].includes(k)
                      ).length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">
                            Additional Parameters
                          </div>

                          <div className="p-3 bg-slate-50 rounded-lg border border-[#E5E7EB] space-y-1.5 text-xs">
                            {Object.entries(parsedDetails)
                              .filter(
                                ([k]) =>
                                  ![
                                    'changes',
                                    'prev',
                                    'new',
                                    'updates',
                                    'questionText',
                                    'questionSnippet',
                                    'title',
                                    'examCode',
                                    'filename',
                                    'chunks',
                                  ].includes(k)
                              )
                              .map(([k, v], idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between py-1.5 border-b border-[#E5E7EB] last:border-0"
                                >
                                  <span className="text-[#4B5563] font-mono text-xs font-semibold">{k}</span>
                                  <span className="font-mono text-[#111827] text-xs font-medium truncate max-w-[200px]">
                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Empty Details State */}
                      {Object.keys(parsedDetails).length === 0 && (
                        <div className="text-center py-8 text-[#4B5563] text-sm">
                          No additional payload parameters were recorded with this event.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Raw Formatted JSON */}
                  {detailTab === 'raw' && (
                    <div className="space-y-2">
                      <div className="relative">
                        <pre className="p-4 bg-slate-900 rounded-lg border border-slate-700 text-slate-100 font-mono text-xs overflow-x-auto max-h-[350px] leading-relaxed custom-scrollbar">
                          {JSON.stringify(parsedDetails, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="border-dashed border-[#D1D5DB] p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-lg bg-[#0B1F3A]/10 text-[#0B1F3A] mx-auto flex items-center justify-center">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#111827]">No Audit Event Selected</h3>
                  <p className="text-xs text-[#4B5563] mt-1">
                    Select any audit event from the stream on the left to inspect its detailed changes, payload, and actor context.
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
