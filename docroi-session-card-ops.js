(function(){
  const VERSION = "20260715-session-card-ops-4";
  if (globalThis.__docroiSessionCardOps === VERSION) return;
  globalThis.__docroiSessionCardOps = VERSION;

  function injectStyles(){
    if (document.getElementById("docroi-session-card-ops-style")) return;
    const style = document.createElement("style");
    style.id = "docroi-session-card-ops-style";
    style.textContent = `
      .record-card.session-ops-card{position:relative;display:grid;gap:14px;min-height:430px;padding:24px;border-left:5px solid var(--inst-color,#7c5cff);background:radial-gradient(circle at 70% 4%,color-mix(in srgb,var(--inst-color,#7c5cff) 14%,transparent),transparent 36%),linear-gradient(180deg,rgba(19,27,47,.96),rgba(12,18,31,.96))}
      .record-card.session-ops-card .record-top{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start}
      .record-card.session-ops-card .session-date-chip{justify-self:start;padding:14px 18px;border:1px solid rgba(170,198,231,.22);border-radius:8px;background:rgba(12,18,31,.74);box-shadow:0 10px 26px rgba(0,0,0,.22)}
      .record-card.session-ops-card .session-date-chip span{display:block;color:#aac6e7;font-size:.86rem;font-weight:900}
      .record-card.session-ops-card .session-date-chip strong{display:block;margin-top:4px;color:#fff;font-size:1.08rem;line-height:1.1}
      .record-card.session-ops-card .inherited-logo{margin:0;display:block}
      .record-card.session-ops-card .inherited-logo span{display:none}
      .record-card.session-ops-card .institution-logo{width:74px;height:74px;margin:0;border-radius:8px;background:#fff;object-fit:contain}
      .record-card.session-ops-card h3{margin:4px 0 0;font-size:1.72rem;line-height:1.08;letter-spacing:0}
      .record-card.session-ops-card p{margin:0;color:#aac6e7;font-size:1.18rem;line-height:1.45}
      .record-card.session-ops-card .meta-grid{display:none}
      .session-ops-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .session-ops-tile{display:grid;align-content:center;min-height:112px;padding:16px;border:1px solid rgba(170,198,231,.2);border-radius:8px;background:rgba(11,17,29,.84)}
      .session-ops-tile span{color:#fff;font-size:1.35rem;line-height:1.12}
      .session-ops-tile strong{color:#fff;font-size:1.62rem;line-height:1.05}
      .session-ops-tile.days{background:#050505;border-color:#111}
      .session-ops-tile.days span{color:#ff2323}
      .session-ops-tile.days strong{color:#ff1616;font-size:3.05rem}
      .record-card.session-ops-card .progress,.record-card.session-ops-card .progress + *{display:none}
      .record-card.session-ops-card .card-actions{margin-top:0}
      .record-card.session-ops-card.session-overdue{border-left-color:#ff4b5c;background:radial-gradient(circle at 70% 4%,rgba(255,75,92,.16),transparent 36%),linear-gradient(180deg,rgba(39,22,31,.96),rgba(16,16,26,.96))}
      .record-card.session-ops-card.session-hidden-board{display:none!important}
      .session-dismiss-btn{position:absolute;top:14px;right:14px;z-index:3;width:34px;height:34px;border:1px solid rgba(255,105,120,.45);border-radius:8px;background:rgba(60,13,24,.88);color:#ff8c9b;font-size:1rem;font-weight:900;line-height:1;cursor:pointer}
      .session-dismiss-btn:hover{background:rgba(104,19,39,.95);color:#fff}
      @media(max-width:760px){.session-ops-grid{grid-template-columns:1fr}.record-card.session-ops-card h3{font-size:1.38rem}.record-card.session-ops-card p{font-size:1rem}}
    `;
    document.head.appendChild(style);
  }

  function shortDate(value){
    if (!value) return "Sin fecha";
    try {
      return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" })
        .format(new Date(`${value}T00:00:00`))
        .replace(".", "");
    } catch {
      return value;
    }
  }

  function daysTo(value){
    if (!value) return "-";
    const base = new Date();
    const sessionDate = new Date(`${value}T00:00:00`);
    const todayDate = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    return Math.ceil((sessionDate - todayDate) / 86400000);
  }

  function dismissedIds(){
    try { return new Set(JSON.parse(localStorage.getItem("docroi.dismissedSessions") || "[]")); }
    catch { return new Set(); }
  }

  function dismissSession(id){
    const ids = dismissedIds();
    ids.add(id);
    localStorage.setItem("docroi.dismissedSessions", JSON.stringify([...ids]));
  }

  function sessionSortValue(session){
    return `${session.date || "9999-12-31"}T${session.startTime || "99:99"}`;
  }

  function titleOf(item){
    return item?.name || item?.title || item?.concept || "Sin asignar";
  }

  function decorate(){
    injectStyles();
    if (typeof state === "undefined") return;
    const dismissed = dismissedIds();
    const cards = [...document.querySelectorAll(".records-grid.sessions .record-card")];
    const visibleCards = [];
    cards.forEach(card => {
      const detail = card.querySelector('[data-detail-module="sessions"][data-detail-id]');
      const session = (state.sessions || []).find(item => item.id === detail?.dataset.detailId);
      if (!session) return;
      const diff = daysTo(session.date);
      const hidden = dismissed.has(session.id) || Number(diff) < -2;
      card.classList.toggle("session-hidden-board", hidden);
      card.classList.toggle("session-overdue", Number(diff) < 0 && Number(diff) >= -2);
      card.dataset.sessionSort = sessionSortValue(session);
      if (!hidden) visibleCards.push(card);
      const program = (state.programs || []).find(item => item.id === session.programId);
      const top = card.querySelector(".record-top");
      const logo = card.querySelector(".inherited-logo,.institution-logo");
      const subtitle = card.querySelector("p");
      const meta = card.querySelector(".meta-grid");
      if (!top || !subtitle || !meta) return;
      card.classList.add("session-ops-card");
      card.dataset.sessionOpsId = session.id;
      if (!top.querySelector(".session-date-chip")) {
        const chip = document.createElement("div");
        chip.className = "session-date-chip";
        chip.innerHTML = `<span>Fecha</span><strong>${shortDate(session.date)}</strong>`;
        const edit = top.querySelector("[data-edit-module]");
        top.insertBefore(chip, edit || null);
      }
      if (!(Number(diff) < 0 && Number(diff) >= -2)) card.querySelector(".session-dismiss-btn")?.remove();
      if (Number(diff) < 0 && Number(diff) >= -2 && !card.querySelector(".session-dismiss-btn")) {
        const dismiss = document.createElement("button");
        dismiss.className = "session-dismiss-btn";
        dismiss.type = "button";
        dismiss.dataset.dismissSession = session.id;
        dismiss.setAttribute("aria-label", "Quitar sesion del tablero");
        dismiss.textContent = "x";
        card.appendChild(dismiss);
      }
      if (logo && logo.parentElement === card) top.after(logo);
      subtitle.innerHTML = `${titleOf(program)}:<br>${session.type || session.title || "Sesion"} - ${session.date || "Sin fecha"} ${session.startTime || ""}`;
      card.querySelector(".session-ops-grid")?.remove();
      const ops = document.createElement("div");
      ops.className = "session-ops-grid";
      ops.innerHTML = `
        <div class="session-ops-tile"><span>Hora Inicio:</span><strong>${session.startTime || "Sin hora"}</strong><span>${session.status || "Pendiente"}</span></div>
        <div class="session-ops-tile days"><span>Dias para:</span><strong>${daysTo(session.date)}</strong></div>
        <div class="session-ops-tile"><span>Duracion calculada (horas)</span><strong>${session.duration || "-"}</strong></div>
        <div class="session-ops-tile"><span>Modalidad</span><strong>${session.mode || program?.mode || "Sin definir"}</strong></div>
      `;
      meta.before(ops);
    });
    const grid = document.querySelector(".records-grid.sessions");
    if (grid) visibleCards
      .sort((a, b) => String(a.dataset.sessionSort || "").localeCompare(String(b.dataset.sessionSort || "")))
      .forEach(card => grid.appendChild(card));
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-dismiss-session]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    dismissSession(button.dataset.dismissSession);
    const card = button.closest(".record-card");
    if (card) card.classList.add("session-hidden-board");
  }, true);

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender && !globalThis.__docroiSessionCardOpsRenderPatched) {
    globalThis.__docroiSessionCardOpsRenderPatched = true;
    render = function(){
      originalRender();
      setTimeout(decorate, 0);
    };
  }

  try { decorate(); } catch {}
  setInterval(decorate, 900);
})();