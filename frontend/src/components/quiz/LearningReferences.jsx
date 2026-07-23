/**
 * LearningReferences — Grouped references section for quiz results.
 * Displays uploaded material and web sources with proper attribution.
 */
export function LearningReferences({ results, contentMeta }) {
  if (!results || results.length === 0) return null;

  // Collect all unique sources grouped by type
  const uploadedSources = new Map();
  const webSources = new Map();
  const aiSources = [];

  results.forEach((r, idx) => {
    const sources = r.sources || [];
    sources.forEach(source => {
      const key = source.contentId || source.url || source.title || `src-${idx}`;
      if (source.sourceType === 'uploaded_content') {
        if (!uploadedSources.has(key)) {
          uploadedSources.set(key, { ...source, questionIndices: [] });
        }
        uploadedSources.get(key).questionIndices.push(idx + 1);
      } else if (source.sourceType === 'web' && source.url) {
        if (!webSources.has(key)) {
          webSources.set(key, { ...source, questionIndices: [] });
        }
        webSources.get(key).questionIndices.push(idx + 1);
      } else {
        aiSources.push({ ...source, questionIndex: idx + 1 });
      }
    });
  });

  const hasUploaded = uploadedSources.size > 0;
  const hasWeb = webSources.size > 0;
  const hasAi = aiSources.length > 0;

  if (!hasUploaded && !hasWeb && !hasAi) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <BookIcon className="w-5 h-5 text-cyan-400" />
        Learning References
      </h3>

      <div className="space-y-4">
        {/* Uploaded material references */}
        {hasUploaded && (
          <div className="space-y-3">
            {Array.from(uploadedSources.values()).map((src, i) => (
              <div
                key={`upload-${i}`}
                className="quiz-glass p-4 flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                  <DocIcon className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 truncate">
                    {src.title || src.filename || 'Uploaded Document'}
                  </p>
                  {src.filename && src.filename !== src.title && (
                    <p className="text-xs text-slate-500 truncate">{src.filename}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Used for Question{src.questionIndices.length > 1 ? 's' : ''}{' '}
                    {formatQuestionList(src.questionIndices)}
                  </p>
                  {src.pageNumber && (
                    <p className="text-xs text-slate-500">Page {src.pageNumber}</p>
                  )}
                  {src.section && (
                    <p className="text-xs text-slate-500">Section: {src.section}</p>
                  )}
                  {src.excerpt && (
                    <p className="text-xs text-slate-500 italic mt-1 line-clamp-2">
                      &ldquo;{src.excerpt}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Web source references — only shown when verified */}
        {hasWeb && (
          <div className="space-y-3">
            {Array.from(webSources.values()).map((src, i) => (
              <div
                key={`web-${i}`}
                className="quiz-glass p-4 flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                  <GlobeIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200">{src.title}</p>
                  {src.publisher && (
                    <p className="text-xs text-slate-400">{src.publisher}</p>
                  )}
                  {src.domain && (
                    <p className="text-xs text-slate-500">{src.domain}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Used for Question{src.questionIndices.length > 1 ? 's' : ''}{' '}
                    {formatQuestionList(src.questionIndices)}
                  </p>
                  {src.url && isValidHttpUrl(src.url) && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-2"
                    >
                      Open Source
                      <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  )}
                  {src.accessedAt && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      Accessed: {new Date(src.accessedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI-generated notice */}
        {!hasUploaded && !hasWeb && hasAi && (
          <div className="quiz-glass p-4 text-sm text-slate-400">
            <p>Questions were generated from AI knowledge without verified external sources.</p>
            <p className="text-xs text-slate-500 mt-1">
              No supporting reference returned by this quiz version.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatQuestionList(indices) {
  if (indices.length <= 3) return indices.join(', ');
  return `${indices[0]}–${indices[indices.length - 1]}`;
}

function isValidHttpUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function BookIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function DocIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function GlobeIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function ExternalLinkIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export default LearningReferences;
