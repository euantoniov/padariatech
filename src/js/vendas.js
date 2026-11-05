import { supabase } from './supabaseClient.js';

/**
 * Módulo de Registro e Histórico de Vendas do PadariaTech
 */

// Registrar venda transacional através da função RPC do PostgreSQL
export async function registrarVenda(itensCarrinho) {
  if (!itensCarrinho || itensCarrinho.length === 0) {
    throw new Error('O carrinho de compras está vazio.');
  }

  // Formatar itens para a função RPC (apenas produto_id e quantidade)
  const itensFormatados = itensCarrinho.map(item => ({
    produto_id: item.produto_id || item.id,
    quantidade: parseInt(item.quantidade, 10)
  }));

  // Validação preliminar do frontend
  for (const item of itensFormatados) {
    if (!item.produto_id) throw new Error('Item com identificador de produto inválido.');
    if (isNaN(item.quantidade) || item.quantidade <= 0) {
      throw new Error('A quantidade de cada produto deve ser maior que zero.');
    }
  }

  // Chamada à RPC transacional 'registrar_venda'
  const { data, error } = await supabase.rpc('registrar_venda', {
    p_itens: itensFormatados
  });

  if (error) {
    console.error('Erro na RPC registrar_venda:', error);
    throw new Error(error.message || 'Erro ao registrar venda.');
  }

  return data;
}

// Consultar o histórico completo de vendas com itens e nomes dos produtos
export async function listarHistoricoVendas() {
  const { data, error } = await supabase
    .from('vendas')
    .select(`
      id,
      data_venda,
      valor_total,
      itens_venda (
        id,
        quantidade,
        preco_unitario,
        subtotal,
        produtos (
          id,
          nome,
          categoria
        )
      )
    `)
    .order('data_venda', { ascending: false });

  if (error) {
    console.error('Erro ao buscar histórico de vendas:', error);
    throw new Error('Falha ao carregar histórico: ' + error.message);
  }

  return data || [];
}
