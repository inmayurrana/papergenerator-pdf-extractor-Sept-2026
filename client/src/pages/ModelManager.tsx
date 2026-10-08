import React, { useState, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  Activity,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Layers,
  ShieldCheck,
  Power,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api';

export const ModelManager: React.FC = () => {
  const [resources, setResources] = useState<any | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unloading, setUnloading] = useState(false);
  const [restartingAll, setRestartingAll] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, 'toggle' | 'restart'>>({});
  const [msg, setMsg] = useState('');

  const fetchSystemData = async () => {
    setLoading(true);
    try {
      const [resRes, modelsRes] = await Promise.all([
        api.get('/system/resources'),
        api.get('/system/models'),
      ]);
      setResources(resRes.data);
      setModels(modelsRes.data.models || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUnloadModels = async () => {
    setUnloading(true);
    try {
      const res = await api.post('/system/models/unload');
      setMsg(res.data.message || 'All loaded models released from RAM/VRAM.');
      fetchSystemData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      alert(`Unload failed: ${err.message}`);
    } finally {
      setUnloading(false);
    }
  };

  const handleToggleEngine = async (name: string, currentlyEnabled: boolean) => {
    setActionLoading(prev => ({ ...prev, [name]: 'toggle' }));
    try {
      const res = await api.post(`/system/models/${encodeURIComponent(name)}/toggle`, {
        enabled: !currentlyEnabled,
      });
      setMsg(res.data.message || `Engine ${name} is now ${!currentlyEnabled ? 'ENABLED' : 'DISABLED'}.`);
      setModels(prev =>
        prev.map(m =>
          m.name === name
            ? {
                ...m,
                is_enabled: !currentlyEnabled,
                health: !currentlyEnabled ? 'HEALTHY' : 'DISABLED',
              }
            : m
        )
      );
      fetchSystemData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      alert(`Failed to toggle engine: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleRestartEngine = async (name: string) => {
    setActionLoading(prev => ({ ...prev, [name]: 'restart' }));
    try {
      const res = await api.post(`/system/models/${encodeURIComponent(name)}/restart`);
      setMsg(res.data.message || `Engine ${name} restarted successfully.`);
      setModels(prev =>
        prev.map(m =>
          m.name === name
            ? { ...m, is_enabled: true, health: 'HEALTHY' }
            : m
        )
      );
      fetchSystemData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      alert(`Failed to restart engine: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleRestartAll = async () => {
    setRestartingAll(true);
    try {
      const res = await api.post('/system/models/restart-all');
      setMsg(res.data.message || 'All engine adapters restarted successfully.');
      fetchSystemData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      alert(`Restart all failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setRestartingAll(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#D1D5DB] p-5 rounded-xl shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#0B1F3A]/5 text-[#0B1F3A] border border-[#0B1F3A]/15 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-[#0B1F3A]" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#111827]">System Resource & Model Manager</h1>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Universal Hardware (min: Intel Core i3 2nd Gen &bull; 6 GB RAM &bull; CPU-Only) &bull; RAM-Aware LRU Model Eviction
            </p>
          </div>
        </div>

        <button
          onClick={handleUnloadModels}
          disabled={unloading}
          className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm flex items-center space-x-2 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-white" />
          <span>{unloading ? 'Releasing Memory...' : 'Unload All Models & Free RAM'}</span>
        </button>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 text-center font-medium shadow-xs">
          {msg}
        </div>
      )}

      {/* Hardware Resource Dials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CPU */}
        <div className="bg-white border border-[#D1D5DB] p-6 rounded-xl shadow-sm space-y-3.5">
          <div className="flex items-center justify-between text-xs text-[#4B5563]">
            <span className="font-bold uppercase tracking-wider text-[#4B5563]">CPU Utilization</span>
            <Cpu className="w-4 h-4 text-[#0B1F3A]" />
          </div>
          <div className="text-3xl font-extrabold text-[#111827] font-mono tracking-tight">
            {resources ? `${resources.cpu_percent}%` : '--'}
          </div>
          <div className="w-full bg-[#E5E7EB] h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                resources && resources.cpu_percent > 85 ? 'bg-red-600' : 'bg-[#0B1F3A]'
              }`}
              style={{ width: `${resources?.cpu_percent || 0}%` }}
            />
          </div>
          <div className="text-xs text-[#6B7280]">
            {resources?.cpu_count || 4} Logical Cores Available
          </div>
        </div>

        {/* System RAM */}
        <div className="bg-white border border-[#D1D5DB] p-6 rounded-xl shadow-sm space-y-3.5">
          <div className="flex items-center justify-between text-xs text-[#4B5563]">
            <span className="font-bold uppercase tracking-wider text-[#4B5563]">RAM Usage & Target Cap</span>
            <HardDrive className="w-4 h-4 text-[#0B1F3A]" />
          </div>
          <div className="text-3xl font-extrabold text-[#111827] font-mono tracking-tight">
            {resources ? `${(resources.ram_used_mb / 1024).toFixed(1)} / ${(resources.ram_total_mb / 1024).toFixed(1)} GB` : '--'}
          </div>
          <div className="w-full bg-[#E5E7EB] h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                resources && resources.ram_percent > 80 ? 'bg-amber-600' : 'bg-blue-700'
              }`}
              style={{ width: `${resources?.ram_percent || 0}%` }}
            />
          </div>
          <div className="text-xs text-[#6B7280]">
            Target Cap: <span className="font-mono text-[#111827] font-semibold">5.0 GB</span> &bull; Free: <span className="font-mono text-emerald-700 font-semibold">{resources ? (resources.ram_available_mb / 1024).toFixed(1) : 0} GB</span>
          </div>
        </div>

        {/* GPU / VRAM */}
        <div className="bg-white border border-[#D1D5DB] p-6 rounded-xl shadow-sm space-y-3.5">
          <div className="flex items-center justify-between text-xs text-[#4B5563]">
            <span className="font-bold uppercase tracking-wider text-[#4B5563]">GPU & Concurrency Lock</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-[#111827] font-mono tracking-tight">
            {resources?.gpu?.available ? `${resources.gpu.vram_used_mb} MB` : 'CPU Mode'}
          </div>
          <div className="text-xs text-[#6B7280] space-y-1">
            <div>Device: <span className="text-[#111827] font-semibold">{resources?.gpu?.name || 'CPU Integrated'}</span></div>
            <div>Max Heavy Jobs: <span className="font-mono text-[#0B1F3A] font-bold">{resources?.max_heavy_jobs || 1}</span> &bull; Sequential Lock Active</div>
          </div>
        </div>
      </div>

      {/* Engine Adapters Table */}
      <div className="bg-white border border-[#D1D5DB] p-6 rounded-xl shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="font-bold text-base text-[#111827]">Pluggable Engine Adapter Registry</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">Manage runtime availability, toggle adapters, or restart subsystem workers</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-[#6B7280] font-mono hidden sm:inline">Idle Unload Timeout: 180s</span>
            <button
              onClick={handleRestartAll}
              disabled={restartingAll || Object.keys(actionLoading).length > 0}
              className="bg-white hover:bg-gray-50 text-[#0B1F3A] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#D1D5DB] shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              title="Restart all engines and purge memory"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${restartingAll ? 'animate-spin text-[#0B1F3A]' : 'text-[#4B5563]'}`} />
              <span>{restartingAll ? 'Restarting All...' : 'Restart All Engines'}</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#E5E7EB] text-xs">
          <div className="grid grid-cols-12 py-2.5 px-3 text-[#4B5563] font-semibold uppercase tracking-wider text-xs items-center bg-gray-50 rounded-lg">
            <div className="col-span-4">Engine Name & Capabilities</div>
            <div className="col-span-1">Version</div>
            <div className="col-span-2">RAM / VRAM</div>
            <div className="col-span-2">Health</div>
            <div className="col-span-3 text-right">Status & Actions</div>
          </div>

          {models.map((m, idx) => {
            const isLoadingToggle = actionLoading[m.name] === 'toggle';
            const isLoadingRestart = actionLoading[m.name] === 'restart';
            const isAnyLoading = isLoadingToggle || isLoadingRestart || restartingAll;

            return (
              <div
                key={idx}
                className={`grid grid-cols-12 py-3.5 items-center hover:bg-gray-50/80 px-3 rounded-lg transition-colors border-b border-[#E5E7EB]/70 ${
                  !m.is_enabled ? 'opacity-65' : ''
                }`}
              >
                <div className="col-span-4 space-y-1 pr-2">
                  <div className="font-semibold text-[#111827] flex items-center space-x-2">
                    <span>{m.name}</span>
                    {!m.is_enabled && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold">
                        OFF
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(m.capabilities || []).map((c: string, cIdx: number) => (
                      <span key={cIdx} className="text-xs font-mono bg-gray-100 text-[#4B5563] border border-gray-200 px-1.5 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="col-span-1 font-mono text-[#6B7280]">{m.version}</div>

                <div className="col-span-2 font-mono text-[#374151] text-xs">
                  ~{m.ram_req_mb} MB {m.vram_req_mb > 0 ? `+ ${m.vram_req_mb} MB VRAM` : ''}
                </div>

                <div className="col-span-2">
                  <span className={`inline-flex items-center space-x-1 font-semibold ${
                    m.health === 'HEALTHY'
                      ? 'text-emerald-700'
                      : m.health === 'DISABLED'
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}>
                    {m.health === 'HEALTHY' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                    )}
                    <span>{m.health}</span>
                  </span>
                </div>

                <div className="col-span-3 flex items-center justify-end space-x-2">
                  {/* Status Badge */}
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                    m.is_enabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    {m.is_enabled ? 'ENABLED' : 'DISABLED'}
                  </span>

                  {/* Enable / Disable Button */}
                  <button
                    onClick={() => handleToggleEngine(m.name, m.is_enabled)}
                    disabled={isAnyLoading}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      m.is_enabled
                        ? 'bg-white hover:bg-red-50 text-red-700 border-red-300'
                        : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}
                    title={m.is_enabled ? `Disable ${m.name}` : `Enable ${m.name}`}
                  >
                    {isLoadingToggle ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Power className="w-3 h-3" />
                    )}
                    <span>{m.is_enabled ? 'Disable' : 'Enable'}</span>
                  </button>

                  {/* Restart Engine Button */}
                  <button
                    onClick={() => handleRestartEngine(m.name)}
                    disabled={isAnyLoading}
                    className="text-xs font-semibold px-2.5 py-1 rounded-md border bg-white hover:bg-gray-100 text-[#111827] border-[#D1D5DB] transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    title={`Restart ${m.name} process & purge memory`}
                  >
                    <RotateCcw className={`w-3 h-3 ${isLoadingRestart ? 'animate-spin text-[#0B1F3A]' : 'text-[#4B5563]'}`} />
                    <span>Restart</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

