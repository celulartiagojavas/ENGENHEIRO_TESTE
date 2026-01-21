
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
  Files
} from 'lucide-react';
import { db } from './db';
import { Message, Project, Attachment } from './types';
import { gemini } from './geminiService';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { GroundingSection } from './components/GroundingSection';
import { BudgetTable } from './components/BudgetTable';
import { FilePreview } from './components/FilePreview';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadMessages(activeProjectId);
    } else {
      setMessages([]);
    }
  }, [activeProjectId]);

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

  const loadMessages = async (projectId: number) => {
    const chatMessages = await db.messages
      .where('projectId')
      .equals(projectId)
      .sortBy('timestamp');
    setMessages(chatMessages);
  };

  const createProject = async (nameOverride?: string) => {
    const id = await db.projects.add({
      name: nameOverride || `Cotação ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`,
      createdAt: Date.now(),
      lastMessageAt: Date.now()
    });
    await loadProjects();
    setActiveProjectId(id as number);
    return id as number;
  };

  const deleteProject = async (id: number) => {
    await db.projects.delete(id);
    await db.messages.where('projectId').equals(id).delete();
    if (activeProjectId === id) setActiveProjectId(null);
    loadProjects();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newAttachment: Attachment = {
          name: file.name,
          type: file.type || 'application/octet-stream',
          data: ev.target?.result as string,
          size: file.size
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && attachments.length === 0) || isLoading) return;

    let currentProjectId = activeProjectId;
    
    // CORREÇÃO: Se não houver projeto ativo, cria um automaticamente antes de enviar
    if (!currentProjectId) {
      currentProjectId = await createProject(trimmedInput.substring(0, 30) || "Novo Orçamento Direto");
    }

    const userMsg: Message = {
      projectId: currentProjectId,
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

      const response = await gemini.chat(currentInput, messages, currentAttachments);

      const aiMsg: Message = {
        projectId: currentProjectId,
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        metadata: response.metadata
      };

      await db.messages.add(aiMsg);
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errMsg: Message = {
        projectId: currentProjectId,
        role: 'assistant',
        content: "Houve um erro técnico no processamento do motor Optimus. Verifique se os arquivos são suportados.",
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
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-black/10 rounded-xl border border-white/5">
            {attachments.map((att, idx) => (
              <FilePreview key={idx} file={att} isCompact={true} />
            ))}
          </div>
        )}
        
        {/* Render Table logic */}
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
    <div className="flex h-screen w-full overflow-hidden bg-[#020617] text-slate-100">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-[#0f172a] border-r border-slate-800 transition-all duration-500 ease-in-out flex flex-col overflow-hidden shadow-2xl z-20`}>
        <div className="p-6 flex items-center gap-4 border-b border-slate-800 bg-[#1e293b]/30">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
            <HardHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tighter leading-tight uppercase">Engenheiro Teste</h1>
            <p className="text-[10px] text-blue-400 font-mono font-bold">OPTIMUS ENGINE V4.5</p>
          </div>
        </div>

        <button 
          onClick={() => createProject()}
          className="m-4 flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-blue-600/10 group active:scale-95"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> Iniciar Novo Orçamento
        </button>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 py-4">
          <h2 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
            <History className="w-3 h-3" /> Registros de Engenharia
          </h2>
          {projects.map(project => (
            <div 
              key={project.id}
              onClick={() => setActiveProjectId(project.id!)}
              className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 ${activeProjectId === project.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-slate-800/50 border border-transparent'}`}
            >
              <div className="flex flex-col overflow-hidden">
                <span className={`text-sm truncate font-bold ${activeProjectId === project.id ? 'text-blue-300' : 'text-slate-400'}`}>
                  {project.name}
                </span>
                <span className="text-[10px] text-slate-600 font-mono mt-1 uppercase tracking-tighter">
                  V{project.id} • {new Date(project.lastMessageAt).toLocaleDateString()}
                </span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteProject(project.id!); }}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all hover:bg-red-400/10 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-800 bg-[#1e293b]/10">
          <button className="flex items-center gap-3 w-full p-2 text-slate-500 hover:text-blue-400 transition-colors text-xs font-bold uppercase tracking-[0.15em]">
            <Settings className="w-4 h-4" /> Configurações de Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-[#020617]">
        {/* Header */}
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-[#020617]/90 backdrop-blur-xl z-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
            >
              <ChevronRight className={`w-5 h-5 transition-transform duration-500 ${isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tighter uppercase">
                {activeProjectId ? projects.find(p => p.id === activeProjectId)?.name : 'Bem-vindo, Engenheiro'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Núcleo de Processamento V2Ativo</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-5 py-2.5 bg-[#1e293b] border border-slate-700/50 rounded-[20px] flex items-center gap-3 shadow-lg">
              <Calculator className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest">DB: SINAPI_JAN_2025</span>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 scrollbar-hide">
          {(!activeProjectId || messages.length === 0) && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-10 py-20">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600 blur-[100px] opacity-10"></div>
                <div className="relative w-36 h-36 bg-[#0f172a] border border-slate-800 rounded-[48px] flex items-center justify-center shadow-2xl">
                  <HardHat className="w-16 h-16 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black tracking-tighter uppercase leading-none">Engenharia Aumentada</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium px-4">
                  Carregue plantas <span className="text-blue-400 font-bold">(DWG/PDF)</span>, orçamentos <span className="text-emerald-400 font-bold">(XLS)</span> ou fotos de canteiro. O motor Optimus fará o levantamento quantitativo e análise de custos em segundos.
                </p>
              </div>
              <button 
                onClick={() => createProject()}
                className="px-10 py-5 bg-blue-600 hover:bg-blue-500 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_20px_50px_rgba(37,99,235,0.25)] hover:scale-105 active:scale-95 ring-1 ring-white/10"
              >
                Novo Relatório Técnico
              </button>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-6 duration-700`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 text-white p-7 rounded-[32px] rounded-tr-none shadow-2xl shadow-blue-950/30' : 'bg-[#0f172a] border border-slate-800 p-10 rounded-[40px] rounded-tl-none shadow-xl border-l-4 border-l-blue-500/50'}`}>
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

        {/* Input & Visualizer Area conforme Screenshot */}
        <div className="p-10 bg-[#020617]/98 backdrop-blur-3xl">
          <div className="max-w-5xl mx-auto flex flex-col gap-5">
            
            {/* Organic File Visualizer - Estilo Dark Box do Screenshot */}
            {attachments.length > 0 && (
              <div className="flex gap-4 p-5 bg-[#0f172a] rounded-[24px] border border-slate-800/80 overflow-x-auto no-scrollbar scroll-smooth items-center shadow-inner ring-1 ring-white/5">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 p-3 bg-blue-600/15 rounded-xl border border-blue-500/20 hover:bg-blue-600/25 transition-colors cursor-pointer"
                >
                  <Files className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex gap-3">
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
            
            {/* Input Bar - Estilo Pill Branco do Screenshot */}
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-600/5 blur-[50px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>
              <div className="relative flex items-center gap-4 bg-white rounded-[32px] p-2.5 transition-all duration-500 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-[24px] transition-all duration-300"
                  title="Anexar Documentação"
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
                  placeholder="Solicite orçamentos, envie plantas ou planilhas..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 text-base py-4 px-2 resize-none max-h-60 font-semibold placeholder:text-slate-400"
                />
                <button 
                  onClick={sendMessage}
                  disabled={isLoading}
                  className={`p-4 rounded-[24px] transition-all duration-500 ${isLoading ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg active:scale-95'}`}
                >
                  <Send className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center px-6">
               <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] opacity-80">
                Optimus Cost Engine • Real-time Grounding • Multi-format Analysis
              </p>
              <div className="flex gap-5">
                <span className="text-[9px] text-slate-800 font-mono font-black uppercase tracking-widest">ENCRYPTED_DB_LOCAL</span>
                <span className="text-[9px] text-blue-900 font-mono font-black uppercase tracking-widest">BDB_V1.1_NODE_ALPHA</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
