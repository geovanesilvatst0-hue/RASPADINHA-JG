
import React, { useEffect, useRef, useState, useMemo } from 'react';
import ScratchCard, { ScratchCardRef } from './components/ScratchCard';
import AdminPanel from './components/AdminPanel';
import { Prize, Winner, StoreConfig, AppView } from './types';
import { INITIAL_PRIZES, INITIAL_CONFIG } from './constants';
import { generatePrizeMessage } from './services/geminiService';
import { Ticket, ChevronRight, AlertCircle, ShieldAlert, User, Check } from 'lucide-react';
import { hasSupabaseEnv, supabase } from './lib/supabase';

// Identifica a "loja" (slug) para carregar/salvar no Supabase.
// Prioridade: ?store=SLUG  -> subdomínio Netlify -> primeiro segmento do hostname.

const getStoreSlug = (): string => {
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get("store");
  if (fromParam) return fromParam;

  const host = window.location.hostname;

  // remove sufixos comuns
  const cleaned = host
    .replace(".netlify.app", "")
    .replace(".vercel.app", "");

  // pega o primeiro pedaço do host (subdomínio)
  const first = cleaned.split(".")[0];

  return first || "default";
};


// Função utilitária para validação de CPF
const isValidCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) return false;
  const digits = cleanCPF.split('').map(Number);
  const calculateDigit = (slice: number[]) => {
    const factor = slice.length + 1;
    const sum = slice.reduce((acc, digit, idx) => acc + digit * (factor - idx), 0);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  const firstDigit = calculateDigit(digits.slice(0, 9));
  if (firstDigit !== digits[9]) return false;
  const secondDigit = calculateDigit(digits.slice(0, 10));
  if (secondDigit !== digits[10]) return false;
  return true;
};

// Função para obter dados iniciais com prioridade: URL > LocalStorage > Default
const getInitialData = () => {
  const params = new URLSearchParams(window.location.search);
  const sharedData = params.get('s');
  
  if (sharedData) {
    try {
      // Decodifica os dados da URL
      const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
      return {
        config: {
          ...INITIAL_CONFIG,
          name: decoded.n || INITIAL_CONFIG.name,
          logoUrl: decoded.l || INITIAL_CONFIG.logoUrl,
          primaryColor: decoded.c || INITIAL_CONFIG.primaryColor,
          whatsappNumber: decoded.w || INITIAL_CONFIG.whatsappNumber
        },
        prizes: decoded.p || INITIAL_PRIZES,
        isFromUrl: true
      };
    } catch (e) {
      console.error("Erro ao decodificar link:", e);
    }
  }
  
  // Se não houver URL, tenta LocalStorage
  const savedConfig = localStorage.getItem('scratch_config');
  const savedPrizes = localStorage.getItem('scratch_prizes');
  
  return {
    config: savedConfig ? JSON.parse(savedConfig) : INITIAL_CONFIG,
    prizes: savedPrizes ? JSON.parse(savedPrizes) : INITIAL_PRIZES,
    isFromUrl: false
  };
};

const App: React.FC = () => {
  const initialData = getInitialData();
  const storeSlug = useMemo(() => getStoreSlug(), []);
  const [cloudStatus, setCloudStatus] = useState<string>('');
  
  const [view, setView] = useState<AppView>('user-form');
  const [config, setConfig] = useState<StoreConfig>(initialData.config);
  const [prizes, setPrizes] = useState<Prize[]>(initialData.prizes);
  const [winners, setWinners] = useState<Winner[]>(() => {
    const saved = localStorage.getItem('scratch_winners');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState({ name: '', cpf: '' });
  const [cpfError, setCpfError] = useState(false);
  const [currentPrize, setCurrentPrize] = useState<Prize | null>(null);
  const [prizeCode, setPrizeCode] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [isScratchingActive, setIsScratchingActive] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const scratchCardRef = useRef<ScratchCardRef>(null);

  const isClientMode = new URLSearchParams(window.location.search).get('mode') === 'client';

  // Sincronização e Limpeza de URL
  useEffect(() => {
    if (initialData.isFromUrl) {
      // Salva no local storage para futuras visitas sem o parâmetro 's'
      localStorage.setItem('scratch_config', JSON.stringify(config));
      localStorage.setItem('scratch_prizes', JSON.stringify(prizes));
      
      // Limpa a URL para ficar elegante, mas mantém o modo cliente se necessário
      const newUrl = window.location.pathname + (isClientMode ? '?mode=client' : '');
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Carrega configurações da nuvem (Supabase) para que funcione em qualquer navegador
  useEffect(() => {
    const run = async () => {
      try {
        if (!hasSupabaseEnv) return;
        // Se veio de um link compartilhado, mantemos o conteúdo do link.
        if (initialData.isFromUrl) return;

        setCloudStatus('Carregando da nuvem...');

        const { data, error } = await supabase
          .from('stores')
          .select('data, name')
          .eq('slug', storeSlug)
          .maybeSingle();

        if (error) {
          console.warn('Supabase read error:', error);
          setCloudStatus('Sem acesso para ler (RLS).');
          return;
        }

        if (data?.data) {
          const remote = data.data as any;
          if (remote.config) setConfig(remote.config);
          if (remote.prizes) setPrizes(remote.prizes);
          setCloudStatus('Carregado da nuvem ✅');
        } else {
          setCloudStatus('Nenhum registro na nuvem (usando local).');
        }
      } catch (e) {
        console.warn('Supabase load error:', e);
        setCloudStatus('Erro ao carregar da nuvem.');
      }
    };
    run();
  }, [storeSlug]);

  const saveToCloud = async () => {
    if (!hasSupabaseEnv) {
      setCloudStatus('Supabase não configurado (variáveis de ambiente).');
      return;
    }

    setCloudStatus('Salvando na nuvem...');

    const payload = { config, prizes };
    const { error } = await supabase
      .from('stores')
      .upsert(
        {
          slug: storeSlug,
          name: config?.name ?? null,
          data: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' }
      );

    if (error) {
      console.warn('Supabase write error:', error);
      setCloudStatus('Sem permissão para salvar (RLS).');
      return;
    }
    setCloudStatus('Salvo na nuvem ✅');
  };

  // Persistência Reativa
  useEffect(() => {
    localStorage.setItem('scratch_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('scratch_prizes', JSON.stringify(prizes));
  }, [prizes]);

  useEffect(() => {
    localStorage.setItem('scratch_winners', JSON.stringify(winners));
  }, [winners]);

  const startScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpfError(false);
    if (!currentUser.name || !currentUser.cpf) return;
    if (!isValidCPF(currentUser.cpf)) { setCpfError(true); return; }
    
    const today = new Date().toLocaleDateString('pt-BR');
    const hasPlayedToday = winners.some(w => w.userCpf === currentUser.cpf && w.date.split(',')[0].trim() === today);
    
    if (hasPlayedToday) { 
      alert("Válido apenas uma vez por CPF hoje! Tente novamente amanhã."); 
      return; 
    }

    const pool = prizes.length > 0 ? prizes : INITIAL_PRIZES;
    const randomPrize = pool[Math.floor(Math.random() * pool.length)];
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    setCurrentPrize(randomPrize);
    setPrizeCode(code);
    setIsScratchingActive(true);
    setIsRevealed(false);
    generatePrizeMessage(randomPrize.name, randomPrize.isWinning).then(setAiMessage);
  };

  const handleRevealComplete = () => {
    if (currentPrize && !isRevealed) {
      const newWinner: Winner = { 
        id: Date.now().toString(), 
        userName: currentUser.name, 
        userCpf: currentUser.cpf, 
        prizeName: currentPrize.name, 
        prizeCode: prizeCode, 
        date: new Date().toLocaleString('pt-BR') 
      };
      setWinners(prev => [...prev, newWinner]);
      setIsRevealed(true);
    }
  };

  const shareApp = async () => {
    // Captura o estado atual exato para o link
    const stateToShare = { 
      n: config.name, 
      l: config.logoUrl, 
      c: config.primaryColor, 
      w: config.whatsappNumber, 
      p: prizes 
    };
    
    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(stateToShare))));
    const baseUrl = window.location.href.split('?')[0];
    const finalUrl = `${baseUrl}?mode=client&s=${encodedData}`;
    
    const shareText = `🎟️ Raspadinha da ${config.name}\n\nTente a sorte e ganhe prêmios exclusivos! 🎁\n\nLink: ${finalUrl}`;
    
    try {
      await navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.error("Erro ao copiar link:", err);
    }
  };

  const openWhatsAppLead = () => {
    const phone = (config.adminContactNumber || '5564993408657').replace(/\D/g, '');
    const storeName = config.name || 'minha loja';
    const msg = `Olá! Vi a raspadinha da loja "${storeName}" e quero fazer a minha. Pode me ajudar?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (view === 'admin') {
    return (
      <div className="p-4 md:p-10 max-w-5xl mx-auto">
        <button onClick={() => setView('user-form')} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white group transition-colors">
          <div className="p-2 rounded-full bg-slate-800 group-hover:bg-slate-700"><ChevronRight className="rotate-180" size={16} /></div>
          <span className="font-bold text-sm">Voltar</span>
        </button>
        <AdminPanel
          config={config}
          setConfig={setConfig}
          prizes={prizes}
          setPrizes={setPrizes}
          winners={winners}
          onBack={() => setView('user-form')}
          hasCloud={hasSupabaseEnv}
          cloudStatus={cloudStatus}
          onSaveCloud={saveToCloud}
          storeSlug={storeSlug}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="w-full max-w-[480px] space-y-4">
        <header className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Ticket className="text-pink-500 fill-pink-500" size={20} />
            <h1 className="text-xl font-bold tracking-tight">
              Raspadinha da <span className="text-indigo-400">{config.name}</span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            1 chance por CPF por dia • raspe para revelar • depois clique em <span className="font-bold text-slate-200">Quero resgatar</span>.
          </p>
        </header>

        <div className="scratch-container rounded-2xl p-5 space-y-5">
          <form onSubmit={startScratch} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Nome Completo</label>
                <input 
                  disabled={isScratchingActive} 
                  required 
                  type="text" 
                  value={currentUser.name} 
                  onChange={e => setCurrentUser({...currentUser, name: e.target.value})} 
                  className="custom-input w-full px-4 py-3 rounded-xl outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700" 
                  placeholder="Seu nome" 
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-xs text-slate-400">CPF</label>
                  {cpfError && <span className="text-[10px] text-red-500 flex items-center gap-1 font-bold animate-pulse"><AlertCircle size={10} /> INVÁLIDO</span>}
                </div>
                <input 
                  disabled={isScratchingActive} 
                  required 
                  type="text" 
                  maxLength={11} 
                  value={currentUser.cpf} 
                  onChange={e => { 
                    setCurrentUser({...currentUser, cpf: e.target.value.replace(/\D/g, '')}); 
                    if(cpfError) setCpfError(false); 
                  }} 
                  className={`custom-input w-full px-4 py-3 rounded-xl outline-none transition-all placeholder:text-slate-700 ${cpfError ? 'border-red-500 ring-1 ring-red-500/20' : 'focus:border-indigo-500/50'}`} 
                  placeholder="12345678901" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="submit" disabled={isScratchingActive} className={`py-3 rounded-xl font-bold text-sm custom-button ${isScratchingActive ? 'opacity-50' : 'text-slate-400 active:scale-95'}`}>Começar</button>
              <button type="button" onClick={() => {setCurrentUser({ name: '', cpf: '' }); setCpfError(false); setIsScratchingActive(false); setIsRevealed(false); setCurrentPrize(null);}} className="py-3 rounded-xl font-bold text-sm custom-button text-slate-400 active:scale-95">Limpar</button>
            </div>
            {isClientMode && <div className="w-full py-2 flex items-center justify-center gap-2 opacity-30 select-none"><ShieldAlert size={12} className="text-slate-500" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acesso Restrito</span></div>}
          </form>
        </div>

        <div className="scratch-container rounded-2xl p-4">
          {isScratchingActive && currentPrize ? (
            <ScratchCard ref={scratchCardRef} prize={currentPrize} onComplete={handleRevealComplete} primaryColor={config.primaryColor} />
          ) : (
            <div className="w-full aspect-video bg-slate-900/50 rounded-xl flex items-center justify-center border border-dashed border-slate-700">
              <span className="text-slate-600 font-bold uppercase tracking-widest text-sm">Aguardando dados...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={() => window.open(`https://wa.me/${config.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`🎟️ RESGATE - ${config.name}\n👤 Cliente: ${currentUser.name}\n📄 CPF: ${currentUser.cpf}\n🎁 Prêmio: ${currentPrize?.name}\n🔑 Código: ${prizeCode}`)}`, '_blank')} 
            disabled={!isRevealed || !currentPrize?.isWinning} 
            className={`py-3.5 rounded-xl text-[10px] font-bold uppercase custom-button ${(!isRevealed || !currentPrize?.isWinning) ? 'opacity-40 grayscale' : 'text-slate-200 active:scale-95'}`}
          >
            Quero resgatar
          </button>
          <button 
            onClick={shareApp} 
            className={`py-3.5 rounded-xl text-[10px] font-bold uppercase custom-button flex items-center justify-center gap-1.5 transition-all ${isCopied ? 'text-green-400 border-green-500/30' : 'text-slate-400'} active:scale-95`}
          >
            {isCopied ? <Check size={14} /> : null}
            {isCopied ? 'Copiado' : 'Compartilhar'}
          </button>
          <button 
            onClick={() => scratchCardRef.current?.reveal()} 
            disabled={!isScratchingActive || isRevealed} 
            className={`py-3.5 rounded-xl text-[10px] font-bold uppercase custom-button ${(!isScratchingActive || isRevealed) ? 'opacity-40' : 'text-slate-400 active:scale-95'}`}
          >
            Revelar
          </button>
        </div>

        {isRevealed && aiMessage && (
          <div className="text-center animate-in fade-in slide-in-from-top-2 duration-700">
            <p className="text-xs text-indigo-400 italic">"{aiMessage}"</p>
          </div>
        )}

        {/* CTA para revenda */}
        <button
          onClick={openWhatsAppLead}
          className="w-full py-3.5 rounded-xl text-[11px] font-bold uppercase custom-button text-slate-200 active:scale-95"
        >
          Quero fazer minha própria raspadinha
        </button>
      </div>

      {/* Ícone de Admin Discreto (Boneco) */}
      {!isClientMode && (
        <button 
          onClick={() => setView('admin')} 
          className="fixed bottom-6 right-6 p-2.5 rounded-full bg-slate-800/30 text-slate-700 hover:text-slate-300 hover:bg-slate-800/70 transition-all shadow-lg backdrop-blur-sm opacity-25 hover:opacity-100"
        >
          <User size={18} />
        </button>
      )}
    </div>
  );
};

export default App;
