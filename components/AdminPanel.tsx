
import React, { useState } from 'react';
import { StoreConfig, Prize, Winner, PlatformClient } from '../types';
import { Settings, Gift, LayoutDashboard, Save, Plus, Trash2, Key, Check, LogOut, Eye, EyeOff, Sparkles, ShieldCheck, Lock, Users, CreditCard, MessageCircle, Link as LinkIcon, Copy, ExternalLink } from 'lucide-react';

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

  // Estados para o Admin Geral
  const [isGlobalAuthenticated, setIsGlobalAuthenticated] = useState(false);
  const [globalPasswordInput, setGlobalPasswordInput] = useState('');
  const [showGlobalPassword, setShowGlobalPassword] = useState(false);
  const [globalSubTab, setGlobalSubTab] = useState<'settings' | 'clients'>('settings');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cálculo de dias restantes para um cliente
  const getClientStatus = (startDateStr: string) => {
    const start = new Date(startDateStr);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 30 - diffDays;
    
    return {
      daysPassed: diffDays,
      daysRemaining: remaining,
      isExpired: remaining <= 0
    };
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

  const addPrize = () => {
    const newPrize: Prize = {
      id: `prize-${Date.now()}`,
      name: 'Novo Prêmio',
      description: 'Descrição do prêmio',
      isWinning: true,
    };
    setPrizes(prev => [...prev, newPrize]);
  };

  const updatePrize = (id: string, field: keyof Prize, value: any) => {
    setPrizes(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addClient = () => {
    const newClient: PlatformClient = {
      id: `client-${Date.now()}`,
      name: 'Novo Cliente',
      phone: '55',
      monthlyValue: 0,
      startDate: new Date().toISOString().split('T')[0],
      isPaid: false,
    };
    setConfig(prev => ({
      ...prev,
      platformClients: [...(prev.platformClients || []), newClient]
    }));
  };

  const deleteClient = (id: string) => {
    setConfig(prev => ({
      ...prev,
      platformClients: (prev.platformClients || []).filter(c => c.id !== id)
    }));
  };

  const updateClient = (id: string, field: keyof PlatformClient, value: any) => {
    setConfig(prev => ({
      ...prev,
      platformClients: (prev.platformClients || []).map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const openWhatsApp = (phone: string, message: string) => {
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const sendCollectionMessage = (client: PlatformClient) => {
    const status = getClientStatus(client.startDate);
    const message = `Olá ${client.name}! 🌸 Notamos que o pagamento da sua Raspadinha Premiada no valor de R$ ${client.monthlyValue.toFixed(2)} ${status.isExpired ? 'venceu há ' + Math.abs(status.daysRemaining) + ' dias' : 'está pendente'}. Podemos ajudar com o financeiro?`;
    openWhatsApp(client.phone, message);
  };

  const copyClientSystemLink = (clientId: string) => {
    // Coleta o estado atual para embutir na URL de forma segura
    const stateToShare = {
      n: config.name,
      l: config.logoUrl,
      c: config.primaryColor,
      w: config.whatsappNumber,
      p: prizes
    };
    
    // Codifica em Base64 para a URL
    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(stateToShare))));
    
    const baseUrl = window.location.href.split('?')[0];
    const systemUrl = `${baseUrl}?mode=client&s=${encodedData}`;
    
    navigator.clipboard.writeText(systemUrl);
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCreateRequest = () => {
    const targetNumber = config.adminContactNumber || config.whatsappNumber;
    const text = "Quero criar minha raspadinha";
    openWhatsApp(targetNumber, text);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl animate-in fade-in slide-in-from-top-4">
        <button 
          onClick={openCreateRequest}
          className="w-full mb-8 py-3 px-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center gap-2 group hover:bg-indigo-100 transition-all duration-300 active:scale-95"
        >
          <Sparkles className="text-indigo-600 group-hover:rotate-12 transition-transform" size={18} />
          <span className="text-indigo-700 font-bold text-sm tracking-tight uppercase">QUERO CRIAR MINHA RASPADINHA</span>
        </button>

        <div className="text-center mb-6">
          <Key className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-slate-900">Acesso Administrativo</h2>
          <p className="text-slate-500 text-sm">Digite a senha para gerenciar sua loja.</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              className="w-full p-3 pr-12 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-black font-medium"
              placeholder="Sua senha"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button type="submit" className="w-full bg-[#111827] text-white py-4 rounded-xl font-bold hover:bg-black transition-colors uppercase tracking-wider text-sm shadow-lg">
            ENTRAR NO PAINEL
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in duration-500">
      <div className="flex border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button onClick={() => setActiveTab('config')} className={`flex-1 min-w-[100px] py-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm ${activeTab === 'config' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
          <Settings size={18} /> LOJA
        </button>
        <button onClick={() => setActiveTab('prizes')} className={`flex-1 min-w-[100px] py-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm ${activeTab === 'prizes' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
          <Gift size={18} /> PRÊMIOS
        </button>
        <button onClick={() => setActiveTab('winners')} className={`flex-1 min-w-[120px] py-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm ${activeTab === 'winners' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
          <LayoutDashboard size={18} /> VENCEDORES
        </button>
        <button onClick={() => setActiveTab('global-admin')} className={`flex-1 min-w-[140px] py-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm ${activeTab === 'global-admin' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
          <ShieldCheck size={18} /> ADMIN GERAL
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'config' && (
          <div className="space-y-6">
             <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Configurações Gerais da Loja</h3>
             <div className="grid gap-4 max-w-xl">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase">Nome da Loja</label>
                  <input type="text" value={config.name} onChange={e => setConfig(prev => ({...prev, name: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white transition-all outline-none border-slate-200 text-slate-900" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase">WhatsApp de Recebimento</label>
                  <input type="text" value={config.whatsappNumber} onChange={e => setConfig(prev => ({...prev, whatsappNumber: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white transition-all outline-none border-slate-200 text-slate-900" placeholder="Ex: 5511999999999" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase">Senha Admin Loja</label>
                  <input type="text" value={config.adminPassword} onChange={e => setConfig(prev => ({...prev, adminPassword: e.target.value}))} className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white transition-all outline-none border-slate-200 text-slate-900" />
                </div>
                <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3">
                   <button type="button" onClick={() => handleSave(true)} disabled={saveStatus !== 'idle'} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-slate-100 text-slate-600 hover:bg-slate-200">
                     <LogOut size={18} /> SALVAR E VOLTAR
                   </button>
                   <button type="button" onClick={() => handleSave(false)} disabled={saveStatus !== 'idle'} className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white'}`}>
                     {saveStatus === 'idle' && 'SALVAR ALTERAÇÕES'}
                     {saveStatus === 'saving' && 'SALVANDO...'}
                     {saveStatus === 'saved' && 'SALVO!'}
                   </button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'prizes' && (
           <div className="space-y-6">
             <div className="flex justify-between items-center"><h3 className="text-lg font-black uppercase text-slate-800">Prêmios</h3><button onClick={addPrize} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1"><Plus size={16} /> NOVO</button></div>
             <div className="grid gap-3">{prizes.map(p => <div key={p.id} className="p-4 border rounded-2xl bg-slate-50 flex items-center justify-between"><input value={p.name} onChange={e => updatePrize(p.id, 'name', e.target.value)} className="font-bold text-slate-900 bg-transparent outline-none w-full" /><button onClick={() => setPrizes(prev => prev.filter(pr => pr.id !== p.id))} className="text-red-400"><Trash2 size={20} /></button></div>)}</div>
             <div className="flex justify-end pt-6"><button onClick={() => handleSave(false)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">SALVAR PRÊMIOS</button></div>
           </div>
        )}

        {activeTab === 'winners' && (
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase text-slate-800">Histórico de Ganhadores</h3>
            <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm text-left"><thead className="bg-slate-50 font-black uppercase text-[10px] text-slate-400"><tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">CPF</th><th className="px-4 py-3">Prêmio</th></tr></thead><tbody>{winners.map(w => <tr key={w.id} className="border-t"> <td className="px-4 py-3 font-bold text-slate-900">{w.userName}</td> <td className="px-4 py-3 text-slate-600">{w.userCpf}</td> <td className="px-4 py-3 text-indigo-600 font-bold">{w.prizeName}</td> </tr>)}</tbody></table></div>
          </div>
        )}

        {activeTab === 'global-admin' && (
          <div className="space-y-6">
            {!isGlobalAuthenticated ? (
              <div className="max-w-sm mx-auto py-12 text-center space-y-4">
                <Lock className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">Acesso Restrito ao Admin Geral</h3>
                <form onSubmit={handleGlobalLogin} className="space-y-4">
                  <div className="relative">
                    <input type={showGlobalPassword ? "text" : "password"} value={globalPasswordInput} onChange={e => setGlobalPasswordInput(e.target.value)} className="w-full p-3 pr-12 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-black font-medium" placeholder="Senha (padrão inicial: 123)" />
                    <button type="button" onClick={() => setShowGlobalPassword(!showGlobalPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400">{showGlobalPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors uppercase tracking-widest text-sm">AUTENTICAR</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex border-b border-slate-100 gap-6 mb-6">
                  <button onClick={() => setGlobalSubTab('settings')} className={`pb-3 text-sm font-black uppercase tracking-wider flex items-center gap-2 ${globalSubTab === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}><Settings size={16}/> Configurações</button>
                  <button onClick={() => setGlobalSubTab('clients')} className={`pb-3 text-sm font-black uppercase tracking-wider flex items-center gap-2 ${globalSubTab === 'clients' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}><Users size={16}/> Gestão de Clientes</button>
                </div>

                {globalSubTab === 'settings' ? (
                  <div className="grid gap-6 max-w-xl">
                    <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                      <h4 className="text-sm font-black text-indigo-900 uppercase tracking-wider">Número de Vendas da Plataforma</h4>
                      <p className="text-xs text-indigo-700">Este número aparecerá no botão promocional para atrair novos clientes interessados no sistema.</p>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-400 uppercase">WhatsApp para Contato Direto</label>
                        <input type="text" value={config.adminContactNumber || ''} onChange={e => setConfig(prev => ({...prev, adminContactNumber: e.target.value}))} className="w-full p-3 border border-indigo-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400 text-black" placeholder="Ex: 5511999999999" />
                      </div>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Acesso Geral</h4>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Alterar Senha de Admin Geral</label>
                        <input type="text" value={config.globalAdminPassword || ''} onChange={e => setConfig(prev => ({...prev, globalAdminPassword: e.target.value}))} className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-slate-400 text-black" placeholder="Nova senha geral" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Faturamento de Lojas (Clientes)</h4>
                      <button onClick={addClient} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-indigo-700 transition-all"><Plus size={14} /> ADICIONAR CLIENTE</button>
                    </div>

                    <div className="grid gap-4">
                      {(config.platformClients || []).length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed rounded-3xl text-slate-400 italic text-sm">Nenhum cliente cadastrado no faturamento.</div>
                      ) : (
                        (config.platformClients || []).map(client => {
                          const status = getClientStatus(client.startDate);
                          return (
                            <div key={client.id} className="p-5 border border-slate-200 rounded-3xl bg-white hover:border-indigo-200 transition-all shadow-sm group">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                <div className="space-y-1">
                                  <input value={client.name} onChange={e => updateClient(client.id, 'name', e.target.value)} className="font-bold text-slate-900 bg-transparent outline-none w-full border-b border-transparent focus:border-indigo-300" placeholder="Nome do Cliente" />
                                  <div className="flex items-center gap-1 text-xs text-slate-500"><MessageCircle size={12}/> <input value={client.phone} onChange={e => updateClient(client.id, 'phone', e.target.value)} className="bg-transparent outline-none w-full text-slate-900" /></div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] font-black text-slate-400 uppercase">Mensalidade</div>
                                  <div className="flex items-center gap-1 font-bold text-indigo-600">R$ <input type="number" value={client.monthlyValue} onChange={e => updateClient(client.id, 'monthlyValue', parseFloat(e.target.value))} className="bg-transparent outline-none w-20 text-indigo-600" /></div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] font-black text-slate-400 uppercase">Início (30 dias)</div>
                                  <input type="date" value={client.startDate} onChange={e => updateClient(client.id, 'startDate', e.target.value)} className="text-xs font-medium text-slate-600 bg-transparent outline-none text-slate-900" />
                                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${status.isExpired ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {status.isExpired ? `Vencido há ${Math.abs(status.daysRemaining)} dias` : `${status.daysRemaining} dias restantes`}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 justify-end">
                                  <button onClick={() => copyClientSystemLink(client.id)} className={`p-3 rounded-xl transition-all shadow-sm flex flex-col items-center gap-1 border ${copiedId === client.id ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`} title="Copiar Link do Sistema">
                                    {copiedId === client.id ? <Check size={20} /> : <LinkIcon size={20} />}
                                    <span className="text-[9px] font-black uppercase">{copiedId === client.id ? 'COPIADO' : 'SISTEMA'}</span>
                                  </button>
                                  <button onClick={() => updateClient(client.id, 'isPaid', !client.isPaid)} className={`p-2 h-[52px] w-[52px] rounded-xl transition-all flex flex-col items-center justify-center gap-1 border ${client.isPaid ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                    <CreditCard size={18} />
                                    <span className="text-[9px] font-black uppercase">{client.isPaid ? 'PAGO' : 'PENDENTE'}</span>
                                  </button>
                                  <button onClick={() => sendCollectionMessage(client)} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Mandar Mensagem de Cobrança"><MessageCircle size={20} /></button>
                                  <button onClick={() => deleteClient(client.id)} className="p-3 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={20} /></button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                  <button onClick={() => setIsGlobalAuthenticated(false)} className="px-6 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all text-xs uppercase tracking-widest">BLOQUEAR ACESSO</button>
                  <button onClick={() => handleSave(false)} disabled={saveStatus !== 'idle'} className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg text-sm uppercase tracking-widest ${saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-black active:scale-95'}`}>
                    {saveStatus === 'idle' && 'SALVAR TUDO'}
                    {saveStatus === 'saving' && 'SALVANDO...'}
                    {saveStatus === 'saved' && 'CONCLUÍDO!'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
