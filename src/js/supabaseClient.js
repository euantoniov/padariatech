import { createClient } from '@supabase/supabase-js';

// Obter as variáveis de ambiente fornecidas pelo Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Configuração do Supabase ausente! Verifique o arquivo .env ou as variáveis na Vercel.');
}

// Criação e exportação do cliente Supabase para ser reutilizado em toda a aplicação
export const supabase = createClient(supabaseUrl, supabaseKey);
