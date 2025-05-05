// Configuração do banco de dados IndexedDB
const DB_NAME = "BarParada666DB";
const DB_VERSION = 1;
const STORE_MESAS = "mesas";
const STORE_PRODUTOS = "produtos";
const STORE_HISTORICO = "historico";

let db;

// Inicializar o banco de dados
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Erro ao abrir o banco de dados:", event.target.error);
      reject("Erro ao abrir o banco de dados");
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_MESAS)) {
        const mesasStore = db.createObjectStore(STORE_MESAS, {
          keyPath: "id",
          autoIncrement: true,
        });
        mesasStore.createIndex("nome", "nome", { unique: false });
        mesasStore.createIndex("status", "status", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_PRODUTOS)) {
        const produtosStore = db.createObjectStore(STORE_PRODUTOS, {
          keyPath: "id",
          autoIncrement: true,
        });
        produtosStore.createIndex("nome", "nome", { unique: false });
        produtosStore.createIndex("categoria", "categoria", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_HISTORICO)) {
        const historicoStore = db.createObjectStore(STORE_HISTORICO, {
          keyPath: "id",
          autoIncrement: true,
        });
        historicoStore.createIndex("data", "data", { unique: false });
        historicoStore.createIndex("mesaId", "mesaId", { unique: false });
      }
    };
  });
}

// Funções genéricas para CRUD
function addItem(storeName, item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function updateItem(storeName, item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function deleteItem(storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

function getItem(storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function getAllItems(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Funções específicas para mesas
async function addMesa(nome = "Nova Mesa") {
  const mesa = {
    nome: nome,
    status: "livre",
    itens: [],
    total: 0,
    desconto: 0,
    divisao: 1,
    createdAt: new Date().toISOString(),
  };
  return await addItem(STORE_MESAS, mesa);
}

async function updateMesa(mesa) {
  return await updateItem(STORE_MESAS, mesa);
}

async function getMesa(id) {
  return await getItem(STORE_MESAS, id);
}

async function getAllMesas() {
  return await getAllItems(STORE_MESAS);
}

async function deleteMesa(id) {
  return await deleteItem(STORE_MESAS, id);
}

// Funções específicas para produtos
async function addProduto(produto) {
  return await addItem(STORE_PRODUTOS, produto);
}

async function updateProduto(produto) {
  return await updateItem(STORE_PRODUTOS, produto);
}

async function getProduto(id) {
  return await getItem(STORE_PRODUTOS, id);
}

async function getAllProdutos() {
  return await getAllItems(STORE_PRODUTOS);
}

async function deleteProduto(id) {
  return await deleteItem(STORE_PRODUTOS, id);
}

// Funções específicas para histórico
async function addHistorico(conta) {
  return await addItem(STORE_HISTORICO, conta);
}

async function getHistorico(id) {
  return await getItem(STORE_HISTORICO, id);
}

async function getAllHistorico() {
  return await getAllItems(STORE_HISTORICO);
}

async function getHistoricoByDate(date) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_HISTORICO], "readonly");
    const store = transaction.objectStore(STORE_HISTORICO);
    const index = store.index("data");
    const request = index.getAll(date);

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function deleteHistorico(id) {
  return await deleteItem(STORE_HISTORICO, id);
}

// Limpar todo o histórico
async function clearAllHistorico() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_HISTORICO], "readwrite");
    const store = transaction.objectStore(STORE_HISTORICO);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

// Inicializar dados padrão se o banco estiver vazio
async function initDefaultData() {
  const produtos = await getAllProdutos();
  if (produtos.length === 0) {
    const defaultProdutos = [
      { nome: "Água Mineral 500ml", preco: 3.0, categoria: "bebidas" },
      { nome: "Refrigerante Lata", preco: 5.0, categoria: "bebidas" },
      { nome: "Suco Natural 300ml", preco: 7.0, categoria: "bebidas" },
      { nome: "Energético 250ml", preco: 10.0, categoria: "bebidas" },
      { nome: "Brahma Lata 350ml", preco: 6.0, categoria: "cervejas" },
      { nome: "Skol Lata 350ml", preco: 6.0, categoria: "cervejas" },
      { nome: "Heineken Long Neck", preco: 12.0, categoria: "cervejas" },
      { nome: "Stella Artois Long Neck", preco: 14.0, categoria: "cervejas" },
      { nome: "Caipirinha de Limão", preco: 15.0, categoria: "drinks" },
      { nome: "Mojito Tradicional", preco: 18.0, categoria: "drinks" },
      { nome: "Margarita Clássica", preco: 20.0, categoria: "drinks" },
      { nome: "Negroni", preco: 22.0, categoria: "drinks" },
      { nome: "Whisky Johnnie Walker", preco: 18.0, categoria: "drinks" },
      { nome: "Batata Frita", preco: 15.0, categoria: "petiscos" },
      { nome: "Porção de Mandioca", preco: 18.0, categoria: "petiscos" },
      { nome: "Coxinha", preco: 5.0, categoria: "petiscos" },
      { nome: "Brigadeiro", preco: 3.0, categoria: "doces" },
      { nome: "Brownie", preco: 8.0, categoria: "doces" },
    ];

    for (const produto of defaultProdutos) {
      await addProduto(produto);
    }
  }

  const mesas = await getAllMesas();
  if (mesas.length === 0) {
    for (let i = 1; i <= 5; i++) {
      await addMesa(`Mesa ${i}`);
    }
  }
}

// Exportar funções
export {
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
};
