import { supabase } from './supabaseClient.js';
import { listarProdutos } from './produtos.js';

/**
 * Módulo de Dashboard do PadariaTech
 */

export async function carregarDadosDashboard() {
  // 1. Carregar produtos
  const produtos = await listarProdutos();
  const totalProdutos = produtos.length;
  const produtosEstoqueBaixo = produtos.filter(p => p.estoque < 10);

  // 2. Carregar vendas
  const { data: vendas, error: erroVendas } = await supabase
    .from('vendas')
    .select('id, data_venda, valor_total')
    .order('data_venda', { ascending: false });

  if (erroVendas) {
    console.error('Erro ao carregar vendas no dashboard:', erroVendas);
    throw new Error('Falha ao calcular indicadores de vendas: ' + erroVendas.message);
  }

  const listaVendas = vendas || [];
  const quantidadeVendas = listaVendas.length;
  const faturamentoTotal = listaVendas.reduce((acc, v) => acc + Number(v.valor_total || 0), 0);
  const ultimasCincoVendas = listaVendas.slice(0, 5);

  return {
    totalProdutos,
    produtosEstoqueBaixo,
    quantidadeVendas,
    faturamentoTotal,
    ultimasCincoVendas
  };
}
