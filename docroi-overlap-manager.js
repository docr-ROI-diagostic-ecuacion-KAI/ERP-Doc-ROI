(function(){
  const VERSION = "20260718-overlap-manager-1";
  if (globalThis.__docroiOverlapManager === VERSION) return;
  globalThis.__docroiOverlapManager = VERSION;

  if (!globalThis.state) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]));
  const titleOf = (item) => item?.name || item?.title || item?.concept || "Sin asignar";
  const rel = (module, id) => {
    try { return relationLabel(module, id); }
    catch {
      const item = (state[module] || []).find(record => record.id === id);
      return titleOf(item) || id || "Sin asignar";
    }
  };

  function minutes(value){
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function sessionEnd(session){
    const start = minutes(session.startTime);
    if (start == null) return null;
    const explicitEnd = minutes(session.endTime);
    if (explicitEnd != null) return explicitEnd < start ? explicitEnd + 1440 : explicitEnd;
    const duration = Number(session.duration || 0);
    return duration > 0 ? start + duration * 60 : null;
  }

  function localDate(value){
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  function daysTo(value){
    const target = localDate(value);
    if (!target) return 9999;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.ceil((target - today) / 86400000);
  }

  function dateText(value){
    try { return formatDate(value); }
    catch {
      const date = localDate(value);
      return date ? date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }).replace(".", "") : "Sin fecha";
    }
  }

  function timeRange(session){
    return `${session.startTime || "Sin hora"}${session.endTime ? " - " + session.endTime : ""}`;
  }

  function conflictPairs(candidate){
    const sessions = (state.sessions || []).filter(session => session.date && session.startTime && session.status !== "Cancelada");
    const source = candidate ? [candidate] : sessions;
    const list = [];
    source.forEach((a, sourceIndex) => {
      const aStart = minutes(a.startTime);
      const aEnd = sessionEnd(a);
      if (aStart == null || aEnd == null) return;
      sessions.forEach((b, index) => {
        if (!candidate && index <= sourceIndex) return;
        if (a.id && b.id === a.id) return;
        if (a.date !== b.date) return;
        const bStart = minutes(b.startTime);
        const bEnd = sessionEnd(b);
        if (bStart == null || bEnd == null) return;
        if (aStart < bEnd && bStart < aEnd) list.push({ a, b, days: daysTo(a.date) });
      });
    });
    return list.sort((x, y) => String(x.a.date || "").localeCompare(String(y.a.date || "")) || String(x.a.startTime || "").localeCompare(String(y.a.startTime || "")));
  }

  function conflictIds(){
    return new Set(conflictPairs().flatMap(pair => [pair.a.id, pair.b.id]).filter(Boolean));
  }

  function conflictCard(pair, compact){
    const firstProgram = rel("programs", pair.a.programId);
    const secondProgram = rel("programs", pair.b.programId);
    const daysLabel = pair.days < 0 ? `Hace ${Math.abs(pair.days)} dias` : pair.days === 0 ? "Hoy" : `${pair.days} dias`;
    return `<article class="overlap-card ${compact ? "compact" : ""}">
      <span class="status-pill conflict">Solape</span>
      <strong>${esc(dateText(pair.a.date))} - ${esc(timeRange(pair.a))}</strong>
      <p>${esc(pair.a.title)} / ${esc(pair.b.title)}</p>
      <small>${esc(firstProgram)} / ${esc(secondProgram)}</small>
      <div class="overlap-countdown"><span>Cuenta atras</span><b>${esc(daysLabel)}</b></div>
      <div class="overlap-actions">
        <button class="btn secondary" type="button" data-detail-module="sessions" data-detail-id="${pair.a.id}">Abrir 1</button>
        <button class="btn secondary" type="button" data-detail-module="sessions" data-detail-id="${pair.b.id}">Abrir 2</button>
      </div>
    </article>`;
  }

  function renderOverlapPanel(context){
    const pairs = conflictPairs();
    if (!pairs.length) {
      if (context === "alerts") return `<section class="overlap-panel"><div class="panel-head"><h3>Solapes</h3><span>Sin conflictos</span></div><div class="empty-state">No hay solapes detectados.</div></section>`;
      return "";
    }
    const title = context === "dashboard" ? "Solapes a negociar" : "Solapes detectados";
    return `<section class="overlap-panel ${context === "dashboard" ? "dashboard-overlaps" : ""}">
      <div class="panel-head"><h3>${title}</h3><span>${pairs.length} conflicto(s)</span></div>
      <div class="overlap-grid">${pairs.map(pair => conflictCard(pair, context === "dashboard")).join("")}</div>
    </section>`;
  }

  function addPanels(){
    const route = location.hash.replace("#", "").split("?")[0] || "dashboard";
    const app = document.querySelector("#app");
    if (!app) return;
    app.querySelectorAll(".overlap-panel,.overlap-dashboard").forEach(node => node.remove());
    if (route === "dashboard") {
      const html = renderOverlapPanel("dashboard");
      if (html) app.insertAdjacentHTML("afterbegin", html);
    }
    if (route === "alerts") {
      app.insertAdjacentHTML("afterbegin", renderOverlapPanel("alerts"));
    }
  }

  function markOverlapElements(){
    const ids = conflictIds();
    document.querySelectorAll(".session-conflict-card,.overlap-chip").forEach(node => node.classList.remove("session-conflict-card", "overlap-chip"));
    document.querySelectorAll(".overlap-mini-badge").forEach(node => node.remove());
    if (!ids.size) return;
    document.querySelectorAll("[data-detail-module='sessions'][data-detail-id], [data-edit-module='sessions'][data-edit-id]").forEach(node => {
      const id = node.dataset.detailId || node.dataset.editId;
      if (!ids.has(id)) return;
      const target = node.closest(".record-card,.calendar-chip,.session-only-chip,.month-row,.predictive-row") || node;
      target.classList.add(target.classList.contains("calendar-chip") || target.classList.contains("session-only-chip") ? "overlap-chip" : "session-conflict-card");
      if (!target.querySelector(".overlap-mini-badge") && target.classList.contains("record-card")) {
        target.insertAdjacentHTML("afterbegin", `<span class="overlap-mini-badge">Solape</span>`);
      }
    });
  }

  function currentDialogRecord(){
    const dialog = document.querySelector("#recordDialog");
    if (!dialog?.open || !/Sesiones/i.test(document.querySelector("#dialogKicker")?.textContent || "")) return null;
    const id = typeof editing !== "undefined" ? editing?.id : null;
    const programId = dialog.querySelector("[name='programId']")?.value || "";
    const program = (state.programs || []).find(item => item.id === programId);
    const startTime = dialog.querySelector("[name='startTime']")?.value || "";
    const endTime = dialog.querySelector("[name='endTime']")?.value || "";
    const duration = dialog.querySelector("[name='duration']")?.value || "";
    return {
      id: id || "__draft_session__",
      title: dialog.querySelector("[name='title']")?.value || "Nueva sesion",
      programId,
      institutionId: dialog.querySelector("[name='institutionId']")?.value || program?.institutionId || "",
      date: dialog.querySelector("[name='date']")?.value || "",
      startTime,
      endTime,
      duration
    };
  }

  function syncDialogWarning(){
    const dialog = document.querySelector("#recordDialog");
    if (!dialog?.open) return;
    dialog.querySelector(".overlap-form-warning")?.remove();
    const draft = currentDialogRecord();
    if (!draft?.date || !draft.startTime) return;
    const pairs = conflictPairs(draft);
    if (!pairs.length) return;
    const holder = document.querySelector("#formFields");
    if (!holder) return;
    holder.insertAdjacentHTML("afterbegin", `<div class="overlap-form-warning span-2">
      <strong>Solape detectado</strong>
      <span>${pairs.map(pair => `${dateText(pair.b.date)} ${timeRange(pair.b)} - ${pair.b.title}`).map(esc).join("<br>")}</span>
      <small>Puedes guardar igualmente. La alerta queda visible para gestionarla.</small>
    </div>`);
  }

  function injectStyles(){
    if (document.getElementById("docroi-overlap-manager-style")) return;
    const style = document.createElement("style");
    style.id = "docroi-overlap-manager-style";
    style.textContent = `
      .overlap-panel{display:grid;gap:14px;margin:0 0 18px;padding:16px;border:1px solid rgba(255,85,105,.28);border-radius:8px;background:linear-gradient(180deg,rgba(41,17,28,.94),rgba(13,18,29,.94))}
      .overlap-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
      .overlap-card{display:grid;gap:8px;padding:14px;border:1px solid rgba(255,85,105,.25);border-radius:8px;background:rgba(11,17,29,.78)}
      .overlap-card strong{color:#fff}.overlap-card p{margin:0;color:#eef5ff;font-weight:900}.overlap-card small{color:#aac6e7;font-weight:800}
      .overlap-card.compact{grid-template-columns:1fr auto;align-items:center}
      .overlap-card.compact p,.overlap-card.compact small{grid-column:1/-1}
      .status-pill.conflict,.overlap-mini-badge{border-color:rgba(255,85,105,.48);background:rgba(255,42,76,.16);color:#ff8fa0}
      .overlap-countdown{display:grid;gap:2px;justify-items:start}.overlap-countdown span{color:#ffb3be;font-size:.78rem;font-weight:900}.overlap-countdown b{color:#ff4b5c;font-size:1.4rem}
      .overlap-actions{display:flex;gap:8px;flex-wrap:wrap}
      .session-conflict-card{outline:2px solid rgba(255,75,92,.7);box-shadow:0 0 0 4px rgba(255,75,92,.1)}
      .overlap-chip{border-color:rgba(255,75,92,.75)!important;background:rgba(255,75,92,.18)!important}
      .overlap-mini-badge{position:absolute;top:56px;right:14px;z-index:4;padding:6px 10px;border:1px solid;border-radius:999px;font-weight:900}
      .overlap-form-warning{display:grid;gap:6px;padding:14px;border:1px solid rgba(255,85,105,.36);border-radius:8px;background:rgba(255,75,92,.12);color:#eef5ff}
      .overlap-form-warning strong{color:#ffb3be}.overlap-form-warning span{line-height:1.35}.overlap-form-warning small{color:#aac6e7}
    `;
    document.head.appendChild(style);
  }

  function refresh(){
    injectStyles();
    addPanels();
    markOverlapElements();
    syncDialogWarning();
  }

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender && !globalThis.__docroiOverlapRenderPatched) {
    globalThis.__docroiOverlapRenderPatched = true;
    render = function(){
      originalRender();
      setTimeout(refresh, 0);
    };
  }

  const originalModuleView = typeof moduleView === "function" ? moduleView : null;
  if (originalModuleView && !globalThis.__docroiOverlapModulePatched) {
    globalThis.__docroiOverlapModulePatched = true;
    moduleView = function(module){
      originalModuleView(module);
      setTimeout(refresh, 0);
    };
  }

  document.addEventListener("input", event => {
    if (event.target.closest("#recordDialog")) setTimeout(syncDialogWarning, 0);
  }, true);
  document.addEventListener("change", event => {
    if (event.target.closest("#recordDialog")) setTimeout(syncDialogWarning, 0);
  }, true);

  try { refresh(); } catch {}
  setInterval(refresh, 1200);
})();