(function (root) {
  const STORAGE_KEY = "biblioteca-personal-data";
  const FIREBASE_CONFIG_KEY = "biblioteca-firebase-config";
  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
  const state = {
    items: [],
    filter: "all",
    search: "",
    currentItemId: null,
    firebaseConfig: null,
    firebaseApp: null,
    firestore: null,
    auth: null,
    cloudStatus: "Sin configurar",
    scannerActive: false,
    scannerHandler: null
  };

  const dom = {};

  function getStorage() {
    return typeof localStorage !== "undefined" ? localStorage : null;
  }

  function loadState() {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.items = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn("No se pudo cargar la colección local", error);
      state.items = [];
    }

    const savedConfig = storage.getItem(FIREBASE_CONFIG_KEY);
    if (savedConfig) {
      try {
        state.firebaseConfig = JSON.parse(savedConfig);
      } catch (error) {
        console.warn("No se pudo leer la configuración de Firebase", error);
      }
    }
  }

  function saveState() {
    const storage = getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    }
    render();
  }

  function createId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createItem(data) {
    return {
      id: data.id || createId(),
      type: data.type || "book",
      title: data.title || "Sin título",
      author: data.author || "",
      publisher: data.publisher || "",
      year: data.year || "",
      pages: data.pages || "",
      cover: data.cover || "",
      isbn: data.isbn || "",
      notes: data.notes || "",
      rating: Number(data.rating || 0),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function calculateStats(items) {
    const books = items.filter((item) => item.type === "book").length;
    const comics = items.filter((item) => item.type === "comic").length;
    const avgRating = items.length
      ? items.reduce((sum, item) => sum + Number(item.rating || 0), 0) / items.length
      : 0;
    const totalPages = items.reduce((sum, item) => sum + Number(item.pages || 0), 0);
    return {
      books,
      comics,
      avgRating: avgRating.toFixed(1),
      totalPages
    };
  }

  function getFilteredItems() {
    const normalizedQuery = state.search.trim().toLowerCase();
    return state.items.filter((item) => {
      const matchesFilter = state.filter === "all" || item.type === state.filter;
      const matchesSearch = !normalizedQuery ||
        [item.title, item.author, item.publisher, item.isbn]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesSearch;
    });
  }

  function renderStats() {
    if (!dom.statBooks) {
      return;
    }
    const stats = calculateStats(state.items);
    dom.statBooks.textContent = stats.books;
    dom.statComics.textContent = stats.comics;
    dom.statRating.textContent = stats.avgRating;
    dom.statPages.textContent = stats.totalPages;
  }

  function renderItems() {
    if (!dom.itemsList) {
      return;
    }
    const items = getFilteredItems();
    if (!items.length) {
      dom.itemsList.innerHTML = '<div class="card"><p>No hay elementos aún. Añade tu primer libro o cómic.</p></div>';
      return;
    }

    dom.itemsList.innerHTML = items
      .map((item) => {
        const cover = item.cover
          ? `<img src="${item.cover}" alt="Portada de ${item.title}" onerror="this.style.display='none'" />`
          : '<div style="width:96px;height:144px;border-radius:14px;background:#e5e7eb;display:grid;place-items:center;color:#64748b;">Sin portada</div>';
        const stars = "★".repeat(Number(item.rating || 0)) + "☆".repeat(5 - Number(item.rating || 0));
        return `
          <article class="item-card">
            ${cover}
            <div>
              <h4>${escapeHtml(item.title)}</h4>
              <p>${escapeHtml(item.author || "Autor desconocido")}</p>
              <p>${escapeHtml(item.publisher || "Editorial desconocida")}</p>
              <p>${escapeHtml(item.year || "Sin año")}</p>
              <p>${escapeHtml(item.isbn || "Sin ISBN")}</p>
              <p>${escapeHtml(item.notes || "Sin comentarios")}</p>
              <p>${escapeHtml(stars)}</p>
              <div class="item-actions">
                <button data-action="edit" data-id="${item.id}">Editar</button>
                <button data-action="delete" data-id="${item.id}">Eliminar</button>
              </div>
            </div>
          </article>`;
      })
      .join("");
  }

  function render() {
    renderStats();
    renderItems();
    updateCloudStatus();
  }

  function updateCloudStatus() {
    if (!dom.cloudStatus) {
      return;
    }
    const configPresent = state.firebaseConfig && state.firebaseConfig.projectId && state.firebaseConfig.projectId !== "YOUR_PROJECT_ID";
    dom.cloudStatus.textContent = configPresent ? `Listo para sincronizar (${state.cloudStatus})` : "Sin configurar";
  }

  function openModal(itemId = null) {
    if (!dom.itemModal) {
      return;
    }
    state.currentItemId = itemId;
    dom.itemModal.classList.remove("hidden");
    dom.itemModal.setAttribute("aria-hidden", "false");
    if (itemId) {
      const item = state.items.find((entry) => entry.id === itemId);
      if (item) {
        dom.modalTitle.textContent = "Editar elemento";
        dom.itemId.value = item.id;
        dom.itemType.value = item.type || "book";
        dom.itemIsbn.value = item.isbn || "";
        dom.itemTitle.value = item.title || "";
        dom.itemAuthor.value = item.author || "";
        dom.itemPublisher.value = item.publisher || "";
        dom.itemYear.value = item.year || "";
        dom.itemPages.value = item.pages || "";
        dom.itemCover.value = item.cover || "";
        dom.itemNotes.value = item.notes || "";
        dom.itemRating.value = String(item.rating || 0);
      }
    } else {
      dom.modalTitle.textContent = "Añadir elemento";
      dom.itemForm.reset();
      dom.itemId.value = "";
      dom.itemType.value = "book";
      dom.itemRating.value = "0";
    }
  }

  function closeModal() {
    if (!dom.itemModal) {
      return;
    }
    dom.itemModal.classList.add("hidden");
    dom.itemModal.setAttribute("aria-hidden", "true");
  }

  function handleItemSubmit(event) {
    event.preventDefault();
    const payload = {
      id: dom.itemId.value || createId(),
      type: dom.itemType.value,
      title: dom.itemTitle.value.trim(),
      author: dom.itemAuthor.value.trim(),
      publisher: dom.itemPublisher.value.trim(),
      year: dom.itemYear.value.trim(),
      pages: dom.itemPages.value.trim(),
      cover: dom.itemCover.value.trim(),
      isbn: dom.itemIsbn.value.trim(),
      notes: dom.itemNotes.value.trim(),
      rating: Number(dom.itemRating.value || 0)
    };

    if (!payload.title) {
      showMessage("El título es obligatorio.");
      return;
    }

    const existingIndex = state.items.findIndex((item) => item.id === payload.id);
    const itemToSave = createItem(payload);
    if (existingIndex >= 0) {
      state.items[existingIndex] = itemToSave;
    } else {
      state.items.unshift(itemToSave);
    }

    saveState();
    closeModal();
    showMessage(`Guardado: ${itemToSave.title}`);
    syncToCloud({ silent: true });
  }

  function deleteItem(itemId) {
    state.items = state.items.filter((item) => item.id !== itemId);
    saveState();
    showMessage("Elemento eliminado.");
    syncToCloud({ silent: true });
  }

  function handleItemListClick(event) {
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) return;
    const { action, id } = actionButton.dataset;
    if (action === "edit") {
      openModal(id);
    }
    if (action === "delete") {
      deleteItem(id);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function fillFromIsbn() {
    if (!dom.itemIsbn) {
      return;
    }
    const isbn = dom.itemIsbn.value.trim();
    if (!isbn) {
      showMessage("Introduce un ISBN antes de buscar datos.");
      return;
    }

    showMessage("Buscando datos en Open Library...");
    try {
      const data = await fetchOpenLibrary(isbn);
      dom.itemTitle.value = data.title || "";
      dom.itemAuthor.value = data.author || "";
      dom.itemPublisher.value = data.publisher || "";
      dom.itemYear.value = data.year || "";
      dom.itemPages.value = data.pages || "";
      dom.itemCover.value = data.cover || "";
      dom.itemIsbn.value = isbn;
    } catch (error) {
      console.error(error);
      showMessage("No se pudieron obtener datos. Prueba con otro ISBN o añade la ficha manualmente.");
    }
  }

  async function fetchOpenLibrary(isbn) {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("No se pudo consultar Open Library");
    }
    const payload = await response.json();
    const entry = payload[`ISBN:${isbn}`];
    if (!entry) {
      throw new Error("ISBN no encontrado");
    }

    return {
      title: entry.title || "",
      author: Array.isArray(entry.authors) ? entry.authors.map((author) => author.name).join(", ") : "",
      publisher: Array.isArray(entry.publishers) ? entry.publishers.map((p) => p.name || p).join(", ") : "",
      year: entry.publish_date ? entry.publish_date.slice(0, 4) : "",
      pages: entry.number_of_pages || "",
      cover: entry.cover && entry.cover.medium ? entry.cover.medium : ""
    };
  }

  function showMessage(message) {
    if (!dom.cloudStatus) {
      return;
    }
    const previous = dom.cloudStatus.textContent;
    dom.cloudStatus.textContent = message;
    const timeoutRef = typeof window !== "undefined" ? window.setTimeout : setTimeout;
    timeoutRef(() => {
      dom.cloudStatus.textContent = previous;
    }, 2400);
  }

  function bindEvents() {
    if (!isBrowser) {
      return;
    }
    dom.btnScan.addEventListener("click", openScannerModal);
    dom.btnAddManual.addEventListener("click", () => openModal());
    dom.btnImport.addEventListener("click", () => dom.importFile.click());
    dom.importFile.addEventListener("change", handleImportFile);
    dom.btnExport.addEventListener("click", exportBackup);
    dom.btnSyncCloud.addEventListener("click", () => syncToCloud({ silent: false }));
    dom.closeModal.addEventListener("click", closeModal);
    dom.closeScanner.addEventListener("click", closeScannerModal);
    dom.startScanner.addEventListener("click", startScanner);
    dom.stopScanner.addEventListener("click", stopScanner);
    dom.itemForm.addEventListener("submit", handleItemSubmit);
    dom.itemsList.addEventListener("click", handleItemListClick);
    dom.btnFillFromIsbn.addEventListener("click", fillFromIsbn);
    dom.searchInput.addEventListener("input", (event) => {
      state.search = event.target.value;
      renderItems();
    });
    dom.firebaseForm.addEventListener("submit", saveFirebaseConfig);
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        state.filter = chip.dataset.filter;
        document.querySelectorAll(".chip").forEach((item) => item.classList.toggle("active", item === chip));
        renderItems();
      });
    });
    dom.itemModal.addEventListener("click", (event) => {
      if (event.target === dom.itemModal) {
        closeModal();
      }
    });
    dom.scannerModal.addEventListener("click", (event) => {
      if (event.target === dom.scannerModal) {
        closeScannerModal();
      }
    });
  }

  function saveFirebaseConfig(event) {
    event.preventDefault();
    const config = {
      apiKey: dom.firebaseApiKey.value.trim(),
      authDomain: dom.firebaseAuthDomain.value.trim(),
      projectId: dom.firebaseProjectId.value.trim(),
      storageBucket: dom.firebaseStorageBucket.value.trim(),
      appId: dom.firebaseAppId.value.trim()
    };
    state.firebaseConfig = config;
    const storage = getStorage();
    if (storage) {
      storage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
    }
    updateCloudStatus();
    showMessage("Configuración de Firebase guardada.");
    syncToCloud({ silent: true });
  }

  function initFirebase() {
    if (!isBrowser || state.firebaseApp) {
      return state.firebaseApp;
    }
    const config = state.firebaseConfig || {};
    const hasRequiredFields = config.apiKey && config.authDomain && config.projectId && config.appId;
    if (!hasRequiredFields) {
      throw new Error("Configura Firebase primero");
    }

    const app = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
      appId: config.appId
    });

    state.firebaseApp = app;
    state.firestore = firebase.firestore(app);
    state.auth = firebase.auth(app);
    return app;
  }

  async function syncToCloud(options = {}) {
    if (!state.firebaseConfig) {
      if (!options.silent && isBrowser) {
        showMessage("Añade la configuración de Firebase para sincronizar.");
      }
      return;
    }

    if (!isBrowser) {
      return;
    }

    try {
      initFirebase();
      const user = state.auth.currentUser || await state.auth.signInAnonymously();
      const collection = state.firestore.collection("biblioteca_personal");
      const batch = state.firestore.batch();
      const ids = new Set();
      state.items.forEach((item) => {
        ids.add(item.id);
        const ref = collection.doc(item.id);
        batch.set(ref, item);
      });

      const existingDocs = await collection.get();
      existingDocs.forEach((doc) => {
        if (!ids.has(doc.id)) {
          batch.delete(collection.doc(doc.id));
        }
      });

      await batch.commit();
      state.cloudStatus = user && user.uid ? `Sincronizado (${user.uid.slice(0, 6)})` : "Sincronizado";
      updateCloudStatus();
      if (!options.silent) {
        showMessage("Sincronización completada.");
      }
    } catch (error) {
      console.error(error);
      state.cloudStatus = "Error de sincronización";
      updateCloudStatus();
      if (!options.silent) {
        showMessage("No se pudo sincronizar con Firestore.");
      }
    }
  }

  async function syncFromCloud() {
    if (!state.firebaseConfig || !isBrowser) {
      return;
    }

    try {
      initFirebase();
      await state.auth.signInAnonymously();
      const snapshot = await state.firestore.collection("biblioteca_personal").get();
      const remoteItems = snapshot.docs.map((doc) => doc.data());
      if (remoteItems.length) {
        state.items = remoteItems;
        saveState();
        showMessage("Datos recuperados desde Firestore.");
      }
    } catch (error) {
      console.error(error);
      showMessage("No se pudieron recuperar los datos de Firestore.");
    }
  }

  function exportBackup() {
    if (!isBrowser) {
      return;
    }
    const blob = new Blob([JSON.stringify({ items: state.items, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "biblioteca-personal-backup.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function handleImportFile(event) {
    if (!isBrowser) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.items)) {
          throw new Error("Formato no válido");
        }
        state.items = parsed.items.map((entry) => createItem(entry));
        saveState();
        showMessage("Importación completada.");
        syncToCloud({ silent: true });
      } catch (error) {
        console.error(error);
        showMessage("No se pudo importar el archivo.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function openScannerModal() {
    if (!dom.scannerModal) {
      return;
    }
    dom.scannerModal.classList.remove("hidden");
    dom.scannerModal.setAttribute("aria-hidden", "false");
    await startScanner();
  }

  function closeScannerModal() {
    stopScanner();
    if (!dom.scannerModal) {
      return;
    }
    dom.scannerModal.classList.add("hidden");
    dom.scannerModal.setAttribute("aria-hidden", "true");
  }

  async function startScanner() {
    if (!isBrowser || !dom.scannerContainer) {
      return;
    }

    if (state.scannerActive) {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showMessage("La cámara no está disponible en este navegador.");
      return;
    }

    try {
      dom.scannerContainer.innerHTML = '<p style="margin:0;color:#64748b;">Solicitando permiso de cámara...</p>';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        }
      });

      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      dom.scannerContainer.innerHTML = "";
      dom.scannerContainer.appendChild(video);
      state.scannerActive = true;
      state.scannerStream = stream;

      const reader = new ImageCapture(stream.getVideoTracks()[0]);
      const captureFrame = async () => {
        if (!state.scannerActive) return;
        try {
          const bitmap = await reader.grabFrame();
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(bitmap, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          if (dataUrl) {
            window.setTimeout(captureFrame, 1000);
          }
        } catch (error) {
          console.warn("No se pudo capturar el fotograma", error);
        }
      };

      captureFrame();
      showMessage("Usa la cámara y apunta al código ISBN.");
    } catch (error) {
      console.error(error);
      showMessage("No se pudo abrir la cámara. Puedes introducir el ISBN manualmente.");
    }
  }

  function stopScanner() {
    if (state.scannerStream) {
      state.scannerStream.getTracks().forEach((track) => track.stop());
      state.scannerStream = null;
    }

    if (dom.scannerContainer) {
      dom.scannerContainer.innerHTML = "";
    }

    state.scannerActive = false;
  }

  function normalizeIsbn(code) {
    const raw = String(code || "").trim();
    if (/^97[0-9]{10,12}$/.test(raw)) {
      return raw.replace(/[^0-9Xx]/g, "").slice(-13);
    }
    return raw.replace(/[^0-9Xx]/g, "");
  }

  function bootstrap() {
    loadState();
    bindEvents();
    populateFirebaseForm();
    render();
    if (isBrowser) {
      syncFromCloud();
    }
  }

  function populateFirebaseForm() {
    if (!isBrowser || !dom.firebaseApiKey) {
      return;
    }
    if (!state.firebaseConfig) {
      return;
    }
    dom.firebaseApiKey.value = state.firebaseConfig.apiKey || "";
    dom.firebaseAuthDomain.value = state.firebaseConfig.authDomain || "";
    dom.firebaseProjectId.value = state.firebaseConfig.projectId || "";
    dom.firebaseStorageBucket.value = state.firebaseConfig.storageBucket || "";
    dom.firebaseAppId.value = state.firebaseConfig.appId || "";
  }

  function cacheDomElements() {
    if (!isBrowser) {
      return;
    }
    dom.itemModal = document.getElementById("itemModal");
    dom.scannerModal = document.getElementById("scannerModal");
    dom.modalTitle = document.getElementById("modalTitle");
    dom.itemForm = document.getElementById("itemForm");
    dom.itemId = document.getElementById("itemId");
    dom.itemType = document.getElementById("itemType");
    dom.itemIsbn = document.getElementById("itemIsbn");
    dom.itemTitle = document.getElementById("itemTitle");
    dom.itemAuthor = document.getElementById("itemAuthor");
    dom.itemPublisher = document.getElementById("itemPublisher");
    dom.itemYear = document.getElementById("itemYear");
    dom.itemPages = document.getElementById("itemPages");
    dom.itemCover = document.getElementById("itemCover");
    dom.itemNotes = document.getElementById("itemNotes");
    dom.itemRating = document.getElementById("itemRating");
    dom.btnScan = document.getElementById("btnScan");
    dom.btnAddManual = document.getElementById("btnAddManual");
    dom.btnFillFromIsbn = document.getElementById("btnFillFromIsbn");
    dom.btnExport = document.getElementById("btnExport");
    dom.btnImport = document.getElementById("btnImport");
    dom.btnSyncCloud = document.getElementById("btnSyncCloud");
    dom.closeModal = document.getElementById("closeModal");
    dom.closeScanner = document.getElementById("closeScanner");
    dom.startScanner = document.getElementById("startScanner");
    dom.stopScanner = document.getElementById("stopScanner");
    dom.searchInput = document.getElementById("searchInput");
    dom.itemsList = document.getElementById("itemsList");
    dom.statBooks = document.getElementById("statBooks");
    dom.statComics = document.getElementById("statComics");
    dom.statRating = document.getElementById("statRating");
    dom.statPages = document.getElementById("statPages");
    dom.cloudStatus = document.getElementById("cloudStatus");
    dom.importFile = document.getElementById("importFile");
    dom.firebaseForm = document.getElementById("firebaseForm");
    dom.firebaseApiKey = document.getElementById("firebaseApiKey");
    dom.firebaseAuthDomain = document.getElementById("firebaseAuthDomain");
    dom.firebaseProjectId = document.getElementById("firebaseProjectId");
    dom.firebaseStorageBucket = document.getElementById("firebaseStorageBucket");
    dom.firebaseAppId = document.getElementById("firebaseAppId");
    dom.scannerContainer = document.getElementById("scannerContainer");
  }

  if (isBrowser) {
    document.addEventListener("DOMContentLoaded", () => {
      cacheDomElements();
      bootstrap();
    });
  } else {
    bootstrap();
  }

  root.BibliotecaPersonal = {
    createItem,
    calculateStats,
    normalizeIsbn
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      createItem,
      calculateStats,
      normalizeIsbn
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
