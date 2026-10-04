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
} from 'lucide-react';

interface EvolutionGraphProps {
  nodes: VariantNode[];
  edges: GraphEdge[];
  onSelectEvidence?: () => void;
}

export const EvolutionGraph: React.FC<EvolutionGraphProps> = ({
  nodes,
  edges,
  onSelectEvidence,
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

  const getNodeTheme = (type: NodeType) => {
    switch (type) {
      case 'original':
        return {
          pill: 'bg-cyan-50 text-[#06B6D4] border-cyan-200',
          border: 'border-[#06B6D4]',
          dot: 'bg-[#06B6D4]',
          glow: 'shadow-[0_0_15px_rgba(6,182,212,0.35)]',
          label: 'ORIGIN',
          icon: GitCommit,
          hex: '#06B6D4',
        };
      case 'modified':
        return {
          pill: 'bg-amber-50 text-[#F59E0B] border-amber-200',
          border: 'border-[#F59E0B]',
          dot: 'bg-[#F59E0B]',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.35)]',
          label: 'MUTATION',
          icon: GitBranch,
          hex: '#F59E0B',
        };
      case 'conflicting':
        return {
          pill: 'bg-red-50 text-[#DC2626] border-red-200',
          border: 'border-[#DC2626]',
          dot: 'bg-[#DC2626]',
          glow: 'shadow-[0_0_15px_rgba(220,38,38,0.35)]',
          label: 'CONFLICT',
          icon: AlertCircle,
          hex: '#DC2626',
        };
      case 'evidence':
        return {
          pill: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
          border: 'border-[#16A34A]',
          dot: 'bg-[#16A34A]',
          glow: 'shadow-[0_0_15px_rgba(22,163,74,0.35)]',
          label: 'PROOF',
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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'supports':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
  };

  // Compute 2D coordinates for the Network Graph view
  const canvasWidth = 880;
  const canvasHeight = 420;

  const nodePositions = nodes.map((node, index) => {
    const total = nodes.length;
    if (total === 5) {
      const coords = [
        { x: 90, y: 190 },   // Origin
        { x: 280, y: 100 },  // First forward / scope drift
        { x: 480, y: 100 },  // Further mutation
        { x: 480, y: 300 },  // Contradiction / Student portal
        { x: 740, y: 200 },  // Official registrar evidence
      ];
      return { ...node, x: coords[index].x, y: coords[index].y };
    }

    const xStep = (canvasWidth - 220) / Math.max(1, total - 1);
    const x = 110 + index * xStep;
    const y = index % 2 === 0 ? 150 : 270;
    return { ...node, x, y };
  });

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
            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              TOPOLOGICAL DAG
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-[#111827] mt-0.5">
            Claim Evolution Graph
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Visual multi-hop network connecting origin nodes, semantic drift, and primary proof.
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
        <div className="mt-6 rounded-2xl border border-gray-200 bg-[#F9FAFB] p-4 sm:p-6 overflow-x-auto relative min-h-[460px]">
          <div className="absolute inset-0 bg-light-dots opacity-40 pointer-events-none" />

          <div
            className="relative z-10 transition-transform duration-200 origin-top-left mx-auto"
            style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, transform: `scale(${zoomLevel})` }}
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
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#DC2626" />
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
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#16A34A" />
                </marker>
              </defs>

              {/* Draw Curved Bezier Edges */}
              {edges.map((edge, idx) => {
                const fromNode = nodePositions.find((n) => n.id === edge.from);
                const toNode = nodePositions.find((n) => n.id === edge.to);

                if (!fromNode || !toNode) return null;

                const startX = fromNode.x + 80;
                const startY = fromNode.y + 40;
                const endX = toNode.x - 10;
                const endY = toNode.y + 40;

                const dx = endX - startX;
                const dy = endY - startY;
                const cx1 = startX + dx * 0.5;
                const cy1 = startY;
                const cx2 = startX + dx * 0.5;
                const cy2 = endY;

                const pathData = `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
                const markerId =
                  edge.type === 'contradicts'
                    ? 'url(#graph-arrow-red)'
                    : edge.type === 'refuted by'
                    ? 'url(#graph-arrow-emerald)'
                    : edge.type === 'mutated'
                    ? 'url(#graph-arrow-amber)'
                    : 'url(#graph-arrow-indigo)';

                const strokeColor =
                  edge.type === 'contradicts'
                    ? '#EF4444'
                    : edge.type === 'refuted by'
                    ? '#10B981'
                    : edge.type === 'mutated'
                    ? '#F59E0B'
                    : '#818CF8';

                return (
                  <g key={`${edge.from}-${edge.to}-${idx}`}>
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#E0E7FF"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <path
                      d={pathData}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2.5"
                      strokeDasharray={edge.type === 'contradicts' ? '6 4' : 'none'}
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

              const midX = (fromNode.x + toNode.x + 70) / 2;
              const midY = (fromNode.y + toNode.y + 70) / 2;

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
              const theme = getNodeTheme(node.type);
              const NodeIcon = theme.icon;

              return (
                <div
                  key={node.id}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  className="absolute z-20 w-[190px]"
                >
                  <div
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setInspectModalNode(node);
                    }}
                    className={`cursor-pointer rounded-2xl bg-white border-2 p-3 transition-all duration-200 shadow-md ${
                      theme.border
                    } ${theme.glow} ${
                      isSelected ? 'ring-4 ring-indigo-500/20 scale-105' : 'hover:scale-102 hover:border-indigo-400'
                    }`}
                  >
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

                    <p className="text-xs font-bold text-[#111827] line-clamp-2 leading-tight">
                      “{node.text}”
                    </p>

                    <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                      <span className="text-gray-500 truncate max-w-[100px] font-medium">
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
            <span>Graph Mode: Directed Acyclic Graph (DAG) with animated multi-hop edges</span>
            <span className="text-[#4F46E5] font-bold">Click any node or “Inspect” to pop up full dossier</span>
          </div>
        </div>
      )}

      {/* VIEW MODE: TIMELINE */}
      {viewMode === 'timeline' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 overflow-hidden rounded-2xl border border-gray-200 bg-[#F9FAFB] p-4 sm:p-6">
            <div className="flex flex-col space-y-4 max-w-xl mx-auto py-2">
              {nodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id;
                const theme = getNodeTheme(node.type);
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
                        setInspectModalNode(node);
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

          <div className="lg:col-span-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-sm space-y-4">
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
                Claim Text
              </span>
              <div className="mt-1.5 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-[#111827]">
                “{selectedNode.text}”
              </div>
            </div>

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
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status:</span>
                <span className="font-bold text-gray-800">
                  {selectedNode.source.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => setInspectModalNode(selectedNode)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#4F46E5] text-xs font-bold text-white hover:bg-[#4338CA] transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="h-4 w-4" />
              <span>Open Inspect Popup</span>
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL: CLAIM EVOLUTION NODE INSPECTOR MODAL */}
      {inspectModalNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-[#E5E7EB] p-6 sm:p-7 shadow-2xl relative space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    getNodeTheme(inspectModalNode.type).pill
                  }`}
                >
                  {React.createElement(getNodeTheme(inspectModalNode.type).icon, {
                    className: 'h-5 w-5',
                  })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase text-[#4F46E5]">
                      Inspected Node
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

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-gray-500">
                <span>Proposition Statement</span>
                <span>{inspectModalNode.timestamp}</span>
              </div>
              <p className="text-sm font-bold text-[#111827] leading-relaxed">
                “{inspectModalNode.text}”
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-gray-200 bg-white space-y-1">
                <span className="text-gray-400 block font-mono text-[10px] uppercase">
                  Platform & Type
                </span>
                <span className="font-bold text-[#111827] block">
                  {inspectModalNode.source.platform}
                </span>
                <span className="text-gray-500 text-[11px] block">
                  Channel: {inspectModalNode.source.type}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-gray-200 bg-white space-y-1">
                <span className="text-gray-400 block font-mono text-[10px] uppercase">
                  Verification & Reliability
                </span>
                <span className="font-bold text-emerald-700 block">
                  {inspectModalNode.source.status}
                </span>
                <span className="text-gray-500 text-[11px] block">
                  Grade: <strong className="capitalize">{inspectModalNode.source.reliability}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase font-bold text-gray-500">
                Forensic Significance:
              </span>
              <p className="text-xs text-[#4B5563] leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-200">
                {inspectModalNode.whyItMatters}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase font-bold text-gray-500">
                Documentary Proof Reference:
              </span>
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-[#1e1b4b] leading-relaxed">
                {inspectModalNode.evidenceRef}
              </div>
            </div>

            {inspectModalNode.mutationNote && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold text-amber-800">Evolution Delta:</span>{' '}
                {inspectModalNode.mutationNote}
              </div>
            )}

            <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
              {onSelectEvidence ? (
                <button
                  onClick={() => {
                    setInspectModalNode(null);
                    onSelectEvidence();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <FileCheck className="h-3.5 w-3.5 text-[#4F46E5]" />
                  <span>View in Evidence Panel</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setInspectModalNode(null)}
                className="px-5 py-2 rounded-xl bg-[#4F46E5] text-xs font-bold text-white hover:bg-[#4338CA] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
