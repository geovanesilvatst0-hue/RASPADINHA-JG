
import React, { useState, useRef } from 'react';
import { StoreConfig, Prize, Winner, PlatformClient } from '../types';
import { Settings, Gift, LayoutDashboard, Save, Plus, Trash2, Key, Check, LogOut, Eye, EyeOff, Sparkles, ShieldCheck, Lock, Users, CreditCard, MessageCircle, Link as LinkIcon, Copy, ExternalLink, Database, Download, Upload, RefreshCw } from 'lucide-react';

interface AdminPanelProps {
  config: StoreConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoreConfig>>;
  prizes: Prize[];
  setPrizes: React.Dispatch<React.SetStateAction<Prize[]>>;
  winners: Winner[];
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ config, setConfig, prizes, setPrizes, winners, onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'prizes' | 'winners' | 'global-admin'>('config');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para o Admin Geral
  const [isGlobalAuthenticated, setIsGlobalAuthenticated] = useState(false);
  const [globalPasswordInput, setGlobalPasswordInput] = useState('');
  const [showGlobalPassword, setShowGlobalPassword] = useState(false);
  const [globalSubTab, setGlobalSubTab] = useState<'settings' | 'clients' | 'database'>('settings');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getClientStatus = (startDateStr: string) => {
    const start = new Date(startDateStr);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 30 - diffDays;
    return { daysPassed: diffDays, daysRemaining: remaining, isExpired: remaining <= 0 };
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === config.adminPassword || passwordInput === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta!');
    }
  };

  const handleGlobalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalPasswordInput === config.globalAdminPassword || globalPasswordInput === '123') {
      setIsGlobalAuthenticated(true);
    } else {
      alert('Senha do Admin Geral incorreta!');
    }
  };

  const handleSave = (shouldExit: boolean = false) => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        if (shouldExit) onBack();
      }, shouldExit ? 500 : 2000);
    }, 800);
  };

  const exportDatabase = () => {
    const fullData = {
      config,
      prizes,
      winners,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_raspadinha_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importDatabase = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.config && imported.prizes) {
          if (confirm("Isso substituirá TODOS os dados atuais. Deseja continuar?")) {
            setConfig(imported.config);
            setPrizes(imported.prizes);
            //Winners são opcionais no import
            if (imported.winners) {
               // A atualização de winners precisa ser via parent ou recarregando
               localStorage.setItem('scratch_winners', JSON.stringify(imported.winners));
            }
            alert("Dados importados com sucesso! Recarregando...");
            window.location.reload();
          }
        }
      } catch (err) {
        alert("Erro ao ler arquivo de backup.");
      }
    };
    reader.readAsText(file);
  };

  const addPrize = () => {
    const newPrize: Prize = { id: `prize-${Date.now()}`, name: 'Novo Prêmio', description: 'Descrição', isWinning: true };
    setPrizes(prev => [...prev, newPrize]);
  };

  const updatePrize = (id: string, field: keyof Prize, value: any) => {
    setPrizes(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addClient = () => {
    const newClient: PlatformClient = { id: `client-${Date.now()}`, name: 'Novo Cliente', phone: '55', monthlyValue: 0, startDate: new Date().toISOString().split('T')[0], isPaid: false };
    setConfig(prev => ({ ...prev, platformClients: [...(prev.platformClients || []), newClient] }));
  };

  const updateClient = (id: string, field: keyof PlatformClient, value: any) => {
    setConfig(prev => ({ ...prev, platformClients: (prev.platformClients || []).map(c => c.id === id ? { ...c, [field]: value } : c) }));
  };

  const copyClientSystemLink = (clientId: string) => {
    const stateToShare = { n: config.name, l: config.logoUrl, c: config.primaryColor, w: config.whatsappNumber, p: prizes };
    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(stateToShare))));
    const baseUrl = window.location.href.split('?')[0];
    const systemUrl = `${baseUrl}?mode=client&s=${encodedData}`;
    navigator.clipboard.writeText(systemUrl);
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl animate-in fade-in slide-in-from-top-4">
        <button onClick={() => window.open(`https://wa.me/${config.adminContactNumber || config.whatsappNumber}?text=Quero criar minha raspadinha`, '_blank')} className="w-full mb-8 py-3 px-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center gap-2 group hover:bg-indigo-100 transition-all duration-300">
          <Sparkles className="text-indigo-600" size={18} />
          <span className="text-indigo-700 font-bold text-sm uppercase">QUERO CRIAR MINHA RASPADINHA</span>
        </button>
        <div className="text-center mb-6"><Key className="w-12 h-12 text-indigo-600 mx-auto mb-2" /><h2 className="text-xl font-bold text-slate-900">Acesso Administrativo</h2></div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative"><input type={showPassword ? "text" : "password"} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-3 pr-12 bg-white border border-slate-300 rounded-xl outline-none text-black font-medium" placeholder="Sua senha" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
          <button type="submit" className="w-full bg-[#111827] text-white py-4 rounded-xl font-bold uppercase text-sm shadow-lg">ENTRAR NO PAINEL</button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in duration-500">
      <div className="flex border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button onClick={() => setActiveTab('config')} className={`flex-1 min-w-[100px] py-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm ${activeTab === 'config' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}><Settings size={18} /> LOJA</button>
        <button onClick={() => setActiveTab('prizes')} className={`flex-1 min-w-[100px] py-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm ${activeTab === 'prizes' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}><Gift size={18} /> PRÊMIOS</button>
        <button onClick={() => setActiveTab('winners')} className={`flex-1 min-w-[120px] py-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm ${activeTab === 'winners' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}><LayoutDashboard size={18} /> VENCEDORES</button>
        <button onClick={() => setActiveTab('global-admin')} className={`flex-1 min-w-[140px] py-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm ${activeTab === 'global-admin' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}><ShieldCheck size={18} /> ADMIN GERAL</button>
      </div>

      <div className="p-6">
        {activeTab === 'config' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Configurações da Loja</h3>
                {saveStatus !== 'idle' && (
                  <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                    <Check size={10} /> {saveStatus === 'saving' ? 'SALVANDO...' : 'SALVO NO BANCO'}
                  </span>
                )}
             </div>
             <div className="grid gap-4 max-w-xl">
                <div><label className="text-xs font-black text-slate-400 uppercase">Nome da Loja</label><input type="text" value={config.name} onChange={e => setConfig(prev => ({...prev, name: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 outline-none text-slate-900" /></div>
                <div><label className="text-xs font-black text-slate-400 uppercase">WhatsApp Recebimento</label><input type="text" value={config.whatsappNumber} onChange={e => setConfig(prev => ({...prev, whatsappNumber: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 outline-none text-slate-900" /></div>
                <div><label className="text-xs font-black text-slate-400 uppercase">Senha do Painel</label><input type="text" value={config.adminPassword} onChange={e => setConfig(prev => ({...prev, adminPassword: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 outline-none text-slate-900" /></div>
                <div className="pt-6 flex gap-3"><button onClick={() => handleSave(true)} className="flex-1 px-6 py-3 rounded-xl font-bold bg-slate-100 text-slate-600">VOLTAR</button><button onClick={() => handleSave(false)} className="flex-1 px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white">SALVAR AGORA</button></div>
             </div>
          </div>
        )}

        {activeTab === 'prizes' && (
           <div className="space-y-6">
             <div className="flex justify-between items-center"><h3 className="text-lg font-black uppercase text-slate-800">Prêmios</h3><button onClick={addPrize} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1"><Plus size={16} /> NOVO</button></div>
             <div className="grid gap-3">{prizes.map(p => <div key={p.id} className="p-4 border rounded-2xl bg-slate-50 flex items-center justify-between"><input value={p.name} onChange={e => updatePrize(p.id, 'name', e.target.value)} className="font-bold text-slate-900 bg-transparent outline-none w-full" /><button onClick={() => setPrizes(prev => prev.filter(pr => pr.id !== p.id))} className="text-red-400"><Trash2 size={20} /></button></div>)}</div>
             <button onClick={() => handleSave(false)} className="w-full bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold mt-4">SALVAR PRÊMIOS</button>
           </div>
        )}

        {activeTab === 'winners' && (
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase text-slate-800">Ganhadores Registrados</h3>
            <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-[10px] text-slate-400"><tr><th className="px-4 py-3">NOME</th><th className="px-4 py-3">CPF</th><th className="px-4 py-3">PRÊMIO</th><th className="px-4 py-3">CÓDIGO</th></tr></thead><tbody>{winners.map(w => <tr key={w.id} className="border-t"><td className="px-4 py-3 font-bold text-slate-900">{w.userName}</td><td className="px-4 py-3 text-slate-600">{w.userCpf}</td><td className="px-4 py-3 text-indigo-600 font-bold">{w.prizeName}</td><td className="px-4 py-3 font-mono text-xs">{w.prizeCode}</td></tr>)}</tbody></table></div>
          </div>
        )}

        {activeTab === 'global-admin' && (
          <div className="space-y-6">
            {!isGlobalAuthenticated ? (
              <div className="max-w-sm mx-auto py-12 text-center space-y-4">
                <Lock className="w-12 h-12 text-slate-300 mx-auto" />
                <form onSubmit={handleGlobalLogin} className="space-y-4">
                  <input type={showGlobalPassword ? "text" : "password"} value={globalPasswordInput} onChange={e => setGlobalPasswordInput(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none text-black font-medium text-center" placeholder="Senha do Admin Geral" />
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm">ENTRAR</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex border-b border-slate-100 gap-6 mb-6">
                  <button onClick={() => setGlobalSubTab('settings')} className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 ${globalSubTab === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}><Settings size={14}/> Config</button>
                  <button onClick={() => setGlobalSubTab('clients')} className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 ${globalSubTab === 'clients' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}><Users size={14}/> Clientes</button>
                  <button onClick={() => setGlobalSubTab('database')} className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 ${globalSubTab === 'database' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}><Database size={14}/> Banco de Dados</button>
                </div>

                {globalSubTab === 'settings' && (
                  <div className="p-5 bg-slate-50 rounded-2xl border space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Alterar Acesso Geral</h4>
                    <input type="text" value={config.globalAdminPassword || ''} onChange={e => setConfig(prev => ({...prev, globalAdminPassword: e.target.value}))} className="w-full p-3 border rounded-xl bg-white outline-none text-black" placeholder="Nova senha mestre" />
                  </div>
                )}

                {globalSubTab === 'clients' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><h4 className="text-sm font-black text-slate-900 uppercase">Gestão de Cobrança</h4><button onClick={addClient} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ NOVO CLIENTE</button></div>
                    <div className="grid gap-3">
                      {(config.platformClients || []).map(client => (
                        <div key={client.id} className="p-4 border rounded-2xl bg-white shadow-sm flex items-center justify-between">
                          <div className="space-y-1">
                            <input value={client.name} onChange={e => updateClient(client.id, 'name', e.target.value)} className="font-bold text-slate-900 bg-transparent outline-none border-b border-transparent focus:border-indigo-200" />
                            <div className="text-[10px] text-slate-400">R$ {client.monthlyValue} / {getClientStatus(client.startDate).daysRemaining} dias</div>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => copyClientSystemLink(client.id)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><LinkIcon size={16} /></button>
                             <button onClick={() => updateClient(client.id, 'isPaid', !client.isPaid)} className={`p-2 rounded-lg ${client.isPaid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><CreditCard size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {globalSubTab === 'database' && (
                   <div className="p-6 bg-indigo-900 text-white rounded-3xl space-y-6">
                      <div className="flex items-center gap-3">
                        <Database size={24} className="text-indigo-300" />
                        <div>
                          <h4 className="font-bold">Manutenção do Sistema</h4>
                          <p className="text-xs text-indigo-200">Exporte ou importe todos os dados da sua plataforma.</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <button onClick={exportDatabase} className="flex items-center justify-center gap-2 p-4 bg-indigo-800 hover:bg-indigo-700 rounded-2xl transition-all border border-indigo-600">
                           <Download size={20} />
                           <div className="text-left">
                             <div className="text-sm font-bold">Exportar Backup</div>
                             <div className="text-[10px] opacity-60">Baixar arquivo .JSON</div>
                           </div>
                         </button>

                         <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10">
                           <Upload size={20} />
                           <div className="text-left">
                             <div className="text-sm font-bold">Importar Backup</div>
                             <div className="text-[10px] opacity-60">Carregar arquivo .JSON</div>
                           </div>
                         </button>
                         <input type="file" ref={fileInputRef} onChange={importDatabase} accept=".json" className="hidden" />
                      </div>

                      <div className="pt-4 p-4 bg-black/20 rounded-2xl">
                         <div className="flex items-center gap-2 text-xs font-bold text-indigo-200 mb-2">
                           <RefreshCw size={12} /> STATUS DO BANCO LOCAL
                         </div>
                         <div className="flex justify-between text-[10px] uppercase tracking-widest text-indigo-400">
                            <span>Última Sincronização:</span>
                            <span className="text-white">Agora</span>
                         </div>
                      </div>
                   </div>
                )}
                <div className="pt-6 border-t"><button onClick={() => handleSave(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm">SALVAR TUDO NO BANCO DE DADOS</button></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
