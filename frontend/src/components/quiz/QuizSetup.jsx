import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * QuizSetup — Premium source selection with Topic / Knowledge Library tabs.
 * Renders topic chips + custom input, OR a list of uploaded content cards.
 */

const SUGGESTED_TOPICS = [
  { label: 'Mathematics', icon: '📐' },
  { label: 'Science', icon: '🔬' },
  { label: 'History', icon: '📜' },
  { label: 'Programming', icon: '💻' },
  { label: 'Literature', icon: '📚' },
  { label: 'Geography', icon: '🌍' },
  { label: 'Physics', icon: '⚛️' },
  { label: 'Chemistry', icon: '🧪' },
];

export function QuizSetup({ onStartQuiz }) {
  const { token } = useAuth();
  const [tab, setTab] = useState('topic');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [contentList, setContentList] = useState([]);
  const [selectedContentId, setSelectedContentId] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Fetch uploaded content
  useEffect(() => {
    if (!token) return;
    setIsLoadingContent(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API_BASE}/content/list`, { method: 'GET', headers })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setContentList(data.contents || []))
      .catch(() => setContentList([]))
      .finally(() => setIsLoadingContent(false));
  }, [token]);

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setSelectedContentId(null);
    setCustomTopic('');
  };

  const handleContentSelect = (contentId) => {
    setSelectedContentId(contentId);
    setSelectedTopic('');
    setCustomTopic('');
    setTab('content');
  };

  const handleSubmit = () => {
    const topic = customTopic.trim() || selectedTopic;
    if (!topic && !selectedContentId) return;

    const sourceMode = selectedContentId ? 'uploaded_only' : 'topic_based';
    onStartQuiz?.({
      topic: topic || null,
      contentId: selectedContentId || null,
      sourceMode,
    });
  };

  const isReady = !!(customTopic.trim() || selectedTopic || selectedContentId);

  return (
    <motion.div
      className="max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold quiz-gradient-text mb-1">Practice Quiz</h1>
        <p className="text-sm text-slate-400">
          Choose a topic or use your uploaded materials
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-2 bg-slate-800/60 border border-slate-700/50">
          <TabsTrigger value="topic">📝 Topic</TabsTrigger>
          <TabsTrigger value="content">📁 Knowledge Library</TabsTrigger>
        </TabsList>

        {/* Topic Tab */}
        <TabsContent value="topic" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUGGESTED_TOPICS.map(t => (
              <button
                key={t.label}
                onClick={() => handleTopicSelect(t.label)}
                className={`quiz-glass p-3 text-center text-sm font-medium rounded-xl transition-all hover:scale-[1.02] ${
                  selectedTopic === t.label
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300 quiz-glow'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                <span className="text-lg block mb-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder="Or type a custom topic..."
              value={customTopic}
              onChange={(e) => {
                setCustomTopic(e.target.value);
                setSelectedTopic('');
                setSelectedContentId(null);
              }}
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </TabsContent>

        {/* Knowledge Library Tab */}
        <TabsContent value="content" className="mt-4">
          {isLoadingContent ? (
            <div className="text-center py-8 text-slate-400">Loading your content...</div>
          ) : contentList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No uploaded content found.</p>
              <p className="text-xs text-slate-500 mt-1">Upload a PDF or video to generate a quiz from your materials.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contentList.map(content => (
                <button
                  key={content.id}
                  onClick={() => handleContentSelect(content.id)}
                  className={`w-full quiz-glass p-4 text-left flex items-center gap-3 rounded-xl transition-all ${
                    selectedContentId === content.id
                      ? 'border-cyan-500/60 bg-cyan-500/10 quiz-glow'
                      : 'hover:border-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    content.type === 'video'
                      ? 'bg-indigo-500/10'
                      : 'bg-red-500/10'
                  }`}>
                    {content.type === 'video' ? (
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 truncate">{content.filename}</p>
                    <p className="text-xs text-slate-500">
                      {content.keyPoints?.length || 0} key points
                    </p>
                  </div>
                  {selectedContentId === content.id && (
                    <svg className="w-5 h-5 text-cyan-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-center pt-2">
        <button
          onClick={handleSubmit}
          disabled={!isReady}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity quiz-glow"
        >
          Continue to Quiz
        </button>
      </div>
    </motion.div>
  );
}

export default QuizSetup;
