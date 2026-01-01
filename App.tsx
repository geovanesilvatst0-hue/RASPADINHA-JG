
import React, { useState, useEffect, useRef } from 'react';
import ScratchCard, { ScratchCardRef } from './components/ScratchCard';
import AdminPanel from './components/AdminPanel';
import { Prize, Winner, StoreConfig, AppView } from './types';
import { INITIAL_PRIZES, INITIAL_CONFIG } from './constants';
import { generatePrizeMessage } from './services/geminiService';
import { Ticket, ChevronRight, AlertCircle, ShieldAlert } from 'lucide-react';

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

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('user-form');
  const [config, setConfig] = useState<StoreConfig>(() => {
    const saved = localStorage.getItem('scratch_config');
    return saved ? JSON.parse(saved) : INITIAL_CONFIG;
  });
  const [prizes, setPrizes] = useState<Prize[]>(() => {
    const saved = localStorage.getItem('scratch_prizes');
    return saved ? JSON.parse(saved) : INITIAL_PRIZES;
  });
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
  const scratchCardRef = useRef<ScratchCardRef>(null);

  // Lógica para verificar se está no modo cliente (Link do Admin Geral)
  const isClientMode = new URLSearchParams(window.location.search).get('mode') === 'client';

  useEffect(() => {
    localStorage.setItem('scratch_config', JSON.stringify(config));
    localStorage.setItem('scratch_prizes', JSON.stringify(prizes));
    localStorage.setItem('scratch_winners', JSON.stringify(winners));
  }, [config, prizes, winners]);

  const startScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpfError(false);

    if (!currentUser.name || !currentUser.cpf) return;

    if (!isValidCPF(currentUser.cpf)) {
      setCpfError(true);
      return;
    }

    const today = new Date().toLocaleDateString('pt-BR');
    const hasPlayedToday = winners.some(w => {
      const recordDate = w.date.split(',')[0].trim();
      return w.userCpf === currentUser.cpf && recordDate === today;
    });

    if (hasPlayedToday) {
      alert("Válido apenas uma vez por CPF! Você já participou hoje. Tente novamente amanhã.");
      return;
    }

    const pool = prizes.length > 0 ? prizes : INITIAL_PRIZES;
    const randomPrize = pool[Math.floor(Math.random() * pool.length)];
    
    // Gerando código de 5 dígitos (letras e números) conforme solicitado
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
        date: new Date().toLocaleString('pt-BR'),
      };
      setWinners(prev => [...prev, newWinner]);
      setIsRevealed(true);
    }
  };

  const sendWhatsApp = () => {
    if (!currentPrize || !isRevealed) return;
    // Formatando mensagem para o resgate oficial na loja
    const text = `🎟️ RESGATE DE PRÊMIO - ${config.name}\n\n👤 Cliente: ${currentUser.name}\n📄 CPF: ${currentUser.cpf}\n🎁 Ganhei: ${currentPrize.name}\n🔑 Código de Resgate: ${prizeCode}`;
    const url = `https://wa.me/${config.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const clearForm = () => {
    setCurrentUser({ name: '', cpf: '' });
    setCpfError(false);
    setIsScratchingActive(false);
    setIsRevealed(false);
    setCurrentPrize(null);
  };

  const shareApp = () => {
    let shareText = `Olha essa raspadinha premiada da ${config.name}! 🎁 Tente a sorte você também e ganhe prêmios.`;
    
    // Se o usuário já revelou o prêmio, compartilha os detalhes específicos do ganho
    if (isRevealed && currentPrize) {
      shareText = `🎟️ Olha o que eu ganhei na Raspadinha da ${config.name}!\n\n👤 Cliente: ${currentUser.name}\n📄 CPF: ${currentUser.cpf}\n🎁 Prêmio: ${currentPrize.name}\n🔑 Código de Resgate: ${prizeCode}`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (view === 'admin') {
    return (
      <div className="p-4 md:p-10 max-w-5xl mx-auto">
        <button 
          onClick={() => setView('user-form')}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white group transition-colors"
        >
          <div className="p-2 rounded-full bg-slate-800 group-hover:bg-slate-700">
            <ChevronRight className="rotate-180" size={16} />
          </div>
          <span className="font-bold text-sm tracking-tight">Voltar para a Raspadinha</span>
        </button>
        <AdminPanel 
          config={config} 
          setConfig={setConfig} 
          prizes={prizes} 
          setPrizes={setPrizes} 
          winners={winners} 
          onBack={() => setView('user-form')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] space-y-4">
        
        <header className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Ticket className="text-pink-500 fill-pink-500 shrink-0" size={20} />
            <h1 className="text-xl font-bold tracking-tight">
              Raspadinha Premiada - <span className="text-indigo-400">{config.name}</span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            1 chance por CPF por dia • raspe para revelar • depois clique em <span className="font-bold text-slate-200">Quero resgatar</span> e envie no WhatsApp.
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
                   <label className="text-xs text-slate-400">CPF (somente números)</label>
                   {cpfError && (
                     <span className="text-[10px] text-red-500 flex items-center gap-1 font-bold animate-pulse">
                       <AlertCircle size={10} /> CPF INVÁLIDO
                     </span>
                   )}
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
              <button 
                type="submit"
                disabled={isScratchingActive}
                className={`py-3 rounded-xl font-bold text-sm custom-button transition-all ${isScratchingActive ? 'opacity-50 cursor-not-allowed' : 'text-slate-400 active:scale-95'}`}
              >
                Começar
              </button>
              <button 
                type="button"
                onClick={clearForm}
                className="py-3 rounded-xl font-bold text-sm custom-button text-slate-400 active:scale-95"
              >
                Limpar
              </button>
            </div>

            {/* Ocultar Admin no modo cliente conforme pedido: "exceto acesso ao admin" */}
            {!isClientMode && (
              <button 
                type="button"
                onClick={() => setView('admin')}
                className="w-full py-3 rounded-xl font-bold text-sm custom-button text-slate-200 active:scale-95"
              >
                Admin
              </button>
            )}

            {isClientMode && (
              <div className="w-full py-2 flex items-center justify-center gap-2 opacity-30 select-none">
                <ShieldAlert size={12} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acesso Restrito</span>
              </div>
            )}
          </form>
        </div>

        <div className="scratch-container rounded-2xl p-4">
          {isScratchingActive && currentPrize ? (
            <ScratchCard 
              ref={scratchCardRef}
              prize={currentPrize} 
              onComplete={handleRevealComplete} 
              primaryColor={config.primaryColor} 
            />
          ) : (
            <div className="w-full aspect-video bg-slate-900/50 rounded-xl flex items-center justify-center border border-dashed border-slate-700">
               <span className="text-slate-600 font-bold uppercase tracking-widest text-sm">Aguardando dados...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={sendWhatsApp}
            disabled={!isRevealed || !currentPrize?.isWinning}
            className={`py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-tight custom-button transition-all ${(!isRevealed || !currentPrize?.isWinning) ? 'opacity-40 grayscale' : 'text-slate-200 active:scale-95'}`}
          >
            Quero resgatar
          </button>
          <button 
            onClick={shareApp}
            className="py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-tight custom-button text-slate-400 active:scale-95"
          >
            Compartilhar
          </button>
          <button 
            onClick={() => scratchCardRef.current?.reveal()}
            disabled={!isScratchingActive || isRevealed}
            className={`py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-tight custom-button transition-all ${(!isScratchingActive || isRevealed) ? 'opacity-40' : 'text-slate-400 active:scale-95'}`}
          >
            Revelar
          </button>
        </div>

        {isRevealed && aiMessage && (
          <div className="text-center animate-in fade-in slide-in-from-top-2 duration-700">
            <p className="text-xs text-indigo-400 italic">"{aiMessage}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
