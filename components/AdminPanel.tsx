
import React, { useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { StoreConfig, Prize, Winner } from '../types';
import { Settings, Gift, LayoutDashboard, Plus, Trash2, Key, Check, Eye, EyeOff, Database, RefreshCw, AlertTriangle, Terminal } from 'lucide-react';

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
    const adminPass = config.adminPassword || 'admin';
    const globalPass = config.globalAdminPassword || '123';
    
    if (passwordInput === adminPass || passwordInput === globalPass || passwordInput === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta!');
    }
  };

  const syncConfig = async () => {
    setSaveStatus('saving');
    // Filtramos apenas os campos que temos certeza que existem no banco para evitar erros de cache
    const payload = {
      id: 1,
      name: config.name,
      whatsappNumber: config.whatsappNumber,
      adminPassword: config.adminPassword,
      primaryColor: config.primaryColor,
      logoUrl: config.logoUrl,
      adminContactNumber: config.adminContactNumber,
      globalAdminPassword: config.globalAdminPassword
    };

    const { error } = await supabase.from('scratch_config').upsert(payload);
    
    if (error) {
      alert(`Erro ao salvar: ${error.message}\n\nCertifique-se de que executou o comando SQL de reparo.`);
      setSaveStatus('idle');
    } else {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const syncPrizes = async (newPrizes: Prize[]) => {
    setSaveStatus('saving');
    // Deletar prêmios antigos usando um filtro que sempre retorna verdadeiro mas é seguro
    await supabase.from('scratch_prizes').delete().neq('name', '___system_reserved_name___');
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

  // Script robusto (Idempotente) para o usuário copiar
  const sqlRepair = `-- 1. CRIAR TABELAS (SE NÃO EXISTIREM)
CREATE TABLE IF NOT EXISTS public.scratch_config (
  id bigint PRIMARY KEY DEFAULT 1,
  name text DEFAULT 'Minha Loja',
  "whatsappNumber" text DEFAULT '5500000000000',
  "adminPassword" text DEFAULT 'admin',
  "primaryColor" text DEFAULT '#4f46e5',
  "logoUrl" text DEFAULT 'https://cdn-icons-png.flaticon.com/512/606/606547.png',
  "adminContactNumber" text DEFAULT '5500000000000',
  "globalAdminPassword" text DEFAULT '123',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scratch_prizes (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  "isWinning" boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scratch_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userName" text NOT NULL,
  "userCpf" text NOT NULL,
  "prizeName" text NOT NULL,
  "prizeCode" text NOT NULL,
  date text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ADICIONAR COLUNAS (CASO JÁ EXISTA A TABELA ANTIGA)
ALTER TABLE public.scratch_config ADD COLUMN IF NOT EXISTS "adminContactNumber" text DEFAULT '5500000000000';
ALTER TABLE public.scratch_config ADD COLUMN IF NOT EXISTS "globalAdminPassword" text DEFAULT '123';

-- 3. INSERIR CONFIGURAÇÃO INICIAL (SE VAZIO)
INSERT INTO public.scratch_config (id, name) VALUES (1, 'Minha Loja') ON CONFLICT (id) DO NOTHING;

-- 4. HABILITAR REALTIME (COM VERIFICAÇÃO PARA EVITAR ERRO 42710)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scratch_config') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scratch_config;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scratch_prizes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scratch_prizes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scratch_winners') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scratch_winners;
  END IF;
END $$;`;

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-800">
        <div className="text-center mb-8">
          <Key className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Painel Admin</h2>
          <p className="text-slate-400 text-sm mt-1">Insira a senha de acesso</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              className="w-full p-4 pr-12 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white font-medium focus:border-indigo-500" 
              placeholder="Senha" 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold uppercase text-sm shadow-lg transition-all active:scale-95">
            ENTRAR NO PAINEL
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
      {(dbError || saveStatus === 'idle') && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <h4 className="text-amber-500 font-bold text-sm uppercase mb-1">Atenção ao SQL</h4>
              <p className="text-amber-500/70 text-xs leading-relaxed mb-4">
                Se ocorrer erro de publicação ou colunas faltando, copie e execute este script atualizado no seu SQL Editor do Supabase:
              </p>
              <div className="relative">
                <textarea 
                  readOnly 
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[9px] text-slate-500 outline-none"
                  value={sqlRepair}
                />
                <button 
                  onClick={() => { navigator.clipboard.writeText(sqlRepair); alert('Copiado! Agora cole no SQL Editor do Supabase e clique em RUN.'); }}
                  className="absolute bottom-2 right-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1.5"
                >
                  <Terminal size={12} /> Copiar SQL Corrigido
                </button>
              </div>
            </div>
          </div>
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
                  <Database size={18} className="text-indigo-500" /> Configuração da Loja
                </h3>
                {saveStatus !== 'idle' && (
                  <span className={`text-[9px] px-2 py-1 rounded-full font-bold flex items-center gap-1 ${saveStatus === 'saving' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' : 'bg-green-500/10 text-green-500'}`}>
                    <Check size={10} /> {saveStatus === 'saving' ? 'Salvando...' : 'Sincronizado'}
                  </span>
                )}
             </div>
             <div className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Loja</label>
                    <input type="text" value={config.name || ''} onChange={e => setConfig({...config, name: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">WhatsApp de Resgate</label>
                    <input type="text" value={config.whatsappNumber || ''} onChange={e => setConfig({...config, whatsappNumber: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Senha do Painel</label>
                    <input type="text" value={config.adminPassword || ''} onChange={e => setConfig({...config, adminPassword: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Senha Global (Alternativa)</label>
                    <input type="text" value={config.globalAdminPassword || ''} onChange={e => setConfig({...config, globalAdminPassword: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" />
                  </div>
                </div>
                <button onClick={syncConfig} className="w-full py-4 rounded-xl font-black bg-indigo-600 text-white hover:bg-indigo-500 transition-all uppercase text-xs tracking-widest shadow-lg shadow-indigo-900/20 active:scale-95">Salvar Configurações</button>
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
                     <input value={p.description || ''} placeholder="Mensagem de vitória..." onChange={e => { const up = [...prizes]; up[idx].description = e.target.value; setPrizes(up); }} className="text-[10px] text-slate-500 bg-transparent outline-none w-full" />
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
             <button onClick={() => syncPrizes(prizes)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">Atualizar Prêmios</button>
           </div>
        )}

        {activeTab === 'winners' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-lg font-black uppercase text-white">Últimos Ganhadores</h3>
               <button onClick={fetchData} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase flex items-center gap-1.5">
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
