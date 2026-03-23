import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Brain,
  Trophy,
  Zap,
  ExternalLink,
  BarChart3,
  X,
  ChevronRight,
  List,
  Link,
  ChevronDown,
  Calendar,
  Loader2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_BASE = "http://localhost:8080";

export default function App() {
  const [input, setInput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("radar"); // "radar" | "heatmap" | "problems"

  // AI Chat & Sidebar
  const [chatMsg, setChatMsg] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Study Plan
  const [studyPlan, setStudyPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  // Problem list filter
  const [patternFilter, setPatternFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showExplorer, setShowExplorer] = useState(false);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const extractSlug = (url) => {
    const match = url.match(/problem-list\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const isUrl = (str) => str.includes("leetcode.com") || str.includes("problem-list/");

  // ─── UNIFIED ANALYZE ───
  const analyze = async () => {
    const trimmed = input.trim();
    if (!trimmed) { setError("Enter a LeetCode list URL or username!"); return; }
    if (isUrl(trimmed)) {
      await analyzeFromList(trimmed);
    } else {
      await analyzeUser(trimmed);
    }
  };

  // ─── ANALYZE FROM LIST URL ───
  const analyzeFromList = async (urlInput) => {
    const slug = extractSlug(urlInput);
    if (!slug) {
      setError("Invalid list URL. Expected: https://leetcode.com/problem-list/xxxxx/");
      return;
    }
    setLoading(true);
    setData(null);
    setError(null);
    setChatLog([]);
    setIsExpanded(false);
    setStudyPlan(null);
    setShowPlan(false);
    setActiveTab("radar");

    setLoadingStage("Connecting to LeetCode...");

    try {
      // Small delay for UX smoothness
      await new Promise((r) => setTimeout(r, 400));
      setLoadingStage("Fetching your solved problems...");

      const res = await fetch(`${API_BASE}/analyze-list/${slug}`);
      if (!res.ok) throw new Error("Backend returned " + res.status);

      setLoadingStage("Building your Skill DNA...");
      await new Promise((r) => setTimeout(r, 300));

      const analysis = await res.json();

      setLoadingStage("Generating insights...");
      await new Promise((r) => setTimeout(r, 300));

      const chartData = analysis.chartData
        ? Object.keys(analysis.chartData)
          .filter((key) => key !== "Others")
          .map((key) => ({
            subject: key,
            value: analysis.chartData[key] || 0,
          }))
        : [];

      const categorizedSummary = buildCategorizedSummary(analysis.patternMap);

      setData({
        stats: {
          easy: analysis.problems.filter((p) => p.difficulty === "Easy").length,
          medium: analysis.problems.filter((p) => p.difficulty === "Medium").length,
          hard: analysis.problems.filter((p) => p.difficulty === "Hard").length,
        },
        patterns: analysis.rawData || {},
        chartData,
        problems: analysis.problems || [],
        patternMap: analysis.patternMap || {},
        categorizedSummary,
        totalCount: analysis.totalCount,
        source: "list",
      });
    } catch (err) {
      console.error("Error analyzing list", err);
      setError("Failed to analyze list. Check if Spring Boot is running.");
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  // ─── ANALYZE FROM USERNAME ───
  const analyzeUser = async (username) => {
    setLoading(true);
    setData(null);
    setError(null);
    setChatLog([]);
    setIsExpanded(false);
    setStudyPlan(null);
    setShowPlan(false);
    setActiveTab("radar");

    setLoadingStage("Connecting to LeetCode...");

    try {
      await new Promise((r) => setTimeout(r, 400));
      setLoadingStage("Fetching your profile...");

      const [statsRes, patternsRes, recRes] = await Promise.all([
        fetch(`${API_BASE}/stats/${username}`),
        fetch(`${API_BASE}/patterns/${username}`),
        fetch(`${API_BASE}/recommendation/${username}`),
      ]);

      if (!statsRes.ok || !patternsRes.ok || !recRes.ok) {
        throw new Error("One or more backend services failed");
      }

      setLoadingStage("Building your Skill DNA...");
      await new Promise((r) => setTimeout(r, 300));

      const stats = await statsRes.json();
      const analytics = await patternsRes.json();
      const rec = await recRes.json();

      const chartData = analytics.chartData
        ? Object.keys(analytics.chartData).map((key) => ({
          subject: key,
          value: analytics.chartData[key] || 0,
        }))
        : [];

      setData({
        stats,
        patterns: analytics.rawData || {},
        rec,
        chartData,
        source: "username",
      });
    } catch (err) {
      console.error("Error fetching data", err);
      setError("Backend error. Check if Spring Boot is running.");
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  const buildCategorizedSummary = (patternMap) => {
    if (!patternMap) return "";
    let summary = "";
    for (const [pattern, problems] of Object.entries(patternMap)) {
      summary += `**${pattern} (${problems.length} solved):** `;
      if (problems.length === 0) {
        summary += "(none)";
      } else {
        summary += problems.map((p) => `${p.title} (${p.difficulty})`).join(", ");
      }
      summary += "\n";
    }
    return summary;
  };

  // ─── CHAT HANDLER ───
  const handleChat = async () => {
    if (!chatMsg || !data) return;
    setIsTyping(true);
    const currentMsg = chatMsg;
    const newLog = [...chatLog, { role: "user", text: currentMsg }];
    setChatLog(newLog);
    setChatMsg("");

    try {
      const body =
        data.source === "list" && data.categorizedSummary
          ? { message: currentMsg, categorizedSummary: data.categorizedSummary }
          : { message: currentMsg, patterns: data.patterns };

      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      setChatLog([...newLog, { role: "ai", text: String(resData.reply || resData.text || "No response.") }]);
    } catch (err) {
      setChatLog([...newLog, { role: "ai", text: "Mentor is offline. Check backend logs." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ─── GENERATE STUDY PLAN ───
  const generateStudyPlan = async () => {
    if (!data?.categorizedSummary) return;
    setPlanLoading(true);
    setShowPlan(true);
    setStudyPlan(null);

    try {
      const response = await fetch(`${API_BASE}/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorizedSummary: data.categorizedSummary }),
      });
      const resData = await response.json();
      setStudyPlan(resData.plan || "Could not generate a study plan.");
    } catch (err) {
      setStudyPlan("Failed to generate plan. Check if the backend is running.");
    } finally {
      setPlanLoading(false);
    }
  };

  // ─── DIFFICULTY HEATMAP DATA ───
  const getHeatmapData = () => {
    if (!data?.patternMap) return [];
    return Object.entries(data.patternMap)
      .filter(([pattern]) => pattern !== "Others")
      .map(([pattern, problems]) => {
        const easy = problems.filter((p) => p.difficulty === "Easy").length;
        const medium = problems.filter((p) => p.difficulty === "Medium").length;
        const hard = problems.filter((p) => p.difficulty === "Hard").length;
        return { name: pattern.length > 14 ? pattern.slice(0, 12) + "…" : pattern, fullName: pattern, Easy: easy, Medium: medium, Hard: hard, total: easy + medium + hard };
      })
      .sort((a, b) => b.total - a.total);
  };

  const getFilteredProblems = () => {
    if (!data?.problems) return [];
    return data.problems.filter((p) => {
      const matchesPattern = patternFilter === "All" || p.pattern === patternFilter;
      const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPattern && matchesSearch;
    });
  };

  const getPatterns = () => {
    if (!data?.patternMap) return [];
    return Object.keys(data.patternMap).filter((p) => data.patternMap[p].length > 0);
  };

  const getWeakestPattern = () => {
    if (!data?.patterns) return null;
    let weakest = null;
    let minCount = Infinity;
    for (const [pattern, count] of Object.entries(data.patterns)) {
      if (pattern === "Others") continue;
      if (count < minCount) { minCount = count; weakest = pattern; }
    }
    return weakest;
  };

  // Custom tooltip for heatmap
  const HeatmapTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-white font-bold text-sm mb-1">{d.fullName}</p>
        <div className="space-y-1 text-xs">
          <p className="text-emerald-400">Easy: {d.Easy}</p>
          <p className="text-amber-400">Medium: {d.Medium}</p>
          <p className="text-rose-400">Hard: {d.Hard}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans min-h-screen text-white relative overflow-x-hidden bg-[#030712]">
      {/* ─── ERROR TOAST ─── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -30, x: "-50%" }}
            className="fixed top-6 left-1/2 z-[200] flex items-center gap-3 bg-rose-950/90 border border-rose-500/30 text-rose-200 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-lg"
          >
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="text-center my-16">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent mb-4">
          LeetCode Analyzer
        </motion.h1>
        <p className="text-slate-400 text-lg font-medium opacity-80">
          Personalized Skill DNA & AI-Powered Mentorship.
        </p>
      </header>

      {/* Hero Branding */}
      <AnimatePresence>
        {!data && !loading && (
          <motion.div initial="hidden" animate="visible"
            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            className="text-center mb-12 max-w-4xl mx-auto flex flex-col items-center">
            <div className="relative w-full py-4 mb-4">
              <motion.h2
                variants={{ hidden: { x: -150, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } } }}
                className="text-2xl md:text-4xl font-black text-slate-300 tracking-tight mb-4">
                Struggling with <span className="text-indigo-300">random playlists</span>?
              </motion.h2>
              <motion.h2
                variants={{ hidden: { x: 150, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { duration: 0.8, delay: 0.3, ease: "easeOut" } } }}
                className="text-2xl md:text-4xl font-black text-slate-300 tracking-tight">
                Annoyed of the <span className="text-violet-400/80">aimless LeetCode grind</span>?
              </motion.h2>
            </div>
            <motion.div
              variants={{ hidden: { scale: 0.8, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { delay: 1.2, duration: 0.5, type: "spring", stiffness: 200 } } }}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-violet-600/20 border border-violet-500/30 text-white text-sm font-black uppercase tracking-widest shadow-[0_0_25px_rgba(139,92,246,0.2)]">
              <Zap size={16} className="fill-white animate-pulse" /> Fear not, we've got you
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── LOADING OVERLAY ─── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md mx-auto mb-16"
          >
            <div className="bg-white/5 border border-violet-500/20 rounded-3xl p-10 text-center backdrop-blur-md shadow-2xl">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                <div className="absolute inset-4 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" style={{ animationDuration: "2s" }} />
              </div>
              <motion.p
                key={loadingStage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-violet-300 font-bold text-lg tracking-tight"
              >
                {loadingStage}
              </motion.p>
              <p className="text-slate-500 text-xs mt-3 font-medium">This may take a few seconds for large lists</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SEARCH INPUTS ─── */}
      {!loading && (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: data ? 0 : 1.6 }}
          className="max-w-2xl mx-auto mb-16 relative z-10">
          <div className="flex gap-3 bg-white/5 p-2 rounded-3xl border border-white/10 focus-within:ring-2 focus-within:ring-violet-500/40 transition-all backdrop-blur-md">
            <div className="flex items-center flex-1 px-4">
              <Search className="text-violet-400 mr-3 shrink-0" size={20} />
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="Paste list URL or enter username..."
                className="bg-transparent border-none outline-none w-full text-lg placeholder:text-slate-600 text-white" />
            </div>
            <button onClick={analyze} disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20">
              Analyze
            </button>
          </div>
          <p className="text-center text-xs text-slate-600 mt-3 font-medium">
            Supports: <span className="text-slate-500">leetcode.com/problem-list/xxxxx</span> or just a <span className="text-slate-500">username</span>
          </p>
        </motion.div>
      )}

      {/* ─── DASHBOARD ─── */}
      <AnimatePresence>
        {data && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
            {/* Left Column */}
            <div className="md:col-span-4 space-y-6 flex flex-col">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setIsExpanded(true)}
                className="bg-slate-900/40 border border-violet-500/20 rounded-3xl p-6 cursor-pointer group transition-all hover:bg-violet-900/10 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-violet-500/10 p-3 rounded-2xl border border-violet-500/20 group-hover:bg-violet-500/20 transition-all">
                      <Brain size={24} className="text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-100">Your AI Mentor</h3>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider group-hover:text-violet-400 transition-colors">
                        {data.source === "list" ? `Knows all ${data.totalCount} problems` : "Personalized Advice"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col flex-1 shadow-inner">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-yellow-500/10 rounded-lg"><Trophy className="text-yellow-500" size={24} /></div>
                  <h3 className="text-2xl font-bold">{data.source === "list" ? `${data.totalCount} Solved` : "Total Solved"}</h3>
                </div>
                <div className="space-y-6 flex-1 justify-center flex flex-col">
                  <StatBox label="Easy" count={data.stats.easy} color="bg-emerald-500" />
                  <StatBox label="Medium" count={data.stats.medium} color="bg-amber-500" />
                  <StatBox label="Hard" count={data.stats.hard} color="bg-rose-500" />
                </div>
              </div>
            </div>

            {/* Right Column — Tabs: Radar / Heatmap / Problems */}
            <div className="md:col-span-8 bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[550px] flex flex-col relative">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg"><Zap className="text-indigo-400" size={24} /></div>
                  <h3 className="text-2xl font-bold text-slate-100">Skill DNA</h3>
                </div>
                <div className="flex items-center gap-1">
                  {/* Radar tab */}
                  <button onClick={() => { setActiveTab("radar"); setShowExplorer(false); }}
                    className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors ${activeTab === "radar" ? "bg-indigo-600/20 text-indigo-300" : "text-slate-500 hover:text-slate-300"}`}>
                    <span className="flex items-center gap-1.5"><BarChart3 size={13} /> Radar</span>
                  </button>
                  {/* Heatmap tab (list-only) */}
                  {data.source === "list" && (
                    <button onClick={() => setActiveTab("heatmap")}
                      className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors ${activeTab === "heatmap" ? "bg-emerald-600/20 text-emerald-300" : "text-slate-500 hover:text-slate-300"}`}>
                      <span className="flex items-center gap-1.5"><TrendingUp size={13} /> Heatmap</span>
                    </button>
                  )}
                  {/* Problems tab (list-only) */}
                  {data.source === "list" && (
                    <button onClick={() => setActiveTab("problems")}
                      className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors ${activeTab === "problems" ? "bg-violet-600/20 text-violet-300" : "text-slate-500 hover:text-slate-300"}`}>
                      <span className="flex items-center gap-1.5"><List size={13} /> All Qs</span>
                    </button>
                  )}
                  {/* Explorer toggle (radar sub-view) */}
                  {activeTab === "radar" && (
                    <button onClick={() => setShowExplorer(!showExplorer)}
                      className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
                      {showExplorer ? "Web Map" : "Details"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {/* ── HEATMAP TAB ── */}
                  {activeTab === "heatmap" && data.source === "list" ? (
                    <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-full flex flex-col">
                      <p className="text-xs text-slate-500 mb-4 font-medium">Difficulty breakdown per pattern — find where you're avoiding hard problems.</p>
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getHeatmapData()} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#1e293b" }} />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<HeatmapTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                            <Bar dataKey="Easy" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Medium" stackId="a" fill="#fbbf24" />
                            <Bar dataKey="Hard" stackId="a" fill="#f87171" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>

                  ) : activeTab === "problems" && data.source === "list" ? (
                    /* ── ALL QUESTIONS TAB ── */
                    <motion.div key="problems" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-full flex flex-col">
                      <div className="flex gap-3 mb-4">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-1">
                          <Search size={14} className="text-slate-500" />
                          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search problems..." className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-600 w-full" />
                        </div>
                        <div className="relative">
                          <select value={patternFilter} onChange={(e) => setPatternFilter(e.target.value)}
                            className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-8 text-sm text-slate-300 outline-none cursor-pointer">
                            <option value="All">All Patterns</option>
                            {getPatterns().map((p) => (<option key={p} value={p}>{p} ({data.patternMap[p]?.length || 0})</option>))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                        {getFilteredProblems().map((problem, idx) => (
                          <a key={problem.titleSlug} href={`https://leetcode.com/problems/${problem.titleSlug}/`} target="_blank" rel="noreferrer"
                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] transition-all group">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs text-slate-600 font-mono w-8 shrink-0">{idx + 1}</span>
                              <span className="text-sm text-slate-200 font-medium truncate group-hover:text-white transition-colors">{problem.title}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${problem.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400" : problem.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                                {problem.difficulty}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider max-w-[120px] truncate">{problem.pattern}</span>
                              <ExternalLink size={12} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                            </div>
                          </a>
                        ))}
                        {getFilteredProblems().length === 0 && <div className="text-center text-slate-500 mt-12">No problems match your filters.</div>}
                      </div>
                      <div className="text-xs text-slate-600 mt-3 text-right">Showing {getFilteredProblems().length} of {data.problems.length} problems</div>
                    </motion.div>

                  ) : activeTab === "radar" && !showExplorer ? (
                    /* ── RADAR TAB ── */
                    <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={data.chartData}>
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <Radar name="Skill Level" dataKey="value" stroke="#818cf8" fill="#6366f1" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  ) : (
                    /* ── EXPLORER (detail counts) ── */
                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-full overflow-y-auto pr-2 custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(data.patterns).map(([pattern, count]) => (
                          <div key={pattern} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all">
                            <span className="text-slate-400 text-sm font-medium">{pattern}</span>
                            <span className="text-white font-black text-lg">{count}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── WEAKNESS SLAYER + STUDY PLAN BUTTON ── */}
            <div className="md:col-span-12 bg-gradient-to-br from-indigo-900/20 to-violet-900/20 border border-violet-500/30 rounded-3xl p-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-4 mb-3">
                  <div className="bg-violet-600 p-2 rounded-full shadow-lg"><Zap className="text-white fill-white" size={20} /></div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-white">Weakness Slayer</h2>
                </div>
                <p className="text-slate-400 text-lg">
                  Analyzing DNA... target{" "}
                  <span className="text-violet-300 font-bold">
                    {data.source === "list" ? getWeakestPattern() || "New Concepts" : data.rec?.weakestPattern || "New Concepts"}
                  </span> next.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {data.source === "list" && (
                  <button onClick={generateStudyPlan} disabled={planLoading}
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-5 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-2xl disabled:opacity-50 disabled:hover:scale-100">
                    {planLoading ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><Calendar size={18} /> 4-Week Roadmap</>}
                  </button>
                )}
                <button onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-2 bg-white text-slate-900 px-8 py-5 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-2xl">
                  Ask AI Mentor <Brain size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── STUDY PLAN MODAL ─── */}
      <AnimatePresence>
        {showPlan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowPlan(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-950 border border-violet-500/20 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
              <div className="p-8 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-2.5 rounded-xl shadow-lg"><Calendar size={20} className="text-white" /></div>
                  <div>
                    <h3 className="font-black text-2xl tracking-tight text-white">Your 4-Week Roadmap</h3>
                    <p className="text-xs text-slate-500 font-medium">AI-generated personalized study plan</p>
                  </div>
                </div>
                <button onClick={() => setShowPlan(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {planLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={40} className="text-violet-500 animate-spin mb-4" />
                    <p className="text-violet-300 font-bold text-lg">Crafting your personalized roadmap...</p>
                    <p className="text-slate-500 text-sm mt-2">Analyzing your {data?.totalCount} solved problems</p>
                  </div>
                ) : (
                  <div className="markdown-container">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{studyPlan}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── AI MENTOR SIDEBAR ─── */}
      <div className={`fixed top-0 left-0 h-full z-[100] transition-all duration-500 ease-in-out ${isExpanded ? "w-[40%]" : "w-0"}`}>
        <div className={`h-full bg-slate-950/98 backdrop-blur-3xl border-r border-violet-500/10 flex flex-col shadow-2xl transition-all duration-300 ${isExpanded ? "w-full opacity-100" : "w-0 opacity-0 overflow-hidden"}`}>
          <div className="p-8 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-violet-600/20 p-2 rounded-xl"><Brain size={22} className="text-violet-400" /></div>
              <div>
                <h3 className="font-black text-2xl tracking-tight text-white">AI Mentor</h3>
                {data?.source === "list" && <p className="text-[10px] text-violet-400/60 font-bold uppercase tracking-widest">Full Problem Context Active</p>}
              </div>
            </div>
            <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-900/20">
            {chatLog.length === 0 && (
              <div className="text-center mt-20 px-6">
                <p className="text-indigo-200/80 font-bold text-lg italic tracking-tight">"A goal without a plan is just a wish."</p>
                <p className="text-sm text-slate-500 mt-4 leading-relaxed">
                  {data?.source === "list"
                    ? `I can see all ${data.totalCount} problems you've solved. Ask me for a gap analysis, personalized roadmap, or specific problem recommendations.`
                    : "Ask me for a personalized roadmap or to explain the gaps in your DNA."}
                </p>
              </div>
            )}
            {chatLog.map((log, i) => (
              <div key={i} className={`flex flex-col ${log.role === "ai" ? "items-start" : "items-end"}`}>
                <div className={`p-5 rounded-3xl max-w-[90%] text-sm leading-relaxed shadow-lg ${log.role === "ai" ? "bg-white/5 text-slate-200 border border-white/10 rounded-tl-none" : "bg-indigo-600 text-white rounded-tr-none"}`}>
                  {log.role === "ai" ? (
                    <div className="markdown-container"><ReactMarkdown remarkPlugins={[remarkGfm]}>{log.text}</ReactMarkdown></div>
                  ) : (
                    <p className="whitespace-pre-wrap">{log.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-1.5 p-2 items-center">
                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>
          <div className="p-8 bg-slate-900/50 border-t border-white/10">
            <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 focus-within:ring-1 focus-within:ring-violet-500/50 transition-all">
              <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChat()}
                placeholder="Ask about your roadmap..."
                className="bg-transparent border-none outline-none px-4 py-3 text-sm flex-1 text-white placeholder:text-slate-600" />
              <button onClick={handleChat} className="bg-violet-600 hover:bg-violet-500 p-3 rounded-xl transition-all">
                <Zap size={20} className="text-white fill-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx="true">{`
        .markdown-container a { color: #818cf8 !important; font-weight: 800; text-decoration: underline; text-underline-offset: 4px; }
        .markdown-container table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; }
        .markdown-container th { text-align: left; padding: 8px; border-bottom: 2px solid rgba(255, 255, 255, 0.1); color: #94a3b8; }
        .markdown-container td { padding: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .markdown-container strong { color: #fff; font-weight: 700; }
        .markdown-container h3 { font-size: 1.15rem; font-weight: 900; margin-top: 24px; margin-bottom: 8px; color: #e2e8f0; }
        .markdown-container ul, .markdown-container ol { padding-left: 20px; margin: 8px 0; }
        .markdown-container li { margin: 4px 0; }
        select option { background: #0f172a; color: #e2e8f0; }
      `}</style>
    </div>
  );
}

function StatBox({ label, count, color }) {
  return (
    <div className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${color} shadow-[0_0_10px_rgba(255,255,255,0.3)]`} />
        <span className="text-slate-300 font-bold text-lg tracking-tight">{label}</span>
      </div>
      <span className="text-3xl font-black">{count}</span>
    </div>
  );
}
