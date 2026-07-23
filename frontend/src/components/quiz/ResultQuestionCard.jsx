import { useState } from 'react';
import { ValidityPanel } from './ValidityPanel';

/**
 * ResultQuestionCard — Individual result card with explicit ✅/❌ header,
 * user answer, correct answer, explanations, validity, and sources.
 */
export function ResultQuestionCard({ result, index }) {
  const [expanded, setExpanded] = useState(false);

  const {
    question,
    userAnswer,
    correctAnswer,
    isCorrect,
    isScored,
    options = [],
    explanation,
    learningExplanation,
    validity,
    sources = [],
  } = result;

  const userAnswerText = options[userAnswer] || 'Not answered';
  const correctAnswerText = options[correctAnswer] || 'Unknown';
  const validityStatus = validity?.status || 'pending_validation';

  // Determine card style
  let cardClass = 'quiz-result-correct';
  let headerIcon = '✅';
  let headerText = 'Correct Answer';

  if (!isCorrect) {
    cardClass = 'quiz-result-incorrect';
    headerIcon = '❌';
    headerText = 'Incorrect Answer';
  }

  if (!isScored && validityStatus !== 'verified') {
    cardClass = 'quiz-result-unscored';
    headerText += ' (Not Scored)';
  }

  return (
    <div className={`quiz-glass ${cardClass} p-5 transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-mono text-slate-500 shrink-0">
            Q{index + 1}
          </span>
          <span className="text-sm font-semibold" aria-label={headerText}>
            {headerIcon} {headerText}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-400 hover:text-cyan-400 transition-colors shrink-0"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
        >
          {expanded ? 'Collapse' : 'Details'}
        </button>
      </div>

      {/* Question text */}
      <p className="text-slate-200 mt-2 leading-relaxed">{question}</p>

      {/* Answer summary */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-slate-400 shrink-0">Your answer:</span>
          <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
            {userAnswerText}
          </span>
        </div>
        {!isCorrect && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-slate-400 shrink-0">Correct answer:</span>
            <span className="text-green-400">{correctAnswerText}</span>
          </div>
        )}
      </div>

      {/* Validity badge */}
      <ValidityPanel validity={validity} />

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
          {/* Explanation */}
          {explanation && (
            <div>
              <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                {isCorrect ? 'Why this is correct' : 'Why the correct answer is valid'}
              </h5>
              <p className="text-sm text-slate-300 leading-relaxed">{explanation}</p>
            </div>
          )}

          {/* Learning explanation */}
          {learningExplanation && (
            <div>
              <h5 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                Learning Insight
              </h5>
              <p className="text-sm text-slate-300 leading-relaxed">{learningExplanation}</p>
            </div>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Source
              </h5>
              {sources.map((src, i) => (
                <SourceBadge key={i} source={src} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }) {
  if (source.sourceType === 'uploaded_content') {
    const label = [
      source.filename || source.title,
      source.pageNumber ? `Page ${source.pageNumber}` : null,
      source.section,
    ].filter(Boolean).join(' — ');

    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
        <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span>{label || 'Uploaded document'}</span>
      </div>
    );
  }

  if (source.sourceType === 'web' && source.verified && source.url) {
    return (
      <div className="flex items-center gap-2 text-xs mt-1">
        <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
        >
          {source.title || source.domain || 'Web Source'}
        </a>
      </div>
    );
  }

  // AI-generated or unverified
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <span>{source.title || 'AI-generated content'}</span>
    </div>
  );
}

export default ResultQuestionCard;
