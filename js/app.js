import {
  initDB,
  initDefaultData,
  addMesa,
  updateMesa,
  getMesa,
  getAllMesas,
  deleteMesa,
  addProduto,
  updateProduto,
  getProduto,
  getAllProdutos,
  deleteProduto,
  addHistorico,
  getHistorico,
  getAllHistorico,
  getHistoricoByDate,
  deleteHistorico,
  clearAllHistorico,
} from "./database.js";

import {
  formatMoney,
  showNotification,
  openModal,
  closeModal,
  calcularTotalMesa,
  formatDate,
} from "./utils.js";

// Variáveis globais
let mesaAtual = null;
let produtos = [];
let mesas = [];
let divisaoAnterior = 1;

// Inicializar aplicação
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initDB();
    await initDefaultData();

    produtos = await getAllProdutos();
    mesas = await getAllMesas();

    setupEventListeners();
    renderMesas();
    renderProdutos();

    if (mesas.length > 0) {
      selectMesa(mesas[0].id);
    }

    // Configurar fechamento de modais
    document.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".modal");
        modal.style.display = "none";
      });
    });

    window.addEventListener("click", (event) => {
      if (event.target.classList.contains("modal")) {
        event.target.style.display = "none";
      }
    });

    // Iniciar atualização periódica das mesas
    setInterval(atualizarMesasPeriodicamente, 2000);

    showNotification("Sistema carregado com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao inicializar aplicação:", error);
    showNotification("Erro ao carregar o sistema!", "error");
  }
});

// Funções globais para gerenciamento de produtos
window.editarProduto = async function(id) {
  try {
    const produto = await getProduto(id);
    if (!produto) {
      showNotification("Produto não encontrado!", "error");
      return;
    }

    document.getElementById("produto-id").value = produto.id;
    document.getElementById("produto-nome").value = produto.nome;
    document.getElementById("produto-preco").value = produto.preco;
    document.getElementById("produto-categoria").value = produto.categoria;
    
    // Rolagem para o formulário
    document.getElementById("produtos-form").scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    console.error("Erro ao carregar produto:", e);
    showNotification("Erro ao carregar produto!", "error");
  }
};

window.excluirProduto = async function(id) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;
  
  try {
    await deleteProduto(id);
    showNotification("Produto excluído com sucesso!", "success");
    renderGerenciadorProdutos();
    produtos = await getAllProdutos();
    renderProdutos();
  } catch (e) {
    console.error(e);
    showNotification("Erro ao excluir produto!", "error");
  }
};

// Atualizar mesas periodicamente
async function atualizarMesasPeriodicamente() {
  try {
    const novasMesas = await getAllMesas();
    if (JSON.stringify(novasMesas) !== JSON.stringify(mesas)) {
      mesas = novasMesas;
      renderMesas();

      if (mesaAtual) {
        const mesaAtualizada = await getMesa(mesaAtual.id);
        if (JSON.stringify(mesaAtualizada) !== JSON.stringify(mesaAtual)) {
          mesaAtual = mesaAtualizada;
          renderConsumoMesa();
        }
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar mesas:", error);
  }
}

// Configurar eventos
function setupEventListeners() {
  document.getElementById("nova-mesa").addEventListener("click", async () => {
    const nome = prompt(
      "Digite o nome da nova mesa:",
      `Mesa ${mesas.length + 1}`
    );
    if (nome) {
      try {
        const id = await addMesa(nome);
        mesas = await getAllMesas();
        renderMesas();
        selectMesa(id);
        showNotification("Mesa criada com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao criar mesa:", error);
        showNotification("Erro ao criar mesa!", "error");
      }
    }
  });

  document.getElementById("btn-gerenciar-produtos").addEventListener("click", () => {
    openModal("modal-gerenciar-produtos");
    renderGerenciadorProdutos();
  });

  document.getElementById("btn-salvar-produto").addEventListener("click", async () => {
    const idRaw = document.getElementById("produto-id").value;
    const id = parseInt(idRaw, 10);
    const isEdicao = !isNaN(id) && id > 0;
    const nome = document.getElementById("produto-nome").value.trim();
    const preco = parseFloat(document.getElementById("produto-preco").value);
    const categoria = document.getElementById("produto-categoria").value.trim();
    
    if (!nome || isNaN(preco) || preco <= 0 || !categoria) {
      showNotification("Preencha todos os campos corretamente!", "warning");
      return;
    }
    
    const produto = { nome, preco, categoria };
    
    try {
      if (isEdicao) {
        produto.id = id;
        await updateProduto(produto);
        showNotification("Produto atualizado com sucesso!", "success");
      } else {
        await addProduto(produto);
        showNotification("Produto adicionado com sucesso!", "success");
      }
      
      // Limpa o formulário e atualiza as listas
      document.getElementById("produto-id").value = "";
      document.getElementById("produto-nome").value = "";
      document.getElementById("produto-preco").value = "";
      document.getElementById("produto-categoria").value = "";
      
      renderGerenciadorProdutos();
      produtos = await getAllProdutos();
      renderProdutos();
    } catch (e) {
      console.error(e);
      showNotification("Erro ao salvar produto", "error");
    }
  });

  document
    .getElementById("excluir-mesa")
    .addEventListener("click", excluirMesaAtual);

  document.getElementById("busca-produto").addEventListener("input", (e) => {
    renderProdutos(e.target.value.toLowerCase());
  });

  document.querySelectorAll(".categoria-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".categoria-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderProdutos();
    });
  });

  document.getElementById("aplicar-desconto").addEventListener("click", () => {
    openModal("modal-desconto");
  });

  document.getElementById("dividir-conta").addEventListener("click", () => {
    openModal("modal-dividir");
  });

  document.getElementById("salvar-mesa").addEventListener("click", () => {
    salvarMesa();
  });

  document.getElementById("finalizar-conta").addEventListener("click", () => {
    if (mesaAtual && mesaAtual.itens.length > 0) {
      openModal("modal-pagamento");
    } else {
      showNotification("Adicione itens à mesa antes de finalizar!", "warning");
    }
  });

  document.getElementById("btn-historico").addEventListener("click", () => {
    openModal("modal-historico");
    renderHistorico();
  });

  document.getElementById("btn-item-custom").addEventListener("click", () => {
    openModal("modal-item-custom");
  });

  document
    .getElementById("aplicar-desconto-btn")
    .addEventListener("click", aplicarDesconto);
  document
    .getElementById("cancelar-desconto")
    .addEventListener("click", cancelarDesconto);

  document.querySelectorAll(".divisao-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pessoas = parseInt(btn.dataset.pessoas);
      dividirConta(pessoas);
    });
  });

  document
    .getElementById("divisao-personalizada")
    .addEventListener("change", (e) => {
      const pessoas = parseInt(e.target.value);
      if (pessoas > 1) {
        dividirConta(pessoas);
      }
    });

  document.getElementById("confirmar-divisao").addEventListener("click", () => {
    closeModal("modal-dividir");
  });

  document
    .querySelectorAll('input[name="forma-pagamento"]')
    .forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const trocoSection = document.getElementById("troco-section");
        if (e.target.value === "dinheiro") {
          trocoSection.classList.remove("hidden");
          document.getElementById("valor-recebido").focus();
        } else {
          trocoSection.classList.add("hidden");
        }
      });
    });

  document.getElementById("valor-recebido").addEventListener("input", (e) => {
    if (mesaAtual) {
      const valorRecebido = parseFloat(e.target.value) || 0;
      const total = calcularTotalMesa(mesaAtual).total;
      const troco = valorRecebido - total;
      document.getElementById(
        "troco-resultado"
      ).textContent = `Troco: ${formatMoney(troco > 0 ? troco : 0)}`;
    }
  });

  document
    .getElementById("confirmar-pagamento")
    .addEventListener("click", finalizarConta);

  document.getElementById("filtro-data").addEventListener("change", (e) => {
    renderHistorico(e.target.value);
  });

  document.getElementById("filtro-mesa").addEventListener("change", (e) => {
    renderHistorico(null, e.target.value);
  });

  document
    .getElementById("adicionar-item-custom")
    .addEventListener("click", adicionarItemCustomizado);

  document
    .getElementById("limpar-historico")
    .addEventListener("click", limparHistoricoCompleto);
}

// Renderizar gerenciador de produtos
function renderGerenciadorProdutos() {
  const lista = document.getElementById("lista-produtos-gerenciar");
  lista.innerHTML = "";

  // Adicione evento de busca
  const buscaInput = document.getElementById("busca-gerenciar-produto");
  buscaInput.addEventListener("input", (e) => {
    const termo = e.target.value.toLowerCase();
    const itens = lista.querySelectorAll(".item-consumo");
    
    itens.forEach(item => {
      const texto = item.textContent.toLowerCase();
      item.style.display = texto.includes(termo) ? "flex" : "none";
    });
  });

  getAllProdutos().then((produtos) => {
    if (produtos.length === 0) {
      lista.innerHTML = "<p>Nenhum produto cadastrado.</p>";
      return;
    }

    produtos.forEach((produto) => {
      const div = document.createElement("div");
      div.className = "item-consumo";
      div.style.display = "flex"; // Garante que o flex seja aplicado

      div.innerHTML = `
        <div style="flex: 1;">
          <div class="item-nome">${produto.nome}</div>
          <div class="item-preco">${formatMoney(produto.preco)} - ${produto.categoria}</div>
        </div>
        <div>
          <button class="btn" onclick="editarProduto(${produto.id})">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger" onclick="excluirProduto(${produto.id})">
            <i class="fas fa-trash"></i> Excluir
          </button>
        </div>
      `;
      lista.appendChild(div);
    });
  });
}

// Excluir mesa atual
async function excluirMesaAtual() {
  if (!mesaAtual) {
    showNotification("Selecione uma mesa para excluir!", "warning");
    return;
  }

  // Verifica se é uma mesa padrão
  const isMesaPadrao = /^Mesa [1-5]$/.test(mesaAtual.nome);

  if (isMesaPadrao) {
    showNotification("Não é possível excluir mesas padrão (1-10)!", "warning");
    return;
  }

  if (
    !confirm(
      `Tem certeza que deseja excluir permanentemente a ${mesaAtual.nome}?`
    )
  ) {
    return;
  }

  try {
    await deleteMesa(mesaAtual.id);
    mesas = await getAllMesas();

    // Seleciona a primeira mesa disponível ou cria uma nova se não houver mesas
    if (mesas.length > 0) {
      selectMesa(mesas[0].id);
    } else {
      const id = await addMesa();
      mesas = await getAllMesas();
      selectMesa(id);
    }

    showNotification("Mesa excluída com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao excluir mesa:", error);
    showNotification("Erro ao excluir mesa!", "error");
  }
}

// Renderizar lista de mesas
function renderMesas() {
  const mesasList = document.getElementById("mesas-list");
  mesasList.innerHTML = "";

  mesas.forEach((mesa) => {
    const mesaElement = document.createElement("div");
    mesaElement.className = `mesa-item ${
      mesa.status === "ocupada" ? "ocupada" : ""
    } ${mesaAtual && mesa.id === mesaAtual.id ? "active" : ""}`;
    mesaElement.dataset.id = mesa.id;

    const total = calcularTotalMesa(mesa).total;

    mesaElement.innerHTML = `
      <div class="mesa-nome">${mesa.nome}</div>
      <div class="mesa-total">${formatMoney(total)}</div>
      <div class="mesa-actions">
        <button class="btn-excluir-mesa" title="Excluir mesa" ${
          /^Mesa [1-5]$/.test(mesa.nome)
            ? 'disabled style="display:none"'
            : ""
        }>
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    mesaElement.addEventListener("click", () => selectMesa(mesa.id));

    // Adiciona evento de exclusão ao botão
    const btnExcluir = mesaElement.querySelector(".btn-excluir-mesa");
    if (btnExcluir) {
      btnExcluir.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (
          confirm(
            `Tem certeza que deseja excluir permanentemente a ${mesa.nome}?`
          )
        ) {
          try {
            await deleteMesa(mesa.id);
            mesas = await getAllMesas();
            renderMesas();

            // Se a mesa excluída era a atual, seleciona outra
            if (mesaAtual && mesa.id === mesaAtual.id) {
              if (mesas.length > 0) {
                selectMesa(mesas[0].id);
              } else {
                const id = await addMesa();
                mesas = await getAllMesas();
                selectMesa(id);
              }
            }

            showNotification("Mesa excluída com sucesso!", "success");
          } catch (error) {
            console.error("Erro ao excluir mesa:", error);
            showNotification("Erro ao excluir mesa!", "error");
          }
        }
      });
    }

    mesasList.appendChild(mesaElement);
  });
}

// Renderizar lista de produtos
function renderProdutos(filter = "") {
  const produtosGrid = document.getElementById("produtos-grid");
  produtosGrid.innerHTML = "";

  const categoriaAtiva = document.querySelector(".categoria-btn.active").dataset
    .categoria;

  const produtosFiltrados = produtos.filter((produto) => {
    const matchesFilter =
      produto.nome.toLowerCase().includes(filter) ||
      produto.categoria.toLowerCase().includes(filter);
    const matchesCategory =
      categoriaAtiva === "todos" || produto.categoria === categoriaAtiva;
    return matchesFilter && matchesCategory;
  });

  produtosFiltrados.forEach((produto) => {
    const produtoElement = document.createElement("div");
    produtoElement.className = "produto-card";
    produtoElement.dataset.id = produto.id;

    produtoElement.innerHTML = `
          <div class="produto-nome">${produto.nome}</div>
          <div class="produto-preco">${formatMoney(produto.preco)}</div>
      `;

    produtoElement.addEventListener("click", () => adicionarItemMesa(produto));
    produtosGrid.appendChild(produtoElement);
  });
}

// Selecionar mesa
async function selectMesa(id) {
  try {
    mesas = await getAllMesas();
    mesaAtual = await getMesa(id);

    document.querySelectorAll(".mesa-item").forEach((item) => {
      item.classList.remove("active");
      if (parseInt(item.dataset.id) === id) {
        item.classList.add("active");
      }
    });

    renderConsumoMesa();
    renderMesas();
  } catch (error) {
    console.error("Erro ao selecionar mesa:", error);
    showNotification("Erro ao carregar mesa!", "error");
  }
}

// Renderizar consumo da mesa
function renderConsumoMesa() {
  if (!mesaAtual) return;

  const mesaInfo = document.getElementById("mesa-info");
  const itensConsumo = document.getElementById("itens-consumo");
  const totalValor = document.getElementById("total-valor");

  mesaInfo.innerHTML = mesaAtual.nome;
  itensConsumo.innerHTML = "";

  const { subtotal, total } = calcularTotalMesa(mesaAtual);

  mesaAtual.itens.forEach((item, index) => {
    const itemElement = document.createElement("div");
    itemElement.className = "item-consumo";

    itemElement.innerHTML = `
      <div class="item-info">
          <div class="item-nome">${item.nome}</div>
          <div class="item-preco">${formatMoney(item.preco * item.quantidade)}</div>
      </div>
      <div class="item-quantidade">
          <button class="diminuir-quantidade" data-index="${index}">-</button>
          <span>${item.quantidade}</span>
          <button class="aumentar-quantidade" data-index="${index}">+</button>
      </div>
      <div class="remover-item" data-index="${index}"><i class="fas fa-times"></i></div>
    `;

    itensConsumo.appendChild(itemElement);
  });

  document.querySelectorAll(".diminuir-quantidade").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      alterarQuantidadeItem(parseInt(e.currentTarget.dataset.index), -1);
    });
  });

  document.querySelectorAll(".aumentar-quantidade").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      alterarQuantidadeItem(parseInt(e.currentTarget.dataset.index), 1);
    });
  });

  document.querySelectorAll(".remover-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      removerItemMesa(index);
    });
  });

  let totalText = `Total: ${formatMoney(total)}`;
  if (mesaAtual.desconto > 0) {
    totalText += ` (${
      mesaAtual.tipoDesconto === "percentual"
        ? `${mesaAtual.desconto}% off`
        : `${formatMoney(mesaAtual.desconto)} off`
    })`;
  }
  if (mesaAtual.divisao > 1) {
    totalText += ` ÷ ${mesaAtual.divisao}`;
  }

  totalValor.textContent = totalText;
  renderMesas();
}


// Adicionar item à mesa
async function adicionarItemMesa(produto) {
  if (!mesaAtual) return;

  const itemIndex = mesaAtual.itens.findIndex((item) => item.id === produto.id);

  if (itemIndex >= 0) {
    mesaAtual.itens[itemIndex].quantidade += 1;
  } else {
    mesaAtual.itens.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      quantidade: 1,
    });
  }

  mesaAtual.status = "ocupada";

  try {
    await updateMesa(mesaAtual);
    renderConsumoMesa();

    const itemElement = document.querySelector(
      `.produto-card[data-id="${produto.id}"]`
    );
    if (itemElement) {
      itemElement.classList.add("item-added");
      setTimeout(() => itemElement.classList.remove("item-added"), 500);
    }

    showNotification(`${produto.nome} adicionado à mesa!`, "success");
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    showNotification("Erro ao adicionar item!", "error");
  }
}

// Adicionar item customizado à mesa
async function adicionarItemCustomizado() {
  if (!mesaAtual) return;

  const nome = document.getElementById("item-custom-nome").value;
  const preco = parseFloat(document.getElementById("item-custom-preco").value);

  if (!nome || isNaN(preco) || preco <= 0) {
    showNotification("Preencha nome e preço válidos!", "warning");
    return;
  }

  mesaAtual.itens.push({
    id: Date.now(),
    nome: nome,
    preco: preco,
    quantidade: 1,
    custom: true,
  });

  mesaAtual.status = "ocupada";

  try {
    await updateMesa(mesaAtual);
    renderConsumoMesa();

    document.getElementById("item-custom-nome").value = "";
    document.getElementById("item-custom-preco").value = "";
    closeModal("modal-item-custom");

    showNotification(`Item "${nome}" adicionado à mesa!`, "success");
  } catch (error) {
    console.error("Erro ao adicionar item customizado:", error);
    showNotification("Erro ao adicionar item customizado!", "error");
  }
}

// Alterar quantidade de item
async function alterarQuantidadeItem(index, delta) {
  if (!mesaAtual || !mesaAtual.itens[index]) return;

  mesaAtual.itens[index].quantidade += delta;

  if (mesaAtual.itens[index].quantidade <= 0) {
    mesaAtual.itens.splice(index, 1);
  }

  if (mesaAtual.itens.length === 0) {
    mesaAtual.status = "livre";
    mesaAtual.desconto = 0;
    mesaAtual.divisao = 1;
  }

  try {
    await updateMesa(mesaAtual);
    renderConsumoMesa();
    showNotification("Quantidade atualizada!", "success");
  } catch (error) {
    console.error("Erro ao atualizar quantidade:", error);
    showNotification("Erro ao atualizar quantidade!", "error");
  }
}

// Remover item da mesa
async function removerItemMesa(index) {
  if (!mesaAtual || !mesaAtual.itens[index]) return;

  mesaAtual.itens.splice(index, 1);

  if (mesaAtual.itens.length === 0) {
    mesaAtual.status = "livre";
    mesaAtual.desconto = 0;
    mesaAtual.divisao = 1;
  }

  try {
    await updateMesa(mesaAtual);
    renderConsumoMesa();
    showNotification("Item removido da mesa!", "success");
  } catch (error) {
    console.error("Erro ao remover item:", error);
    showNotification("Erro ao remover item!", "error");
  }
}

// Salvar mesa
async function salvarMesa() {
  if (!mesaAtual) return;

  try {
    await updateMesa(mesaAtual);
    showNotification("Mesa salva com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao salvar mesa:", error);
    showNotification("Erro ao salvar mesa!", "error");
  }
}

// Aplicar desconto
async function aplicarDesconto() {
  if (!mesaAtual) return;

  const tipoDesconto = document.querySelector(
    'input[name="tipo-desconto"]:checked'
  ).value;
  const valorDesconto = parseFloat(
    document.getElementById("valor-desconto").value
  );

  if (isNaN(valorDesconto)) {
    showNotification("Digite um valor válido para o desconto!", "warning");
    return;
  }

  if (
    tipoDesconto === "percentual" &&
    (valorDesconto <= 0 || valorDesconto > 100)
  ) {
    showNotification("Desconto percentual deve ser entre 0 e 100!", "warning");
    return;
  }

  const subtotal = calcularTotalMesa(mesaAtual).subtotal;
  if (tipoDesconto === "valor" && valorDesconto > subtotal) {
    showNotification("Desconto não pode ser maior que o total!", "warning");
    return;
  }

  divisaoAnterior = mesaAtual.divisao;
  mesaAtual.tipoDesconto = tipoDesconto;
  mesaAtual.desconto = valorDesconto;

  try {
    await updateMesa(mesaAtual);
    renderConsumoMesa();
    closeModal("modal-desconto");
    showNotification("Desconto aplicado com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao aplicar desconto:", error);
    showNotification("Erro ao aplicar desconto!", "error");
  }
}

// Cancelar desconto
async function cancelarDesconto() {
  if (!mesaAtual) return;

  mesaAtual.tipoDesconto = null;
  mesaAtual.desconto = 0;
  mesaAtual.divisao = divisaoAnterior;

  try {
    await updateMesa(mesaAtual);
    renderConsumoMesa();
    closeModal("modal-desconto");
    showNotification("Desconto removido com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao cancelar desconto:", error);
    showNotification("Erro ao cancelar desconto!", "error");
  }
}

// Dividir conta
function dividirConta(pessoas) {
  if (!mesaAtual || pessoas < 2) return;

  mesaAtual.divisao = pessoas;

  updateMesa(mesaAtual).then(() => {
    renderConsumoMesa();

    const totalDividido = calcularTotalMesa(mesaAtual).total;
    document.getElementById("divisao-resultado").innerHTML = `
          <p>Total dividido por ${pessoas} pessoas:</p>
          <p><strong>${formatMoney(totalDividido)} por pessoa</strong></p>
      `;
  });
}

// Finalizar conta
async function finalizarConta() {
  if (!mesaAtual || mesaAtual.itens.length === 0) return;

  const formaPagamento = document.querySelector(
    'input[name="forma-pagamento"]:checked'
  ).value;
  let valorRecebido = 0;
  let troco = 0;

  if (formaPagamento === "dinheiro") {
    valorRecebido =
      parseFloat(document.getElementById("valor-recebido").value) || 0;
    const total = calcularTotalMesa(mesaAtual).total;
    troco = valorRecebido - total;

    if (valorRecebido < total) {
      showNotification("Valor recebido insuficiente!", "warning");
      return;
    }
  }

  const conta = {
    mesaId: mesaAtual.id,
    mesaNome: mesaAtual.nome,
    itens: [...mesaAtual.itens],
    subtotal: calcularTotalMesa(mesaAtual).subtotal,
    desconto: mesaAtual.desconto,
    tipoDesconto: mesaAtual.tipoDesconto,
    divisao: mesaAtual.divisao,
    total: calcularTotalMesa(mesaAtual).total,
    formaPagamento: formaPagamento,
    valorRecebido: formaPagamento === "dinheiro" ? valorRecebido : null,
    troco: formaPagamento === "dinheiro" ? troco : null,
    data: new Date().toISOString(),
  };

  try {
    await addHistorico(conta);

    mesaAtual.itens = [];
    mesaAtual.status = "livre";
    mesaAtual.desconto = 0;
    mesaAtual.divisao = 1;

    await updateMesa(mesaAtual);

    renderConsumoMesa();
    mesas = await getAllMesas();
    renderMesas();

    // Verifica se há mesas vazias criadas pelo usuário que podem ser excluídas
    const mesasParaLimpar = mesas.filter(
      (mesa) =>
        mesa.itens.length === 0 &&
        mesa.status === "livre" &&
        !/^Mesa [1-5]|$/.test(mesa.nome)
    );

    for (const mesa of mesasParaLimpar) {
      try {
        await deleteMesa(mesa.id);
      } catch (error) {
        console.error(`Erro ao limpar mesa ${mesa.nome}:`, error);
      }
    }

    // Atualiza a lista de mesas após possível limpeza
    mesas = await getAllMesas();
    renderMesas();

    closeModal("modal-pagamento");
    mostrarRecibo(conta);
    showNotification("Conta finalizada com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao finalizar conta:", error);
    showNotification("Erro ao finalizar conta!", "error");
  }
}

// Mostrar recibo
function mostrarRecibo(conta) {
  const recibo = `
      <h3>Bar Parada 666</h3>
      <p>${formatDate(conta.data)}</p>
      <p>Mesa: ${conta.mesaNome}</p>
      <hr>
      <h4>Itens Consumidos:</h4>
      <ul>
          ${conta.itens
            .map(
              (item) => `
              <li>${item.quantidade}x ${item.nome} - ${formatMoney(
                item.preco * item.quantidade
              )}</li>
          `
            )
            .join("")}
      </ul>
      <hr>
      <p>Subtotal: ${formatMoney(conta.subtotal)}</p>
      ${
        conta.desconto > 0
          ? `
          <p>Desconto: ${
            conta.tipoDesconto === "percentual"
              ? `${conta.desconto}%`
              : formatMoney(conta.desconto)
          }</p>
      `
          : ""
      }
      ${
        conta.divisao > 1 ? `<p>Dividido por: ${conta.divisao} pessoas</p>` : ""
      }
      <h3>Total: ${formatMoney(conta.total)}</h3>
      <hr>
      <p>Forma de pagamento: ${conta.formaPagamento}</p>
      ${
        conta.formaPagamento === "dinheiro"
          ? `
          <p>Valor recebido: ${formatMoney(conta.valorRecebido)}</p>
          <p>Troco: ${formatMoney(conta.troco)}</p>
      `
          : ""
      }
      <hr>
      <p>Obrigado pela preferência!</p>
  `;

  alert(recibo.replace(/<[^>]*>/g, ""));
}

// Renderizar histórico
async function renderHistorico(dateFilter = "", mesaFilter = "") {
  const historicoLista = document.getElementById("historico-lista");
  historicoLista.innerHTML = "";

  let contas = await getAllHistorico();

  if (dateFilter) {
    contas = contas.filter((conta) => conta.data.includes(dateFilter));
  }

  if (mesaFilter) {
    contas = contas.filter((conta) => conta.mesaId === parseInt(mesaFilter));
  }

  contas.sort((a, b) => new Date(b.data) - new Date(a.data));

  // Calcular total do dia
  const totalDia = contas.reduce((total, conta) => total + conta.total, 0);
  document.getElementById("total-dia").textContent = formatMoney(totalDia);

  if (contas.length === 0) {
    historicoLista.innerHTML = "<p>Nenhuma conta encontrada</p>";
    return;
  }

  // Atualizar filtro de mesas
  const filtroMesa = document.getElementById("filtro-mesa");
  if (filtroMesa.options.length <= 1) {
    filtroMesa.innerHTML = '<option value="">Todas as mesas</option>';
    const mesasUnicas = [...new Set(contas.map((conta) => conta.mesaId))];
    mesasUnicas.forEach((mesaId) => {
      const mesa = contas.find((c) => c.mesaId === mesaId);
      const option = document.createElement("option");
      option.value = mesaId;
      option.textContent = mesa.mesaNome;
      filtroMesa.appendChild(option);
    });
  }

  contas.forEach((conta) => {
    const contaElement = document.createElement("div");
    contaElement.className = "historico-item";

    contaElement.innerHTML = `
          <div class="historico-header">
              <div>
                  <div class="historico-data">${formatDate(conta.data)}</div>
                  <div class="historico-mesa">Mesa: ${conta.mesaNome}</div>
              </div>
              <button class="btn-excluir-historico" data-id="${conta.id}">
                  <i class="fas fa-trash"></i>
              </button>
          </div>
          <div class="historico-total">Total: ${formatMoney(conta.total)}</div>
          <div class="historico-pagamento">Pagamento: ${
            conta.formaPagamento
          }</div>
      `;

    const btnExcluir = contaElement.querySelector(".btn-excluir-historico");
    btnExcluir.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (
        confirm("Tem certeza que deseja excluir este registro do histórico?")
      ) {
        try {
          await deleteHistorico(conta.id);
          renderHistorico();
          showNotification("Registro excluído com sucesso!", "success");
        } catch (error) {
          console.error("Erro ao excluir histórico:", error);
          showNotification("Erro ao excluir registro!", "error");
        }
      }
    });

    contaElement.addEventListener("click", () => {
      mostrarDetalhesHistorico(conta);
    });

    historicoLista.appendChild(contaElement);
  });
}

// Limpar todo o histórico
async function limparHistoricoCompleto() {
  if (
    !confirm(
      "Tem certeza que deseja apagar TODO o histórico de vendas? Esta ação não pode ser desfeita!"
    )
  ) {
    return;
  }

  try {
    await clearAllHistorico();
    renderHistorico();
    showNotification("Histórico limpo com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao limpar histórico:", error);
    showNotification("Erro ao limpar histórico!", "error");
  }
}

// Mostrar detalhes do histórico
function mostrarDetalhesHistorico(conta) {
  const detalhes = `
      <h3>Detalhes da Conta</h3>
      <p>Data: ${formatDate(conta.data)}</p>
      <p>Mesa: ${conta.mesaNome}</p>
      <hr>
      <h4>Itens:</h4>
      <ul>
          ${conta.itens
            .map(
              (item) => `
              <li>${item.quantidade}x ${item.nome} - ${formatMoney(
                item.preco * item.quantidade
              )}</li>
          `
            )
            .join("")}
      </ul>
      <hr>
      <p>Subtotal: ${formatMoney(conta.subtotal)}</p>
      ${
        conta.desconto > 0
          ? `
          <p>Desconto: ${
            conta.tipoDesconto === "percentual"
              ? `${conta.desconto}%`
              : formatMoney(conta.desconto)
          }</p>
      `
          : ""
      }
      ${
        conta.divisao > 1 ? `<p>Dividido por: ${conta.divisao} pessoas</p>` : ""
      }
      <p>Total: ${formatMoney(conta.total)}</p>
      <hr>
      <p>Forma de pagamento: ${conta.formaPagamento}</p>
      ${
        conta.formaPagamento === "dinheiro"
          ? `
          <p>Valor recebido: ${formatMoney(conta.valorRecebido)}</p>
          <p>Troco: ${formatMoney(conta.troco)}</p>
      `
          : ""
      }
  `;

  alert(detalhes.replace(/<[^>]*>/g, ""));
}
window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;
