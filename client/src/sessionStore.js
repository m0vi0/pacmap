/**
 * sessionStore.js — Custom hook for PacMap session/checkpoint/branch state.
 *
 * Phases:
 *   Phase 1 — Extract session state + logic from App.jsx into this hook
 *   Phase 2 — Parent pointers (DAG), headId, getAncestors, getCheckpointGraph
 *   Phase 3 — Auto-commit label generation from computeCheckpointDiff output
 *   Phase 4 — .pacmap file export/import (JSON, no extra dependencies)
 *   Phase 5 — Branch model (named refs → checkpoint IDs)
 */

import { useState, useEffect, useRef } from 'react'
import { serializeCheckpoint, computeCheckpointDiff } from './checkpointEngine.js'

// ── Phase 2: DAG utilities ───────────────────────────────────

/**
 * Walk parent pointers from checkpointId upward.
 * Returns ordered array [id, parentId, grandparentId, ...], at most maxDepth entries.
 */
export function getAncestors(checkpointId, checkpoints, maxDepth = 50) {
  const byId = new Map(checkpoints.map(c => [c.id, c]))
  const chain = []
  let current = byId.get(checkpointId)
  let depth = 0
  while (current && depth < maxDepth) {
    chain.push(current.id)
    current = current.parentId ? byId.get(current.parentId) : null
    depth++
  }
  return chain
}

/**
 * Return the full checkpoint DAG as { nodes, edges }.
 * Suitable for rendering a commit-graph visualization.
 */
export function getCheckpointGraph(checkpoints) {
  const nodes = checkpoints.map(c => ({
    id: c.id,
    label: c.label,
    type: c.type,
    createdAt: c.createdAt,
    parentId: c.parentId || null,
    nodeCount: c.nodeCount,
    edgeCount: c.edgeCount,
  }))
  const edges = checkpoints
    .filter(c => c.parentId)
    .map(c => ({ from: c.parentId, to: c.id }))
  return { nodes, edges }
}

// ── Phase 3: Auto-commit label generation ───────────────────

function labelFromDiff(diff, fallbackReason) {
  if (!diff) return fallbackReason ? `Auto: ${fallbackReason}` : 'Auto-checkpoint'

  const { addedNodes, removedNodes, addedEdges } = diff

  if (addedNodes.length === 1 && removedNodes.length === 0) {
    return `host appeared: ${addedNodes[0].ip}`
  }
  if (addedNodes.length > 1 && removedNodes.length === 0) {
    return `${addedNodes.length} new hosts appeared`
  }
  if (removedNodes.length === 1 && addedNodes.length === 0) {
    return `host went silent: ${removedNodes[0].ip}`
  }
  if (removedNodes.length > 1 && addedNodes.length === 0) {
    return `${removedNodes.length} hosts went silent`
  }
  if (addedNodes.length > 0 && removedNodes.length > 0) {
    return `+${addedNodes.length} / -${removedNodes.length} hosts`
  }
  if (addedEdges.length === 1) {
    const e = addedEdges[0]
    return `new path: ${e.src} → ${e.dst}`
  }
  if (addedEdges.length > 1) {
    return `${addedEdges.length} new connections`
  }
  return fallbackReason ? `Auto: ${fallbackReason}` : 'Auto-checkpoint'
}

// ── Phase 4: .pacmap file format ─────────────────────────────

const PACMAP_FORMAT_VERSION = '1'

export function exportPacmap(checkpoints, headId, branches) {
  const manifest = {
    version: PACMAP_FORMAT_VERSION,
    exportedAt: Date.now(),
    checkpointCount: checkpoints.length,
    headId: headId || null,
    branches: branches || [],
  }
  const blob = new Blob([JSON.stringify({ manifest, commits: checkpoints }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pacmap-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.pacmap.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importPacmap(file) {
  const text = await file.text()
  const payload = JSON.parse(text)
  if (!payload.manifest || !Array.isArray(payload.commits)) {
    throw new Error('Invalid .pacmap file: missing manifest or commits.')
  }
  if (payload.manifest.version !== PACMAP_FORMAT_VERSION) {
    throw new Error(`Unsupported .pacmap version: ${payload.manifest.version}`)
  }
  return {
    checkpoints: payload.commits,
    headId: payload.manifest.headId || null,
    branches: payload.manifest.branches || [],
  }
}

// ── Main hook ────────────────────────────────────────────────

/**
 * useSessionStore — owns all checkpoint/branch/diff state.
 *
 * @param {object} params
 * @param {React.MutableRefObject} params.snapshotGraphRef  - set by Three.js effect; call to get {nodeStore, edgeStore}
 * @param {React.MutableRefObject} params.applyDiffStateRef - set by Three.js effect; call to color nodes/edges by diff
 * @param {React.MutableRefObject} params.clearDiffStateRef - set by Three.js effect; call to clear diff coloring
 * @param {object} params.trafficAnalysis  - current traffic analysis value (for checkpoint serialization)
 * @param {string} params.activeSource     - 'live' | 'replay' (triggers "vs Current" diff refresh and filteredCheckpoints)
 * @param {object} params.analysisSnapshot - triggers "vs Current" diff live update
 */
export function useSessionStore({
  snapshotGraphRef,
  applyDiffStateRef,
  clearDiffStateRef,
  trafficAnalysis,
  activeSource,
  analysisSnapshot,
}) {
  // ── State ────────────────────────────────────────────────
  const [checkpoints, setCheckpoints] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pacmap_checkpoints') || '[]') }
    catch { return [] }
  })

  // Phase 2: HEAD pointer
  const [headId, setHeadId] = useState(() => localStorage.getItem('pacmap_head') || null)

  // Phase 5: Branch model
  const [branches, setBranches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pacmap_branches') || 'null') ||
        [{ name: 'main', checkpointId: null }]
    } catch {
      return [{ name: 'main', checkpointId: null }]
    }
  })
  const [currentBranch, setCurrentBranch] = useState(
    () => localStorage.getItem('pacmap_current_branch') || 'main'
  )

  const [activeDiff, setActiveDiff] = useState(null)
  const [diffMode, setDiffMode] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState('checkpoints')
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [autoCheckpointMode, setAutoCheckpointMode] = useState('off')
  const [pendingLabel, setPendingLabel] = useState('')
  const [labelingOpen, setLabelingOpen] = useState(false)
  const [editingCpId, setEditingCpId] = useState(null)
  const [editingCpLabel, setEditingCpLabel] = useState('')
  const [changeFeed, setChangeFeed] = useState([])
  const [feedOpen, setFeedOpen] = useState(false)

  // ── Refs ─────────────────────────────────────────────────
  const autoCheckpointModeRef = useRef('off')
  const autoCheckpointQueueRef = useRef([])
  const autoCheckpointTimerRef = useRef(null)
  const activeDiffRef = useRef(null)
  const diffModeRef = useRef(false)
  const feedQueueRef = useRef([])

  // Stable ref mirrors for current call-time values
  const trafficAnalysisRef = useRef(trafficAnalysis)
  const checkpointsRef = useRef(checkpoints)
  const headIdRef = useRef(headId)
  const currentBranchRef = useRef(currentBranch)

  // Bridge refs — Three.js closure calls these; hook keeps them current
  const queueAutoCheckpointRef = useRef(null)
  const pushFeedEventRef = useRef(null)

  // ── Ref sync effects ─────────────────────────────────────
  useEffect(() => { trafficAnalysisRef.current = trafficAnalysis }, [trafficAnalysis])
  useEffect(() => { checkpointsRef.current = checkpoints }, [checkpoints])
  useEffect(() => { headIdRef.current = headId }, [headId])
  useEffect(() => { currentBranchRef.current = currentBranch }, [currentBranch])
  useEffect(() => { autoCheckpointModeRef.current = autoCheckpointMode }, [autoCheckpointMode])
  useEffect(() => { diffModeRef.current = diffMode }, [diffMode])
  useEffect(() => { activeDiffRef.current = activeDiff }, [activeDiff])

  // ── Persistence ──────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('pacmap_checkpoints', JSON.stringify(checkpoints.slice(-50)))
  }, [checkpoints])
  useEffect(() => {
    if (headId) localStorage.setItem('pacmap_head', headId)
    else localStorage.removeItem('pacmap_head')
  }, [headId])
  useEffect(() => {
    localStorage.setItem('pacmap_branches', JSON.stringify(branches))
  }, [branches])
  useEffect(() => {
    localStorage.setItem('pacmap_current_branch', currentBranch)
  }, [currentBranch])

  // ── Change feed flush (batch from Three.js queue → React state) ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (feedQueueRef.current.length === 0) return
      const events = feedQueueRef.current.splice(0)
      setChangeFeed(prev => [...events, ...prev].slice(0, 50))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // ── Core functions ────────────────────────────────────────

  function buildCurrentState() {
    const graphData = snapshotGraphRef.current?.()
    if (!graphData) return null
    const ta = trafficAnalysisRef.current
    const serialized = serializeCheckpoint(graphData.nodeStore, graphData.edgeStore, ta)
    const protocolSummary = {}
    ta.protocols.forEach(p => { protocolSummary[p.proto] = { bytes: p.bytes, packets: p.packets } })
    return { ...serialized, protocolSummary }
  }

  function takeCheckpoint(opts = {}) {
    const graphData = snapshotGraphRef.current?.()
    if (!graphData) return null
    const ta = trafficAnalysisRef.current
    const serialized = serializeCheckpoint(graphData.nodeStore, graphData.edgeStore, ta)
    const parentId = headIdRef.current || null  // Phase 2: parent pointer

    const cp = {
      id: crypto.randomUUID(),
      parentId,                                 // Phase 2: DAG edge
      label: opts.label || `Checkpoint ${new Date().toLocaleTimeString()}`,
      createdAt: Date.now(),
      source: activeSource,
      type: opts.type || 'manual',
      reason: opts.reason || null,
      eventSummary: opts.eventSummary || [],
      ...serialized,
    }

    setCheckpoints(prev => {
      const next = [...prev, cp]
      return next.length > 50 ? next.slice(next.length - 50) : next
    })

    // Phase 2: advance HEAD
    setHeadId(cp.id)

    // Phase 5: advance current branch tip
    const branch = currentBranchRef.current
    setBranches(prev => prev.map(b =>
      b.name === branch ? { ...b, checkpointId: cp.id } : b
    ))

    return cp
  }

  function queueAutoCheckpoint(reason) {
    if (autoCheckpointModeRef.current === 'off') return
    autoCheckpointQueueRef.current.push(reason)
    if (autoCheckpointTimerRef.current) return
    autoCheckpointTimerRef.current = window.setTimeout(() => {
      autoCheckpointTimerRef.current = null
      const reasons = autoCheckpointQueueRef.current.splice(0)
      const unique = [...new Set(reasons)]

      // Phase 3: generate label from diff output instead of just the trigger reason
      const currentCps = checkpointsRef.current
      const headCp = headIdRef.current ? currentCps.find(c => c.id === headIdRef.current) : null
      const compare = buildCurrentState()
      let label
      if (headCp && compare) {
        const diff = computeCheckpointDiff(headCp, compare)
        label = labelFromDiff(diff, unique[0])
      } else {
        label = unique.length === 1
          ? `Auto: ${unique[0]}`
          : `Auto: ${unique.length} network changes`
      }

      takeCheckpoint({ type: 'auto', reason: unique[0], eventSummary: unique, label })
    }, 4000)
  }

  function computeDiff(baseId, compareId = 'current') {
    const getState = (id) => {
      if (id === 'current') return buildCurrentState()
      return checkpointsRef.current.find(c => c.id === id) || null
    }
    const base = getState(baseId)
    const compare = getState(compareId)
    if (!base || !compare) return
    const result = computeCheckpointDiff(base, compare)
    setActiveDiff({ baseId, compareId, result })
    applyDiffStateRef.current?.(result)
    setRightPanelTab('diff')
    setRightPanelOpen(true)
  }

  function clearDiff() {
    setActiveDiff(null)
    setDiffMode(false)
    clearDiffStateRef.current?.()
    setRightPanelTab(t => t === 'diff' ? 'checkpoints' : t)
  }

  function updateCheckpointLabel(id, label) {
    setCheckpoints(prev => prev.map(c => c.id === id ? { ...c, label: label.trim() || c.label } : c))
  }
  function startRename(cp) {
    setEditingCpId(cp.id)
    setEditingCpLabel(cp.label)
  }
  function commitRename() {
    if (editingCpId && editingCpLabel.trim()) updateCheckpointLabel(editingCpId, editingCpLabel)
    setEditingCpId(null)
    setEditingCpLabel('')
  }
  function fmtTs(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  function submitCheckpointLabel() {
    const label = pendingLabel.trim() || `Checkpoint ${new Date().toLocaleTimeString()}`
    takeCheckpoint({ label })
    setPendingLabel('')
    setLabelingOpen(false)
  }

  // ── Phase 5: Branch functions ─────────────────────────────

  function createBranch(name, checkpointId = null) {
    const targetId = checkpointId ?? headIdRef.current ?? null
    setBranches(prev => {
      if (prev.some(b => b.name === name)) return prev
      return [...prev, { name, checkpointId: targetId }]
    })
  }

  function switchBranch(name) {
    setBranches(prev => {
      const branch = prev.find(b => b.name === name)
      if (!branch) return prev
      setCurrentBranch(name)
      if (branch.checkpointId) setHeadId(branch.checkpointId)
      return prev
    })
  }

  // ── Phase 4: Import / Export ──────────────────────────────

  function handleExport() {
    exportPacmap(checkpointsRef.current, headIdRef.current, branches)
  }

  async function handleImport(file) {
    const result = await importPacmap(file)
    setCheckpoints(result.checkpoints)
    setHeadId(result.headId)
    if (result.branches.length > 0) setBranches(result.branches)
  }

  // ── "vs Current" live diff updater ───────────────────────
  // Runs whenever analysisSnapshot or activeSource changes so the diff panel
  // stays current without the user manually refreshing.
  useEffect(() => {
    const ad = activeDiffRef.current
    if (!ad || ad.compareId !== 'current') return
    const base = checkpointsRef.current.find(c => c.id === ad.baseId) || null
    const compare = buildCurrentState()
    if (!base || !compare) {
      setActiveDiff(null)
      clearDiffStateRef.current?.()
      return
    }
    const result = computeCheckpointDiff(base, compare)
    setActiveDiff(prev => prev ? { ...prev, result } : null)
    applyDiffStateRef.current?.(result)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisSnapshot, activeSource])

  // ── Bridge ref assignment (runs every render) ─────────────
  // Keeps Three.js closure refs pointing at the latest versions of these fns.
  queueAutoCheckpointRef.current = queueAutoCheckpoint
  pushFeedEventRef.current = (event) => {
    feedQueueRef.current.push({ ...event, id: crypto.randomUUID(), ts: Date.now() })
  }

  // ── Return ───────────────────────────────────────────────
  return {
    // State + setters
    checkpoints,
    setCheckpoints,
    headId,
    setHeadId,
    branches,
    currentBranch,
    activeDiff,
    setActiveDiff,
    diffMode,
    setDiffMode,
    rightPanelTab,
    setRightPanelTab,
    rightPanelOpen,
    setRightPanelOpen,
    autoCheckpointMode,
    setAutoCheckpointMode,
    pendingLabel,
    setPendingLabel,
    labelingOpen,
    setLabelingOpen,
    editingCpId,
    setEditingCpId,
    editingCpLabel,
    setEditingCpLabel,
    changeFeed,
    feedOpen,
    setFeedOpen,

    // Refs exposed to App.jsx (Three.js closure captures these at mount)
    autoCheckpointModeRef,
    autoCheckpointTimerRef,  // exposed so App.jsx cleanup can cancel pending timers
    activeDiffRef,
    diffModeRef,
    queueAutoCheckpointRef,
    pushFeedEventRef,

    // Functions
    takeCheckpoint,
    queueAutoCheckpoint,
    buildCurrentState,
    computeDiff,
    clearDiff,
    updateCheckpointLabel,
    startRename,
    commitRename,
    fmtTs,
    submitCheckpointLabel,
    createBranch,
    switchBranch,
    handleExport,
    handleImport,

    // Derived
    filteredCheckpoints: checkpoints.filter(c => !c.source || c.source === activeSource),
  }
}
