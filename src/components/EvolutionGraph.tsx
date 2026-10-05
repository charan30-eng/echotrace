import React, { useState } from 'react';
import { VariantNode, GraphEdge, NodeType } from '../types/claim';
import {
  GitCommit,
  GitBranch,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Calendar,
  ArrowRight,
  X,
  FileCheck,
  Sparkles,
  ExternalLink,
  Building2,
  Quote,
  CheckCircle2,
  Info,
  Globe,
} from 'lucide-react';

interface EvolutionGraphProps {
  nodes: VariantNode[];
  edges: GraphEdge[];
  onSelectEvidence?: () => void;
  isDemo?: boolean;
}

export const EvolutionGraph: React.FC<EvolutionGraphProps> = ({
  nodes,
  edges,
  onSelectEvidence,
  isDemo = false,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[0]?.id || '');
  const [inspectModalNode, setInspectModalNode] = useState<VariantNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'network' | 'timeline'>('network');

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const handleReset = () => {
    setZoomLevel(1);
    setSelectedNodeId(nodes[0]?.id || '');
  };

  const getNodeTheme = (node: VariantNode) => {
    if (node.relationship === 'publishing_authority') {
      return {
        pill: 'bg-purple-50 text-purple-700 border-purple-200',
        border: 'border-purple-500',
        dot: 'bg-purple-600',
        glow: 'shadow-[0_0_15px_rgba(139,92,246,0.25)]',
        label: node.label || 'AUTHORITY',
        icon: Building2,
        hex: '#8B5CF6',
      };
    }

    switch (node.type) {
      case 'original':
        return {
          pill: 'bg-cyan-50 text-[#06B6D4] border-cyan-200',
          border: 'border-[#06B6D4]',
          dot: 'bg-[#06B6D4]',
          glow: 'shadow-[0_0_15px_rgba(6,182,212,0.35)]',
          label: 'ORIGIN CLAIM',
          icon: GitCommit,
          hex: '#06B6D4',
        };
      case 'modified':
        return {
          pill: 'bg-amber-50 text-[#F59E0B] border-amber-200',
          border: 'border-[#F59E0B]',
          dot: 'bg-[#F59E0B]',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.35)]',
          label: node.label || 'MUTATION',
          icon: GitBranch,
          hex: '#F59E0B',
        };
      case 'conflicting':
        return {
          pill: 'bg-red-50 text-[#DC2626] border-red-200',
          border: 'border-[#DC2626]',
          dot: 'bg-[#DC2626]',
          glow: 'shadow-[0_0_15px_rgba(220,38,38,0.35)]',
          label: node.label || 'CONTRADICTING',
          icon: AlertCircle,
          hex: '#DC2626',
        };
      case 'evidence':
        return {
          pill: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
          border: 'border-[#16A34A]',
          dot: 'bg-[#16A34A]',
          glow: 'shadow-[0_0_15px_rgba(22,163,74,0.35)]',
          label: node.label || 'SUPPORTING',
          icon: ShieldCheck,
          hex: '#16A34A',
        };
    }
  };

  const getRelationshipBadge = (type: GraphEdge['type']) => {
    switch (type) {
      case 'mutated':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'contradicts':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'refuted by':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'supports':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'published by':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'corroborates':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'derived from':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Layout calculation: Check if it's the legacy 5-node demo or a dynamic evidence graph
  const isLegacyFiveNode =
    nodes.length === 5 &&
    !nodes.some(
      (n) =>
        n.relationship === 'publishing_authority' ||
        n.url ||
        n.evidenceRelationship
    );

  const canvasWidth = 980;

  let nodePositions: (VariantNode & { x: number; y: number })[] = [];

  if (isLegacyFiveNode) {
    const coords = [
      { x: 90, y: 190 },   // Origin
      { x: 280, y: 100 },  // First forward / scope drift
      { x: 480, y: 100 },  // Further mutation
      { x: 480, y: 300 },  // Contradiction / Student portal
      { x: 740, y: 200 },  // Official registrar evidence
    ];
    nodePositions = nodes.map((node, index) => ({
      ...node,
      x: coords[index]?.x ?? (100 + index * 150),
      y: coords[index]?.y ?? 200,
    }));
  } else {
    // Dynamic 3-Column Multi-Hop DAG Layout:
    // Col 0: Claim origin & lineage variants / forwards (Left)
    // Col 1: Real Evidence items (Supporting / Contradicting / Context) (Center)
    // Col 2: Sources / Publishing Authorities (Right)
    const col0: VariantNode[] = [];
    const col1: VariantNode[] = [];
    const col2: VariantNode[] = [];

    for (const node of nodes) {
      if (node.relationship === 'publishing_authority') {
        col2.push(node);
      } else if (
        node.id.startsWith('node-evi-') ||
        node.evidenceRelationship ||
        node.type === 'evidence' ||
        node.type === 'conflicting'
      ) {
        if (node.type === 'original' || node.relationship === 'investigated_claim') {
          col0.push(node);
        } else {
          col1.push(node);
        }
      } else {
        col0.push(node);
      }
    }

    const posMap = new Map<string, { x: number; y: number }>();

    // Col 0: x = 70
    col0.forEach((n, idx) => {
      const y = 80 + idx * 175;
      posMap.set(n.id, { x: 70, y });
    });

    // Col 1: x = 400
    col1.forEach((n, idx) => {
      const y = 60 + idx * 165;
      posMap.set(n.id, { x: 400, y });
    });

    // Col 2: x = 730
    col2.forEach((n, idx) => {
      const y = 70 + idx * 165;
      posMap.set(n.id, { x: 730, y });
    });

    nodePositions = nodes.map((node, idx) => {
      const pos = posMap.get(node.id) || {
        x: 80 + (idx % 3) * 320,
        y: 80 + Math.floor(idx / 3) * 160,
      };
      return { ...node, x: pos.x, y: pos.y };
    });
  }

  const maxY = Math.max(...nodePositions.map((p) => p.y), 300);
  const canvasHeight = Math.max(460, maxY + 180);

  return (
    <div
      className={`rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all ${
        isFullscreen
          ? 'fixed inset-4 z-50 overflow-y-auto bg-white p-6 shadow-2xl'
          : 'relative p-6 sm:p-7'
      }`}
    >
      {/* Graph Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F46E5]">
              Lineage Network Graph
            </span>
            {isDemo ? (
              <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                ILLUSTRATIVE DEMO GRAPH — SYNTHETIC TOPOLOGY
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                AUTHENTIC EVIDENCE PIPELINE DAG
              </span>
            )}
          </div>
          <h3 className="text-xl font-extrabold text-[#111827] mt-0.5">
            Evidence & Lineage Graph
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Multi-hop relational DAG connecting claim propositions, verified evidence excerpts, and publishing authorities.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold font-mono">
            <button
              onClick={() => setViewMode('network')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'network'
                  ? 'bg-white text-[#4F46E5] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Network Graph
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white text-[#4F46E5] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Timeline View
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.1))}
              title="Zoom Out"
              className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-white transition-colors cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-gray-600 font-bold tabular-nums">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.3, z + 0.1))}
              title="Zoom In"
              className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-white transition-colors cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          {/* Fullscreen Expand */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Minimize' : 'Expand full screen'}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 shadow-2xs cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* VIEW MODE: NETWORK GRAPH CANVAS */}
      {viewMode === 'network' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-[#F9FAFB] p-4 sm:p-6 overflow-x-auto relative min-h-[480px]">
            <div className="absolute inset-0 bg-light-dots opacity-40 pointer-events-none" />

            {/* Column Guide Headers */}
            <div
              className="relative z-10 flex items-center justify-between px-6 pb-3 mb-2 border-b border-gray-200/80 text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400"
              style={{ width: `${canvasWidth}px` }}
            >
              <span className="w-[210px] text-left text-cyan-700">1. Original Claim & Drift</span>
              <span className="w-[210px] text-center text-emerald-700">2. Retrieved Evidence Excerpts</span>
              <span className="w-[210px] text-right text-purple-700">3. Publishing Authorities</span>
            </div>

            <div
              className="relative z-10 transition-transform duration-200 origin-top-left mx-auto"
              style={{
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                transform: `scale(${zoomLevel})`,
              }}
            >
              {/* SVG Edges and Connectors Layer */}
              <svg
                className="absolute inset-0 pointer-events-none w-full h-full"
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              >
                <defs>
                  <marker
                    id="graph-arrow-indigo"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#6366F1" />
                  </marker>
                  <marker
                    id="graph-arrow-amber"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#F59E0B" />
                  </marker>
                  <marker
                    id="graph-arrow-red"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#EF4444" />
                  </marker>
                  <marker
                    id="graph-arrow-emerald"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#10B981" />
                  </marker>
                  <marker
                    id="graph-arrow-purple"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#8B5CF6" />
                  </marker>
                  <marker
                    id="graph-arrow-teal"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#14B8A6" />
                  </marker>
                  <marker
                    id="graph-arrow-blue"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#3B82F6" />
                  </marker>
                </defs>

                {/* Draw Curved Bezier Edges */}
                {edges.map((edge, idx) => {
                  const fromNode = nodePositions.find((n) => n.id === edge.from);
                  const toNode = nodePositions.find((n) => n.id === edge.to);

                  if (!fromNode || !toNode) return null;

                  const isReversed = toNode.x < fromNode.x;
                  const startX = isReversed ? fromNode.x : fromNode.x + 210;
                  const startY = fromNode.y + 45;
                  const endX = isReversed ? toNode.x + 210 : toNode.x - 10;
                  const endY = toNode.y + 45;

                  const dx = endX - startX;
                  const cx1 = startX + dx * 0.5;
                  const cy1 = startY;
                  const cx2 = startX + dx * 0.5;
                  const cy2 = endY;

                  const pathData = `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;

                  const markerId =
                    edge.type === 'contradicts' || edge.type === 'refuted by'
                      ? 'url(#graph-arrow-red)'
                      : edge.type === 'supports'
                      ? 'url(#graph-arrow-emerald)'
                      : edge.type === 'published by'
                      ? 'url(#graph-arrow-purple)'
                      : edge.type === 'corroborates'
                      ? 'url(#graph-arrow-teal)'
                      : edge.type === 'derived from'
                      ? 'url(#graph-arrow-blue)'
                      : edge.type === 'mutated'
                      ? 'url(#graph-arrow-amber)'
                      : 'url(#graph-arrow-indigo)';

                  const strokeColor =
                    edge.type === 'contradicts' || edge.type === 'refuted by'
                      ? '#EF4444'
                      : edge.type === 'supports'
                      ? '#10B981'
                      : edge.type === 'published by'
                      ? '#8B5CF6'
                      : edge.type === 'corroborates'
                      ? '#14B8A6'
                      : edge.type === 'derived from'
                      ? '#3B82F6'
                      : edge.type === 'mutated'
                      ? '#F59E0B'
                      : '#818CF8';

                  const isDashed =
                    edge.type === 'contradicts' || edge.type === 'refuted by';

                  return (
                    <g key={`${edge.from}-${edge.to}-${idx}`}>
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#F1F5F9"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                      <path
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        strokeDasharray={isDashed ? '6 4' : 'none'}
                        markerEnd={markerId}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Edge Badges */}
              {edges.map((edge, idx) => {
                const fromNode = nodePositions.find((n) => n.id === edge.from);
                const toNode = nodePositions.find((n) => n.id === edge.to);

                if (!fromNode || !toNode) return null;

                const isReversed = toNode.x < fromNode.x;
                const startX = isReversed ? fromNode.x : fromNode.x + 210;
                const endX = isReversed ? toNode.x + 210 : toNode.x;
                const midX = (startX + endX) / 2;
                const midY = (fromNode.y + toNode.y + 90) / 2;

                return (
                  <div
                    key={`badge-${edge.from}-${edge.to}-${idx}`}
                    style={{ left: `${midX - 45}px`, top: `${midY - 12}px` }}
                    className="absolute pointer-events-none z-20"
                  >
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase shadow-xs ${getRelationshipBadge(
                        edge.type
                      )}`}
                    >
                      <span>{edge.label}</span>
                    </span>
                  </div>
                );
              })}

              {/* Nodes on 2D Graph Canvas */}
              {nodePositions.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const theme = getNodeTheme(node);
                const NodeIcon = theme.icon;

                return (
                  <div
                    key={node.id}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    className="absolute z-20 w-[210px]"
                  >
                    <div
                      onClick={() => {
                        setSelectedNodeId(node.id);
                      }}
                      className={`cursor-pointer rounded-2xl bg-white border-2 p-3.5 transition-all duration-200 shadow-md ${
                        theme.border
                      } ${theme.glow} ${
                        isSelected
                          ? 'ring-4 ring-indigo-500/25 scale-105'
                          : 'hover:scale-102 hover:border-indigo-400'
                      }`}
                    >
                      {/* Top Pill & Timestamp */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase ${theme.pill}`}
                        >
                          <NodeIcon className="h-2.5 w-2.5" />
                          <span>{theme.label}</span>
                        </span>

                        <span className="text-[10px] font-mono text-gray-400">
                          {node.timestamp}
                        </span>
                      </div>

                      {/* Main Node Text / Excerpt */}
                      <p className="text-xs font-bold text-[#111827] line-clamp-2 leading-tight">
                        “{node.text}”
                      </p>

                      {/* Metadata Badges if Evidence */}
                      {node.evidenceRelationship && (
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${
                              node.evidenceRelationship === 'supports'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : node.evidenceRelationship === 'contradicts'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {node.evidenceRelationship}
                          </span>

                          {node.reliability && (
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${
                                node.reliability === 'high'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : node.reliability === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {node.reliability} rel
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer: Publisher / Domain & Action */}
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                        <span className="text-gray-500 truncate max-w-[110px] font-medium" title={node.source.name}>
                          {node.source.name}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(node.id);
                            setInspectModalNode(node);
                          }}
                          className="inline-flex items-center gap-1 font-bold text-[#4F46E5] hover:text-[#4338CA] bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 font-mono pt-3 border-t border-gray-200">
              <span>Graph Architecture: Topological Multi-Hop DAG (Claim ➔ Real Evidence ➔ Source Authorities)</span>
              <span className="text-[#4F46E5] font-bold">Select any node below to inspect full evidence excerpt & URL</span>
            </div>
          </div>

          {/* Selected Node Details Panel (Embedded below canvas for instant inspection) */}
          {selectedNode && (
            <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/30 p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${getNodeTheme(selectedNode).pill}`}>
                    {React.createElement(getNodeTheme(selectedNode).icon, {
                      className: 'h-4 w-4',
                    })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold uppercase text-[#4F46E5]">
                        Selected Node Dossier
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs font-mono text-gray-600 font-bold">
                        {selectedNode.label}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-[#111827]">
                      {selectedNode.source.name}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedNode.evidenceRelationship && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                        selectedNode.evidenceRelationship === 'supports'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : selectedNode.evidenceRelationship === 'contradicts'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {selectedNode.evidenceRelationship === 'supports' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      <span>Stance: {selectedNode.evidenceRelationship}</span>
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                      selectedNode.reliability === 'high' || selectedNode.source.reliability === 'high'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedNode.reliability === 'medium' || selectedNode.source.reliability === 'medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    <span>Reliability: {selectedNode.reliability || selectedNode.source.reliability}</span>
                  </span>

                  <button
                    onClick={() => setInspectModalNode(selectedNode)}
                    className="flex items-center gap-1 text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Open Popup</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 text-xs">
                {/* Text & Excerpt */}
                <div className="lg:col-span-7 space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block mb-1">
                      Proposition / Heading:
                    </span>
                    <p className="text-sm font-bold text-gray-900 bg-white p-3 rounded-xl border border-gray-200">
                      “{selectedNode.text}”
                    </p>
                  </div>

                  {selectedNode.excerpt && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-indigo-700 font-mono font-bold text-[10px] uppercase">
                        <Quote className="h-3 w-3" />
                        <span>Verified Evidence Excerpt</span>
                      </div>
                      <p className="text-xs text-gray-800 italic leading-relaxed font-serif">
                        “{selectedNode.excerpt}”
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block mb-1">
                      Why It Matters (Forensic Rationale):
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed bg-white p-2.5 rounded-xl border border-gray-200">
                      {selectedNode.whyItMatters}
                    </p>
                  </div>
                </div>

                {/* Source Provenance & Metadata */}
                <div className="lg:col-span-5 space-y-2.5">
                  <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Source Authority:</span>
                      <span className="font-bold text-gray-900">{selectedNode.source.name}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Platform / Channel:</span>
                      <span className="font-mono text-gray-700">{selectedNode.source.platform}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Classification:</span>
                      <span className="font-semibold text-gray-800">{selectedNode.source.type}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Verification Status:</span>
                      <span className="font-bold text-emerald-700">{selectedNode.source.status}</span>
                    </div>
                  </div>

                  {/* Clickable URL */}
                  {(selectedNode.url || selectedNode.source.url) && (
                    <div className="rounded-xl border border-indigo-200 bg-white p-3 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">
                        Verified Source URL
                      </span>
                      <a
                        href={selectedNode.url || selectedNode.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#4F46E5] hover:text-[#4338CA] hover:underline break-all bg-indigo-50/70 p-2 rounded-lg border border-indigo-100 w-full"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{selectedNode.url || selectedNode.source.url}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE: TIMELINE */}
      {viewMode === 'timeline' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 overflow-hidden rounded-2xl border border-gray-200 bg-[#F9FAFB] p-4 sm:p-6">
            <div className="flex flex-col space-y-4 max-w-xl mx-auto py-2">
              {nodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id;
                const theme = getNodeTheme(node);
                const NodeIcon = theme.icon;

                const nextNode = nodes[index + 1];
                const connectingEdge = edges.find(
                  (e) => e.from === node.id && (nextNode ? e.to === nextNode.id : false)
                );

                return (
                  <div key={node.id} className="relative">
                    <div
                      onClick={() => {
                        setSelectedNodeId(node.id);
                      }}
                      className={`cursor-pointer rounded-2xl border border-l-4 p-4.5 bg-white transition-all duration-200 shadow-2xs ${
                        isSelected
                          ? 'ring-2 ring-indigo-500 border-indigo-400 shadow-md'
                          : 'hover:border-gray-300'
                      }`}
                      style={{ borderLeftColor: theme.hex }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold uppercase ${theme.pill}`}
                          >
                            <NodeIcon className="h-3 w-3" />
                            {theme.label}
                          </span>
                          <span className="text-xs font-mono text-gray-500 font-semibold">
                            {node.source.type}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {node.timestamp}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-[#111827] leading-snug">
                        “{node.text}”
                      </h4>

                      {/* Excerpt Snippet if available */}
                      {node.excerpt && (
                        <p className="mt-2 text-xs text-gray-600 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-serif">
                          “{node.excerpt}”
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-2.5 border-t border-gray-100">
                        <span className="truncate max-w-[240px]">
                          Source: <strong className="text-gray-800 font-medium">{node.source.name}</strong>
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(node.id);
                            setInspectModalNode(node);
                          }}
                          className="text-[#4F46E5] font-bold text-xs flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
                        >
                          Inspect Popup
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {connectingEdge && nextNode && (
                      <div className="flex flex-col items-center my-2 relative">
                        <div className="h-4 w-0.5 bg-gray-300" />
                        <div
                          className={`my-1 inline-flex items-center gap-1 px-3 py-0.5 rounded-full border text-[11px] font-mono font-bold uppercase shadow-2xs ${getRelationshipBadge(
                            connectingEdge.type
                          )}`}
                        >
                          <span>↓</span>
                          <span>{connectingEdge.label}</span>
                        </div>
                        <div className="h-4 w-0.5 bg-gray-300" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Sidebar Node Preview */}
          <div className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-xs font-mono font-bold uppercase text-[#4F46E5]">
                Node Preview
              </span>
              <span className="text-xs font-mono text-gray-500">
                {selectedNode.timestamp}
              </span>
            </div>

            <div>
              <span className="text-xs font-mono uppercase font-bold text-gray-400">
                Proposition Text
              </span>
              <div className="mt-1.5 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-[#111827]">
                “{selectedNode.text}”
              </div>
            </div>

            {selectedNode.excerpt && (
              <div>
                <span className="text-xs font-mono uppercase font-bold text-indigo-700 flex items-center gap-1">
                  <Quote className="h-3 w-3" />
                  Verified Evidence Excerpt
                </span>
                <div className="mt-1.5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 text-xs italic font-serif text-gray-800 leading-relaxed">
                  “{selectedNode.excerpt}”
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Source:</span>
                <span className="font-bold text-gray-800 font-mono">
                  {selectedNode.source.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Platform:</span>
                <span className="font-medium text-gray-700">
                  {selectedNode.source.platform}
                </span>
              </div>
              {selectedNode.evidenceRelationship && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Relationship:</span>
                  <span
                    className={`font-bold uppercase ${
                      selectedNode.evidenceRelationship === 'supports'
                        ? 'text-emerald-700'
                        : selectedNode.evidenceRelationship === 'contradicts'
                        ? 'text-red-700'
                        : 'text-gray-700'
                    }`}
                  >
                    {selectedNode.evidenceRelationship}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Reliability:</span>
                <span className="font-bold capitalize text-emerald-700">
                  {selectedNode.reliability || selectedNode.source.reliability}
                </span>
              </div>
            </div>

            {(selectedNode.url || selectedNode.source.url) && (
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block mb-1">
                  Source Reference
                </span>
                <a
                  href={selectedNode.url || selectedNode.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#4F46E5] hover:text-[#4338CA] hover:underline break-all bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 w-full"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{selectedNode.url || selectedNode.source.url}</span>
                </a>
              </div>
            )}

            <div>
              <span className="text-xs font-mono uppercase font-bold text-gray-400 block mb-1">
                Forensic Significance
              </span>
              <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-200 leading-relaxed">
                {selectedNode.whyItMatters}
              </p>
            </div>

            <button
              onClick={() => setInspectModalNode(selectedNode)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#4F46E5] text-xs font-bold text-white hover:bg-[#4338CA] transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="h-4 w-4" />
              <span>Open Inspect Dossier</span>
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL: CLAIM EVOLUTION & EVIDENCE NODE INSPECTOR MODAL */}
      {inspectModalNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-[#E5E7EB] p-6 sm:p-7 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    getNodeTheme(inspectModalNode).pill
                  }`}
                >
                  {React.createElement(getNodeTheme(inspectModalNode).icon, {
                    className: 'h-5 w-5',
                  })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase text-[#4F46E5]">
                      Inspected Evidence Node
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs font-mono font-bold text-gray-600">
                      {inspectModalNode.label}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                    {inspectModalNode.source.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setInspectModalNode(null)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Proposition Text */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-gray-500">
                <span>Proposition Statement</span>
                <span>{inspectModalNode.timestamp}</span>
              </div>
              <p className="text-sm font-bold text-[#111827] leading-relaxed">
                “{inspectModalNode.text}”
              </p>
            </div>

            {/* Evidence Excerpt */}
            {inspectModalNode.excerpt && (
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-indigo-700">
                  <Quote className="h-3 w-3" />
                  <span>Exact Authenticated Passage Excerpt</span>
                </div>
                <p className="text-xs text-gray-800 italic leading-relaxed font-serif">
                  “{inspectModalNode.excerpt}”
                </p>
              </div>
            )}

            {/* 4-Box Key Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-gray-200 bg-white space-y-1">
                <span className="text-gray-400 block font-mono text-[10px] uppercase">
                  Channel & Type
                </span>
                <span className="font-bold text-[#111827] block truncate">
                  {inspectModalNode.source.platform}
                </span>
                <span className="text-gray-500 text-[11px] block">
                  {inspectModalNode.source.type}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-gray-200 bg-white space-y-1">
                <span className="text-gray-400 block font-mono text-[10px] uppercase">
                  Source Reliability
                </span>
                <span className="font-bold text-emerald-700 block capitalize">
                  {inspectModalNode.reliability || inspectModalNode.source.reliability}
                </span>
                <span className="text-gray-500 text-[11px] block">
                  Status: {inspectModalNode.source.status}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-gray-200 bg-white space-y-1">
                <span className="text-gray-400 block font-mono text-[10px] uppercase">
                  Evidence Stance
                </span>
                <span
                  className={`font-bold block uppercase ${
                    inspectModalNode.evidenceRelationship === 'supports'
                      ? 'text-emerald-700'
                      : inspectModalNode.evidenceRelationship === 'contradicts'
                      ? 'text-red-700'
                      : 'text-gray-700'
                  }`}
                >
                  {inspectModalNode.evidenceRelationship || 'Contextual'}
                </span>
                <span className="text-gray-500 text-[11px] block">
                  Score: {Math.round((inspectModalNode.relevanceScore || 0.8) * 100)}% relevance
                </span>
              </div>

              <div className="p-3 rounded-xl border border-gray-200 bg-white space-y-1">
                <span className="text-gray-400 block font-mono text-[10px] uppercase">
                  Provenance Class
                </span>
                <span className="font-bold text-gray-900 block">
                  {inspectModalNode.isPrimarySource ? 'Primary Authority' : 'Secondary Citation'}
                </span>
                <span className="text-gray-500 text-[11px] block">
                  Method: {inspectModalNode.extractionMethod || 'semantic search'}
                </span>
              </div>
            </div>

            {/* Forensic Significance */}
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase font-bold text-gray-500">
                Forensic Significance (Why It Matters):
              </span>
              <p className="text-xs text-[#4B5563] leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-200">
                {inspectModalNode.whyItMatters}
              </p>
            </div>

            {/* Clickable URL */}
            {(inspectModalNode.url || inspectModalNode.source.url) && (
              <div className="space-y-1">
                <span className="text-xs font-mono uppercase font-bold text-gray-500 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Authenticated URL:
                </span>
                <a
                  href={inspectModalNode.url || inspectModalNode.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#4F46E5] hover:text-[#4338CA] hover:underline bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 break-all w-full"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span>{inspectModalNode.url || inspectModalNode.source.url}</span>
                </a>
              </div>
            )}

            {inspectModalNode.mutationNote && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold text-amber-800">Evolution Delta:</span>{' '}
                {inspectModalNode.mutationNote}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
              {onSelectEvidence ? (
                <button
                  onClick={() => {
                    setInspectModalNode(null);
                    onSelectEvidence();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <FileCheck className="h-3.5 w-3.5 text-[#4F46E5]" />
                  <span>View in Evidence Panel</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setInspectModalNode(null)}
                className="px-5 py-2 rounded-xl bg-[#4F46E5] text-xs font-bold text-white hover:bg-[#4338CA] transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
