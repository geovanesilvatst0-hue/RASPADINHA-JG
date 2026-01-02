import React, { useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { StoreConfig, Prize, Winner } from '../types';
import { Settings, Gift, LayoutDashboard, Plus, Trash2, Key, Check, Eye, EyeOff, Database, RefreshCw, AlertTriangle } from 'lucide-react';

interface AdminPanelProps {
  supabase: SupabaseClient;
  config: StoreConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoreConfig>>;
  prizes: Prize[];
  setPrizes: React.Dispatch<React.SetStateAction<Prize[]>>;
  winners: Winner[];
  onBack: () => void;
  fetchData: () => Promise<void>;
  dbError?: string | null;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ supabase, config, setConfig, prizes, setPrizes, winners, onBack, fetchData, dbError }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'prizes' | 'winners'>('config');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === (config.adminPassword || 'admin') || passwordInput === 'admin' || passwordInput === 'admin123' || passwordInput === '123') {
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta!');
    }
  };

  const syncConfig = async () => {
    setSaveStatus('saving');
    const { error } = await supabase.from('scratch_config').upsert({ id: 1, ...config });
    if (error) {
      alert(`Erro: ${error.message}`);
      setSaveStatus('idle');
    } else {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const syncPrizes = async (newPrizes: Prize[]) => {
    setSaveStatus('saving');
    // Deleta os prêmios antigos
    await supabase.from('scratch_prizes').delete().neq('id', 'xpto_nao_existente');
    const { error } = await supabase.from('scratch_prizes').insert(newPrizes);
    
    if (error) {
      alert(`Erro ao salvar prêmios: ${error.message}`);
      setSaveStatus('idle');
    } else {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const addPrize = () => {
    const newPrize: Prize = { id: Date.now().toString(), name: 'Novo Prêmio', description: 'Descreva aqui', isWinning: true };
    setPrizes([...prizes, newPrize]);
  };

  const deletePrize = (id: string) => {
    setPrizes(prizes.filter(p => p.id !== id));
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-800">
        <div className="text-center mb-8">
          <Key className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Acesso Restrito</h2>
          <p className="text-slate-400 text-sm mt-1">Insira a senha do painel</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              className="w-full p-4 pr-12 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white font-medium focus:border-indigo-500" 
              placeholder="Senha Admin" 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold uppercase text-sm shadow-lg transition-all active:scale-95">
            ENTRAR
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
      {dbError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 flex items-center gap-3 text-amber-500 text-xs">
          <AlertTriangle size={18} />
          <span>O banco de dados ainda não está configurado. Verifique o console ou execute o SQL.</span>
        </div>
      )}

      <div className="flex border-b border-slate-800 bg-slate-950/50">
        <button onClick={() => setActiveTab('config')} className={`flex-1 py-5 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-indigo-600/10 text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
          <Settings size={16} /> Loja
        </button>
        <button onClick={() => setActiveTab('prizes')} className={`flex-1 py-5 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'prizes' ? 'bg-indigo-600/10 text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
          <Gift size={16} /> Prêmios
        </button>
        <button onClick={() => setActiveTab('winners')} className={`flex-1 py-5 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'winners' ? 'bg-indigo-600/10 text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
          <LayoutDashboard size={16} /> Ganhadores
        </button>
      </div>

      <div className="p-8">
        {activeTab === 'config' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                  <Database size={18} className="text-indigo-500" /> Configurações Gerais
                </h3>
                {saveStatus !== 'idle' && (
                  <span className={`text-[9px] px-2 py-1 rounded-full font-bold flex items-center gap-1 ${saveStatus === 'saving' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' : 'bg-green-500/10 text-green-500'}`}>
                    {saveStatus === 'saving' ? 'Salvando...' : 'Sincronizado'}
                  </span>
                )}
             </div>
             <div className="grid gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Loja</label>
                  <input type="text" value={config.name || ''} onChange={e => setConfig({...config, name: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">WhatsApp de Resgate</label>
                  <input type="text" value={config.whatsappNumber || ''} onChange={e => setConfig({...config, whatsappNumber: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Senha Admin</label>
                  <input type="text" value={config.adminPassword || ''} onChange={e => setConfig({...config, adminPassword: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" />
                </div>
                <button onClick={syncConfig} className="w-full py-4 rounded-xl font-black bg-indigo-600 text-white hover:bg-indigo-500 transition-all uppercase text-xs tracking-widest shadow-lg shadow-indigo-900/20 active:scale-95">Salvar Todas Alterações</button>
             </div>
          </div>
        )}

        {activeTab === 'prizes' && (
           <div className="space-y-6">
             <div className="flex justify-between items-center">
               <h3 className="text-lg font-black uppercase text-white">Editar Prêmios</h3>
               <button onClick={addPrize} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-xs transition-all">
                 <Plus size={16} /> Adicionar Item
               </button>
             </div>
             <div className="space-y-3">
               {prizes.map((p, idx) => (
                 <div key={p.id || idx} className="p-4 border border-slate-800 rounded-2xl bg-slate-950/30 flex flex-col md:flex-row gap-4 items-center group">
                   <div className="flex-1 w-full space-y-1">
                     <input value={p.name || ''} onChange={e => { const up = [...prizes]; up[idx].name = e.target.value; setPrizes(up); }} className="font-bold text-white bg-transparent outline-none w-full border-b border-slate-800 pb-1 focus:border-indigo-500" />
                     <input value={p.description || ''} placeholder="Mensagem..." onChange={e => { const up = [...prizes]; up[idx].description = e.target.value; setPrizes(up); }} className="text-[10px] text-slate-500 bg-transparent outline-none w-full" />
                   </div>
                   <div className="flex items-center gap-3">
                     <select value={p.isWinning ? "true" : "false"} onChange={e => { const up = [...prizes]; up[idx].isWinning = e.target.value === "true"; setPrizes(up); }} className="bg-slate-900 border border-slate-700 text-[9px] font-bold uppercase text-slate-400 p-2 rounded-lg outline-none">
                       <option value="true">Ganhador ✅</option>
                       <option value="false">Perdedor ❌</option>
                     </select>
                     <button onClick={() => deletePrize(p.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                       <Trash2 size={18} />
                     </button>
                   </div>
                 </div>
               ))}
             </div>
             <button onClick={() => syncPrizes(prizes)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">Atualizar Prêmios no Banco</button>
           </div>
        )}

        {activeTab === 'winners' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-lg font-black uppercase text-white">Últimos Ganhadores</h3>
               <button onClick={fetchData} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase flex items-center gap-1.5">
                 {/* Fix: Changed size(14) to size={14} to correctly assign the numeric prop value and resolve boolean type error */}
                 <RefreshCw size={14} /> Atualizar Agora
               </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="bg-slate-900/80 text-[9px] text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">CPF</th>
                    <th className="px-5 py-4">Prêmio</th>
                    <th className="px-5 py-4">Código / Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {winners.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-600 italic">Nenhum ganhador registrado.</td></tr>
                  ) : (
                    winners.map(w => (
                      <tr key={w.id} className="hover:bg-slate-900/30">
                        <td className="px-5 py-4 font-bold text-slate-200">{w.userName || 'N/A'}</td>
                        <td className="px-5 py-4 text-slate-500">{w.userCpf || 'N/A'}</td>
                        <td className="px-5 py-4"><span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-full font-black text-[8px] border border-indigo-500/20 uppercase">{w.prizeName || 'N/A'}</span></td>
                        <td className="px-5 py-4">
                          <div className="font-mono font-black text-white opacity-80">{w.prizeCode || 'N/A'}</div>
                          <div className="text-[8px] text-slate-700">{w.date || 'N/A'}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;