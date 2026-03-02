/**
 * Execution monitoring: phase lifecycle (Pending/Running/Completed/Failed),
 * state-aware connectors, orchestration summary, grouped sections. Temporal / GitHub Actions / Step Functions style.
 */
import { useState } from 'react';

export type PhaseState = 'pending' | 'running' | 'completed' | 'failed';

export type OrchestrationExecution = {
  currentPhaseId: string;
  orderStatus: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  completedPhaseIds: string[];
  failedPhaseIds: string[];
  totalPhases: number;
  retryCount: number;
  hasFailures: boolean;
};

// Default execution for definition/demo view
const DEFAULT_EXECUTION: OrchestrationExecution = {
  currentPhaseId: 'worker-execution',
  orderStatus: 'IN_PROGRESS',
  completedPhaseIds: ['trigger', 'order-init', 'task-gen', 'dependency', 'queue'],
  failedPhaseIds: [],
  totalPhases: 8,
  retryCount: 0,
  hasFailures: false,
};

// Flow connector: state-aware (completed = filled, active = animated, pending = muted)
function FlowConnector({ state = 'pending' }: { state?: PhaseState }) {
  const isCompleted = state === 'completed';
  const isActive = state === 'running';
  const isFailed = state === 'failed';

  const lineClass = isCompleted
    ? 'bg-green-400'
    : isFailed
    ? 'bg-red-300'
    : isActive
    ? 'bg-blue-400'
    : 'bg-gray-200';
  const arrowClass = isCompleted
    ? 'text-green-500'
    : isFailed
    ? 'text-red-400'
    : isActive
    ? 'text-blue-500'
    : 'text-gray-300';

  return (
    <div className="flex flex-col items-center py-0.5">
      <div className={`h-3 w-px transition-colors duration-300 ${lineClass}`} />
      <svg
        className={`h-4 w-4 -my-0.5 transition-colors duration-300 ${arrowClass} ${isActive ? 'animate-pulse' : ''}`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden
      >
        <path fillRule="evenodd" d="M10 14l5-5H5l5 5z" clipRule="evenodd" />
      </svg>
      <div className={`h-2 w-px ${lineClass}`} />
    </div>
  );
}

// Phase container with lifecycle state
function PhaseBlock({
  phaseId: _phaseId,
  title,
  children,
  state = 'pending',
  emphasis = 'default',
}: {
  phaseId: string;
  title: string;
  children: React.ReactNode;
  state?: PhaseState;
  emphasis?: 'default' | 'worker' | 'completion';
}) {
  const isRunning = state === 'running';
  const isCompleted = state === 'completed';
  const isFailed = state === 'failed';

  const stateBorder =
    isCompleted
      ? 'border-l-4 border-l-green-500'
      : isFailed
      ? 'border-l-4 border-l-red-500'
      : isRunning
      ? 'border-l-4 border-l-blue-500'
      : 'border-l-4 border-l-transparent';

  const stateBg =
    isRunning
      ? 'bg-blue-50/50 ring-2 ring-blue-200'
      : isCompleted
      ? 'bg-white'
      : isFailed
      ? 'bg-red-50/30'
      : 'bg-gray-50/50';

  const emphasisClass =
    emphasis === 'worker' ? 'ring-amber-200/50' : emphasis === 'completion' ? 'ring-green-200/50' : '';

  return (
    <div
      className={`rounded-xl border border-gray-200 shadow-sm transition-all duration-300 ${stateBorder} ${stateBg} ${emphasisClass}`}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <PhaseStateBadge state={state} />
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function PhaseStateBadge({ state }: { state: PhaseState }) {
  const config = {
    pending: { label: 'Pending', class: 'bg-gray-100 text-gray-600 border-gray-200' },
    running: { label: 'Running', class: 'bg-blue-100 text-blue-700 border-blue-200' },
    completed: { label: 'Completed', class: 'bg-green-100 text-green-700 border-green-200' },
    failed: { label: 'Failed', class: 'bg-red-100 text-red-700 border-red-200' },
  };
  const { label, class: c } = config[state];
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${c}`}>
      {state === 'running' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" aria-hidden />
      )}
      {label}
    </span>
  );
}

// Grouped execution section (replaces per-card runtime/definition labels)
function ExecutionSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CompactStep({ summary }: { summary: string }) {
  return (
    <p className="text-sm text-gray-700 py-1.5 px-2 rounded-md bg-gray-50/80 border border-gray-100">
      {summary}
    </p>
  );
}

// Decision node with execution-oriented rejoin message
function DecisionNode({
  condition,
  branches,
  rejoinLabel = 'Branches merge — flow continues',
}: {
  condition: string;
  branches: { label: string; path: string; outcome: 'success' | 'failure' }[];
  rejoinLabel?: string;
}) {
  return (
    <div className="rounded-xl border-2 border-purple-200 bg-purple-50/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-purple-200/80">
        <p className="text-sm font-semibold text-purple-900">{condition}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
        {branches.map((b, i) => (
          <div
            key={i}
            className={`rounded-lg border px-3 py-2 text-sm ${
              b.outcome === 'success'
                ? 'border-green-200 bg-green-50 text-green-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <span className="font-medium">{b.label}</span>
            <span className="text-gray-600"> → </span>
            <span className="text-xs font-mono opacity-90">{b.path}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-1.5 bg-purple-100/50 border-t border-purple-200/80 text-center text-[10px] font-medium text-purple-700">
        {rejoinLabel}
      </div>
    </div>
  );
}

function DeepInspect({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        aria-expanded={open}
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        {label}
      </button>
      {open && (
        <div className="mt-1.5 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {children}
        </div>
      )}
    </div>
  );
}

// Resolve phase state from execution
function getPhaseState(phaseId: string, execution: OrchestrationExecution): PhaseState {
  if (execution.failedPhaseIds.includes(phaseId)) return 'failed';
  if (execution.currentPhaseId === phaseId) return 'running';
  if (execution.completedPhaseIds.includes(phaseId)) return 'completed';
  return 'pending';
}

function getConnectorState(
  fromPhaseId: string,
  execution: OrchestrationExecution
): PhaseState {
  const fromState = getPhaseState(fromPhaseId, execution);
  if (fromState === 'failed') return 'failed';
  if (fromState === 'completed') return 'completed';
  if (fromState === 'running') return 'running';
  return 'pending';
}


export function OrchestrationFlow({
  execution = DEFAULT_EXECUTION,
}: {
  execution?: OrchestrationExecution;
}) {
  const [legendOpen, setLegendOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  const completedCount =
    execution.completedPhaseIds.length +
    (execution.failedPhaseIds.length > 0 ? 1 : 0);
  const progressLabel = `${completedCount}/${execution.totalPhases} phases`;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-0">
        {/* Orchestration summary header */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm mb-6 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Current phase</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5 capitalize">
                {execution.currentPhaseId.replace(/-/g, ' ')}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Order status</p>
              <p className="mt-0.5">
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${
                    execution.orderStatus === 'COMPLETED'
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : execution.orderStatus === 'FAILED'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : execution.orderStatus === 'IN_PROGRESS'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {execution.orderStatus}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Progress</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{progressLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Failures / Retries</p>
              <p className="mt-0.5 flex items-center gap-2">
                {execution.hasFailures && (
                  <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                    Failures
                  </span>
                )}
                {execution.retryCount > 0 && (
                  <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Retries: {execution.retryCount}
                  </span>
                )}
                {!execution.hasFailures && execution.retryCount === 0 && (
                  <span className="text-xs text-gray-500">None</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Read-only banner */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 mb-6">
          <svg className="h-4 w-4 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs font-medium text-amber-800">
            Execution monitoring view. Connect an order to see live state.
          </p>
        </div>

        <div className="flex items-start justify-between gap-2 mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Order orchestration</h1>
            <p className="text-sm text-gray-500 mt-0.5">Trigger → Completion. Live phase states.</p>
          </div>
          <div className="relative lg:hidden">
            <button
              type="button"
              onClick={() => setHelpOpen(!helpOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
              title="Legend"
              aria-expanded={helpOpen}
            >
              <span className="text-sm font-semibold">?</span>
            </button>
            {helpOpen && (
              <>
                <div className="absolute right-0 top-10 z-10 w-48 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                  <p className="text-[10px] font-semibold uppercase text-gray-500 mb-2">Phase states</p>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <span><span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1.5" /> Pending</span><br />
                    <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" /> Running</span><br />
                    <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" /> Completed</span><br />
                    <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" /> Failed</span>
                  </div>
                </div>
                <button type="button" onClick={() => setHelpOpen(false)} className="fixed inset-0 z-0" aria-label="Close" />
              </>
            )}
          </div>
        </div>

        {/* Workflow definition */}
        <ExecutionSection label="Workflow definition">
          <PhaseBlock
            phaseId="trigger"
            title="Trigger"
            state={getPhaseState('trigger', execution)}
          >
            <CompactStep summary="User clicks Start on order (CREATED). Backend validates CREATED → IN_PROGRESS." />
          </PhaseBlock>
          <FlowConnector state={getConnectorState('trigger', execution)} />

          <PhaseBlock
            phaseId="order-init"
            title="Order initialization"
            state={getPhaseState('order-init', execution)}
          >
            <CompactStep summary="Order record updated to IN_PROGRESS; state history appended; persisted to MongoDB." />
          </PhaseBlock>
          <FlowConnector state={getConnectorState('order-init', execution)} />

          <PhaseBlock
            phaseId="task-gen"
            title="Task generation"
            state={getPhaseState('task-gen', execution)}
          >
            <CompactStep summary="Blueprint generator creates task list by order type." />
            <div className="mt-3">
              <DecisionNode
                condition="Order type?"
                branches={[
                  { label: 'INSTALL', path: 'VALIDATE → PROVISION → BILLING', outcome: 'success' },
                  { label: 'CHANGE / DISCONNECT', path: 'VALIDATE → BILLING', outcome: 'success' },
                ]}
                rejoinLabel="Branches merge — flow continues"
              />
            </div>
          </PhaseBlock>
        </ExecutionSection>

        <FlowConnector state={getConnectorState('task-gen', execution)} />

        {/* Runtime execution */}
        <ExecutionSection label="Runtime execution">
          <PhaseBlock
            phaseId="dependency"
            title="Dependency resolution"
            state={getPhaseState('dependency', execution)}
          >
            <CompactStep summary="Topological sort (Kahn); tasks persisted; no deps → READY, others → PENDING." />
          </PhaseBlock>
          <FlowConnector state={getConnectorState('dependency', execution)} />

          <PhaseBlock
            phaseId="queue"
            title="Queue processing"
            state={getPhaseState('queue', execution)}
          >
            <CompactStep summary="READY tasks enqueued to BullMQ (Redis). Worker consumes from queue." />
          </PhaseBlock>
        </ExecutionSection>

        <FlowConnector state={getConnectorState('queue', execution)} />

        {/* Worker: Execution + Retry / Failure handling */}
        <ExecutionSection label="Worker">
          <PhaseBlock
            phaseId="worker-execution"
            title="Worker execution"
            state={getPhaseState('worker-execution', execution)}
            emphasis="worker"
          >
            <CompactStep summary="Worker picks job; runs task executor (mock 1–3 s, ~15% fail). Task → RUNNING then COMPLETED or FAILED." />
            <div className="mt-3">
              <DecisionNode
                condition="Task result?"
                branches={[
                  { label: 'Success', path: 'Dependents READY → enqueue; all done → order COMPLETED', outcome: 'success' },
                  { label: 'Failure', path: 'Handled by retry / failure phase', outcome: 'failure' },
                ]}
                rejoinLabel="Success path continues; failure path goes to retry handling"
              />
            </div>
          </PhaseBlock>
          <FlowConnector state={getConnectorState('worker-execution', execution)} />

          <PhaseBlock
            phaseId="worker-retry"
            title="Retry / failure handling"
            state={getPhaseState('worker-retry', execution)}
            emphasis="worker"
          >
            <CompactStep summary="Failed tasks retry up to 3× (2 s delay). If exhausted: task FAILED, order FAILED, store failure reason." />
            <DeepInspect label="Technical details (executor, Socket.io)">
              Single BullMQ worker; mock service 1–3 s delay, ~15% fail. Socket.io emits order:updated / task:updated for UI.
            </DeepInspect>
          </PhaseBlock>
        </ExecutionSection>

        <FlowConnector state={getConnectorState('worker-retry', execution)} />

        {/* Completion: distinct terminal */}
        <ExecutionSection label="Completion">
          <PhaseBlock
            phaseId="completion"
            title="Completion"
            state={getPhaseState('completion', execution)}
            emphasis="completion"
          >
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 shadow-inner">
                  <svg className="h-7 w-7 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-green-900">Final order status</p>
                  <p className="text-xs text-green-700">End of flow. Order is COMPLETED or FAILED; UI updates via Socket.io.</p>
                </div>
              </div>
              <div className="mt-3 flex gap-3 flex-wrap">
                <span className="rounded-lg border-2 border-green-300 bg-white px-3 py-2 text-sm font-semibold text-green-800 shadow-sm">COMPLETED</span>
                <span className="rounded-lg border-2 border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800 shadow-sm">FAILED</span>
              </div>
            </div>
          </PhaseBlock>
          {/* End-of-flow indicator */}
          <div className="flex flex-col items-center py-4">
            <div className="h-1 w-24 rounded-full bg-gray-300" aria-hidden />
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">End of workflow</p>
          </div>
        </ExecutionSection>
      </div>

      {/* Right-side legend: phase states */}
      <aside
        className={`sticky top-4 hidden shrink-0 lg:block ${legendOpen ? 'w-52' : 'w-10'}`}
        style={{ height: 'fit-content' }}
      >
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setLegendOpen(!legendOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-50"
          >
            <span className={legendOpen ? '' : 'hidden'}>States</span>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${legendOpen ? '' : 'rotate-180'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M12.707 14.707a1 1 0 01-1.414 0L5.586 10l5.707-5.707a1 1 0 011.414 1.414L7.414 10l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {legendOpen && (
            <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300 border border-gray-200" />
                Pending
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                Running
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Completed
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Failed
              </div>
              <div className="pt-2 mt-2 border-t border-gray-100">
                <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Connectors</p>
                <p className="text-[10px] text-gray-500">Filled = completed path. Pulse = active. Muted = pending.</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
