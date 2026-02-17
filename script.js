document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  /* ===================== BASE ===================== */
  let recetas = JSON.parse(localStorage.getItem("recetas")) || {
    panaderia: [],
    reposteria: [],
    rellenos: []
  };
  let insumos = JSON.parse(localStorage.getItem("insumos")) || [];

  let recetaEditando = null;
  let insumoEditando = null;

  /* ===================== UTILIDADES ===================== */
  function peso(g) {
    return g >= 1000 ? (g / 1000).toFixed(2) + " kg" : g.toFixed(2) + " g";
  }

  function precioPorGramo(nombre) {
    const insumo = insumos.find(i => i.nombre.toLowerCase() === nombre.toLowerCase());
    if (!insumo) return 0;
    return insumo.precio / insumo.cantidad;
  }

  function costoIngrediente(nombre, cantidad) {
    return precioPorGramo(nombre) * cantidad;
  }

  function calcularCostoReceta(receta) {
    let total = 0;
    receta.ingredientes.forEach(i => total += costoIngrediente(i.nombre, i.cantidad));
    return total;
  }

  /* ===================== SECCIONES ===================== */
  let seccionActual = "panaderia";

  function activarSeccion(seccion) {
    seccionActual = seccion;

    document.querySelectorAll(".seccion").forEach(s => s.classList.remove("activa"));
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("activa"));

    const sec = $(seccion);
    const tab = document.querySelector(`.tab[data-seccion="${seccion}"]`);
    if (!sec || !tab) return;

    sec.classList.add("activa");
    tab.classList.add("activa");

    const form = $("form-recetas");
    if (form) {
      form.style.display = (seccion === "insumos" || seccion === "costos" || seccion === "backup")
        ? "none"
        : "block";
    }

    if (seccion === "costos") renderCostos();
    else if (seccion === "insumos") renderInsumos();
    else renderRecetas(seccion);
  }

  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => activarSeccion(btn.dataset.seccion));
  });

  /* ===================== RECETAS ===================== */
  const ingredientesContainer = $("ingredientesContainer");

  $("btnAgregar")?.addEventListener("click", () => {
    const div = document.createElement("div");
    div.className = "ingrediente";
    div.innerHTML = `
      <input placeholder="Ingrediente">
      <input type="number" placeholder="Cantidad (g)">
    `;
    ingredientesContainer.appendChild(div);
  });

  $("btnGuardar")?.addEventListener("click", () => {
    const nombre = $("nombre").value.trim();
    if (!nombre) return;

    const ingredientes = [...ingredientesContainer.children]
      .map(d => ({
        nombre: d.children[0].value.trim(),
        cantidad: parseFloat(d.children[1].value)
      }))
      .filter(i => i.nombre && !isNaN(i.cantidad));

    if (!ingredientes.length) return;

    const receta = { nombre, ingredientes };

    if (recetaEditando) {
      recetas[recetaEditando.sec][recetaEditando.i] = receta;
      recetaEditando = null;
    } else {
      recetas[seccionActual].push(receta);
    }

    localStorage.setItem("recetas", JSON.stringify(recetas));

    $("nombre").value = "";
    ingredientesContainer.innerHTML = "";

    renderRecetas(seccionActual);
  });

  function renderRecetas(seccion) {
    const ul = $(`lista-${seccion}`);
    if (!ul) return;

    ul.innerHTML = "";

    recetas[seccion].forEach((r, i) => {
      const total = r.ingredientes.reduce((s, x) => s + x.cantidad, 0);
      const li = document.createElement("li");

      li.className = "receta receta-finalizada";

      li.innerHTML = `
        <strong>${r.nombre}</strong>
        <div class="resultado">
          ${r.ingredientes.map(x => `${x.nombre}: ${peso(x.cantidad)}`).join("<br>")}
          <br><strong>Total:</strong> ${peso(total)}
        </div>

        <input id="porcentaje-${seccion}-${i}" type="number" placeholder="➕ %">
        <div id="porc-${seccion}-${i}"></div>

        <input id="piezas-${seccion}-${i}" type="number" placeholder="🔢 Cantidad de piezas">
        <div id="piezasRes-${seccion}-${i}"></div>

        <div class="acciones-receta">
          <button onclick="editar('${seccion}',${i})">✏️</button>
          <button onclick="eliminar('${seccion}',${i})">🗑</button>
        </div>
      `;
      ul.appendChild(li);

      // EVENTOS
      $(`porcentaje-${seccion}-${i}`).addEventListener("input", e => {
        aplicarPorcentaje(seccion, i, e.target.value);

        // 🔥 NUEVO: recalcula piezas automáticamente si hay valor
        const piezasInput = document.getElementById(`piezas-${seccion}-${i}`);
        if (piezasInput && piezasInput.value) {
          dividir(seccion, i, piezasInput.value);
        }
      });

      $(`piezas-${seccion}-${i}`).addEventListener("input", e => {
        dividir(seccion, i, e.target.value);
      });
    });
  }

  window.editar = (sec, i) => {
    const r = recetas[sec][i];
    if (!r) return;

    $("nombre").value = r.nombre;
    ingredientesContainer.innerHTML = "";

    r.ingredientes.forEach(x => {
      const d = document.createElement("div");
      d.className = "ingrediente";
      d.innerHTML = `
        <input value="${x.nombre}">
        <input type="number" value="${x.cantidad}">
      `;
      ingredientesContainer.appendChild(d);
    });

    recetaEditando = { sec, i };
    activarSeccion(sec);
  };

  window.eliminar = (sec, i) => {
    if (!confirm("¿Eliminar receta?")) return;
    recetas[sec].splice(i, 1);
    localStorage.setItem("recetas", JSON.stringify(recetas));
    renderRecetas(sec);
  };

  /* ===================== INSUMOS ===================== */
  $("btnAgregarInsumo")?.addEventListener("click", () => {
    const nombre = $("insumo-nombre").value.trim();
    const cantidad = parseFloat($("insumo-cantidad").value);
    const precio = parseFloat($("insumo-precio").value);

    if (!nombre || isNaN(cantidad) || isNaN(precio)) return;

    if (insumoEditando !== null) {
      insumos[insumoEditando] = { nombre, cantidad, precio };
      insumoEditando = null;
    } else {
      insumos.push({ nombre, cantidad, precio });
    }

    localStorage.setItem("insumos", JSON.stringify(insumos));

    $("insumo-nombre").value = "";
    $("insumo-cantidad").value = "";
    $("insumo-precio").value = "";

    renderInsumos();
  });

  function renderInsumos() {
    const ul = $("lista-insumos");
    if (!ul) return;

    ul.innerHTML = "";
    insumos.forEach((i, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${i.nombre}</strong> — ${peso(i.cantidad)} — $${i.precio.toFixed(2)}
        <div class="acciones-receta">
          <button onclick="editarInsumo(${index})">✏️</button>
          <button onclick="eliminarInsumo(${index})">🗑</button>
        </div>
      `;
      ul.appendChild(li);
    });
  }

  window.editarInsumo = (index) => {
    const insumo = insumos[index];
    if (!insumo) return;

    $("insumo-nombre").value = insumo.nombre;
    $("insumo-cantidad").value = insumo.cantidad;
    $("insumo-precio").value = insumo.precio;

    insumoEditando = index;
    activarSeccion("insumos");
  };

  window.eliminarInsumo = (index) => {
    if (!confirm("¿Eliminar insumo?")) return;
    insumos.splice(index, 1);
    localStorage.setItem("insumos", JSON.stringify(insumos));
    renderInsumos();
  };

  /* ===================== PORCENTAJE / PIEZAS ===================== */
  window.aplicarPorcentaje = (sec, i, p) => {
    const r = recetas[sec][i];
    const cont = $(`porc-${sec}-${i}`);
    if (!r || !cont) return;

    const porcentaje = parseFloat(p);
    if (isNaN(porcentaje)) {
      cont.innerHTML = "";
      r._porcentaje = 0;
      return;
    }

    r._porcentaje = porcentaje;
    const factor = 1 + porcentaje / 100;
    const totalPeso = r.ingredientes.reduce((s, x) => s + x.cantidad, 0);

    cont.innerHTML =
      r.ingredientes.map(x => `${x.nombre}: ${peso(x.cantidad * factor)}`).join("<br>") +
      `<br><strong>Total con %:</strong> ${peso(totalPeso * factor)}`;
  };

  window.dividir = (sec, i, n) => {
    const r = recetas[sec][i];
    const cont = $(`piezasRes-${sec}-${i}`);
    if (!r || !cont) return;

    n = parseFloat(n);
    if (isNaN(n) || n <= 0) {
      cont.innerHTML = "";
      return;
    }

    const factor = r._porcentaje ? 1 + r._porcentaje / 100 : 1;
    const totalPeso = r.ingredientes.reduce((s, x) => s + x.cantidad, 0);

    cont.innerHTML = `
      <strong>Por unidad:</strong> ${peso(totalPeso / n)}
      <br><strong>Por unidad con %:</strong> ${peso((totalPeso * factor) / n)}
    `;
  };

    /* ===================== COSTOS ===================== */
  function renderCostos() {
    const cont = $("vista-costos");
    if (!cont) return;
    cont.innerHTML = "";

    ["panaderia", "reposteria", "rellenos"].forEach(seccion => {
      recetas[seccion].forEach((receta, i) => {
        const factor = receta._porcentaje ? 1 + receta._porcentaje / 100 : 1;
        const totalGramos = receta.ingredientes.reduce((s, i) => s + i.cantidad, 0);
        const totalCosto = calcularCostoReceta(receta);
        
        // Buscamos las piezas del input de la receta
        const inputPiezas = document.getElementById(`piezas-${seccion}-${i}`);
        const numPiezas = inputPiezas ? parseFloat(inputPiezas.value) : 0;

        const card = document.createElement("div");
        card.className = "card-costo";

        let htmlUnidad = "";
        if (numPiezas > 0) {
          const costoUnitarioBase = totalCosto / numPiezas;
          // Solo mostramos el costo real por pieza (sin el % de aumento)
          htmlUnidad = `<br><strong>Costo por unidad (Base):</strong> $${costoUnitarioBase.toFixed(2)}`;
        }

        card.innerHTML = `
          <h3>${receta.nombre}</h3>
          <table>
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Cantidad</th>
                <th>Con %</th>
                <th>Costo</th>
              </tr>
            </thead>
            <tbody>
              ${receta.ingredientes.map(i => `
                <tr>
                  <td>${i.nombre}</td>
                  <td>${peso(i.cantidad)}</td>
                  <td>${peso(i.cantidad * factor)}</td>
                  <td>$${(precioPorGramo(i.nombre) * i.cantidad).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="totales">
            <strong>Total:</strong> ${peso(totalGramos)} — $${totalCosto.toFixed(2)}<br>
            <strong>Total con %:</strong> ${peso(totalGramos * factor)} — $${(totalCosto * factor).toFixed(2)}
            ${htmlUnidad}
          </div>
        `;
        cont.appendChild(card);
      });
    });
  }

  /* ===================== BACKUP ===================== */
  $("btnExportar")?.addEventListener("click", () => {
    const data = { recetas, insumos };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-recetas.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  $("btnImportar")?.addEventListener("click", () => {
    const input = $("fileImportar");
    if (!input.files.length) {
      alert("Seleccioná un archivo primero");
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.recetas || !data.insumos) {
          alert("Archivo inválido");
          return;
        }

        if (!confirm("Esto reemplazará todos tus datos actuales. ¿Continuar?")) return;

        recetas = data.recetas;
        insumos = data.insumos;

        localStorage.setItem("recetas", JSON.stringify(recetas));
        localStorage.setItem("insumos", JSON.stringify(insumos));

        activarSeccion("panaderia");

        alert("Backup restaurado correctamente ✅");

      } catch {
        alert("Error al leer archivo");
      }
    };

    reader.readAsText(input.files[0]);
  });

  /* ===================== INICIAL ===================== */
  activarSeccion(seccionActual);
});

// ======================
// SPLASH SCREEN
// ======================

window.addEventListener("load", () => {
  setTimeout(() => {
    const splash = document.getElementById("splash");
    if (splash) splash.style.display = "none";
  }, 800);
});


// ======================
// SERVICE WORKER
// ======================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

