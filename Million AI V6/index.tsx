import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCtyJLx_e_OZDaylQ7DnK4UuZkMqMMV0jI",
  authDomain: "million-ai-be745.firebaseapp.com",
  projectId: "million-ai-be745",
  storageBucket: "million-ai-be745.firebasestorage.app",
  messagingSenderId: "360147173018",
  appId: "1:360147173018:web:655ab43cc03a4cde50e923",
  measurementId: "G-0Z2MJQXSBF"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// --- Types ---
type Theme = 'hacker' | 'modern';

interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'code' | 'text';
  mimeType: string;
  data: string;
  isLoading?: boolean;
  progress?: number;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isSearching?: boolean;
  attachments?: Attachment[];
  groundingMetadata?: any;
  timestamp: number;
}

interface Project {
  id: string;
  name: string;
  icon: string;
  category: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  projectId?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// --- Utilities ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- Theme Config ---
const getThemeStyles = (theme: Theme) => {
  if (theme === 'modern') {
    return {
      app: "bg-white text-gray-900 font-sans selection:bg-black selection:text-white",

      sidebar: "bg-gray-50 border-r border-gray-200",
      sidebarButton: "bg-white text-gray-700 border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md transition-all duration-200 rounded-lg px-4",
      sidebarText: "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900 rounded-lg px-3",
      sidebarActive: "bg-black text-white font-medium rounded-lg px-3 shadow-md",
      sidebarSectionTitle: "text-gray-400 font-medium",
      searchInput: "bg-white border border-gray-200 focus:border-gray-400 focus:ring-0 text-gray-900 placeholder-gray-400 rounded-lg shadow-sm",

      modalOverlay: "bg-black/50 backdrop-blur-sm",
      modalContent: "bg-white rounded-2xl shadow-2xl border border-gray-200",
      modalInput: "bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent",
      modalChip: "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300",
      modalChipActive: "bg-black text-white border-black",
      modalBtnPrimary: "bg-black text-white hover:bg-gray-800 rounded-lg shadow-lg",
      modalBtnSecondary: "text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg",

      header: "bg-white/80 backdrop-blur-md text-gray-900 border-b border-gray-100 sticky top-0",

      scanlines: "hidden",

      msgUserContainer: "justify-end",
      msgUserBubble: "bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm px-4 md:px-5 py-2 md:py-3 max-w-[90%] md:max-w-[85%]",
      msgModelContainer: "justify-start",
      msgModelBubble: "bg-transparent text-gray-800 px-0 py-0 w-full",

      codeBlock: "border border-gray-200 bg-[#1e1e1e] rounded-xl my-4 overflow-hidden shadow-sm",
      codeHeader: "bg-[#2d2d2d] border-b border-[#3d3d3d] text-gray-300",

      inputContainer: "bg-gradient-to-t from-white via-white to-transparent pb-4 md:pb-6",
      inputWrapper: "bg-white shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_0_40px_-5px_rgba(0,0,0,0.15)] transition-shadow rounded-[24px] border border-gray-200 focus-within:border-gray-300",
      inputField: "text-gray-800 placeholder-gray-400",

      sendBtn: "text-gray-400 hover:text-gray-600 rounded-full",
      sendBtnActive: "bg-black text-white hover:bg-gray-800 hover:scale-105 shadow-lg transform transition-all duration-200",

      chip: "bg-white border border-gray-200 text-gray-700 shadow-sm rounded-md",
      iconBase: "text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors",
      micActive: "text-white bg-red-500 animate-pulse hover:bg-red-600 shadow-md rounded-full",

      fontBase: "font-sans",
      avatarUser: "bg-black text-white shadow-sm",
      avatarModel: "text-black",
      actionBtn: "text-gray-400 hover:text-black hover:bg-gray-100 p-1.5 rounded-md transition-all duration-200",
      progressBar: "bg-black"
    };
  }

  // Hacker Defaults
  return {
    app: "bg-[#050505] text-[#00ff41] font-mono selection:bg-[#00ff41] selection:text-black",

    sidebar: "bg-black border-r border-[#003b00]",
    sidebarButton: "border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-all duration-200 rounded-none px-4 shadow-[0_0_10px_rgba(0,255,65,0.2)]",
    sidebarText: "text-[#008f11] hover:text-[#00ff41] hover:bg-[#003b00] rounded-none px-3 border-l-2 border-transparent hover:border-[#00ff41]",
    sidebarActive: "bg-[#003b00] text-[#00ff41] font-bold border-l-2 border-[#00ff41] rounded-none px-3",
    sidebarSectionTitle: "text-[#008f11] font-bold tracking-widest",
    searchInput: "bg-black border border-[#003b00] text-[#00ff41] placeholder-[#003b00] focus:border-[#00ff41] focus:shadow-[0_0_15px_rgba(0,255,65,0.3)] rounded-none",

    modalOverlay: "bg-black/80 backdrop-blur-sm",
    modalContent: "bg-black border border-[#00ff41] shadow-[0_0_30px_rgba(0,255,65,0.3)]",
    modalInput: "bg-[#001a00] border border-[#003b00] text-[#00ff41] rounded-none focus:border-[#00ff41] focus:shadow-[0_0_10px_rgba(0,255,65,0.3)]",
    modalChip: "bg-black border border-[#003b00] text-[#008f11] hover:border-[#00ff41] hover:text-[#00ff41]",
    modalChipActive: "bg-[#00ff41] text-black font-bold border-[#00ff41]",
    modalBtnPrimary: "bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] hover:shadow-[0_0_15px_#00ff41] rounded-none",
    modalBtnSecondary: "text-[#008f11] hover:text-[#00ff41] hover:bg-[#001a00] rounded-none border border-transparent hover:border-[#003b00]",

    header: "bg-black/90 border-b border-[#003b00] backdrop-blur-sm text-[#00ff41] sticky top-0",

    scanlines: "block",

    msgUserContainer: "justify-end",
    msgUserBubble: "bg-[#001a00] border border-[#00ff41] text-[#00ff41] rounded-none px-3 md:px-4 py-2 max-w-[95%] md:max-w-[90%] shadow-[0_0_5px_rgba(0,255,65,0.2)]",
    msgModelContainer: "justify-start",
    msgModelBubble: "bg-transparent pl-0 w-full text-[#00ff41]",

    codeBlock: "border border-[#00ff41] bg-black rounded-none shadow-[0_0_10px_rgba(0,255,65,0.1)] my-4",
    codeHeader: "bg-[#001a00] border-b border-[#00ff41] text-[#00ff41]",

    inputContainer: "bg-black border-t border-[#003b00]",
    inputWrapper: "bg-black border border-[#003b00] focus-within:border-[#00ff41] focus-within:shadow-[0_0_20px_rgba(0,255,65,0.2)] transition-all rounded-none",
    inputField: "text-[#00ff41] placeholder-[#003b00] font-mono",

    sendBtn: "text-[#003b00] rounded-none",
    sendBtnActive: "bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] hover:shadow-[0_0_15px_#00ff41] rounded-none transition-all",

    chip: "bg-[#001a00] border border-[#00ff41] text-[#00ff41] rounded-none shadow-[0_0_5px_rgba(0,255,65,0.3)]",
    iconBase: "text-[#008f11] hover:text-[#00ff41] hover:bg-[#001a00] rounded-none transition-colors",
    micActive: "text-red-500 bg-[#001a00] border border-red-500 animate-pulse rounded-none shadow-[0_0_10px_red]",

    fontBase: "font-mono",
    avatarUser: "bg-[#003b00] text-[#00ff41] border border-[#00ff41]",
    avatarModel: "text-[#00ff41]",
    actionBtn: "text-[#008f11] hover:text-[#00ff41] hover:bg-[#003b00] p-1 rounded-none transition-colors border border-transparent hover:border-[#00ff41]",
    progressBar: "bg-[#00ff41]"
  };
};

// --- Icons ---
const IconPaperclip = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
);

const IconFile = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconSun = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const IconTerminal = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17l6-6-6-6m8 14h8" />
  </svg>
);

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconMic = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const IconSend = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const IconMillion = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 0L1.6 6v12L12 24l10.4-6V6L12 0zm0 2.3l8.4 4.9v9.6L12 21.7l-8.4-4.9V7.2L12 2.3z" opacity="0.4" />
    <path d="M16.5 8l-4.5 2.5L7.5 8 6 8.8l6 3.4 6-3.4L16.5 8z" />
    <path d="M12 12.5l-6 3.4v1.7l6-3.4 6 3.4v-1.7l-6-3.4z" />
  </svg>
);

const IconCopy = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const IconRefresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const IconThumbUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
  </svg>
);

const IconFolder = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconClearAll = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconArrowDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);



const IconGlobe = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    {active && <circle cx="12" cy="12" r="3" fill="currentColor" className="animate-pulse" />}
  </svg>
);

const IconImage = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

// --- Components ---

const CodeBlock = ({ code, language, theme, styles }: { code: string, language: string, theme: Theme, styles: any }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`${styles.codeBlock}`}>
      <div className={`flex justify-between items-center px-4 py-2 ${styles.codeHeader}`}>
        <span className="text-xs font-medium font-mono opacity-80">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors uppercase tracking-wider`}
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <IconCopy />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          background: 'transparent',
          fontSize: '0.9rem',
          lineHeight: '1.6',
        }}
        wrapLongLines={true}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

const FormattedText = ({ text, theme }: { text: string, theme: Theme }) => {
  const styles = getThemeStyles(theme);
  const parts = text.split(/(```[\s\S]*?```)/g);

  const processInlineMarkdown = (content: string, keyPrefix: number) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const key = `${keyPrefix}-${idx}`;
      if (line.startsWith('### ')) return <h3 key={key} className="text-lg font-bold mt-4 mb-2 text-inherit">{processBold(line.slice(4))}</h3>;
      if (line.startsWith('## ')) return <h2 key={key} className="text-xl font-bold mt-6 mb-3 text-inherit">{processBold(line.slice(3))}</h2>;
      if (line.startsWith('# ')) return <h1 key={key} className="text-2xl font-bold mt-6 mb-4 text-inherit">{processBold(line.slice(2))}</h1>;
      if (line.match(/^[-*] /)) return <li key={key} className="ml-5 list-disc pl-1 my-1 opacity-90">{processBold(line.slice(2))}</li>;
      if (line.match(/^\d+\. /)) return <li key={key} className="ml-5 list-decimal pl-1 my-1 opacity-90">{processBold(line.replace(/^\d+\. /, ''))}</li>;
      if (!line.trim()) return <div key={key} className="h-2"></div>;
      return <p key={key} className="mb-1 leading-relaxed">{processBold(line)}</p>;
    });
  };

  const processBold = (text: string) => {
    const chunks = text.split(/(\*\*.*?\*\*)/g);
    return chunks.map((chunk, i) => {
      if (chunk.startsWith('**') && chunk.endsWith('**')) {
        return <strong key={i} className="font-bold">{chunk.slice(2, -2)}</strong>;
      }
      const codeChunks = chunk.split(/(`.*?`)/g);
      if (codeChunks.length > 1) {
        return codeChunks.map((c, ci) => {
          if (c.startsWith('`') && c.endsWith('`')) {
            return <code key={`${i}-${ci}`} className={`px-1.5 py-0.5 rounded text-sm font-mono ${theme === 'modern' ? 'bg-gray-200 text-black' : 'bg-[#003b00] text-[#00ff41] border border-[#00ff41]'}`}>{c.slice(1, -1)}</code>;
          }
          return c;
        });
      }
      return chunk;
    });
  };

  return (
    <div className={`whitespace-pre-wrap ${theme === 'hacker' ? 'font-mono text-sm' : 'font-sans text-[15px]'}`}>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3).trim();
          const firstLineBreak = content.indexOf('\n');
          let code = content;
          let lang = 'text';
          if (firstLineBreak > -1) {
            const possibleLang = content.substring(0, firstLineBreak).trim();
            if (possibleLang && !possibleLang.includes(' ') && possibleLang.length < 20) {
              lang = possibleLang;
              code = content.substring(firstLineBreak + 1);
            }
          }
          return (
            <div key={index}>
              <CodeBlock code={code} language={lang} theme={theme} styles={styles} />
            </div>
          );
        }
        return <div key={index}>{processInlineMarkdown(part, index)}</div>;
      })}
    </div>
  );
};



const ProjectModal = ({
  isOpen,
  onClose,
  onCreate,
  theme
}: {
  isOpen: boolean,
  onClose: () => void,
  onCreate: (name: string, category: string) => void,
  theme: Theme
}) => {
  const styles = getThemeStyles(theme);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Writing');
  const categories = [
    { id: 'Investing', label: 'Investing', icon: '💲' },
    { id: 'Homework', label: 'Homework', icon: '📚' },
    { id: 'Writing', label: 'Writing', icon: '🖊️' },
    { id: 'Health', label: 'Health', icon: '☘️' },
    { id: 'Travel', label: 'Travel', icon: '✈️' },
    { id: 'Coding', label: 'Coding', icon: '💻' }
  ];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name, category);
    setName('');
    setCategory('Writing');
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center ${styles.modalOverlay}`}>
      <div className={`w-full max-w-lg p-6 relative animate-fade-in-up ${styles.modalContent}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${theme === 'hacker' ? 'tracking-widest' : 'tracking-tight'}`}>
            {theme === 'hacker' ? 'INIT_PROJECT_SEQUENCE' : 'Create Project'}
          </h2>
          <button onClick={onClose} className="opacity-50 hover:opacity-100 text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className={`text-xs uppercase font-semibold tracking-wider ${theme === 'hacker' ? 'opacity-70' : 'text-gray-500'}`}>
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-3 outline-none transition-all ${styles.modalInput}`}
              placeholder={theme === 'hacker' ? "ENTER_PROJECT_ID..." : "e.g. Copenhagen Trip"}
              autoFocus
            />
          </div>
          <div className="space-y-3">
            <label className={`text-xs uppercase font-semibold tracking-wider ${theme === 'hacker' ? 'opacity-70' : 'text-gray-500'}`}>
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 transition-all ${category === cat.id ? styles.modalChipActive : styles.modalChip
                    }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={`p-4 rounded text-sm leading-relaxed opacity-70 ${theme === 'hacker' ? 'bg-[#001a00] text-[#00ff41] border border-[#003b00]' : 'bg-gray-50 text-gray-600'}`}>
            <span className="font-bold mr-2">💡</span>
            Projects keep chats, files, and custom instructions in one place. Use them for ongoing work, or just to keep things tidy.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 font-medium transition-colors ${styles.modalBtnSecondary}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 font-medium transition-all shadow-md ${styles.modalBtnPrimary}`}
            >
              {theme === 'hacker' ? 'EXECUTE' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Sidebar = ({
  isOpen,
  toggle,
  theme,
  sessions,
  currentSessionId,
  activeProjectId,
  projects,
  user,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onSelectProject,
  onCreateProjectClick,
  onLogout
}: {
  isOpen: boolean,
  toggle: () => void,
  theme: Theme,
  sessions: ChatSession[],
  currentSessionId: string,
  activeProjectId: string | null,
  projects: Project[],
  user: User | null,
  onNewChat: () => void,
  onSelectSession: (id: string) => void,
  onDeleteSession: (e: React.MouseEvent, id: string) => void,
  onSelectProject: (id: string | null) => void,
  onCreateProjectClick: () => void,
  onLogout: () => void
}) => {
  const styles = getThemeStyles(theme);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter(session => {
    if (activeProjectId && session.projectId !== activeProjectId) return false;
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    const titleMatch = session.title.toLowerCase().includes(query);
    const msgMatch = session.messages.some(m => m.text.toLowerCase().includes(query));
    return titleMatch || msgMatch;
  });

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggle}
      />
      <aside className={`
        fixed md:relative z-50 h-full
        w-[280px] 
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0'}
        flex flex-col flex-shrink-0 overflow-hidden 
        ${styles.sidebar}
        ${!isOpen && 'md:border-r-0'}
      `}>
        <div className={`p-5 space-y-4 ${theme === 'modern' ? '' : 'border-b border-[#003b00]'}`}>
          <button
            onClick={() => { onNewChat(); if (window.innerWidth < 768) toggle(); }}
            className={`flex items-center justify-center gap-3 w-full py-3 transition-all ${styles.sidebarButton}`}
          >
            <span className="text-xl leading-none mb-0.5">+</span>
            <span className="text-sm font-semibold">{theme === 'hacker' ? 'INIT_SEQUENCE' : 'New Conversation'}</span>
          </button>
          <div className="relative group">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={theme === 'hacker' ? "GREP_LOGS..." : "Search history..."}
              className={`w-full px-4 py-2.5 text-sm transition-all outline-none ${styles.searchInput} ${theme === 'hacker' ? '' : 'pl-10'}`}
            />
            {theme === 'modern' && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors">
                <IconSearch />
              </div>
            )}
          </div>
        </div>

        <div className="px-3 pb-2">
          <div className={`flex items-center justify-between px-4 py-2 mb-1`}>
            <span className={`text-xs font-bold uppercase tracking-wider ${styles.sidebarSectionTitle}`}>Projects</span>
            <button onClick={onCreateProjectClick} className={`opacity-60 hover:opacity-100 transition-opacity ${theme === 'hacker' ? 'text-[#00ff41]' : 'text-gray-600'}`}>
              <IconPlus />
            </button>
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => onSelectProject(null)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-all ${activeProjectId === null ? styles.sidebarActive : styles.sidebarText}`}
            >
              <span className="opacity-70"><IconFolder /></span>
              <span>All Chats</span>
            </button>
            {projects.map(proj => (
              <button
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-all ${activeProjectId === proj.id ? styles.sidebarActive : styles.sidebarText}`}
              >
                <span>{proj.icon}</span>
                <span className="truncate">{proj.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar border-t ${theme === 'hacker' ? 'border-[#003b00]' : 'border-gray-100'}`}>
          <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider mb-1 ${styles.sidebarSectionTitle}`}>
            {activeProjectId ? projects.find(p => p.id === activeProjectId)?.name : (searchTerm ? 'Results' : 'History')}
          </div>
          {filteredSessions.length === 0 && (
            <div className={`px-4 py-8 text-center text-sm opacity-50 italic ${theme === 'hacker' ? 'text-[#008f11]' : 'text-gray-400'}`}>
              {activeProjectId ? 'No chats in project' : 'No logs found'}
            </div>
          )}
          {filteredSessions.map((session) => (
            <div key={session.id} className="relative group">
              <button
                onClick={() => { onSelectSession(session.id); if (window.innerWidth < 768) toggle(); }}
                className={`w-full text-left px-4 py-3 text-sm cursor-pointer truncate transition-all pr-8 ${currentSessionId === session.id ? styles.sidebarActive : styles.sidebarText
                  }`}
              >
                {session.title || (theme === 'hacker' ? `LOG_${session.id.substr(0, 4)}` : 'Untitled Chat')}
              </button>
              <button
                onClick={(e) => onDeleteSession(e, session.id)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'hacker' ? 'text-red-500 hover:bg-[#001a00]' : 'text-gray-400 hover:text-red-500 hover:bg-gray-200'} rounded z-10`}
                title="Delete"
              >
                <IconTrash />
              </button>
            </div>
          ))}
        </div>

        {theme === 'hacker' && (
          <div className="p-4 border-t border-[#003b00] text-[10px] flex justify-between items-center text-[#008f11]">
            <div className="flex items-center gap-2">
              <span>USER: {user?.email?.split('@')[0].toUpperCase()}</span>
            </div>
            <button onClick={onLogout} className="hover:text-red-500 transition-colors"><IconLogout /></button>
          </div>
        )}
        {theme === 'modern' && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors group">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${styles.avatarUser}`}>
                  {user?.email?.[0].toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-semibold text-sm text-gray-900 truncate w-24">{user?.email?.split('@')[0]}</span>
                  <span className="text-[11px] text-gray-500">Pro Plan</span>
                </div>
              </div>
              <button onClick={onLogout} className="text-gray-400 hover:text-red-500 p-2 rounded-md hover:bg-gray-200 transition-all" title="Sign Out">
                <IconLogout />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

const AuthPage = ({ theme }: { theme: Theme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const styles = getThemeStyles(theme);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      setShake(true);
      setLoading(false);
      setTimeout(() => setShake(false), 500);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message.replace('Firebase: ', ''));
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const isModern = theme === 'modern';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden ${isModern ? 'bg-gray-50 text-gray-900 font-sans' : 'bg-black text-[#00ff41] font-mono'}`}>
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{
        background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
        backgroundSize: '100% 4px'
      }}></div>

      <div className={`z-10 w-full max-w-md transition-transform duration-100 ${shake ? 'translate-x-2' : ''}`}>
        <div className={`${isModern ? 'bg-white shadow-2xl rounded-3xl border border-gray-100' : 'border border-[#00ff41] bg-[#050505] shadow-[0_0_20px_rgba(0,255,65,0.15)]'} p-8 relative`}>
          {!isModern && (
            <>
              <div className="absolute top-0 left-0 w-2 h-2 bg-[#00ff41]"></div>
              <div className="absolute top-0 right-0 w-2 h-2 bg-[#00ff41]"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#00ff41]"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#00ff41]"></div>
            </>
          )}

          <div className="flex flex-col items-center mb-8">
            <div className={`w-16 h-16 mb-4 ${isModern ? 'text-black' : 'text-[#00ff41] animate-pulse'}`}>
              <IconMillion />
            </div>
            <h1 className={`text-2xl font-bold ${isModern ? 'tracking-tight text-gray-900' : 'tracking-[0.2em]'} mb-2 text-center`}>MILLION AI</h1>
            <div className={`text-xs ${isModern ? 'text-gray-500 tracking-wide' : 'tracking-widest opacity-70'}`}>
              {isLogin ? (isModern ? 'Sign in to continue' : 'SECURE LOGIN // LEVEL 5') : (isModern ? 'Create your account' : 'NEW USER REGISTRATION')}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className={`text-xs uppercase tracking-wider block ${isModern ? 'text-gray-500 font-semibold' : 'opacity-80'}`}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full py-2 px-3 outline-none transition-colors ${isModern ? 'bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent' : 'bg-black border-b-2 border-[#003b00] focus:border-[#00ff41] text-[#00ff41] font-mono'}`}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className={`text-xs uppercase tracking-wider block ${isModern ? 'text-gray-500 font-semibold' : 'opacity-80'}`}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full py-2 px-3 outline-none transition-colors ${isModern ? 'bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent' : 'bg-black border-b-2 border-[#003b00] focus:border-[#00ff41] text-[#00ff41] font-mono'}`}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {!isLogin && (
              <div className="space-y-2 animate-fade-in-up">
                <label className={`text-xs uppercase tracking-wider block ${isModern ? 'text-gray-500 font-semibold' : 'opacity-80'}`}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full py-2 px-3 outline-none transition-colors ${isModern ? 'bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent' : 'bg-black border-b-2 border-[#003b00] focus:border-[#00ff41] text-[#00ff41] font-mono'}`}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {error && (
              <div className={`text-center text-xs font-bold py-2 px-2 ${isModern ? 'text-red-600 bg-red-50 rounded-lg' : 'text-red-500 borderQN border-red-500 bg-red-900/20'}`}>
                ERROR: {error.toUpperCase()}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 font-bold tracking-widest transition-all duration-200 shadow-lg mt-4 disabled:opacity-50 ${isModern ? 'bg-black text-white rounded-xl hover:bg-gray-800 hover:shadow-xl' : 'border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black'}`}
            >
              {loading ? 'PROCESSING...' : (isLogin ? 'AUTHENTICATE' : 'REGISTER')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className={`text-[11px] tracking-widest transition-all ${isModern ? 'text-gray-500 hover:text-black font-medium' : 'opacity-60 hover:opacity-100 hover:underline hover:text-[#00ff41]'}`}
            >
              {isLogin ? 'NO CREDENTIALS? CREATE ACCOUNT' : 'ALREADY HAVE AN ACCOUNT? LOGIN'}
            </button>
          </div>

          {!isModern && (
            <div className="mt-8 text-[10px] text-center opacity-40">
              SECURE CONNECTION ESTABLISHED<br />firebase-auth-v9.0.1
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [theme, setTheme] = useState<Theme>('modern'); // Changed default to modern
  const styles = getThemeStyles(theme);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Check if user is banned
        const bannedUsers = JSON.parse(localStorage.getItem('banned_users') || '[]');
        if (bannedUsers.includes(currentUser.email)) {
          alert('Your account has been banned. Please contact support.');
          signOut(auth);
          return;
        }

        // Track user in admin panel
        const adminUsers = JSON.parse(localStorage.getItem('admin_users') || '[]');
        const existingUserIndex = adminUsers.findIndex((u: any) => u.email === currentUser.email);
        
        if (existingUserIndex >= 0) {
          // Update existing user
          adminUsers[existingUserIndex].lastActive = Date.now();
        } else {
          // Add new user
          adminUsers.push({
            email: currentUser.email,
            uid: currentUser.uid,
            createdAt: Date.now(),
            lastActive: Date.now(),
            messageCount: 0,
            isBanned: false
          });
        }
        
        localStorage.setItem('admin_users', JSON.stringify(adminUsers));
      }
      
      setUser(currentUser);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Project State ---
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('million_ai_projects');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('million_ai_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return localStorage.getItem('million_ai_current_id') || '';
  });

  const getInitialMessages = (): Message[] => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) return session.messages;
    }
    return [];
  };

  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
  const [isListening, setIsListening] = useState(false);
  const [isDeepResearchEnabled, setIsDeepResearchEnabled] = useState(false);
  const [isImageGenMode, setIsImageGenMode] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('million_ai_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (!messages.length && !currentSessionId) return;

    let sessionId = currentSessionId;
    if (!sessionId && messages.length > 0) {
      sessionId = generateId();
      setCurrentSessionId(sessionId);
    }

    if (sessionId) {
      setSessions(prev => {
        const existingIdx = prev.findIndex(s => s.id === sessionId);
        let newSessions = [...prev];

        let title = 'New Chat';
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (firstUserMsg) {
          title = firstUserMsg.text.slice(0, 30);
        } else if (existingIdx >= 0) {
          title = prev[existingIdx].title;
        }

        const existingProject = existingIdx >= 0 ? prev[existingIdx].projectId : activeProjectId;

        const updatedSession: ChatSession = {
          id: sessionId,
          title,
          messages,
          updatedAt: Date.now(),
          projectId: existingProject || undefined
        };

        if (existingIdx >= 0) {
          newSessions[existingIdx] = updatedSession;
        } else {
          newSessions = [updatedSession, ...newSessions];
        }
        newSessions.sort((a, b) => b.updatedAt - a.updatedAt);
        localStorage.setItem('million_ai_sessions', JSON.stringify(newSessions));
        return newSessions;
      });
      localStorage.setItem('million_ai_current_id', sessionId);
    }
  }, [messages, currentSessionId, activeProjectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  // Scroll detection for scroll-to-bottom button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);



  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("Voice input not supported.");
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };



  const handleNewChat = () => {
    const newId = generateId();
    setCurrentSessionId(newId);
    setMessages([]);
    setAttachments([]);
    setInput('');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleCreateProject = (name: string, category: string) => {
    const icons: { [key: string]: string } = {
      'Investing': '💲', 'Homework': '📚', 'Writing': '🖊️',
      'Health': '☘️', 'Travel': '✈️', 'Coding': '💻'
    };
    const newProject: Project = {
      id: generateId(),
      name,
      category,
      icon: icons[category] || '📁'
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id); // Auto switch to new project
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setAttachments([]);
      setInput('');
      if (window.innerWidth < 768) setSidebarOpen(false);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmMsg = theme === 'hacker' ? 'EXECUTE DELETE_SEQUENCE?' : 'Delete this conversation?';
    if (window.confirm(confirmMsg)) {
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      localStorage.setItem('million_ai_sessions', JSON.stringify(newSessions));

      if (currentSessionId === id) {
        if (newSessions.length > 0) {
          const nextInProject = newSessions.find(s => activeProjectId ? s.projectId === activeProjectId : true);
          if (nextInProject) {
            setCurrentSessionId(nextInProject.id);
            setMessages(nextInProject.messages);
          } else {
            handleNewChat();
          }
        } else {
          handleNewChat();
        }
      }
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'hacker' ? 'modern' : 'hacker');

  const processFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const id = generateId();
      
      // Enhanced file type detection
      const isText = file.type.startsWith('text/') ||
        /\.(js|ts|tsx|jsx|py|java|c|cpp|h|json|md|css|html|xml|sql|txt|env|gitignore|yaml|yml|toml|ini|conf|sh|bash|ps1|bat|cmd)$/i.test(file.name);
      
      const isDocument = /\.(doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp|rtf)$/i.test(file.name) ||
        file.type.includes('word') || 
        file.type.includes('excel') || 
        file.type.includes('spreadsheet') ||
        file.type.includes('presentation');

      let type: Attachment['type'] = 'text';
      if (!isText && !isDocument) {
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type === 'application/pdf') type = 'pdf';
      } else if (isDocument) {
        type = 'pdf'; // Treat documents as PDF type for display
      } else {
        type = 'code';
      }

      setAttachments(prev => [...prev, {
        id,
        name: file.name,
        type,
        mimeType: file.type || 'text/plain',
        data: '',
        isLoading: true,
        progress: 0
      }]);

      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, progress } : a));
        }
      };

      reader.onload = (e) => {
        const data = e.target?.result as string;
        setAttachments(prev => prev.map(a => a.id === id ? { ...a, data, isLoading: false, progress: 100 } : a));
      };

      reader.onerror = () => {
        setAttachments(prev => prev.filter(a => a.id !== id));
      };

      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const isUploading = attachments.some(a => a.isLoading);
    if ((!input.trim() && attachments.length === 0) || isLoading || isUploading) return;

    // Handle Image Generation Mode
    if (isImageGenMode) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: input,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMsg]);
      const prompt = input;
      setInput('');
      setIsLoading(true);

      try {
        const encodedPrompt = encodeURIComponent(prompt);
        const response = await fetch(`https://imagegenerator.alphaapi.workers.dev/alphaapi/imagegenv2/?prompt=${encodedPrompt}`);
        const data = await response.json();

        if (data.success && data.url) {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: `Generated image for: "${prompt}"`,
            attachments: [{
              id: generateId(),
              name: 'generated-image.jpg',
              type: 'image',
              mimeType: 'image/jpeg',
              data: data.url,
              isLoading: false
            }],
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, aiMsg]);
        } else {
          setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'model', 
            text: "Error: Failed to generate image. Please try again.", 
            timestamp: Date.now() 
          }]);
        }
      } catch (error) {
        console.error('Image generation error:', error);
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'model', 
          text: "Error: Failed to generate image. Please check your connection and try again.", 
          timestamp: Date.now() 
        }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!process.env.API_KEY) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Error: API Key is missing. Please set the API_KEY environment variable.", timestamp: Date.now() }]);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      attachments: [...attachments],
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    const currentAttachments = [...attachments];
    const currentInput = input;

    // Track message count for admin panel
    if (user) {
      const adminUsers = JSON.parse(localStorage.getItem('admin_users') || '[]');
      const userIndex = adminUsers.findIndex((u: any) => u.email === user.email);
      if (userIndex >= 0) {
        adminUsers[userIndex].messageCount = (adminUsers[userIndex].messageCount || 0) + 1;
        adminUsers[userIndex].lastActive = Date.now();
        localStorage.setItem('admin_users', JSON.stringify(adminUsers));
      }
    }

    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      // Get API key from localStorage (set by admin) or fallback to env
      const apiKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
      
      if (!apiKey) {
        throw new Error('API key not configured. Please contact admin.');
      }
      
      const ai = new GoogleGenAI({ apiKey });

      const historyContents: any[] = [];

      messages.forEach(msg => {
        const parts: any[] = [];

        if (msg.attachments) {
          msg.attachments.forEach(att => {
            if (att.type === 'image') {
              const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
              if (base64Data) {
                parts.push({ inlineData: { mimeType: att.mimeType, data: base64Data } });
              }
            } else {
              parts.push({ text: `\n\nFile: ${att.name}\n${att.data}\n\n` });
            }
          });
        }

        if (msg.text && !msg.text.startsWith('Error:')) {
          parts.push({ text: msg.text });
        }

        if (parts.length > 0) {
          historyContents.push({
            role: msg.role,
            parts: parts
          });
        }
      });
      const currentParts: any[] = [];
      for (const att of currentAttachments) {
        if (att.type === 'code' || att.type === 'text') {
          currentParts.push({ text: `\n\nFile: ${att.name}\n${att.data}\n\n` });
        } else {
          const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
          currentParts.push({
            inlineData: { mimeType: att.mimeType, data: base64Data }
          });
        }
      }
      if (currentInput) currentParts.push({ text: currentInput });

      historyContents.push({
        role: 'user',
        parts: currentParts
      });

      // Configure tools for deep research
      const tools = isDeepResearchEnabled ? [{ googleSearch: {} }] : undefined;
      
      // Add research instruction when deep research is enabled
      let systemInstruction = theme === 'hacker'
        ? "You are MILLION AI, an elite coding assistant provided by Million Corp. Output valid Markdown. Be concise."
        : "You are MILLION AI, a helpful and expert AI assistant. Use Markdown formatted text.";
      
      if (isDeepResearchEnabled) {
        systemInstruction += "\n\nIMPORTANT: You have access to Google Search. When answering questions that require current information, recent events, or factual data, use the search tool to find accurate and up-to-date information. Always cite your sources and provide comprehensive answers based on the search results.";
      }

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: historyContents,
        config: {
          systemInstruction,
          tools
        }
      });

      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { 
        id: aiMsgId, 
        role: 'model', 
        text: '', 
        isSearching: isDeepResearchEnabled,
        timestamp: Date.now() 
      }]);

      let fullText = '';
      let groundingMetadata: any = null;

      for await (const chunk of responseStream) {
        console.log('Chunk:', chunk);
        const chunkText = chunk.text;
        
        // Extract grounding metadata from various possible locations
        if (chunk.candidates?.[0]?.groundingMetadata) {
          console.log('Grounding Metadata Found:', chunk.candidates[0].groundingMetadata);
          groundingMetadata = chunk.candidates[0].groundingMetadata;
        }
        
        // Also check for grounding chunks in search results
        if ((chunk.candidates?.[0] as any)?.groundingChunks) {
          if (!groundingMetadata) groundingMetadata = {};
          groundingMetadata.groundingChunks = (chunk.candidates[0] as any).groundingChunks;
        }
        
        if (!chunkText && !groundingMetadata) continue;

        let processedChunk = chunkText || '';
        fullText += processedChunk;

        setMessages(prev => prev.map(m => m.id === aiMsgId ? {
          ...m,
          text: fullText,
          // Turn off searching once we have text or grounding metadata
          isSearching: isDeepResearchEnabled && !fullText && !groundingMetadata,
          groundingMetadata: groundingMetadata
        } : m));
      }

      // Final cleanup to ensure searching stops
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isSearching: false } : m));

    } catch (error) {
      console.error(error);
      let errorMessage = "Failed to generate response.";
      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes("Unexpected token")) {
          errorMessage = "Error: The API response was invalid. Check API Key.";
        }
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: errorMessage, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (text: string) => navigator.clipboard.writeText(text);
  
  const downloadImage = async (imageUrl: string, fileName: string) => {
    try {
      // For external URLs, we need to fetch with CORS
      const response = await fetch(imageUrl, { mode: 'cors' });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'generated-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: try direct download or open in new tab
      try {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = fileName || 'generated-image.jpg';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        window.open(imageUrl, '_blank');
      }
    }
  };
  
  const handleLogout = async () => { await signOut(auth); };

  const handleClearChat = () => {
    const confirmMsg = theme === 'hacker' 
      ? 'EXECUTE CLEAR_SEQUENCE? ALL MESSAGES WILL BE DELETED.' 
      : 'Clear all messages in this conversation?';
    
    if (window.confirm(confirmMsg)) {
      setMessages([]);
      setAttachments([]);
      setInput('');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Show loading screen while checking auth status
  if (isAuthChecking) {
    return <div className={`min-h-screen flex items-center justify-center font-mono ${theme === 'modern' ? 'bg-white text-black' : 'bg-black text-[#00ff41]'}`}>INITIALIZING...</div>;
  }

  if (!user) {
    return <AuthPage theme={theme} />;
  }

  const isUploading = attachments.some(a => a.isLoading);

  return (
    <div
      className={`flex h-screen w-full text-base overflow-hidden transition-colors duration-500 ${styles.app}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`scanlines pointer-events-none fixed inset-0 z-50 opacity-20 ${styles.scanlines}`}></div>

      <button
        className={`absolute top-3 left-3 z-40 md:hidden p-2 rounded ${theme === 'modern' ? 'bg-white/80 backdrop-blur shadow-sm' : 'text-[#00ff41] border border-[#00ff41] bg-black'} ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        onClick={() => setSidebarOpen(true)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      <Sidebar
        isOpen={sidebarOpen}
        toggle={() => setSidebarOpen(!sidebarOpen)}
        theme={theme}
        sessions={sessions}
        currentSessionId={currentSessionId}
        activeProjectId={activeProjectId}
        projects={projects}
        user={user}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onSelectProject={setActiveProjectId}
        onCreateProjectClick={() => setIsProjectModalOpen(true)}
        onLogout={handleLogout}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreate={handleCreateProject}
        theme={theme}
      />

      <div className={`flex-1 flex flex-col relative min-w-0 ${theme === 'modern' ? 'bg-white' : 'bg-[#050505]'}`}>
        {/* Header */}
        <header className={`px-4 md:px-6 py-4 flex justify-between items-center z-20 ${styles.header}`}>
          <div className="ml-10 md:ml-0 flex items-center gap-2 select-none cursor-pointer" onClick={toggleTheme}>
            <div className={`flex items-center justify-center ${theme === 'modern' ? 'text-black' : 'text-[#00ff41]'}`}>
              <div className="w-6 h-6 mr-2">
                <IconMillion />
              </div>
              {theme === 'modern' ? <span className="text-xl font-bold tracking-tight">MILLION<span className="font-light">AI</span></span> : <span className="text-xl tracking-widest font-bold">MILLION_AI_TERM</span>}
              {theme === 'modern' && <span className="text-xs bg-black text-white px-1.5 py-0.5 rounded ml-2 font-medium">PRO</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className={`p-2.5 rounded-full transition-all ${theme === 'hacker' ? 'hover:bg-[#003b00] text-[#00ff41] hover:shadow-[0_0_10px_#00ff41]' : 'hover:bg-gray-100 text-gray-600'}`}
                title="Clear Chat"
              >
                <IconClearAll />
              </button>
            )}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-full transition-all ${theme === 'hacker' ? 'hover:bg-[#003b00] text-[#00ff41] hover:shadow-[0_0_10px_#00ff41]' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Toggle Theme"
            >
              {theme === 'hacker' ? <IconSun /> : <IconTerminal />}
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth" ref={chatContainerRef}>
          <div className="max-w-[850px] mx-auto px-4 md:px-6 pb-6 pt-8 flex flex-col gap-8">

            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center mt-24 opacity-40 select-none animate-fade-in-up">
                <div className={`w-20 h-20 mb-6 rounded-2xl flex items-center justify-center ${theme === 'hacker' ? 'bg-[#001a00] text-[#00ff41] border border-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.2)]' : 'bg-gray-100 text-black'}`}>
                  <div className="w-10 h-10">
                    <IconMillion />
                  </div>
                </div>
                <h2 className="text-3xl font-semibold mb-3 tracking-tight text-center">{theme === 'hacker' ? 'SYSTEM READY' : 'Million AI'}</h2>
                <p className="text-sm text-center">
                  {activeProjectId
                    ? `Project: ${projects.find(p => p.id === activeProjectId)?.name || 'Unknown'}`
                    : (theme === 'hacker' ? 'AWAITING INPUT...' : 'How can I help you today?')}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex w-full group ${msg.role === 'user' ? styles.msgUserContainer : styles.msgModelContainer}`}>

                {msg.role === 'model' && (
                  <div className={`hidden md:flex flex-shrink-0 mr-4 mt-1 w-8 h-8 rounded-full items-center justify-center ${styles.avatarModel} ${theme === 'hacker' ? 'border border-[#00ff41] bg-[#001a00]' : ''}`}>
                    <div className="w-6 h-6"><IconMillion /></div>
                  </div>
                )}

                <div className={`relative flex flex-col max-w-full ${msg.role === 'user' ? 'items-end' : 'items-start w-full min-w-0'}`}>

                  {msg.role === 'model' && theme === 'modern' && (
                    <span className="text-sm font-semibold mb-1 ml-1 text-gray-900">Million AI</span>
                  )}
                  {msg.role === 'model' && theme === 'hacker' && (
                    <span className="text-xs font-bold mb-1 text-[#008f11]">CORE_AI</span>
                  )}

                  <div className={`${msg.role === 'user' ? styles.msgUserBubble : styles.msgModelBubble}`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {msg.attachments.map((att, idx) => (
                          att.type === 'image' ? (
                            <div key={idx} className="relative group">
                              <img src={att.data} className={`max-w-xs max-h-64 object-cover ${theme === 'modern' ? 'rounded-xl shadow-sm' : 'border border-[#00ff41]'}`} />
                              <button
                                onClick={() => downloadImage(att.data, att.name)}
                                className={`absolute top-2 right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${theme === 'modern' ? 'bg-white/90 hover:bg-white text-gray-700 shadow-lg' : 'bg-black/80 hover:bg-[#003b00] text-[#00ff41] border border-[#00ff41]'}`}
                                title="Download Image"
                              >
                                <IconDownload />
                              </button>
                            </div>
                          ) : (
                            <div key={idx} className={`flex items-center gap-2 p-2 ${theme === 'modern' ? 'bg-white rounded-lg shadow-sm' : 'bg-[#001a00] border border-[#00ff41]'}`}>
                              <IconFile /> <span className="text-xs font-medium truncate max-w-[150px]">{att.name}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    {msg.isSearching && (
                      <div className={`mb-4 rounded-lg overflow-hidden border ${theme === 'modern' ? 'bg-blue-50 border-blue-200' : 'bg-[#001a00] border-[#003b00]'}`}>
                        <div className={`px-4 py-3 text-sm flex items-center gap-3 ${theme === 'modern' ? 'text-blue-600' : 'text-[#00ff41]'}`}>
                          <div className="animate-spin">
                            <IconGlobe active={true} />
                          </div>
                          <span className="font-medium">
                            {theme === 'hacker' ? 'SEARCHING_WEB...' : 'Searching the web...'}
                          </span>
                        </div>
                      </div>
                    )}
                    <FormattedText text={msg.text} theme={theme} />

                    {msg.groundingMetadata?.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                      <div className={`mt-4 pt-3 border-t ${theme === 'modern' ? 'border-gray-200' : 'border-[#003b00]'}`}>
                        <div className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${theme === 'modern' ? 'text-gray-600' : 'text-[#008f11]'}`}>
                          <IconGlobe active={true} />
                          <span>{theme === 'hacker' ? 'SEARCH_RESULTS' : 'Sources'}</span>
                          <span className={`text-[10px] font-normal ${theme === 'modern' ? 'text-gray-400' : 'opacity-60'}`}>
                            ({msg.groundingMetadata.groundingChunks.filter((c: any) => c.web?.uri).length})
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => (
                            chunk.web?.uri && (
                              <a
                                key={idx}
                                href={chunk.web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`group/link text-xs px-3 py-2 rounded flex items-start gap-2 transition-all ${theme === 'modern'
                                  ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                                  : 'bg-[#001a00] border border-[#003b00] hover:border-[#00ff41] hover:shadow-[0_0_10px_rgba(0,255,65,0.1)]'
                                  }`}
                              >
                                <span className={`flex-shrink-0 mt-0.5 ${theme === 'modern' ? 'text-blue-600' : 'text-[#00ff41]'}`}>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-medium truncate ${theme === 'modern' ? 'text-blue-600 group-hover/link:text-blue-700' : 'text-[#00ff41]'}`}>
                                    {chunk.web.title || 'Untitled'}
                                  </div>
                                  <div className={`text-[10px] truncate mt-0.5 ${theme === 'modern' ? 'text-gray-500' : 'text-[#008f11] opacity-70'}`}>
                                    {new URL(chunk.web.uri).hostname}
                                  </div>
                                </div>
                              </a>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'model' && !isLoading && msg.text && !msg.text.startsWith('Error:') && (
                    <div className={`flex items-center gap-1 mt-2 ml-0 select-none opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${theme === 'hacker' ? 'text-[#008f11]' : 'text-gray-400'}`}>
                      <button onClick={() => copyMessage(msg.text)} className={styles.actionBtn} title="Copy">
                        <IconCopy />
                      </button>
                      <button className={styles.actionBtn} title="Good">
                        <IconThumbUp />
                      </button>
                      <button className={styles.actionBtn} title="Regenerate">
                        <IconRefresh />
                      </button>
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <div className={`flex items-center gap-1 mt-1 text-[10px] opacity-50 ${msg.role === 'user' ? 'ml-auto' : 'ml-0'}`}>
                    <IconClock />
                    <span>{formatTimestamp(msg.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex w-full justify-start animate-pulse">
                <div className={`flex-shrink-0 mr-4 mt-1 w-8 h-8 rounded-full flex items-center justify-center ${styles.avatarModel}`}>
                  <div className="w-5 h-5"><IconMillion /></div>
                </div>
                <div className="flex items-center gap-1 mt-3">
                  <span className={`w-2 h-2 rounded-full animate-bounce ${theme === 'modern' ? 'bg-black' : 'bg-[#00ff41]'}`}></span>
                  <span className={`w-2 h-2 rounded-full animate-bounce delay-75 ${theme === 'modern' ? 'bg-black' : 'bg-[#00ff41]'}`}></span>
                  <span className={`w-2 h-2 rounded-full animate-bounce delay-150 ${theme === 'modern' ? 'bg-black' : 'bg-[#00ff41]'}`}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className={`fixed bottom-24 right-8 p-3 rounded-full shadow-lg transition-all duration-300 z-40 hover:scale-110 ${
              theme === 'modern' 
                ? 'bg-black text-white hover:bg-gray-800' 
                : 'bg-[#00ff41] text-black hover:bg-[#00cc33] border-2 border-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.3)]'
            }`}
            title="Scroll to bottom"
          >
            <IconArrowDown />
          </button>
        )}

        {/* Input Area */}
        <footer className={`px-4 md:px-6 z-30 ${styles.inputContainer}`}>
          <div className="max-w-[850px] mx-auto">
            {isImageGenMode && (
              <div className={`mb-3 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-medium ${theme === 'modern' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-[#001a00] text-[#00ff41] border border-[#003b00]'}`}>
                <IconImage active={true} />
                <span>{theme === 'hacker' ? 'IMAGE_GEN_MODE_ACTIVE' : 'Image Generation Mode Active'}</span>
                <button 
                  onClick={() => setIsImageGenMode(false)} 
                  className={`ml-auto opacity-60 hover:opacity-100 transition-opacity ${theme === 'modern' ? 'text-purple-700' : 'text-[#00ff41]'}`}
                >
                  ✕
                </button>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 pl-2 animate-in slide-in-from-bottom-2 fade-in">
                {attachments.map(att => (
                  <div key={att.id} className="relative group">
                    {/* Main attachment chip */}
                    <div className={`relative flex items-center gap-2 pl-2 pr-8 py-1.5 rounded-lg text-xs font-medium ${styles.chip} overflow-hidden`}>
                      {att.isLoading && (
                        <div className={`absolute bottom-0 left-0 h-1 transition-all duration-200 ${styles.progressBar}`} style={{ width: `${att.progress || 0}%` }}></div>
                      )}
                      {att.isLoading ? (
                        <div className="w-5 h-5 flex items-center justify-center">
                          <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${theme === 'hacker' ? 'border-[#00ff41]' : 'border-gray-500'}`}></div>
                        </div>
                      ) : (
                        att.type === 'image' ? <img src={att.data} className="w-5 h-5 rounded object-cover" /> : <IconFile />
                      )}
                      <span className="max-w-[120px] truncate">{att.name}</span>
                      <button onClick={() => removeAttachment(att.id)} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded-full">
                        <IconTrash />
                      </button>
                    </div>
                    
                    {/* Image preview on hover */}
                    {att.type === 'image' && !att.isLoading && (
                      <div className={`absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 ${theme === 'modern' ? 'shadow-2xl' : 'shadow-[0_0_20px_rgba(0,255,65,0.3)]'}`}>
                        <img 
                          src={att.data} 
                          className={`max-w-[200px] max-h-[200px] object-contain ${theme === 'modern' ? 'rounded-lg border-2 border-gray-200' : 'border-2 border-[#00ff41]'}`}
                          alt="Preview"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className={`relative flex items-center gap-1 md:gap-2 p-1 md:p-2 pl-2 md:pl-3 ${styles.inputWrapper}`}
            >
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect} 
                accept="image/*,application/pdf,.txt,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.h,.json,.md,.css,.html,.xml,.sql,.yaml,.yml,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.rtf" 
              />

              <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2 md:p-2.5 flex-shrink-0 ${styles.iconBase}`} title="Attach">
                <IconPaperclip />
              </button>

              <button type="button" onClick={toggleListening} className={`p-2 md:p-2.5 flex-shrink-0 transition-all ${isListening ? styles.micActive : styles.iconBase}`} title="Voice">
                <IconMic active={isListening} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsImageGenMode(!isImageGenMode);
                  if (!isImageGenMode) setIsDeepResearchEnabled(false);
                }}
                className={`p-2 md:p-2.5 flex-shrink-0 transition-all ${isImageGenMode ? (theme === 'modern' ? 'text-purple-600 bg-purple-50' : 'text-[#00ff41] bg-[#003b00]') : styles.iconBase}`}
                title="Image Generation"
              >
                <IconImage active={isImageGenMode} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDeepResearchEnabled(!isDeepResearchEnabled);
                  if (!isDeepResearchEnabled) setIsImageGenMode(false);
                }}
                className={`p-2 md:p-2.5 flex-shrink-0 transition-all ${isDeepResearchEnabled ? (theme === 'modern' ? 'text-blue-600 bg-blue-50' : 'text-[#00ff41] bg-[#003b00]') : styles.iconBase}`}
                title="Deep Research (Web Search)"
              >
                <IconGlobe active={isDeepResearchEnabled} />
              </button>

              <input
                className={`flex-1 bg-transparent border-none focus:ring-0 p-2 md:p-2.5 text-sm md:text-[16px] ${styles.inputField} outline-none min-w-0`}
                placeholder={
                  isListening ? "Listening..." : 
                  isImageGenMode ? (theme === 'hacker' ? "DESCRIBE_IMAGE..." : "Describe the image you want to generate...") :
                  (theme === 'hacker' ? "ENTER_COMMAND..." : "Ask Million AI...")
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
              />

              <button type="submit" disabled={(!input.trim() && attachments.length === 0) || isLoading || isUploading} className={`p-2.5 md:p-3 rounded-full flex-shrink-0 flex items-center justify-center ${(!input.trim() && attachments.length === 0) || isLoading || isUploading ? 'opacity-30 cursor-not-allowed' : styles.sendBtnActive} ${styles.sendBtn} transition-all duration-300 ease-out`}>
                <IconSend />
              </button>
            </form>
            <div className={`text-[10px] md:text-[11px] text-center mt-3 opacity-70 ${theme === 'hacker' ? 'text-[#008f11]' : 'text-gray-400'}`}>
              {theme === 'hacker' ? 'MILLION_AI_V4 // ENCRYPTED_CONNECTION' : 'Million AI can make mistakes. Please double-check important information.'}
            </div>
          </div>
        </footer>
      </div >
    </div >
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);