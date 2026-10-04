import React, { useState } from 'react';
import { TEXT_DEMOS, URL_DEMOS, SOCIAL_DEMOS, SocialPlatform } from '../data/inputDemos';
import {
  InvestigationInput,
  InputType,
} from '../types/investigation';
import {
  validateInvestigationInput,
  MAX_TEXT_LENGTH,
  MAX_URL_LENGTH,
  MAX_SOCIAL_LENGTH,
} from '../utils/inputValidator';
import { claimExtractor } from '../services/claimExtractor';
import {
  Search,
  Sparkles,
  Link2,
  FileText,
  Share2,
  Send,
  Twitter,
  Flame,
  Camera,
  ArrowRight,
  Info,
  AlertCircle,
  Code2,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  Loader2,
} from 'lucide-react';

interface AnalyzeInputProps {
  onStartAnalysis: (input: InvestigationInput, isDemoScenario: boolean) => void;
  onLoadDemo: () => void;
}

export const AnalyzeInput: React.FC<AnalyzeInputProps> = ({
  onStartAnalysis,
  onLoadDemo,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<InputType>('text');

  // Text state
  const [selectedTextDemoId, setSelectedTextDemoId] = useState<string | null>('text-1');
  const [freeText, setFreeText] = useState('SRM College is closed tomorrow due to heavy rain.');

  // URL state
  const [selectedUrlDemoId, setSelectedUrlDemoId] = useState<string | null>('url-1');
  const [webUrl, setWebUrl] = useState(
    'https://evarsity.srmist.edu.in/announcements/circular-monsoon-rain-advisory-2026.html'
  );

  // Social state
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform>('telegram');
  const [socialDemoIndex, setSocialDemoIndex] = useState<number | null>(0);
  const [socialPost, setSocialPost] = useState(SOCIAL_DEMOS['telegram'][0].postText);
  const [socialAuthor, setSocialAuthor] = useState<string>(SOCIAL_DEMOS['telegram'][0].author);

  // Validation & Loading state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showJsonPreview, setShowJsonPreview] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'phase1' | 'phase2'>('phase1');
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  // Character lengths & limits
  const currentLength =
    activeInputTab === 'text'
      ? freeText.length
      : activeInputTab === 'url'
      ? webUrl.length
      : socialPost.length;

  const currentLimit =
    activeInputTab === 'text'
      ? MAX_TEXT_LENGTH
      : activeInputTab === 'url'
      ? MAX_URL_LENGTH
      : MAX_SOCIAL_LENGTH;

  const isNearLimit = currentLength > currentLimit * 0.85;
  const isOverLimit = currentLength > currentLimit;

  // Clear errors when switching tabs
  const handleTabChange = (tab: InputType) => {
    setActiveInputTab(tab);
    setErrorMessage(null);
    setErrorCode(null);
  };

  // Build live preview of normalized model
  const buildCurrentNormalizedInput = (): InvestigationInput => {
    const rawInput =
      activeInputTab === 'text'
        ? freeText
        : activeInputTab === 'url'
        ? webUrl
        : socialPost;

    const validation = validateInvestigationInput(
      activeInputTab,
      rawInput,
      socialPlatform,
      {
        isDemo:
          activeInputTab === 'text'
            ? selectedTextDemoId !== null
            : activeInputTab === 'url'
            ? selectedUrlDemoId !== null
            : socialDemoIndex !== null,
        scenarioId:
          activeInputTab === 'text'
            ? selectedTextDemoId ?? undefined
            : activeInputTab === 'url'
            ? selectedUrlDemoId ?? undefined
            : socialDemoIndex !== null
            ? SOCIAL_DEMOS[socialPlatform][socialDemoIndex]?.id
            : undefined,
        author: activeInputTab === 'social' ? socialAuthor : undefined,
      }
    );

    if (validation.isValid) {
      return validation.normalizedInput;
    }

    // Fallback draft object for preview
    return {
      id: 'inv-preview-draft',
      inputType: activeInputTab,
      rawInput: rawInput.trim(),
      platform: activeInputTab === 'social' ? socialPlatform : undefined,
      submittedAt: new Date().toISOString(),
      metadata: {
        charCount: rawInput.length,
        wordCount: rawInput.trim().split(/\s+/).filter(Boolean).length,
      },
    };
  };

  const handleAnalyze = () => {
    setErrorMessage(null);
    setErrorCode(null);

    let rawInput = '';
    let isDemo = false;
    let scenarioId: string | undefined = undefined;

    if (activeInputTab === 'text') {
      rawInput = freeText;
      isDemo = selectedTextDemoId !== null;
      scenarioId = selectedTextDemoId ?? undefined;
    } else if (activeInputTab === 'url') {
      rawInput = webUrl;
      isDemo = selectedUrlDemoId !== null;
      scenarioId = selectedUrlDemoId ?? undefined;
    } else if (activeInputTab === 'social') {
      rawInput = socialPost;
      isDemo = socialDemoIndex !== null;
      scenarioId =
        socialDemoIndex !== null
          ? SOCIAL_DEMOS[socialPlatform][socialDemoIndex]?.id
          : undefined;
    }

    // Run strict production validation
    const result = validateInvestigationInput(
      activeInputTab,
      rawInput,
      socialPlatform,
      {
        isDemo,
        scenarioId,
        author: activeInputTab === 'social' ? socialAuthor : undefined,
      }
    );

    if (!result.isValid) {
      setErrorMessage(result.errorMessage);
      setErrorCode(result.errorCode);
      return;
    }

    // Set brief loading transition to demonstrate asynchronous normalization
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onStartAnalysis(result.normalizedInput, isDemo);
    }, 280);
  };

  const copyLivePayload = () => {
    let payload = '';
    if (previewTab === 'phase1') {
      payload = JSON.stringify(buildCurrentNormalizedInput(), null, 2);
    } else {
      const raw =
        activeInputTab === 'text'
          ? freeText
          : activeInputTab === 'url'
          ? webUrl
          : socialPost;
      payload = JSON.stringify(
        claimExtractor.extract(
          raw,
          'inv-preview',
          activeInputTab === 'social' ? socialPlatform : undefined
        ),
        null,
        2
      );
    }
    navigator.clipboard?.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Title & Phase 1 Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-mono font-bold text-[#4F46E5] dark:text-indigo-400 mb-2">
          <span>PHASE 1: STANDARDIZED INPUT LAYER</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-white tracking-tight">
          Trace & Verify an Unverified Claim
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#4B5563] dark:text-gray-300">
          Input any statement, public web link, or social forum post. EchoTrace ingests raw inputs into a normalized investigation model for forensic claim extraction and evidence auditing.
        </p>
      </div>

      {/* Input Console Container */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-gray-800 bg-white dark:bg-[#111622] p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6 transition-colors">
        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap border-b border-gray-100 dark:border-gray-800 pb-3 gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('text')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeInputTab === 'text'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-[#4F46E5] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>1. Direct Text Statement</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('url')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeInputTab === 'url'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-[#4F46E5] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <Link2 className="h-4 w-4" />
            <span>2. Web Link / URL</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('social')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeInputTab === 'social'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-[#4F46E5] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <Share2 className="h-4 w-4" />
            <span>3. Social Post / Forum</span>
          </button>
        </div>

        {/* Tab 1: Direct Raw Text */}
        {activeInputTab === 'text' && (
          <div className="space-y-4">
            {/* Demo Scenarios for Raw Statement */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-[#6B7280] dark:text-gray-400 block">
                  Choose a Statement Demo Scenario:
                </label>
                <span className="text-[11px] font-mono text-gray-400">Presets auto-populate input</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {TEXT_DEMOS.map((demo) => {
                  const isSelected = selectedTextDemoId === demo.id;

                  return (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => {
                        setSelectedTextDemoId(demo.id);
                        setFreeText(demo.claim);
                        setErrorMessage(null);
                        setErrorCode(null);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#4F46E5] bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20 shadow-2xs'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-800/60 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[#111827] dark:text-white">{demo.title}</span>
                        <span className="text-[10px] font-mono text-[#4F46E5] dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                          {demo.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        “{demo.claim}”
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="free-text-input"
                  className="text-xs font-mono font-bold uppercase text-[#6B7280] dark:text-gray-400 block"
                >
                  Direct Claim Statement:
                </label>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    isOverLimit
                      ? 'text-red-600 font-bold'
                      : isNearLimit
                      ? 'text-amber-600'
                      : 'text-gray-400'
                  }`}
                >
                  {freeText.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} chars
                </span>
              </div>
              <textarea
                id="free-text-input"
                rows={4}
                value={freeText}
                onChange={(e) => {
                  setFreeText(e.target.value);
                  setSelectedTextDemoId(null);
                  if (errorMessage) {
                    setErrorMessage(null);
                    setErrorCode(null);
                  }
                }}
                placeholder="Paste or type a claim statement to investigate (e.g. 'SRM College is closed tomorrow due to heavy rain.')..."
                className={`w-full rounded-xl border p-4 text-sm font-semibold text-[#111827] dark:text-white bg-white dark:bg-gray-900/80 focus:ring-2 focus:outline-none transition-colors ${
                  errorMessage && errorCode !== 'MISSING_SOCIAL_CONTENT'
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 dark:border-gray-700 focus:border-[#4F46E5] focus:ring-indigo-500/20'
                }`}
              />
            </div>
          </div>
        )}

        {/* Tab 2: URL Intake */}
        {activeInputTab === 'url' && (
          <div className="space-y-4">
            {/* Informational Callout: Clarifying URL is unverified */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/40 text-xs text-indigo-950 dark:text-indigo-200">
              <Info className="h-4 w-4 text-[#4F46E5] dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Raw URL Ingestion Policy:</span>
                <p className="text-[11px] leading-relaxed text-indigo-900/80 dark:text-indigo-300">
                  Submitting a URL does not verify the content or establish authority. EchoTrace stores the URL as an unverified external source. Claims will be extracted in Phase 2 and cross-referenced in Phase 3.
                </p>
              </div>
            </div>

            {/* Demo Scenarios for URL / Web Links */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase text-[#6B7280] dark:text-gray-400 block">
                Choose an Article / URL Demo Scenario:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {URL_DEMOS.map((demo) => {
                  const isSelected = selectedUrlDemoId === demo.id;

                  return (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => {
                        setSelectedUrlDemoId(demo.id);
                        setWebUrl(demo.url);
                        setErrorMessage(null);
                        setErrorCode(null);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#4F46E5] bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20 shadow-2xs'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-800/60 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[#111827] dark:text-white truncate max-w-[130px]">{demo.title}</span>
                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                          {demo.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        “{demo.claim}”
                      </p>
                      <div className="mt-2 text-[10px] font-mono text-gray-400 truncate">
                        {demo.domain}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="web-url-input"
                  className="text-xs font-mono font-bold uppercase text-[#6B7280] dark:text-gray-400 block"
                >
                  Article or Source URL:
                </label>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    isOverLimit
                      ? 'text-red-600 font-bold'
                      : isNearLimit
                      ? 'text-amber-600'
                      : 'text-gray-400'
                  }`}
                >
                  {webUrl.length.toLocaleString()} / {MAX_URL_LENGTH.toLocaleString()} chars
                </span>
              </div>
              <input
                id="web-url-input"
                type="text"
                value={webUrl}
                onChange={(e) => {
                  setWebUrl(e.target.value);
                  setSelectedUrlDemoId(null);
                  if (errorMessage) {
                    setErrorMessage(null);
                    setErrorCode(null);
                  }
                }}
                placeholder="https://example.com/announcements/circular.html"
                className={`w-full rounded-xl border p-3.5 text-xs sm:text-sm font-semibold text-[#111827] dark:text-white bg-white dark:bg-gray-900/80 focus:ring-2 focus:outline-none font-mono transition-colors ${
                  errorMessage && errorCode !== 'MISSING_SOCIAL_CONTENT'
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 dark:border-gray-700 focus:border-[#4F46E5] focus:ring-indigo-500/20'
                }`}
              />
              <p className="mt-1.5 text-xs text-[#6B7280] dark:text-gray-400">
                Supports public HTTP and HTTPS links. Intranet, localhost, and non-web URI schemes are excluded.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Social / Forum */}
        {activeInputTab === 'social' && (
          <div className="space-y-5">
            {/* Informational Callout: Clarifying Social is unverified */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/40 text-xs text-indigo-950 dark:text-indigo-200">
              <Info className="h-4 w-4 text-[#4F46E5] dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Social Media Ingestion Policy:</span>
                <p className="text-[11px] leading-relaxed text-indigo-900/80 dark:text-indigo-300">
                  Pasted forum posts, chat screenshots, or social commentary are ingested as raw claims with zero assumed credibility. Narrative drift and authority verification will be computed in subsequent phases.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-bold uppercase text-[#6B7280] dark:text-gray-400">
                  Select Public Platform:
                </label>
                <span className="text-xs font-mono text-[#4F46E5] dark:text-indigo-400 font-bold">
                  {socialPlatform.toUpperCase()} PRESETS
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'telegram' as SocialPlatform, label: 'Telegram', icon: Send, color: 'text-sky-500' },
                  { id: 'x' as SocialPlatform, label: 'X (Twitter)', icon: Twitter, color: 'text-gray-900 dark:text-gray-200' },
                  { id: 'reddit' as SocialPlatform, label: 'Reddit', icon: Flame, color: 'text-orange-600' },
                  { id: 'instagram' as SocialPlatform, label: 'Instagram', icon: Camera, color: 'text-pink-600' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isCurrent = socialPlatform === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSocialPlatform(item.id);
                        setSocialDemoIndex(0);
                        const firstDemo = SOCIAL_DEMOS[item.id][0];
                        setSocialPost(firstDemo.postText);
                        setSocialAuthor(firstDemo.author);
                        setErrorMessage(null);
                        setErrorCode(null);
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 text-[#4F46E5] dark:text-indigo-300 shadow-xs'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Distinct Demos for Selected Platform */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase text-[#6B7280] dark:text-gray-400 block">
                Choose a {socialPlatform.toUpperCase()} Demo Scenario:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SOCIAL_DEMOS[socialPlatform].map((demo, idx) => {
                  const isSelected = socialDemoIndex === idx;

                  return (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => {
                        setSocialDemoIndex(idx);
                        setSocialPost(demo.postText);
                        setSocialAuthor(demo.author);
                        setErrorMessage(null);
                        setErrorCode(null);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#4F46E5] bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20 shadow-2xs'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-800/60 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                          <span>{demo.avatarEmoji}</span>
                          <span className="truncate max-w-[150px]">{demo.author}</span>
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">{demo.timestamp.split('·')[0]}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        “{demo.postText}”
                      </p>
                      <div className="mt-2 text-[10px] font-mono text-[#4F46E5] dark:text-indigo-400 font-semibold truncate">
                        Target claim: {demo.extractedClaim}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="social-post-input"
                  className="text-xs font-mono font-bold uppercase text-[#6B7280] dark:text-gray-400 block"
                >
                  Paste or Edit {socialPlatform.toUpperCase()} Post Content:
                </label>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    isOverLimit
                      ? 'text-red-600 font-bold'
                      : isNearLimit
                      ? 'text-amber-600'
                      : 'text-gray-400'
                  }`}
                >
                  {socialPost.length.toLocaleString()} / {MAX_SOCIAL_LENGTH.toLocaleString()} chars
                </span>
              </div>
              <textarea
                id="social-post-input"
                rows={4}
                value={socialPost}
                onChange={(e) => {
                  setSocialPost(e.target.value);
                  setSocialDemoIndex(null);
                  if (errorMessage) {
                    setErrorMessage(null);
                    setErrorCode(null);
                  }
                }}
                placeholder="Paste the raw text of the social post, forward message, or forum thread..."
                className={`w-full rounded-xl border p-4 text-xs sm:text-sm font-semibold text-[#111827] dark:text-white bg-white dark:bg-gray-900/80 focus:ring-2 focus:outline-none transition-colors ${
                  errorMessage
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 dark:border-gray-700 focus:border-[#4F46E5] focus:ring-indigo-500/20'
                }`}
              />
            </div>
          </div>
        )}

        {/* Clear Diagnostic Error State Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-red-900 dark:text-red-200">
                  Input Validation Error
                </span>
                {errorCode && (
                  <span className="text-[10px] font-mono font-bold uppercase bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
                    {errorCode}
                  </span>
                )}
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Expandable Live Normalized Model Inspector (Phase 1 Deliverable) */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowJsonPreview(!showJsonPreview)}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-500 dark:text-gray-400 hover:text-[#4F46E5] dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Inspection Schema Preview</span>
              {showJsonPreview ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {showJsonPreview && (
              <button
                type="button"
                onClick={copyLivePayload}
                className="text-[11px] font-mono text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedPayload ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <span>Copy JSON Payload</span>
                )}
              </button>
            )}
          </div>

          {showJsonPreview && (
            <div className="mt-3 p-3.5 rounded-xl bg-gray-900 dark:bg-black/90 text-gray-100 font-mono text-[11px] overflow-x-auto border border-gray-800 shadow-inner space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-800 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('phase1')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      previewTab === 'phase1'
                        ? 'bg-[#4F46E5] text-white shadow-2xs'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Phase 1: InvestigationInput
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('phase2')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      previewTab === 'phase2'
                        ? 'bg-[#4F46E5] text-white shadow-2xs'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Phase 2: ExtractedClaim Tuple
                  </button>
                </div>
                <span className="text-emerald-400">● Validated Structure</span>
              </div>

              {previewTab === 'phase1' ? (
                <div>
                  <div className="text-[10px] text-gray-400 mb-1">
                    Phase 1 Normalized Intake Model (Emitted to Claim Extraction):
                  </div>
                  <pre className="whitespace-pre leading-relaxed text-indigo-300">
                    {JSON.stringify(buildCurrentNormalizedInput(), null, 2)}
                  </pre>
                </div>
              ) : (
                <div>
                  <div className="text-[10px] text-gray-400 mb-1">
                    Phase 2 Extracted Claim Tuple (Consumed by Evidence Search):
                  </div>
                  <pre className="whitespace-pre leading-relaxed text-emerald-300">
                    {JSON.stringify(
                      claimExtractor.extract(
                        activeInputTab === 'text'
                          ? freeText
                          : activeInputTab === 'url'
                          ? webUrl
                          : socialPost,
                        'inv-preview',
                        activeInputTab === 'social' ? socialPlatform : undefined
                      ),
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button & Clear Loading State */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#6B7280] dark:text-gray-400 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-[#4F46E5] dark:text-indigo-400" />
            <span>Produces validated InvestigationInput for Phase 2 Claim Extraction.</span>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isSubmitting || isOverLimit}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition-all cursor-pointer ${
              isSubmitting || isOverLimit
                ? 'bg-indigo-400 cursor-not-allowed opacity-80'
                : 'bg-[#4F46E5] hover:bg-[#4338CA] shadow-indigo-500/25 active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Normalizing Input...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Start Lineage Analysis</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
