
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Plus, 
  Paperclip, 
  Trash2, 
  Settings, 
  History, 
  HardHat, 
  ChevronRight,
  Calculator,
  X,
  FileUp,
  Files,
  Save,
  Database,
  LayoutGrid
} from 'lucide-react';
import { db } from './db';
import { Message, Project, Session, Attachment, StoredBlob } from './types';
import { gemini } from './geminiService';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { GroundingSection } from './components/GroundingSection';
import { BudgetTable } from './components/BudgetTable';
import { FilePreview } from './components/FilePreview';
import { PersistenceIndicator } from './components/PersistenceIndicator';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'volatile' | 'error'>('synced');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadSessions(activeProjectId);
    } else {
      setSessions([]);
      setActiveSessionId(null);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const loadProjects = async () => {
    const allProjects = await db.projects.orderBy('lastMessageAt').reverse().toArray();
    setProjects(allProjects);
    if (allProjects.length > 0 && !activeProjectId) {
      setActiveProjectId(allProjects[0].id!);
    }
  };

  const loadSessions = async (projectId: number) => {
    const projSessions = await db.sessions
      .where('projectId')
      .equals(projectId)
      .sortBy('lastActiveAt');
    const reversed = projSessions.reverse();
    setSessions(reversed);
    
    if (reversed.length > 0 && !activeSessionId) {
      setActiveSessionId(reversed[0].id!);
    } else if (reversed.length === 0) {
      createSession(projectId);
    }
  };

  const loadMessages = async (sessionId: number) => {
    const chatMessages = await db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('timestamp');
    setMessages(chatMessages);
    setSyncStatus(chatMessages.length > 0 ? 'synced' : 'volatile');
  };

  const createProject = async (nameOverride?: string) => {
    setSyncStatus('syncing');
    try {
      const id = await db.projects.add({
        name: nameOverride || `Projeto ${new Date().toLocaleDateString('pt-BR')}`,
        createdAt: Date.now(),
        lastMessageAt: Date.now()
      });
      await loadProjects();
      setActiveProjectId(id as number);
      await createSession(id as number);
      setSyncStatus('synced');
      return id as number;
    } catch (e) {
      setSyncStatus('error');
      return null;
    }
  };

  const createSession = async (projectId: number, name?: string) => {
    setSyncStatus('syncing');
    try {
      const id = await db.sessions.add({
        projectId,
        name: name || `Sessão ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        isCommitted: false
      });
      await loadSessions(projectId);
      setActiveSessionId(id as number);
      setSyncStatus('volatile');
      return id as number;
    } catch (e) {
      setSyncStatus('error');
      return null;
    }
  };

  const commitSession = async () => {
    if (!activeSessionId) return;
    setSyncStatus('syncing');
    try {
      await db.sessions.update(activeSessionId, { isCommitted: true });
      setSyncStatus('synced');
      await loadSessions(activeProjectId!);
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const deleteProject = async (id: number) => {
    if (!confirm("Confirmar deleção de projeto e todos os arquivos L2?")) return;
    setSyncStatus('syncing');
    await db.projects.delete(id);
    await db.sessions.where('projectId').equals(id).delete();
    await db.messages.where('projectId').equals(id).delete();
    await db.blobs.where('projectId').equals(id).delete();
    if (activeProjectId === id) setActiveProjectId(null);
    loadProjects();
    setSyncStatus('synced');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Fix: Explicitly casting to File[] to ensure the 'file' object properties like 'name', 'type', and 'size' are correctly typed and recognized by TypeScript.
    (Array.from(files) as File[]).forEach(file => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const data = ev.target?.result as string;
        const newAttachment: Attachment = {
          name: file.name,
          type: file.type || 'application/octet-stream',
          data,
          size: file.size
        };
        setAttachments(prev => [...prev, newAttachment]);
        
        if (activeProjectId && activeSessionId) {
          setSyncStatus('syncing');
          await db.blobs.add({
            projectId: activeProjectId,
            sessionId: activeSessionId,
            name: file.name,
            type: file.type,
            data,
            timestamp: Date.now()
          });
          setSyncStatus('volatile');
        }
      };
      // Fix: Passing the file object as a Blob, which is guaranteed since file is typed as File.
      reader.readAsDataURL(file);
    });
  };

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && attachments.length === 0) || isLoading) return;

    setSyncStatus('syncing');
    let currentProjectId = activeProjectId;
    if (!currentProjectId) {
      currentProjectId = await createProject(trimmedInput.substring(0, 30) || "Cotação Automática");
    }

    let currentSessionId = activeSessionId;
    if (!currentSessionId && currentProjectId) {
      currentSessionId = await createSession(currentProjectId);
    }

    if (!currentProjectId || !currentSessionId) return;

    const userMsg: Message = {
      projectId: currentProjectId,
      sessionId: currentSessionId,
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = trimmedInput;
    const currentAttachments = [...attachments];
    
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      await db.messages.add(userMsg);
      await db.projects.update(currentProjectId, { lastMessageAt: Date.now() });
      await db.sessions.update(currentSessionId, { lastActiveAt: Date.now() });

      const response = await gemini.chat(currentInput, messages, currentAttachments);

      const aiMsg: Message = {
        projectId: currentProjectId,
        sessionId: currentSessionId,
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        metadata: response.metadata
      };

      await db.messages.add(aiMsg);
      setMessages(prev => [...prev, aiMsg]);
      setSyncStatus('volatile');
    } catch (error) {
      setSyncStatus('error');
      console.error(error);
      const errMsg: Message = {
        projectId: currentProjectId,
        sessionId: currentSessionId,
        role: 'assistant',
        content: "Interrupção detectada no motor Optimus. A persistência L2 está íntegra, mas a conexão com o núcleo AI falhou.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      loadProjects();
    }
  };

  const renderMessageContent = (msg: Message) => {
    const { content, attachments } = msg;
    
    return (
      <div className="flex flex-col gap-4">
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-black/20 rounded-xl border border-white/5">
            {attachments.map((att, idx) => (
              <FilePreview key={idx} file={att} isCompact={true} />
            ))}
          </div>
        )}
        
        {(() => {
          if (content.trim().startsWith('{') || content.trim().includes('```json')) {
            const jsonMatch = content.match(/(\{.*\}|\[.*\])/s);
            if (jsonMatch) {
              return (
                <>
                  <BudgetTable jsonString={jsonMatch[0]} />
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">{content.replace(jsonMatch[0], '')}</div>
                </>
              );
            }
          }
          return <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{content}</p>;
        })()}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#020617] text-slate-100 selection:bg-blue-500/30">
      {/* VFS Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-[#0f172a] border-r border-slate-800 transition-all duration-500 ease-in-out flex flex-col overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20`}>
        <div className="p-6 flex items-center gap-4 border-b border-slate-800/50 bg-[#1e293b]/20">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] ring-1 ring-white/10">
            <HardHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tighter leading-tight uppercase">Engenheiro Pro</h1>
            <p className="text-[9px] text-blue-400 font-mono font-bold uppercase tracking-widest">Optimus VFS 4.5</p>
          </div>
        </div>

        <button 
          onClick={() => createProject()}
          className="m-5 flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/10 active:scale-95 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" /> Iniciar Projeto
        </button>

        <div className="flex-1 overflow-y-auto px-4 space-y-6 py-4 scrollbar-hide">
          <div className="space-y-3">
             <h3 className="px-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <LayoutGrid className="w-3 h-3" /> Repositórios de Obra
            </h3>
            {projects.map(project => (
              <div key={project.id} className="space-y-1.5 animate-in fade-in duration-500">
                <div 
                  onClick={() => setActiveProjectId(project.id!)}
                  className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-300 border ${activeProjectId === project.id ? 'bg-blue-600/15 border-blue-500/40 shadow-lg shadow-blue-500/5' : 'hover:bg-slate-800/40 border-transparent text-slate-500'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Database className={`w-4 h-4 flex-shrink-0 ${activeProjectId === project.id ? 'text-blue-400' : 'text-slate-700'}`} />
                    <span className={`text-[11px] truncate font-bold uppercase tracking-tight ${activeProjectId === project.id ? 'text-blue-100' : 'text-slate-500'}`}>
                      {project.name}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteProject(project.id!); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 transition-all hover:bg-red-400/10 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Nested Sessions */}
                {activeProjectId === project.id && (
                  <div className="ml-8 pl-3 border-l-2 border-slate-800/50 space-y-1.5 animate-in slide-in-from-left-4 duration-500">
                    {sessions.map(session => (
                      <div 
                        key={session.id}
                        onClick={() => setActiveSessionId(session.id!)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-widest transition-all ${activeSessionId === session.id ? 'bg-slate-800/80 text-blue-400 ring-1 ring-blue-500/20' : 'text-slate-600 hover:text-slate-300'}`}
                      >
                        <span className="truncate">{session.name}</span>
                        {session.isCommitted ? <Save className="w-3 h-3 text-emerald-500/60" /> : <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40 animate-pulse" />}
                      </div>
                    ))}
                    <button 
                      onClick={() => createSession(project.id!)}
                      className="flex items-center gap-2 p-2.5 text-[9px] font-black text-blue-500/40 hover:text-blue-400 uppercase tracking-[0.2em] transition-all group"
                    >
                      <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform" /> Nova Sessão
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-[#1e293b]/10">
          <button className="flex items-center gap-3 w-full p-2 text-slate-600 hover:text-blue-400 transition-colors text-xs font-bold uppercase tracking-[0.2em]">
            <Settings className="w-4 h-4" /> Configs Sistema
          </button>
        </div>
      </aside>

      {/* Main Analysis Engine */}
      <main className="flex-1 flex flex-col relative bg-[#020617]">
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-[#020617]/95 backdrop-blur-2xl z-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-slate-800 rounded-2xl text-slate-500 transition-all border border-transparent hover:border-slate-700"
            >
              <ChevronRight className={`w-5 h-5 transition-transform duration-700 ${isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-black tracking-tighter uppercase flex items-center gap-3">
                {activeSessionId ? sessions.find(s => s.id === activeSessionId)?.name : 'Civil Estimator VFS Core'}
              </h2>
              <div className="flex items-center gap-5">
                <PersistenceIndicator status={syncStatus} />
                {!sessions.find(s => s.id === activeSessionId)?.isCommitted && activeSessionId && (
                  <button 
                    onClick={commitSession}
                    className="flex items-center gap-2 text-[9px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-[0.25em] transition-all py-1 px-3 bg-blue-500/5 rounded-full border border-blue-500/20 hover:bg-blue-500/10"
                  >
                    <Save className="w-3 h-3" /> Commit Session
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-5 py-2.5 bg-[#0f172a] border border-slate-700/50 rounded-[20px] flex items-center gap-4 shadow-xl ring-1 ring-white/5">
              <Calculator className="w-4 h-4 text-blue-500" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black font-mono text-slate-500 uppercase tracking-widest leading-none">DB_CONTEXT</span>
                <span className="text-[10px] font-black font-mono text-blue-400 uppercase tracking-tighter">SINAPI_2025_LATEST</span>
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 md:p-16 space-y-12 scrollbar-hide">
          {(!activeSessionId || messages.length === 0) && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-12 py-20">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-600 blur-[120px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative w-44 h-44 bg-[#0f172a] border border-slate-800 rounded-[56px] flex items-center justify-center shadow-3xl ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-700">
                  <HardHat className="w-20 h-20 text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-5xl font-black tracking-tighter uppercase leading-[0.85] text-white">Engenharia de Memória Profunda</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium px-8 opacity-80 uppercase tracking-tight">
                  Seu contexto é preservado via <span className="text-blue-400 font-black">IndexedDB L2 Sync</span>. Carregue plantas complexas e orçamentos gigantes com garantia de persistência.
                </p>
              </div>
              <button 
                onClick={() => createProject()}
                className="px-12 py-6 bg-blue-600 hover:bg-blue-500 rounded-[30px] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_20px_60px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95 ring-1 ring-white/20"
              >
                Novo Relatório VFS
              </button>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-8 duration-700`}>
              <div className={`max-w-[88%] ${msg.role === 'user' ? 'bg-blue-600 text-white p-8 rounded-[36px] rounded-tr-none shadow-2xl shadow-blue-950/40 ring-1 ring-white/10' : 'bg-[#0f172a] border border-slate-800 p-10 rounded-[48px] rounded-tl-none shadow-2xl border-l-8 border-l-blue-500 ring-1 ring-white/5'}`}>
                {renderMessageContent(msg)}
                {msg.metadata && <GroundingSection metadata={msg.metadata} />}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <ThinkingIndicator />
              </div>
            </div>
          )}
        </div>

        {/* Optimus Control Deck */}
        <div className="p-10 bg-[#020617]/95 backdrop-blur-3xl border-t border-slate-800/50">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            
            {attachments.length > 0 && (
              <div className="flex gap-4 p-6 bg-[#0f172a] rounded-[28px] border border-slate-800/80 overflow-x-auto no-scrollbar items-center shadow-inner ring-1 ring-white/5 animate-in slide-in-from-bottom-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20 hover:bg-blue-600/20 transition-colors cursor-pointer group"
                >
                  <Files className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex gap-4">
                  {attachments.map((att, i) => (
                    <FilePreview 
                      key={i} 
                      file={att} 
                      onRemove={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} 
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-600/10 blur-[80px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>
              <div className="relative flex items-center gap-4 bg-white rounded-[36px] p-3 transition-all duration-500 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.6)] border border-white/20">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-[28px] transition-all duration-300"
                  title="Ingerir Documentação VFS"
                >
                  <Paperclip className="w-6 h-6 stroke-[2.5]" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  multiple 
                  accept="image/*,application/pdf,.dwg,.dxf,.xls,.xlsx,.csv" 
                  className="hidden" 
                />
                <textarea 
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Instrua o motor Optimus para levantamento ou análise..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 text-lg py-4 px-2 resize-none max-h-72 font-bold placeholder:text-slate-300 placeholder:italic"
                />
                <button 
                  onClick={sendMessage}
                  disabled={isLoading}
                  className={`p-5 rounded-[28px] transition-all duration-500 ${isLoading ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_10px_30px_rgba(37,99,235,0.4)] active:scale-95'}`}
                >
                  <Send className="w-7 h-7 stroke-[2.5]" />
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center px-8">
               <div className="flex items-center gap-3">
                 <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
                 <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] opacity-80">
                  VFS_CORE_V1.5_ONLINE • COMMIT_READY
                </p>
               </div>
              <div className="flex gap-6">
                <span className="text-[9px] text-slate-800 font-mono font-black uppercase tracking-widest">IDB_PERSIST_LAYER</span>
                <span className="text-[9px] text-blue-900 font-mono font-black uppercase tracking-widest">GEMINI_3_PRO_NUCLEUS</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
