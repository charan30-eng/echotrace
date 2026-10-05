import React, { useState, useEffect } from 'react';
import { ActiveTab, ClaimAnalysis, InvestigationInput } from './types/claim';
import { PRIMARY_DEMO_CLAIM, PRESET_HISTORY_CLAIMS } from './data/demoClaims';
import { DEMO_SCENARIOS, DemoScenarioItem } from './data/demoScenarios';
import {
  generateCustomClaimAnalysis,
  generateStagedInvestigationAnalysis,
} from './utils/claimGenerator';
import { claimExtractor } from './services/claimExtractor';
import { evidenceSearch } from './services/evidenceSearch';
import { Header } from './components/Header';
import { LandingHero } from './components/LandingHero';
import { AnalyzeInput } from './components/AnalyzeInput';
import { PipelineProcessing } from './components/PipelineProcessing';
import { Dashboard } from './components/Dashboard';
import { HistoryView } from './components/HistoryView';
import { HowItWorksView } from './components/HowItWorksView';
import { ForensicArchitectureView } from './components/ForensicArchitectureView';
import { investigationService } from './services/investigationService';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('echotrace_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('echotrace_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Default to the first SRM Demo Scenario (College Closure) with Phase 2 extraction and Phase 3 query plan
  const [currentAnalysis, setCurrentAnalysis] = useState<ClaimAnalysis>(() => {
    const ext = claimExtractor.extract(DEMO_SCENARIOS[0].claim);
    const queryPlan = evidenceSearch.generateQueryPlan(ext.primaryClaim);
    return {
      ...DEMO_SCENARIOS[0].analysis,
      extractedClaim: ext.primaryClaim,
      extractionResult: ext,
      evidenceSearchResponse: {
        status: 'demo_preserved',
        claimId: ext.primaryClaim.id,
        claimText: ext.primaryClaim.claimText,
        queryPlan,
        results: [],
        totalResultsFound: 0,
        uniqueUrlsCount: 0,
        providerUsed: 'EvidenceSearchProvider (Demo Preserved)',
        executedQueries: queryPlan.queries.map((q) => q.query),
        executionTimeMs: 0,
        retrievedAt: new Date().toISOString(),
      },
    };
  });

  // Initialize history with all 5 SRM scenarios plus general presets
  const [historyList, setHistoryList] = useState<ClaimAnalysis[]>([
    ...DEMO_SCENARIOS.map((s) => s.analysis),
    ...PRESET_HISTORY_CLAIMS.slice(1),
  ]);

  // Phase 12: Load Persisted Investigations from Storage / REST API on mount
  useEffect(() => {
    let isMounted = true;
    investigationService.getInvestigations().then((persistedRecords) => {
      if (!isMounted || !persistedRecords || persistedRecords.length === 0) return;
      const converted = persistedRecords.map((rec) =>
        investigationService.investigationRecordToAnalysis(rec)
      );
      setHistoryList((prev) => {
        const seenIds = new Set(converted.map((c) => c.id));
        const seenTexts = new Set(converted.map((c) => c.text.toLowerCase()));
        const unseeded = prev.filter(
          (item) => !seenIds.has(item.id) && !seenTexts.has(item.text.toLowerCase())
        );
        return [...converted, ...unseeded];
      });
    }).catch((err) => {
      console.warn('[EchoTrace:App] Failed to load persisted investigations:', err);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pendingInput, setPendingInput] = useState<InvestigationInput | null>(null);
  const [pendingClaimText, setPendingClaimText] = useState<string>(
    DEMO_SCENARIOS[0].claim
  );

  // Handler to start pipeline processing with normalized input
  const handleStartAnalysis = (
    inputOrText: InvestigationInput | string,
    isDemoScenario = false
  ) => {
    if (typeof inputOrText === 'string') {
      const syntheticInput: InvestigationInput = {
        id: `inv-${Date.now()}`,
        inputType: 'text',
        rawInput: inputOrText,
        submittedAt: new Date().toISOString(),
        metadata: {
          charCount: inputOrText.length,
          wordCount: inputOrText.split(/\s+/).filter(Boolean).length,
          isDemo: isDemoScenario,
        },
      };
      setPendingInput(syntheticInput);
      setPendingClaimText(inputOrText);
    } else {
      setPendingInput(inputOrText);
      setPendingClaimText(inputOrText.rawInput);
    }
    setIsProcessing(true);
  };

  // Called when pipeline finishes 5-step animation
  const handlePipelineComplete = () => {
    let newAnalysis: ClaimAnalysis;

    const currentRawInput = pendingInput?.rawInput || pendingClaimText;
    const isExplicitDemo = pendingInput?.metadata?.isDemo;
    const scenarioId = pendingInput?.metadata?.sourceScenarioId;

    // 1. Check if explicitly linked to a preset demo scenario ID
    if (scenarioId) {
      const matchedById = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
      if (matchedById) {
        const ext = claimExtractor.extract(currentRawInput, pendingInput?.id);
        newAnalysis = {
          ...matchedById.analysis,
          timestamp: 'Just now',
          investigationInput: pendingInput || undefined,
          extractedClaim: ext.primaryClaim,
          extractionResult: ext,
        };
        finishProcessing(newAnalysis);
        return;
      }
    }

    // 2. Check if matching any of our 5 SRM demo scenarios by text / content
    const lower = currentRawInput.toLowerCase();
    const matchedScenario = DEMO_SCENARIOS.find(
      (s) =>
        lower === s.claim.toLowerCase() ||
        s.claim.toLowerCase().includes(lower) ||
        (s.id === 'srm-college-closure' &&
          (lower.includes('closed tomorrow') || lower.includes('heavy rain'))) ||
        (s.id === 'srm-exam-postponement' &&
          (lower.includes('internal exam') || lower.includes('postponed to monday'))) ||
        (s.id === 'srm-placement-drive' &&
          (lower.includes('tcs') || lower.includes('placement drive'))) ||
        (s.id === 'srm-college-event' &&
          (lower.includes('fest') || lower.includes('cultural fest'))) ||
        (s.id === 'srm-transport-claim' &&
          (lower.includes('bus') || lower.includes('buses')))
    );

    if (isExplicitDemo && matchedScenario) {
      const ext = claimExtractor.extract(currentRawInput, pendingInput?.id);
      newAnalysis = {
        ...matchedScenario.analysis,
        timestamp: 'Just now',
        investigationInput: pendingInput || undefined,
        extractedClaim: ext.primaryClaim,
        extractionResult: ext,
      };
    } else if (lower.includes('college x is closed') || lower.includes('college x closed')) {
      const ext = claimExtractor.extract(currentRawInput, pendingInput?.id);
      newAnalysis = {
        ...PRIMARY_DEMO_CLAIM,
        timestamp: 'Just now',
        investigationInput: pendingInput || undefined,
        extractedClaim: ext.primaryClaim,
        extractionResult: ext,
      };
    } else if (pendingInput) {
      // Phase 2 Normalized Custom Input:
      // Ingests normalized input, runs claimExtractor, and builds unverified staging dossier
      newAnalysis = generateStagedInvestigationAnalysis(pendingInput);
    } else {
      newAnalysis = generateCustomClaimAnalysis(currentRawInput);
    }

    finishProcessing(newAnalysis);
  };

  const finishProcessing = (analysis: ClaimAnalysis) => {
    setCurrentAnalysis(analysis);
    setIsProcessing(false);
    setActiveTab('dashboard');

    // Phase 12: Persist complete investigation record via Backend API / Storage Adapter
    investigationService.saveInvestigation(analysis).catch((err) => {
      console.warn('[EchoTrace:App] Background investigation save error:', err);
    });

    // Add or update in history list
    setHistoryList((prev) => {
      const filtered = prev.filter((p) => p.id !== analysis.id && p.text.toLowerCase() !== analysis.text.toLowerCase());
      return [analysis, ...filtered];
    });
  };

  // Quick launch for SRM College closure demo
  const handleLaunchDemo = () => {
    const demoInput: InvestigationInput = {
      id: 'inv-demo-srm-closure',
      inputType: 'text',
      rawInput: DEMO_SCENARIOS[0].claim,
      submittedAt: new Date().toISOString(),
      metadata: {
        charCount: DEMO_SCENARIOS[0].claim.length,
        wordCount: DEMO_SCENARIOS[0].claim.split(/\s+/).filter(Boolean).length,
        isDemo: true,
        sourceScenarioId: DEMO_SCENARIOS[0].id,
      },
    };
    setPendingInput(demoInput);
    setPendingClaimText(DEMO_SCENARIOS[0].claim);
    setIsProcessing(true);
  };

  // Selection from demo scenario items
  const handleSelectDemoScenario = (scenario: DemoScenarioItem) => {
    const ext = claimExtractor.extract(scenario.claim);
    const queryPlan = evidenceSearch.generateQueryPlan(ext.primaryClaim);
    const demoInput: InvestigationInput = {
      id: `inv-${scenario.id}`,
      inputType: 'text',
      rawInput: scenario.claim,
      submittedAt: new Date().toISOString(),
      metadata: {
        charCount: scenario.claim.length,
        wordCount: scenario.claim.split(/\s+/).filter(Boolean).length,
        isDemo: true,
        sourceScenarioId: scenario.id,
      },
    };
    setPendingInput(demoInput);
    setCurrentAnalysis({
      ...scenario.analysis,
      extractedClaim: ext.primaryClaim,
      extractionResult: ext,
      evidenceSearchResponse: {
        status: 'demo_preserved',
        claimId: ext.primaryClaim.id,
        claimText: ext.primaryClaim.claimText,
        queryPlan,
        results: [],
        totalResultsFound: 0,
        uniqueUrlsCount: 0,
        providerUsed: 'EvidenceSearchProvider (Demo Preserved)',
        executedQueries: queryPlan.queries.map((q) => q.query),
        executionTimeMs: 0,
        retrievedAt: new Date().toISOString(),
      },
    });
    setPendingClaimText(scenario.claim);
    setActiveTab('dashboard');
  };

  // Switch demo scenarios directly in Dashboard view
  const handleSwitchDemoScenario = (scenarioId: string) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (scenario) {
      const ext = claimExtractor.extract(scenario.claim);
      const queryPlan = evidenceSearch.generateQueryPlan(ext.primaryClaim);
      setCurrentAnalysis({
        ...scenario.analysis,
        extractedClaim: ext.primaryClaim,
        extractionResult: ext,
        evidenceSearchResponse: {
          status: 'demo_preserved',
          claimId: ext.primaryClaim.id,
          claimText: ext.primaryClaim.claimText,
          queryPlan,
          results: [],
          totalResultsFound: 0,
          uniqueUrlsCount: 0,
          providerUsed: 'EvidenceSearchProvider (Demo Preserved)',
          executedQueries: queryPlan.queries.map((q) => q.query),
          executionTimeMs: 0,
          retrievedAt: new Date().toISOString(),
        },
      });
      setPendingClaimText(scenario.claim);
    }
  };

  // Selecting a past analysis from History
  const handleSelectHistoryClaim = (claim: ClaimAnalysis) => {
    setCurrentAnalysis(claim);
    setActiveTab('dashboard');
  };

  // Phase 12: Delete an investigation from persistent storage and view
  const handleDeleteHistoryClaim = (id: string) => {
    investigationService.deleteInvestigation(id).catch((err) => {
      console.warn('[EchoTrace:App] Error deleting investigation:', err);
    });
    setHistoryList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleTraceAnother = () => {
    setActiveTab('analyze');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0B0E14] text-[#111827] dark:text-[#F8FAFC] flex flex-col font-sans antialiased selection:bg-indigo-500/20 selection:text-indigo-800 transition-colors">
      {/* Sticky Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLaunchDemo={handleLaunchDemo}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main View Container */}
      <main className="flex-1">
        {isProcessing ? (
          <PipelineProcessing
            claimText={pendingClaimText}
            investigationInput={pendingInput}
            onComplete={handlePipelineComplete}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <LandingHero
                setActiveTab={setActiveTab}
                onLaunchDemo={handleLaunchDemo}
                onSelectDemoScenario={handleSelectDemoScenario}
              />
            )}

            {activeTab === 'architecture' && (
              <ForensicArchitectureView setActiveTab={setActiveTab} />
            )}

            {activeTab === 'analyze' && (
              <AnalyzeInput
                onStartAnalysis={handleStartAnalysis}
                onLoadDemo={handleLaunchDemo}
              />
            )}

            {activeTab === 'dashboard' && (
              <Dashboard
                analysis={currentAnalysis}
                setActiveTab={setActiveTab}
                onTraceAnother={handleTraceAnother}
                onSwitchDemoScenario={handleSwitchDemoScenario}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                historyList={historyList}
                onSelectClaim={handleSelectHistoryClaim}
                onNewAnalysis={() => setActiveTab('analyze')}
                onDeleteClaim={handleDeleteHistoryClaim}
              />
            )}

            {activeTab === 'how-it-works' && (
              <HowItWorksView
                setActiveTab={setActiveTab}
                onLaunchDemo={handleLaunchDemo}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
