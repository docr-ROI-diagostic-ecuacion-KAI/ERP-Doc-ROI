(function(){
  const VERSION = "20260711-functional-alignment";
  if (globalThis.__docroiFunctionalAlignment === VERSION) return;
  globalThis.__docroiFunctionalAlignment = VERSION;

  const cfgs = typeof modules !== "undefined" ? modules : (typeof moduleConfig !== "undefined" ? moduleConfig : null);
  if (!cfgs || !globalThis.state) return;

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const moneyFmt = (v) => {
    try { return eur.format(Number(v || 0)); } catch {
      try { return money.format(Number(v || 0)); } catch {
        return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v || 0));
      }
    }
  };
  const dateFmt2 = (v) => { try { return fmtDate(v); } catch { try { return formatDate(v); } catch { return v || "Sin fecha"; } } };
  const saveX = () => { try { save(); } catch { try { saveState(); } catch {} } };
  const rel = (mod, id) => { try { return label(mod, id); } catch { try { return relationLabel(mod, id); } catch { const x=(state[mod]||[]).find(r=>r.id===id); return x?.name || x?.title || x?.concept || id || "Sin asignar"; } } };
  const daysUntil = (v) => { if (!v) return 999; return Math.ceil((new Date(v + "T00:00:00") - new Date(new Date().toDateString())) / 86400000); };

  function fieldsOf(module){ return cfgs[module]?.fields || []; }
  function removeField(module, name){
    const fields = fieldsOf(module);
    const idx = fields.findIndex(f => f[0] === name);
    if (idx >= 0) fields.splice(idx, 1);
  }
  function insertField(module, field, after){
    const fields = fieldsOf(module);
    if (!fields.length || fields.some(f => f[0] === field[0])) return;
    const idx = fields.findIndex(f => f[0] === after);
    fields.splice(idx >= 0 ? idx + 1 : fields.length, 0, field);
  }

  removeField("programs", "manualAmount");
  insertField("programs", ["programDocumentIds", "Documentacion asociada", "multi:documents"], "documentHubUrl");

  const statusField = fieldsOf("programs").find(f => f[0] === "status");
  if (statusField?.[4]) statusField[4] = statusField[4].map(v => v === "Programa" ? "En Programacion" : v);
  (state.programs || []).forEach(p => { if (p.status === "Programa") p.status = "En Programacion"; });

  (state.sessions || []).sort((a,b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.startTime || "").localeCompare(String(b.startTime || "")));
  saveX();

  function minutes(time){
    if (!time) return null;
    const [h,m] = String(time).split(":").map(Number);
    if (Number.isNaN(h)) return null;
    return h * 60 + (Number.isNaN(m) ? 0 : m);
  }

  function sessionEnd(session){
    const start = minutes(session.startTime);
    if (session.endTime) return minutes(session.endTime);
    if (start == null) return null;
    return start + Number(session.duration || 1) * 60;
  }

  function overlaps(){
    const list = [];
    const sessions = (state.sessions || []).filter(s => s.date && s.startTime && s.status !== "Cancelada");
    sessions.forEach((a, i) => {
      const aStart = minutes(a.startTime);
      const aEnd = sessionEnd(a);
      sessions.slice(i + 1).forEach(b => {
        if (a.date !== b.date) return;
        const bStart = minutes(b.startTime);
        const bEnd = sessionEnd(b);
        if (aStart == null || aEnd == null || bStart == null || bEnd == null) return;
        if (aStart < bEnd && bStart < aEnd) list.push({ a, b });
      });
    });
    return list;
  }

  function programFor(record){
    if (!record) return null;
    if (record.programId) return (state.programs || []).find(p => p.id === record.programId) || null;
    return null;
  }

  function sessionIncome(session){
    const program = programFor(session) || {};
    const hours = Number(session.duration || 0);
    const rate = Number(program.hourlyRate || 0);
    const gross = hours * rate;
    const retention = gross * 0.15;
    const net = gross - retention;
    return { program, hours, rate, gross, retention, net };
  }

  function financeTrackingHtml(){
    const rows = (state.finances || []).map(finance => {
      const program = (state.programs || []).find(p => p.id === finance.programId) || {};
      const admin = finance.adminOrgId ? rel("organization", finance.adminOrgId) : rel("contacts", finance.adminContactId);
      const issueDays = daysUntil(finance.plannedIssueDate);
      const collectDays = daysUntil(finance.plannedCollectionDate);
      const urgent = finance.status !== "Cobrado" && (issueDays <= 7 || collectDays <= 7);
      return `<article class="finance-tracking-row ${urgent ? "finance-alert-row" : ""}" data-detail-module="finances" data-detail-id="${finance.id}">
        <span class="finance-status">${esc(finance.status || "Pendiente")}</span>
        <div><strong>${esc(finance.concept)}</strong><small>${esc(rel("programs", finance.programId))} - ${esc(rel("institutions", finance.institutionId || program.institutionId))}</small></div>
        <div><small>Emitir factura</small><strong>${dateFmt2(finance.plannedIssueDate)}</strong></div>
        <div><small>Cobro previsto</small><strong>${dateFmt2(finance.plannedCollectionDate)}</strong></div>
        <div><small>Admin</small><strong>${esc(admin)}</strong></div>
      </article>`;
    }).join("");
    const pending = (state.finances || []).reduce((sum, f) => sum + Math.max(Number(f.expectedAmount || 0) - Number(f.collectedAmount || 0), 0), 0);
    const collected = (state.finances || []).reduce((sum, f) => sum + Number(f.collectedAmount || 0), 0);
    return `<section class="module-head"><div><p class="eyebrow">Facturacion y cobro</p><h2>Finanzas</h2></div><div class="report-toolbar"><button class="btn secondary" data-new="finances">Nueva factura</button></div></section>
      <section class="finance-strip"><article><span>A facturar/cobrar</span><strong>${moneyFmt(pending)}</strong></article><article><span>Cobrado</span><strong>${moneyFmt(collected)}</strong></article><article><span>Facturas abiertas</span><strong>${(state.finances || []).filter(f => f.status !== "Cobrado").length}</strong></article></section>
      <section class="finance-tracking-grid">${rows || `<div class="empty-state">Sin facturas registradas.</div>`}</section>`;
  }

  function addDashboardOverlapBlock(){
    const app = $("#app");
    if (!app || app.querySelector(".overlap-dashboard")) return;
    const list = overlaps();
    if (!list.length) return;
    app.insertAdjacentHTML("afterbegin", `<section class="panel predictive-alerts overlap-dashboard"><div class="panel-head"><h3>Solapes de agenda</h3><span>${list.length} conflicto(s)</span></div><div class="alert-stack">${list.map(({a,b}) => `<button class="predictive-row overlap-alert" data-detail-module="sessions" data-detail-id="${a.id}"><strong>Solape</strong><span>${esc(a.title)} / ${esc(b.title)}</span><small>${dateFmt2(a.date)} - ${esc(a.startTime)}-${esc(a.endTime || "")}</small></button>`).join("")}</div></section>`);
  }

  function markCalendarOverlaps(){
    const conflictIds = new Set(overlaps().flatMap(pair => [pair.a.id, pair.b.id]));
    if (!conflictIds.size) return;
    document.querySelectorAll("[data-detail-module='sessions'][data-detail-id]").forEach(node => {
      if (conflictIds.has(node.dataset.detailId)) {
        (node.closest(".record-card,.calendar-chip,.month-row,.predictive-row") || node).classList.add("overlap-alert");
      }
    });
    document.querySelectorAll(".month-row,.calendar-chip").forEach(row => {
      const text = row.textContent || "";
      (state.sessions || []).forEach(session => {
        if (conflictIds.has(session.id) && text.includes(session.title)) row.classList.add("overlap-alert");
      });
    });
  }

  function enhanceChecklistDocs(){
    const dialog = $("#recordDialog");
    if (!dialog?.open) return;
    const docs = state.documents || [];
    dialog.querySelectorAll(".checklist-field label").forEach((label, index) => {
      if (label.querySelector(".check-doc-row")) return;
      const labelText = label.querySelector("span")?.textContent || label.firstChild?.textContent || "";
      const select = label.querySelector("select");
      if (!select) return;
      const row = document.createElement("div");
      row.className = "check-doc-row";
      row.innerHTML = `<span>${esc(labelText)}</span>`;
      row.appendChild(select);
      const docSelect = document.createElement("select");
      docSelect.name = `checkDoc_${index}`;
      docSelect.innerHTML = `<option value="">Documento asociado</option>${docs.map(doc => `<option value="${doc.id}">${esc(doc.name || doc.title || doc.fileName || doc.id)}</option>`).join("")}`;
      row.appendChild(docSelect);
      label.textContent = "";
      label.appendChild(row);
    });
  }

  document.addEventListener("click", event => {
    const closeBtn = event.target.closest("dialog .dialog-head .icon-btn, dialog button[value='cancel'], #closeDetail, #cancelDialog");
    if (closeBtn) {
      event.preventDefault();
      event.stopPropagation();
      const dialog = closeBtn.closest("dialog");
      if (dialog) dialog.close();
      return;
    }
    setTimeout(enhanceChecklistDocs, 0);
  }, true);

  const originalOpenForm = typeof openForm === "function" ? openForm : null;
  if (originalOpenForm) {
    openForm = function(module, id){
      originalOpenForm(module, id);
      setTimeout(enhanceChecklistDocs, 0);
    };
  }

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender) {
    render = function(){
      originalRender();
      const route = location.hash.replace("#", "").split("?")[0] || "dashboard";
      if (route === "finances") {
        $("#pageTitle").textContent = "Finanzas";
        $("#app").innerHTML = financeTrackingHtml();
      }
      if (route === "dashboard") addDashboardOverlapBlock();
      if (route === "calendar" || route === "sessions") markCalendarOverlaps();
    };
  }

  const originalModuleView = typeof moduleView === "function" ? moduleView : null;
  if (originalModuleView) {
    moduleView = function(module){
      if (module === "finances") {
        $("#app").innerHTML = financeTrackingHtml();
        return;
      }
      originalModuleView(module);
      if (module === "sessions" || module === "calendar") markCalendarOverlaps();
    };
  }

  try { render(); } catch {}
})();
