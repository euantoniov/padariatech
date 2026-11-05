import { supabase } from './supabaseClient.js';

/**
 * Módulo de Gerenciamento de Produtos do PadariaTech
 */

// Listar produtos do usuário logado (com suporte a busca por nome)
export async function listarProdutos(busca = '') {
  let query = supabase
    .from('produtos')
    .select('*')
    .order('nome', { ascending: true });

  if (busca && busca.trim() !== '') {
    query = query.ilike('nome', `%${busca.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao listar produtos:', error);
    throw new Error('Não foi possível carregar os produtos: ' + error.message);
  }
  return data || [];
}

// Criar um novo produto
export async function criarProduto({ nome, categoria, preco, estoque }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  // Validações
  if (!nome || nome.trim() === '') throw new Error('O nome do produto é obrigatório.');
  if (!categoria || categoria.trim() === '') throw new Error('A categoria é obrigatória.');
  const precoNum = parseFloat(preco);
  const estoqueNum = parseInt(estoque, 10);

  if (isNaN(precoNum) || precoNum <= 0) throw new Error('O preço deve ser maior que zero.');
  if (isNaN(estoqueNum) || estoqueNum < 0) throw new Error('O estoque não pode ser negativo.');

  const { data, error } = await supabase
    .from('produtos')
    .insert([{
      nome: nome.trim(),
      categoria: categoria.trim(),
      preco: precoNum,
      estoque: estoqueNum,
      usuario_id: user.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao cadastrar produto:', error);
    throw new Error('Falha ao salvar produto: ' + error.message);
  }
  return data;
}

// Atualizar produto existente
export async function atualizarProduto(id, { nome, categoria, preco, estoque }) {
  if (!nome || nome.trim() === '') throw new Error('O nome do produto é obrigatório.');
  if (!categoria || categoria.trim() === '') throw new Error('A categoria é obrigatória.');
  const precoNum = parseFloat(preco);
  const estoqueNum = parseInt(estoque, 10);

  if (isNaN(precoNum) || precoNum <= 0) throw new Error('O preço deve ser maior que zero.');
  if (isNaN(estoqueNum) || estoqueNum < 0) throw new Error('O estoque não pode ser negativo.');

  const { data, error } = await supabase
    .from('produtos')
    .update({
      nome: nome.trim(),
      categoria: categoria.trim(),
      preco: precoNum,
      estoque: estoqueNum
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar produto:', error);
    throw new Error('Falha ao atualizar produto: ' + error.message);
  }
  return data;
}

// Excluir produto (com proteção de integridade referencial)
export async function excluirProduto(id) {
  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao excluir produto:', error);
    // Verificar violação de chave estrangeira (RESTRICT em itens_venda)
    if (error.code === '23503' || (error.message && error.message.includes('violates foreign key constraint'))) {
      throw new Error('Não é possível excluir este produto pois ele possui histórico de vendas associado. Para manter a integridade contábil, você pode zerar seu estoque.');
    }
    throw new Error('Falha ao excluir produto: ' + error.message);
  }
  return true;
}

// Cadastrar produtos de exemplo sem duplicar
export async function carregarProdutosExemplo() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const produtosPadrao = [
    { nome: 'Pão francês', categoria: 'Pães', preco: 1.00, estoque: 100 },
    { nome: 'Pão de queijo', categoria: 'Salgados', preco: 4.50, estoque: 40 },
    { nome: 'Café expresso', categoria: 'Bebidas', preco: 5.00, estoque: 30 },
    { nome: 'Bolo de chocolate', categoria: 'Doces', preco: 35.00, estoque: 8 },
    { nome: 'Croissant', categoria: 'Pães', preco: 8.50, estoque: 20 },
    { nome: 'Sonho', categoria: 'Doces', preco: 6.00, estoque: 15 },
    { nome: 'Leite integral', categoria: 'Laticínios', preco: 6.50, estoque: 25 },
    { nome: 'Sanduíche natural', categoria: 'Lanches', preco: 12.00, estoque: 12 }
  ];

  // Buscar produtos já existentes do usuário
  const existentes = await listarProdutos();
  const nomesExistentes = new Set(existentes.map(p => p.nome.toLowerCase().trim()));

  // Filtrar apenas os que ainda não foram criados
  const novos = produtosPadrao
    .filter(p => !nomesExistentes.has(p.nome.toLowerCase().trim()))
    .map(p => ({ ...p, usuario_id: user.id }));

  if (novos.length === 0) {
    return { inseridos: 0, mensagem: 'Todos os produtos de exemplo já existem no seu catálogo.' };
  }

  const { error } = await supabase
    .from('produtos')
    .insert(novos);

  if (error) {
    console.error('Erro ao carregar exemplos:', error);
    throw new Error('Falha ao inserir produtos de exemplo: ' + error.message);
  }

  return { inseridos: novos.length, mensagem: `${novos.length} produtos de exemplo adicionados com sucesso!` };
}
