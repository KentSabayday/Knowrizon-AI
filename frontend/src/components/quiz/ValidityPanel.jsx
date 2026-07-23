import { useState } from 'react';

/**
 * ValidityPanel — Collapsible validity display for a quiz question.
 * Shows status, confidence, validation method, reason, and evidence.
 */

const STATUS_LABELS = {
  verified: 'Verified',
  partially_supported: 'Partially Supported',
  unsupported: 'Unsupported',
  conflicting: 'Conflicting Sources',
  pending_validation: 'Pending Validation',
};

const STATUS_CLASSES = {
  verified: 'quiz-validity-verified',
  partially_supported: 'quiz-validity-partial',
  unsupported: 'quiz-validity-unsupported',
  conflicting: 'quiz-validity-unsupported',
  pending_validation: 'quiz-validity-pending',
};

const METHOD_LABELS = {
  direct_source_match: 'Direct Document Match',
  content_based_generation: 'Content-Based Generation',
  multiple_source_agreement: 'Multiple Source Agreement',
  ai_generation: 'AI Generation',
  none: 'Not Validated',
};

export function ValidityPanel({ validity }) {
  const [expanded, setExpanded] = useState(false);

  if (!validity) {
    return (
      <div className="text-xs text-slate-500 italic mt-2">
        Validity information unavailable
      </div>
    );
  }

  const status = validity.status || 'pending_validation';
  const statusLabel = STATUS_LABELS[status] || status;
  const statusClass = STATUS_CLASSES[status] || 'quiz-validity-pending';
  const confidence = validity.confidence;
  const method = validity.validationMethod || 'none';
  const reason = validity.reason;
  const evidence = validity.evidence;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
        aria-expanded={expanded}
        aria-label="Toggle validity details"
      >
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusClass}`}>
          {statusLabel}
        </span>
        {confidence != null && (
          <span className="text-slate-500">
            AI confidence: {Math.round(confidence * 100)}%
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 pl-3 border-l-2 border-slate-700 space-y-1.5 text-xs text-slate-400">
          <div>
            <span className="font-medium text-slate-300">Validation method: </span>
            {METHOD_LABELS[method] || method}
          </div>
          {reason && (
            <div>
              <span className="font-medium text-slate-300">Reason: </span>
              {reason}
            </div>
          )}
          {evidence && (
            <div>
              <span className="font-medium text-slate-300">Evidence: </span>
              <span className="italic">&ldquo;{evidence}&rdquo;</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ValidityPanel;
