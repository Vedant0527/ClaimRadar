"use client";

import { useState, useRef, useEffect } from "react";
import { getDependencyOrder, getDocumentChecklist } from "@/lib/documents";

type Message = { role: "user" | "assistant"; content: string };
type Profile = Record<string, string>;
type BenefitSource = { document: string; rule: string; url: string };
type Benefit = {
  name: string;
  eligible: "yes" | "likely" | "unlikely" | "no";
  confidence: number;
  reason: string;
  annual_value: string;
  annual_value_number: number;
  apply_url: string;
  deadline?: string;
  source: BenefitSource;
};

type TabType = "benefits" | "documents" | "sequence";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hi! I'm FormZero 👋 I help people find US government benefits they may qualify for — completely free.\n\nAre you more comfortable in English or Spanish?\n\n¿Prefiere hablar en inglés o español?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [benefits, setBenefits] = useState<Benefit[] | null>(null);
  const [discoveryText, setDiscoveryText] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("benefits");
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const discoveryRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, discoveryText]);

  async function runDiscoveryFeed(profileData: Record<string, string>) {
    setIsDiscovering(true);
    setDiscoveryText("");
    const profileString = Object.entries(profileData).map(([k, v]) => `${k}: ${v}`).join(", ");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "discovery",
          language: profileData.language || "english",
          messages: [{ role: "user", content: profileString }],
        }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setDiscoveryText(prev => prev + decoder.decode(value));
      }
    } catch (e) {
      console.error("Discovery feed error:", e);
    } finally {
      setIsDiscovering(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.profile) { setProfile(data.profile); await runDiscoveryFeed(data.profile); }
      if (data.benefits) { setBenefits(data.benefits); setActiveTab("benefits"); }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function badgeColor(eligible: string) {
    if (eligible === "yes") return "bg-green-500/20 text-green-400 border border-green-500/30";
    if (eligible === "likely") return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    if (eligible === "unlikely") return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
    return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  }

  function badgeText(eligible: string) {
    if (eligible === "yes") return "✓ Eligible";
    if (eligible === "likely") return "~ Likely";
    if (eligible === "unlikely") return "? Unlikely";
    return "✗ No";
  }

  function confidenceColor(score: number) {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-gray-600";
  }

  function statusIcon(status: string) {
    if (status === "likely_have") return "✅";
    if (status === "need_to_gather") return "🟡";
    return "🔴";
  }

  function statusLabel(status: string) {
    if (status === "likely_have") return "You likely have this";
    if (status === "need_to_gather") return "Need to gather";
    return "May be hard to get";
  }

  const totalUnclaimed = benefits
    ?.filter(b => b.eligible === "yes" || b.eligible === "likely")
    .reduce((sum, b) => sum + b.annual_value_number, 0) || 0;
  const eligibleBenefits = benefits?.filter(b => b.eligible === "yes" || b.eligible === "likely") || [];
  const dependencyOrder = benefits ? getDependencyOrder(benefits) : [];

  return (
    <main className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* Chat Section */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 bg-gray-900">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">FZ</div>
          <div>
            <h1 className="font-semibold text-white text-sm">FormZero.ai</h1>
            <p className="text-xs text-gray-400">US Benefits Navigator · EN/ES</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>

        {benefits && totalUnclaimed > 0 && (
          <div className="mx-4 mt-4 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-700/50 rounded-2xl px-5 py-4">
            <p className="text-xs text-green-400 font-medium uppercase tracking-wide mb-1">💰 Unclaimed Benefits Detected</p>
            <p className="text-2xl font-bold text-white">${totalUnclaimed.toLocaleString()}<span className="text-sm font-normal text-green-300 ml-2">per year unclaimed</span></p>
            <p className="text-xs text-green-300/70 mt-1">Across {eligibleBenefits.length} programs you likely qualify for</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold mr-2 mt-1 flex-shrink-0">FZ</div>
              )}
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-800 text-gray-100 rounded-bl-sm"}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {(isDiscovering || discoveryText) && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">🔍</div>
              <div className="max-w-[80%] bg-gray-900 border border-purple-800/40 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${isDiscovering ? "bg-purple-400 animate-pulse" : "bg-green-400"}`}></div>
                  <span className="text-xs text-purple-400 font-medium">{isDiscovering ? "Live Discovery Feed — scanning..." : "Scan complete"}</span>
                </div>
                <pre ref={discoveryRef} className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {discoveryText}
                  {isDiscovering && <span className="animate-pulse text-purple-400">▋</span>}
                </pre>
              </div>
            </div>
          )}

          {loading && !isDiscovering && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold mr-2 mt-1">FZ</div>
              <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1 items-center h-5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-4 border-t border-gray-800 bg-gray-900">
          <div className="flex gap-3 items-end max-w-3xl mx-auto">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Type your message... / Escriba su mensaje..." rows={1}
              className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors">
              Send
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">FormZero · Free benefits help · Not legal advice</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-80 border-l border-gray-800 bg-gray-900 flex flex-col overflow-hidden">

        {/* Audit Modal */}
        {selectedBenefit && (
          <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium uppercase tracking-wide mb-1">📋 Audit Ledger</p>
                  <h3 className="text-sm font-semibold text-white">{selectedBenefit.name}</h3>
                </div>
                <button onClick={() => setSelectedBenefit(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
              </div>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">📄 Source Document</p>
                  <p className="text-xs text-white font-medium">{selectedBenefit.source.document}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">📌 Exact Rule Applied</p>
                  <p className="text-xs text-gray-200 leading-relaxed">{selectedBenefit.source.rule}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">🔗 Verified Source URL</p>
                  <a href={selectedBenefit.source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 break-all">{selectedBenefit.source.url}</a>
                </div>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">🎯 Eligibility Decision</p>
                  <p className="text-xs text-gray-200">{selectedBenefit.reason}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${selectedBenefit.confidence >= 80 ? "bg-green-500" : selectedBenefit.confidence >= 60 ? "bg-blue-500" : "bg-yellow-500"}`} style={{ width: `${selectedBenefit.confidence}%` }} />
                    </div>
                    <span className="text-xs text-gray-300">{selectedBenefit.confidence}% confidence</span>
                  </div>
                  {selectedBenefit.confidence < 60 && <span className="text-xs text-yellow-400">⚠ Verify with caseworker</span>}
                </div>
              </div>
              <a href={selectedBenefit.apply_url} target="_blank" rel="noopener noreferrer" className="block text-center text-sm bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl transition-colors font-medium">Apply Now →</a>
            </div>
          </div>
        )}

        {/* Profile */}
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wide">User Profile</h2>
        </div>
        <div className="px-4 py-3 border-b border-gray-800">
          {!profile ? (
            <p className="text-xs text-gray-500 text-center py-1">Profile builds as you chat...</p>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(profile).map(([key, value]) => (
                <div key={key} className="text-xs">
                  <span className="text-gray-500 capitalize">{key.replace(/_/g, " ")}: </span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {(["benefits", "documents", "sequence"] as TabType[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${activeTab === tab ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}>
              {tab === "benefits" ? "Benefits" : tab === "documents" ? "Documents" : "Order"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* BENEFITS TAB */}
          {activeTab === "benefits" && (
            <>
              {!benefits ? (
                <div className="space-y-2 mt-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse"></div>)}
                  <p className="text-xs text-gray-600 text-center mt-2">Complete the chat to unlock results...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Found {eligibleBenefits.length} of {benefits.length} programs</span>
                  </div>
                  {benefits.map((b, i) => (
                    <div key={i} className={`rounded-xl p-3 space-y-2 border ${b.eligible === "yes" ? "bg-gray-800 border-green-800/40" : b.eligible === "likely" ? "bg-gray-800 border-blue-800/40" : "bg-gray-900 border-gray-800"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-white leading-tight">{b.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${badgeColor(b.eligible)}`}>{badgeText(b.eligible)}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Confidence</span>
                          <span className="text-xs text-gray-300">{b.confidence}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${confidenceColor(b.confidence)}`} style={{ width: `${b.confidence}%` }} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{b.reason}</p>
                      <p className="text-xs text-green-400 font-medium">{b.annual_value}</p>
                      {b.deadline && <p className="text-xs text-yellow-400/70">⏰ {b.deadline}</p>}
                      {b.confidence < 60 && (
                        <div className="text-xs bg-yellow-900/30 border border-yellow-700/30 rounded-lg px-2 py-1.5 text-yellow-300/80">⚠ Verify with a caseworker</div>
                      )}
                      <button onClick={() => setSelectedBenefit(b)} className="w-full text-center text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 py-1.5 rounded-lg transition-colors">📋 View Source & Audit</button>
                      {(b.eligible === "yes" || b.eligible === "likely") && (
                        <a href={b.apply_url} target="_blank" rel="noopener noreferrer" className="block text-center text-xs bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-lg transition-colors">Apply Now →</a>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === "documents" && (
            <>
              {!benefits ? (
                <p className="text-xs text-gray-500 text-center py-4">Complete the chat to see document checklists...</p>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-2">Click a program to see what documents you need.</p>
                  {eligibleBenefits.map((b, i) => {
                    const checklist = getDocumentChecklist(b.name);
                    if (!checklist) return null;
                    const isExpanded = expandedDoc === b.name;
                    return (
                      <div key={i} className="rounded-xl border border-gray-700 overflow-hidden">
                        <button onClick={() => setExpandedDoc(isExpanded ? null : b.name)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800 hover:bg-gray-700 transition-colors">
                          <span className="text-xs font-medium text-white">{b.name}</span>
                          <span className="text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                        {isExpanded && (
                          <div className="px-3 py-2 space-y-2 bg-gray-900">
                            {checklist.documents.map((doc, j) => (
                              <div key={j} className="flex items-start gap-2">
                                <span className="text-sm mt-0.5">{statusIcon(doc.status)}</span>
                                <div className="flex-1">
                                  <p className="text-xs text-white font-medium">{doc.name}</p>
                                  <p className="text-xs text-gray-400">{doc.description}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{statusLabel(doc.status)} · {doc.time_estimate}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* SEQUENCE TAB */}
          {activeTab === "sequence" && (
            <>
              {!benefits ? (
                <p className="text-xs text-gray-500 text-center py-4">Complete the chat to see the recommended order...</p>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-3">Apply in this order for the best results:</p>
                  {dependencyOrder.map((b, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                        {i < dependencyOrder.length - 1 && <div className="w-0.5 h-6 bg-gray-700 mt-1"></div>}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="text-xs font-medium text-white">{b.name}</p>
                        {b.unlocks && (
                          <p className="text-xs text-green-400 mt-0.5">🔓 Unlocks: {b.unlocks.join(", ")}</p>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${badgeColor(b.eligible)}`}>{badgeText(b.eligible)}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}