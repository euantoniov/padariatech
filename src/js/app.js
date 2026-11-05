import { entrarUsuario, cadastrarUsuario, sairUsuario, obterSessaoAtual, monitorarAutenticacao } from './auth.js';
import { listarProdutos, criarProduto, atualizarProduto, excluirProduto, carregarProdutosExemplo } from './produtos.js';
import { registrarVenda, listarHistoricoVendas } from './vendas.js';
import { carregarDadosDashboard } from './dashboard.js';

/**
 * Aplicação Principal PadariaTech
 */

// Estado da Aplicação
let usuarioAtual = null;
let carrinho = []; // Formato: [{ produto: {}, quantidade: 1 }]
let produtosEmMemoria = [];

// Elementos DOM Principais
const viewAuth = document.getElementById('view-auth');
const viewApp = document.getElementById('view-app');
const formLogin = document.getElementById('form-login');
const formCadastro = document.getElementById('form-cadastro');
const linkIrCadastro = document.getElementById('link-ir-cadastro');
const linkIrLogin = document.getElementById('link-ir-login');
const userDisplayEmail = document.getElementById('user-display-email');
const btnLogout = document.getElementById('btn-logout');
const toastContainer = document.getElementById('toast-container');
const btnToggleMenu = document.getElementById('btn-toggle-menu');
const sidebar = document.getElementById('sidebar');

// Subvisões
const subviews = {
  dashboard: document.getElementById('subview-dashboard'),
  produtos: document.getElementById('subview-produtos'),
  vendas: document.getElementById('subview-vendas'),
  historico: document.getElementById('subview-historico')
};

// ============================================================================
// Utilitários de Interface e Notificações (Toasts)
// ============================================================================
export function mostrarToast(mensagem, tipo = 'sucesso') {
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensagem;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor || 0));
}

function formatarData(dataString) {
  if (!dataString) return '-';
  const data = new Date(dataString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(data);
}

// ============================================================================
// Navegação Entre Telas do Painel
// ============================================================================
function alternarVisualizacao(nomeView) {
  // Ocultar todas as subvisões
  Object.values(subviews).forEach(el => {
    if (el) el.style.display = 'none';
  });

  // Exibir a subvisão selecionada
  if (subviews[nomeView]) {
    subviews[nomeView].style.display = 'block';
  }

  // Atualizar classes ativas na barra lateral
  document.querySelectorAll('.sidebar-menu .nav-link').forEach(link => {
    if (link.dataset.view === nomeView) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Fechar sidebar mobile se estiver aberta
  if (sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
  }

  // Executar carga de dados da visão específica
  if (nomeView === 'dashboard') carregarViewDashboard();
  if (nomeView === 'produtos') carregarViewProdutos();
  if (nomeView === 'vendas') carregarViewVendas();
  if (nomeView === 'historico') carregarViewHistorico();
}

// ============================================================================
// Lógica da Tela: DASHBOARD
// ============================================================================
async function carregarViewDashboard() {
  try {
    const dados = await carregarDadosDashboard();

    document.getElementById('stat-total-produtos').textContent = dados.totalProdutos;
    document.getElementById('stat-estoque-baixo').textContent = dados.produtosEstoqueBaixo.length;
    document.getElementById('stat-total-vendas').textContent = dados.quantidadeVendas;
    document.getElementById('stat-faturamento').textContent = formatarMoeda(dados.faturamentoTotal);

    const tbody = document.getElementById('tbody-ultimas-vendas');
    if (dados.ultimasCincoVendas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--cor-texto-mutado);">Nenhuma venda registrada ainda.</td></tr>`;
      return;
    }

    tbody.innerHTML = dados.ultimasCincoVendas.map(v => `
      <tr>
        <td><strong>#${v.id}</strong></td>
        <td>${formatarData(v.data_venda)}</td>
        <td style="font-weight: 700; color: var(--cor-caramelo);">${formatarMoeda(v.valor_total)}</td>
      </tr>
    `).join('');

  } catch (erro) {
    mostrarToast(erro.message, 'erro');
  }
}

// ============================================================================
// Lógica da Tela: PRODUTOS
// ============================================================================
async function carregarViewProdutos(termoBusca = '') {
  const tbody = document.getElementById('tbody-produtos');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--cor-texto-mutado);">Carregando catálogo...</td></tr>`;

  try {
    const produtos = await listarProdutos(termoBusca);
    produtosEmMemoria = produtos;

    if (produtos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--cor-texto-mutado);">Nenhum produto encontrado. Adicione um novo produto ou carregue os exemplos!</td></tr>`;
      return;
    }

    tbody.innerHTML = produtos.map(p => {
      const estoqueBaixo = p.estoque < 10;
      const statusBadge = estoqueBaixo
        ? `<span class="badge badge-estoque-baixo">Baixo Estoque</span>`
        : `<span class="badge badge-estoque-ok">Normal</span>`;

      return `
        <tr>
          <td>#${p.id}</td>
          <td><strong>${p.nome}</strong></td>
          <td>${p.categoria}</td>
          <td>${formatarMoeda(p.preco)}</td>
          <td>${p.estoque} un</td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm btn-editar-prod" data-id="${p.id}">✏️ Editar</button>
            <button class="btn btn-danger btn-sm btn-excluir-prod" data-id="${p.id}" data-nome="${p.nome}">🗑️ Excluir</button>
          </td>
        </tr>
      `;
    }).join('');

    // Eventos de Ações da Tabela
    document.querySelectorAll('.btn-editar-prod').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = produtosEmMemoria.find(p => p.id == btn.dataset.id);
        if (prod) abrirModalProduto(prod);
      });
    });

    document.querySelectorAll('.btn-excluir-prod').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const nome = btn.dataset.nome;
        if (confirm(`Tem certeza que deseja excluir o produto "${nome}"?`)) {
          try {
            await excluirProduto(id);
            mostrarToast(`Produto "${nome}" excluído com sucesso!`);
            carregarViewProdutos(document.getElementById('input-busca-produto').value);
          } catch (erro) {
            mostrarToast(erro.message, 'erro');
          }
        }
      });
    });

  } catch (erro) {
    mostrarToast(erro.message, 'erro');
  }
}

// Modal de Criação / Edição de Produto
const modalProduto = document.getElementById('modal-produto');
const formSalvarProduto = document.getElementById('form-salvar-produto');
const modalProdutoTitulo = document.getElementById('modal-produto-titulo');

function abrirModalProduto(produto = null) {
  if (produto) {
    modalProdutoTitulo.textContent = 'Editar Produto';
    document.getElementById('prod-id').value = produto.id;
    document.getElementById('prod-nome').value = produto.nome;
    document.getElementById('prod-categoria').value = produto.categoria;
    document.getElementById('prod-preco').value = produto.preco;
    document.getElementById('prod-estoque').value = produto.estoque;
  } else {
    modalProdutoTitulo.textContent = 'Novo Produto';
    formSalvarProduto.reset();
    document.getElementById('prod-id').value = '';
  }
  modalProduto.style.display = 'flex';
}

function fecharModalProduto() {
  modalProduto.style.display = 'none';
  formSalvarProduto.reset();
}

// ============================================================================
// Lógica da Tela: FRENTE DE CAIXA (PDV) E CARRINHO
// ============================================================================
async function carregarViewVendas() {
  const grid = document.getElementById('pos-grid-produtos');
  grid.innerHTML = '<p style="color: var(--cor-texto-mutado); padding: 20px;">Carregando produtos para o balcão...</p>';

  try {
    const produtos = await listarProdutos();
    produtosEmMemoria = produtos;
    renderizarCatalogoPDV(produtos);
    atualizarExibicaoCarrinho();
  } catch (erro) {
    mostrarToast(erro.message, 'erro');
  }
}

function renderizarCatalogoPDV(produtos) {
  const grid = document.getElementById('pos-grid-produtos');
  if (produtos.length === 0) {
    grid.innerHTML = '<p style="color: var(--cor-texto-mutado); padding: 20px;">Nenhum produto cadastrado no estoque.</p>';
    return;
  }

  grid.innerHTML = produtos.map(p => {
    const semEstoque = p.estoque <= 0;
    return `
      <div class="product-tile ${semEstoque ? 'sem-estoque' : ''}" data-id="${p.id}">
        <div>
          <span class="tile-category">${p.categoria}</span>
          <h4 class="tile-title">${p.nome}</h4>
        </div>
        <div class="tile-footer">
          <span class="tile-price">${formatarMoeda(p.preco)}</span>
          <span class="tile-stock">${p.estoque} em estoque</span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.product-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const prodId = tile.dataset.id;
      const produto = produtosEmMemoria.find(p => p.id == prodId);
      if (!produto || produto.estoque <= 0) {
        mostrarToast('Produto esgotado ou indisponível.', 'aviso');
        return;
      }
      adicionarAoCarrinho(produto);
    });
  });
}

function adicionarAoCarrinho(produto) {
  const itemExistente = carrinho.find(item => item.produto.id === produto.id);
  const quantidadeAtual = itemExistente ? itemExistente.quantidade : 0;

  if (quantidadeAtual + 1 > produto.estoque) {
    mostrarToast(`Estoque máximo atingido para ${produto.nome} (${produto.estoque} un).`, 'aviso');
    return;
  }

  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({ produto, quantidade: 1 });
  }

  mostrarToast(`${produto.nome} adicionado ao carrinho.`);
  atualizarExibicaoCarrinho();
}

function atualizarExibicaoCarrinho() {
  const lista = document.getElementById('cart-list');
  const totalEl = document.getElementById('cart-total-valor');

  if (carrinho.length === 0) {
    lista.innerHTML = `
      <li style="text-align: center; padding: 24px; color: var(--cor-texto-mutado);">
        O carrinho está vazio.<br/>Clique nos produtos ao lado para adicionar.
      </li>
    `;
    totalEl.textContent = 'R$ 0,00';
    return;
  }

  let totalGeral = 0;

  lista.innerHTML = carrinho.map((item, index) => {
    const subtotal = item.produto.preco * item.quantidade;
    totalGeral += subtotal;

    return `
      <li class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.produto.nome}</div>
          <div class="cart-item-price">${item.quantidade} x ${formatarMoeda(item.produto.preco)} = <strong>${formatarMoeda(subtotal)}</strong></div>
        </div>
        <div class="cart-item-actions">
          <button class="qty-btn btn-diminuir-qty" data-index="${index}">-</button>
          <span style="font-weight: 600; min-width: 20px; text-align: center;">${item.quantidade}</span>
          <button class="qty-btn btn-aumentar-qty" data-index="${index}">+</button>
          <button class="btn btn-danger btn-sm btn-remover-item" data-index="${index}" style="padding: 4px 8px; margin-left: 6px;">✕</button>
        </div>
      </li>
    `;
  }).join('');

  totalEl.textContent = formatarMoeda(totalGeral);

  // Eventos nos botões de quantidade
  lista.querySelectorAll('.btn-aumentar-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      const item = carrinho[idx];
      if (item.quantidade + 1 > item.produto.estoque) {
        mostrarToast('Limite de estoque atingido!', 'aviso');
        return;
      }
      item.quantidade += 1;
      atualizarExibicaoCarrinho();
    });
  });

  lista.querySelectorAll('.btn-diminuir-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      if (carrinho[idx].quantidade > 1) {
        carrinho[idx].quantidade -= 1;
      } else {
        carrinho.splice(idx, 1);
      }
      atualizarExibicaoCarrinho();
    });
  });

  lista.querySelectorAll('.btn-remover-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      carrinho.splice(idx, 1);
      atualizarExibicaoCarrinho();
    });
  });
}

// ============================================================================
// Lógica da Tela: HISTÓRICO DE VENDAS
// ============================================================================
async function carregarViewHistorico() {
  const tbody = document.getElementById('tbody-historico');
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--cor-texto-mutado);">Carregando histórico...</td></tr>`;

  try {
    const historico = await listarHistoricoVendas();

    if (historico.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--cor-texto-mutado);">Nenhuma venda registrada até o momento.</td></tr>`;
      return;
    }

    tbody.innerHTML = historico.map(v => {
      const itensHtml = (v.itens_venda || []).map(item => `
        <div style="font-size: 0.85rem; margin-bottom: 2px;">
          • ${item.quantidade}x <strong>${item.produtos?.nome || 'Item'}</strong> (${formatarMoeda(item.preco_unitario)}) = ${formatarMoeda(item.subtotal)}
        </div>
      `).join('');

      return `
        <tr>
          <td><strong>#${v.id}</strong></td>
          <td>${formatarData(v.data_venda)}</td>
          <td style="font-weight: 700; color: var(--cor-caramelo);">${formatarMoeda(v.valor_total)}</td>
          <td>${itensHtml || '<span style="color: var(--cor-texto-mutado);">Sem detalhes</span>'}</td>
        </tr>
      `;
    }).join('');

  } catch (erro) {
    mostrarToast(erro.message, 'erro');
  }
}

// ============================================================================
// Inicialização e Configuração de Eventos
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Verificar Sessão Ativa ao Carregar
  const sessaoInicial = await obterSessaoAtual();
  tratarMudancaSessao(sessaoInicial);

  // 2. Monitorar Mudanças no Supabase Auth
  monitorarAutenticacao((evento, sessao) => {
    tratarMudancaSessao(sessao);
  });

  function tratarMudancaSessao(sessao) {
    if (sessao && sessao.user) {
      usuarioAtual = sessao.user;
      userDisplayEmail.textContent = sessao.user.email;
      viewAuth.style.display = 'none';
      viewApp.style.display = 'flex';
      alternarVisualizacao('dashboard');
    } else {
      usuarioAtual = null;
      carrinho = [];
      viewAuth.style.display = 'flex';
      viewApp.style.display = 'none';
    }
  }

  // 3. Alternância entre Login e Cadastro
  linkIrCadastro.addEventListener('click', (e) => {
    e.preventDefault();
    formLogin.style.display = 'none';
    formCadastro.style.display = 'block';
  });

  linkIrLogin.addEventListener('click', (e) => {
    e.preventDefault();
    formCadastro.style.display = 'none';
    formLogin.style.display = 'block';
  });

  // 4. Submissão do Login
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const btnEntrar = document.getElementById('btn-entrar');

    btnEntrar.disabled = true;
    btnEntrar.textContent = 'Autenticando...';

    try {
      await entrarUsuario(email, senha);
      mostrarToast('Login realizado com sucesso!');
    } catch (erro) {
      mostrarToast(erro.message, 'erro');
    } finally {
      btnEntrar.disabled = false;
      btnEntrar.textContent = 'Entrar no Sistema';
    }
  });

  // 5. Submissão do Cadastro
  formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('cad-email').value.trim();
    const senha = document.getElementById('cad-senha').value;
    const confirmarSenha = document.getElementById('cad-confirmar-senha').value;
    const btnCadastrar = document.getElementById('btn-cadastrar');

    if (senha !== confirmarSenha) {
      mostrarToast('As senhas não coincidem!', 'aviso');
      return;
    }

    btnCadastrar.disabled = true;
    btnCadastrar.textContent = 'Criando conta...';

    try {
      const data = await cadastrarUsuario(email, senha);
      if (data.session) {
        mostrarToast('Conta criada com sucesso! Bem-vindo ao PadariaTech.');
      } else {
        mostrarToast('Conta criada! Se o seu projeto exigir confirmação de e-mail, verifique sua caixa de entrada.', 'aviso');
        formCadastro.style.display = 'none';
        formLogin.style.display = 'block';
      }
    } catch (erro) {
      mostrarToast(erro.message, 'erro');
    } finally {
      btnCadastrar.disabled = false;
      btnCadastrar.textContent = 'Criar Conta';
    }
  });

  // 6. Logout
  btnLogout.addEventListener('click', async () => {
    try {
      await sairUsuario();
      mostrarToast('Sessão encerrada com sucesso.');
    } catch (erro) {
      mostrarToast(erro.message, 'erro');
    }
  });

  // 7. Navegação na Barra Lateral
  document.querySelectorAll('.sidebar-menu .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const viewName = link.dataset.view;
      alternarVisualizacao(viewName);
    });
  });

  // 8. Botão Toggle Menu Mobile
  btnToggleMenu.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // 9. Ações do Dashboard
  document.getElementById('btn-recarregar-dashboard').addEventListener('click', () => {
    carregarViewDashboard();
    mostrarToast('Dashboard atualizado!');
  });

  // 10. Ações da Tela de Produtos
  document.getElementById('btn-abrir-novo-produto').addEventListener('click', () => {
    abrirModalProduto();
  });

  document.getElementById('btn-fechar-modal-prod').addEventListener('click', fecharModalProduto);
  document.getElementById('btn-cancelar-modal-prod').addEventListener('click', fecharModalProduto);

  // Busca de produtos com debounce
  let timeoutBusca;
  document.getElementById('input-busca-produto').addEventListener('input', (e) => {
    clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(() => {
      carregarViewProdutos(e.target.value);
    }, 300);
  });

  // Salvar Produto (Novo ou Edição)
  formSalvarProduto.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const nome = document.getElementById('prod-nome').value;
    const categoria = document.getElementById('prod-categoria').value;
    const preco = document.getElementById('prod-preco').value;
    const estoque = document.getElementById('prod-estoque').value;
    const btnSalvar = document.getElementById('btn-confirmar-salvar-prod');

    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';

    try {
      if (id) {
        await atualizarProduto(id, { nome, categoria, preco, estoque });
        mostrarToast('Produto atualizado com sucesso!');
      } else {
        await criarProduto({ nome, categoria, preco, estoque });
        mostrarToast('Produto cadastrado com sucesso!');
      }
      fecharModalProduto();
      carregarViewProdutos(document.getElementById('input-busca-produto').value);
    } catch (erro) {
      mostrarToast(erro.message, 'erro');
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.textContent = 'Salvar Produto';
    }
  });

  // Carregar produtos de exemplo
  document.getElementById('btn-carregar-exemplos').addEventListener('click', async () => {
    const btn = document.getElementById('btn-carregar-exemplos');
    btn.disabled = true;
    btn.textContent = 'Carregando...';
    try {
      const res = await carregarProdutosExemplo();
      mostrarToast(res.mensagem, res.inseridos > 0 ? 'sucesso' : 'aviso');
      carregarViewProdutos();
    } catch (erro) {
      mostrarToast(erro.message, 'erro');
    } finally {
      btn.disabled = false;
      btn.textContent = '✨ Carregar Exemplos';
    }
  });

  // 11. Ações da Frente de Caixa (PDV)
  document.getElementById('input-pdv-busca').addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase().trim();
    const filtrados = produtosEmMemoria.filter(p =>
      p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo)
    );
    renderizarCatalogoPDV(filtrados);
  });

  document.getElementById('btn-limpar-carrinho').addEventListener('click', () => {
    if (carrinho.length > 0 && confirm('Deseja realmente esvaziar o carrinho?')) {
      carrinho = [];
      atualizarExibicaoCarrinho();
      mostrarToast('Carrinho esvaziado.');
    }
  });

  document.getElementById('btn-finalizar-venda').addEventListener('click', async () => {
    if (carrinho.length === 0) {
      mostrarToast('O carrinho está vazio!', 'aviso');
      return;
    }

    const btn = document.getElementById('btn-finalizar-venda');
    btn.disabled = true;
    btn.textContent = 'Processando venda...';

    try {
      // Converte carrinho para formato de envio à RPC
      const itensEnvio = carrinho.map(item => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade
      }));

      const resultado = await registrarVenda(itensEnvio);
      mostrarToast(`Venda #${resultado.venda_id} concluída com sucesso! Total: ${formatarMoeda(resultado.valor_total)}`);

      // Limpar carrinho e recarregar dados do catálogo PDV
      carrinho = [];
      atualizarExibicaoCarrinho();
      await carregarViewVendas();

    } catch (erro) {
      mostrarToast(erro.message, 'erro');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Finalizar Venda';
    }
  });

  // 12. Ações do Histórico
  document.getElementById('btn-recarregar-historico').addEventListener('click', () => {
    carregarViewHistorico();
    mostrarToast('Histórico atualizado!');
  });

});
