import { useEffect, useMemo, useRef, useState } from "react";
import {
    MessageSquare,
    Send,
    FileText,
    Pencil,
    Trash2,
    Save,
    X,
    Plus,
    AlertTriangle
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useUser } from '../context/UserContext';
import api from '../services/api'; 

type Message = {
    role: "user" | "assistant";
    content: string;
};

type DocumentItem = {
    id: string;      
    text: string;
};

export default function ChatbotManagement() {
    const { user, role } = useUser();
    
    // Determine if user is super-admin
    const isSuperAdmin = role === "super-admin";
    
    const [messages, setMessages] = useState<Message[]>(([
        {
            role: "assistant",
            content: "Hello 👋 I am the Ziquala Abo School Assistant.",
        },
    ]));

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const [docs, setDocs] = useState<DocumentItem[]>([]);
    const [docText, setDocText] = useState("");
    const [docLoading, setDocLoading] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const loadDocs = async () => {
        try {
            const response = await api.get('/super-admin/chatbot/docs');
            setDocs(response.data.documents || []);
        } catch (err) {
            console.error("Error loading docs:", err);
        }
    };

    useEffect(() => {
        loadDocs();
    }, []);

    // CHAT (Accessible to all)
    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMessage = { role: "user" as const, content: input };
        const newMessages = [...messages, userMessage];

        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            const response = await api.post('/guest/chat', { messages: newMessages });
            setMessages([...newMessages, { role: "assistant", content: response.data.content }]);
        } catch (err) {
            console.error(err);
            setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Could not connect to backend." }]);
        } finally {
            setLoading(false);
        }
    };

    // ADMIN ACTIONS
    const addDocument = async () => {
        if (!docText.trim() || !isSuperAdmin) return;
        setDocLoading(true);
        try {
            await api.post('/super-admin/chatbot/docs', { text: docText });
            setDocText("");
            loadDocs();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to add document. Check your permissions or backend logs.");
        } finally {
            setDocLoading(false);
        }
    };

    const deleteDoc = async (id: string) => {
        if (!isSuperAdmin) return;
        if (!window.confirm("Are you sure you want to delete this full document?")) return;

        try {
            await api.delete(`/super-admin/chatbot/docs/${id}`);
            loadDocs();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to delete document.");
        }
    };

    const clearAllDocs = async () => {
        if (!isSuperAdmin) return;
        if (!window.confirm("Are you sure you want to delete ALL documents? This cannot be undone.")) return;

        try {
            await api.delete('/super-admin/chatbot/docs');
            setDocs([]);
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to clear documents.");
        }
    };

    const updateDoc = async () => {
        if (editingId === null || !isSuperAdmin) return;
        try {
            await api.put(`/super-admin/chatbot/docs/${editingId}`, { text: editingText });
            setEditingId(null);
            setEditingText("");
            loadDocs();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to update document.");
        }
    };

    const reversedMessages = useMemo(() => [...messages], [messages]);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white p-6">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Left Side: Chatbot Preview */}
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[850px]">

                    <div className="bg-blue-600 p-5 text-white">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <MessageSquare size={24} />
                            </div>

                            <div>
                                <h1 className="font-bold text-xl">
                                    Ziquala Abo School Assistant
                                </h1>

                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <p className="text-sm text-blue-100">
                                        Semantic Search Active
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-950/40 space-y-4">
                        {reversedMessages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-sm ${msg.role === "user"
                                            ? "bg-blue-600 text-white rounded-tr-none"
                                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none"
                                        }`}
                                >
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl rounded-tl-none px-5 py-4 shadow-sm flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}

                        <div ref={scrollRef} />
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex gap-3">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        sendMessage();
                                    }
                                }}
                                placeholder="Ask anything..."
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <button
                                onClick={sendMessage}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-2xl transition-colors shadow-lg"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Knowledge Base Management */}
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[850px]">

                    {/* Header */}
                    <div className="bg-emerald-600 p-5 text-white shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-3 rounded-2xl">
                                    <FileText size={24} />
                                </div>

                                <div>
                                    <h2 className="font-bold text-xl">
                                        Knowledge Base
                                    </h2>

                                    <p className="text-sm text-emerald-100">
                                        {isSuperAdmin ? "Manage whole documents securely" : "View available knowledge base"}
                                    </p>
                                </div>
                            </div>

                            {/* ONLY SHOW CLEAR ALL IF ADMIN */}
                            {isSuperAdmin && (
                                <button
                                    onClick={clearAllDocs}
                                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-2xl text-sm font-medium transition-colors shadow-lg"
                                >
                                    <AlertTriangle size={16} />
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ONLY SHOW ADD DOC IF ADMIN */}
                    {isSuperAdmin && (
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 shrink-0">
                            <textarea
                                value={docText}
                                onChange={(e) => setDocText(e.target.value)}
                                placeholder="Paste full document text here..."
                                className="w-full h-32 resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 outline-none focus:ring-2 focus:ring-emerald-500"
                            />

                            <button
                                onClick={addDocument}
                                disabled={docLoading || !docText.trim()}
                                className="mt-4 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-2xl shadow-lg transition-colors"
                            >
                                <Plus size={18} />

                                {docLoading ? "Adding..." : "Add Document"}
                            </button>
                        </div>
                    )}

                    {/* Docs List */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50 dark:bg-slate-950/40">
                        {docs.length === 0 && (
                            <div className="text-center text-slate-500 dark:text-slate-400 mt-10">
                                No documents found in database.
                            </div>
                        )}

                        {docs.map((doc) => (
                            <div
                                key={doc.id}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-700 pb-3">

                                    <div className="text-xs font-mono font-medium bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full text-slate-600 dark:text-slate-300">
                                        Doc ID: {doc.id.slice(0, 8)}...
                                    </div>

                                    {isSuperAdmin && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingId(doc.id);
                                                    setEditingText(doc.text);
                                                }}
                                                className="p-2 rounded-xl bg-slate-100 hover:bg-yellow-500 text-slate-600 hover:text-white dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-yellow-600 transition-colors"
                                                title="Edit Full Document"
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            <button
                                                onClick={() => deleteDoc(doc.id)}
                                                className="p-2 rounded-xl bg-slate-100 hover:bg-red-500 text-slate-600 hover:text-white dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-red-600 transition-colors"
                                                title="Delete Document"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {editingId === doc.id ? (
                                    <div className="flex flex-col gap-3">
                                        <textarea
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                            className="w-full h-64 resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 outline-none focus:ring-2 focus:ring-blue-500"
                                        />

                                        <div className="flex gap-3">
                                            <button
                                                onClick={updateDoc}
                                                className="flex items-center justify-center flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-colors font-medium"
                                            >
                                                <Save size={18} />
                                                Save Changes
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setEditingId(null);
                                                    setEditingText("");
                                                }}
                                                className="flex items-center justify-center flex-1 gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-3 rounded-xl transition-colors font-medium"
                                            >
                                                <X size={18} />
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto max-h-60 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 custom-scrollbar">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {doc.text}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
