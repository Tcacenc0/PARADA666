// Função para formatar valor monetário
function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Função para mostrar notificação
function showNotification(message, type = "success", duration = 3000) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification show ${type}`;

  setTimeout(() => {
    notification.classList.remove("show");
  }, duration);
}

// Função para abrir modal
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = "block";
}

// Função para fechar modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = "none";
}

// Função para calcular total da mesa
function calcularTotalMesa(mesa) {
  let subtotal = mesa.itens.reduce((total, item) => {
    return total + item.preco * item.quantidade;
  }, 0);

  let total = subtotal;
  if (mesa.desconto > 0) {
    if (mesa.tipoDesconto === "percentual") {
      total = subtotal * (1 - mesa.desconto / 100);
    } else {
      total = subtotal - mesa.desconto;
    }
  }

  if (mesa.divisao > 1) {
    total = total / mesa.divisao;
  }

  return {
    subtotal: subtotal,
    total: total > 0 ? total : 0,
  };
}

// Função para formatar data
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Exportar funções
export {
  formatMoney,
  showNotification,
  openModal,
  closeModal,
  calcularTotalMesa,
  formatDate,
};
