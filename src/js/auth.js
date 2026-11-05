import { supabase } from './supabaseClient.js';

/**
 * Módulo de Autenticação com Supabase Auth
 */

// Mensagens amigáveis em português para erros comuns do Supabase
export function traduzirErroAuth(erro) {
  if (!erro) return 'Ocorreu um erro desconhecido.';
  const msg = erro.message || '';
  if (msg.includes('Invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (msg.includes('User already registered')) {
    return 'Este e-mail já está cadastrado. Tente fazer login.';
  }
  if (msg.includes('Password should be at least 6 characters')) {
    return 'A senha deve conter pelo menos 6 caracteres.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'E-mail não confirmado. Verifique sua caixa de entrada se a confirmação estiver ativada.';
  }
  if (msg.includes('rate limit')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes.';
  }
  return msg;
}

// Cadastro de novo usuário com e-mail e senha
export async function cadastrarUsuario(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) {
    throw new Error(traduzirErroAuth(error));
  }
  return data;
}

// Login de usuário existente com e-mail e senha
export async function entrarUsuario(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    throw new Error(traduzirErroAuth(error));
  }
  return data;
}

// Encerrar sessão (Logout)
export async function sairUsuario() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(traduzirErroAuth(error));
  }
}

// Obter a sessão ativa atual
export async function obterSessaoAtual() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Erro ao verificar sessão:', error);
    return null;
  }
  return session;
}

// Escutar mudanças de estado de autenticação (login, logout, refresh)
export function monitorarAutenticacao(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
