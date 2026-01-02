
import { Prize, StoreConfig } from './types';

export const INITIAL_PRIZES: Prize[] = [
  { id: '1', name: '50% de Desconto', description: 'Ganhou 10% na próxima compra!', isWinning: true },
  { id: '2', name: 'Brinde Surpresa', description: 'Retire um brinde no balcão!', isWinning: true },
  { id: '3', name: 'Vale R$ 20,00', description: 'Desconto direto no caixa.', isWinning: true },
  { id: '4', name: 'Teste direto na fonte', description: 'Não foi dessa vez!', isWinning: false },
];

export const INITIAL_CONFIG: StoreConfig = {
  name: 'JG Presentes',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/606/606547.png',
  primaryColor: '#4f46e5',
  whatsappNumber: '5564993408657',
  adminPassword: 'admin',
  // Número que receberá os leads do botão "Quero fazer minha própria raspadinha"
  adminContactNumber: '5564993408657',
  globalAdminPassword: '123', // Senha inicial solicitada
  platformClients: [],
};

export const SCRATCH_THRESHOLD = 45;
