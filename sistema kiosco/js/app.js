/**
 * main.js
 * Usa Firebase modular SDK (v9+). 
 * Antes de ejecutar: pegá tu firebaseConfig (desde consola) en la variable firebaseConfig abajo.
 * Funcionalidad:
 * - agregar producto
 * - editar / eliminar
 * - mostrar lista ordenada alfabéticamente
 * - búsqueda por nombre
 * - paginación local 15 items por página (fácil y suficiente para prototipo)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ====== PEGAR AQUÍ TU CONFIG FIREBASE (desde consola) ====== */
const firebaseConfig = {
  apiKey: "AIzaSyBoefbCVIUOzMbiPimzXDaHJ24Jab2ZrmA",
  authDomain: "kiosco1-cc957.firebaseapp.com",
  projectId: "kiosco1-cc957",
  storageBucket: "kiosco1-cc957.firebasestorage.app",
  messagingSenderId: "542618995311",
  appId: "1:542618995311:web:c44c69e46bceee309f1b9a"
};

/* ========================================================= */

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productosCol = collection(db, 'productos');

/* UI refs */
const productForm = document.getElementById('productForm');
const nombreInput = document.getElementById('nombre');
const categoriaInput = document.getElementById('categoria');
const productIdInput = document.getElementById('productId');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const productsList = document.getElementById('productsList');
const searchInput = document.getElementById('searchInput');
const paginationDiv = document.getElementById('pagination');

let productosCache = []; // guardamos localmente los docs para paginar y buscar
let currentPage = 1;
const PAGE_SIZE = 15;

/* --- CRUD --- */
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = nombreInput.value.trim();
  const categoria = categoriaInput.value.trim();
  if (!nombre || !categoria) return;

  const editingId = productIdInput.value;
  submitBtn.disabled = true;

  try {
    if (editingId) {
      // actualizar documento
      const docRef = doc(db, 'productos', editingId);
      await updateDoc(docRef, { nombre, categoria });
      productIdInput.value = '';
      submitBtn.textContent = 'Agregar producto';
      cancelEditBtn.style.display = 'none';
    } else {
      // agregar nuevo
      await addDoc(productosCol, {
        nombre,
        categoria,
        createdAt: serverTimestamp()
      });
    }
    nombreInput.value = '';
    categoriaInput.value = '';
    await loadAllProducts();
  } catch (err) {
    console.error('Error guardando producto', err);
    alert('Ocurrió un error. Mirá la consola.');
  } finally {
    submitBtn.disabled = false;
  }
});

cancelEditBtn.addEventListener('click', () => {
  productIdInput.value = '';
  nombreInput.value = '';
  categoriaInput.value = '';
  submitBtn.textContent = 'Agregar producto';
  cancelEditBtn.style.display = 'none';
});

/* Load all products (simple approach: traer todo y paginar en cliente) */
async function loadAllProducts() {
  productsList.innerHTML = 'Cargando...';
  const snapshot = await getDocs(productosCol);
  productosCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  // ordenar alfabéticamente por nombre (case-insensitive)
  productosCache.sort((a,b) => a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase()));
  currentPage = 1;
  renderList();
}

/* Render paginado y filtrado por búsqueda */
function renderList(){
  const q = searchInput.value.trim().toLowerCase();
  const filtered = productosCache.filter(p => p.nombre.toLowerCase().includes(q));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  // Render items
  productsList.innerHTML = '';
  if (pageItems.length === 0) {
    productsList.innerHTML = `<div style="padding:12px;background:#fff;border-radius:8px">No hay productos.</div>`;
  } else {
    pageItems.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="card-left">
          <div>
            <div class="product-name">${escapeHtml(p.nombre)}</div>
            <div class="product-cat">${escapeHtml(p.categoria)}</div>
          </div>
        </div>
        <div class="card-actions">
          <button class="edit" data-id="${p.id}">Editar</button>
          <button class="delete" data-id="${p.id}">Eliminar</button>
        </div>
      `;
      productsList.appendChild(card);
    });
  }

  // Render pagination
  renderPagination(totalPages);
  // attach events
  document.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', onEdit);
  });
  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', onDelete);
  });
}

function renderPagination(totalPages){
  paginationDiv.innerHTML = '';
  for (let i=1;i<=totalPages;i++){
    const b = document.createElement('button');
    b.className = 'page-btn' + (i===currentPage ? ' active' : '');
    b.textContent = i;
    b.addEventListener('click', ()=> { currentPage = i; renderList(); });
    paginationDiv.appendChild(b);
  }
}

/* Edit */
function onEdit(e){
  const id = e.currentTarget.dataset.id;
  const p = productosCache.find(x=>x.id===id);
  if (!p) return;
  productIdInput.value = p.id;
  nombreInput.value = p.nombre;
  categoriaInput.value = p.categoria;
  submitBtn.textContent = 'Guardar cambios';
  cancelEditBtn.style.display = 'inline-block';
}

/* Delete */
async function onDelete(e){
  const id = e.currentTarget.dataset.id;
  if (!confirm('¿Eliminar este producto?')) return;
  try {
    await deleteDoc(doc(db, 'productos', id));
    await loadAllProducts();
  } catch(err){
    console.error(err);
    alert('Error al borrar.');
  }
}

/* Buscador */
searchInput.addEventListener('input', () => { currentPage = 1; renderList(); });

/* Helper: escape HTML simple */
function escapeHtml(text){
  return String(text).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* Inicializar carga */
loadAllProducts().catch(err => {
  console.error('Error cargando productos', err);
  productsList.innerHTML = '<div style="padding:12px;background:#fff;border-radius:8px">Error al cargar productos. Mirá la consola.</div>';
});
