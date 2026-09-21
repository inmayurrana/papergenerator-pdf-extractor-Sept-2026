import React, { useState } from 'react';
import {
  Languages,
  Globe,
  ArrowRightLeft,
  Sparkles,
  RefreshCw,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';

export interface SupportedLanguage {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو (Urdu)', flag: '🇵🇰' },
  { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
  { code: 'sa', name: 'संस्कृतम् (Sanskrit)', flag: '🇮🇳' },
  { code: 'fr', name: 'Français (French)', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪' },
  { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺' },
];

interface LanguageTranslatorBarProps {
  text: string;
  onApplyTranslation: (translatedText: string) => void;
  compact?: boolean;
}

export const LanguageTranslatorBar: React.FC<LanguageTranslatorBarProps> = ({
  text,
  onApplyTranslation,
  compact = false,
}) => {
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('hi');
  const [detectedLang, setDetectedLang] = useState<{
    code: string;
    name: string;
    script: string;
    confidence: number;
  } | null>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedResult, setTranslatedResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleDetectLanguage = async () => {
    if (!text || !text.trim()) {
      setErrorMsg('Please enter or paste text first to detect language');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setIsDetecting(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/documents/detect-language', { text });
      const data = res.data;
      setDetectedLang({
        code: data.language,
        name: data.language_name,
        script: data.script,
        confidence: data.confidence,
      });
      setSourceLang(data.language);

      // Auto pick a logical target language if source matches target
      if (data.language === targetLang) {
        setTargetLang(data.language === 'en' ? 'hi' : 'en');
      }
    } catch (err: any) {
      console.error('Detection failed:', err);
      setErrorMsg(err.response?.data?.error || 'Language detection failed');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleTranslate = async () => {
    if (!text || !text.trim()) {
      setErrorMsg('Please enter or paste text to translate');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setIsTranslating(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/documents/translate', {
        text,
        target_lang: targetLang,
        source_lang: sourceLang === 'auto' ? undefined : sourceLang,
      });

      if (res.data?.translated_text) {
        setTranslatedResult(res.data.translated_text);
        setShowPreview(true);
        if (res.data.source_lang && !detectedLang) {
          const match = SUPPORTED_LANGUAGES.find((l) => l.code === res.data.source_lang);
          setDetectedLang({
            code: res.data.source_lang,
            name: match ? match.name : res.data.source_lang,
            script: '',
            confidence: 1.0,
          });
        }
      }
    } catch (err: any) {
      console.error('Translation failed:', err);
      setErrorMsg(err.response?.data?.error || 'Translation failed. Please try again.');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyTranslated = async () => {
    if (!translatedResult) return;
    try {
      await navigator.clipboard.writeText(translatedResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Could not copy to clipboard');
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') {
      if (detectedLang) {
        const oldTarget = targetLang;
        setTargetLang(detectedLang.code);
        setSourceLang(oldTarget);
      }
    } else {
      const oldSource = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(oldSource);
    }
  };

  return (
    <div className="space-y-3">
      {/* Action Controls Bar */}
      <div className={`p-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 ${compact ? 'text-xs' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Detect Button */}
          <button
            type="button"
            onClick={handleDetectLanguage}
            disabled={isDetecting || !text.trim()}
            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-40"
            title="Automatically detect script and language of your text"
          >
            {isDetecting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>{isDetecting ? 'Detecting...' : 'Detect Language'}</span>
          </button>

          {/* Detected Language Pill */}
          {detectedLang && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[11px] font-medium text-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>
                Detected: <strong>{detectedLang.name}</strong> ({detectedLang.code.toUpperCase()})
                {detectedLang.script ? ` &bull; ${detectedLang.script}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Translation Selector & Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Language Dropdown */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Translate to:</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 text-white rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Swap */}
          {sourceLang !== 'auto' && (
            <button
              type="button"
              onClick={handleSwapLanguages}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
              title="Swap source and target language"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Translate Button */}
          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating || !text.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition-all disabled:opacity-40"
          >
            {isTranslating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Languages className="w-3.5 h-3.5 text-white" />
            )}
            <span>{isTranslating ? 'Translating...' : 'Translate Text'}</span>
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Translation Result Card / Drawer */}
      {showPreview && translatedResult && (
        <div className="p-4 bg-slate-900/95 border border-indigo-500/40 rounded-2xl shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>
                Translated Text (
                {SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang}
                )
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                Formulas &amp; Options Preserved
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyTranslated}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center space-x-1 transition-colors"
                title="Copy translated text to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onApplyTranslation(translatedResult);
                  setShowPreview(false);
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow flex items-center space-x-1.5 transition-colors"
                title="Apply translated text for ingestion"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Use Translated Text</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
            {translatedResult}
          </div>
        </div>
      )}
    </div>
  );
};
