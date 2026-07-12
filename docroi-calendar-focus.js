(function(){
  const VERSION = "20260712-calendar-focus";
  if (globalThis.__docroiCalendarFocus === VERSION) return;
  globalThis.__docroiCalendarFocus = VERSION;

  if (!globalThis.state) return;

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const dateText = (v) => { try { return formatDate(v); } catch { return v || "Sin fecha"; } };
  const rel = (mod, id) => { try { return relationLabel(mod, id); } catch { const x = (state[mod] || []).find(item => item.id === id); return x?.name || x?.title || id || "Sin asignar"; } };
  const dayDiff = (date) => {
    if (!date) return 9999;
    const today = new Date(new Date().toDateString());
    return Math.ceil((new Date(date + "T00:00:00") - today) / 86400000);
  };

  function upcomingWeekSessions(){
    return [...(state.sessions || [])]
      .filter(session => session.date && session.status !== "Cancelada")
      .filter(session => dayDiff(session.date) >= 0 && dayDiff(session.date) <= 7)
      .sort((a,b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.startTime || "").localeCompare(String(b.startTime || "")));
  }

  function programOf(session){
    return (state.programs || []).find(program => program.id === session.programId) || {};
  }

  function institutionOf(session){
    const program = programOf(session);
    return (state.institutions || []).find(institution => institution.id === program.institutionId) || {};
  }

  function miniLogo(institution){
    if (institution.logoFileData) return `<img class="institution-logo inherited-logo" src="${institution.logoFileData}" alt="${esc(institution.name)}">`;
    const initials = String(institution.name || "IN").split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();
    return `<div class="institution-logo placeholder inherited-logo">${esc(initials || "IN")}</div>`;
  }

  function sessionCard(session){
    const program = programOf(session);
    const institution = institutionOf(session);
    const modeLine = [session.mode, session.place || session.classroom || session.onlineLink].filter(Boolean).join(" - ");
    return `<article class="record-card calendar-session-card" data-detail-module="sessions" data-detail-id="${session.id}">
      <div class="record-top">
        <span class="status-pill ${String(session.status || "Pendiente").toLowerCase()}">${esc(session.status || "Pendiente")}</span>
        <button class="icon-btn" type="button" data-edit-module="sessions" data-edit-id="${session.id}" aria-label="Editar">Edit</button>
      </div>
      ${miniLogo(institution)}
      <h3>${esc(session.title)}</h3>
      <p>${esc(program.name || "Sin programa")} - ${esc(institution.name || "Sin institucion")}</p>
      <div class="meta-grid">
        <span>Fecha<strong>${dateText(session.date)}</strong></span>
        <span>Hora<strong>${esc(session.startTime || "Sin hora")}${session.endTime ? " - " + esc(session.endTime) : ""}</strong></span>
        <span>Duracion<strong>${Number(session.duration || 0)} h</strong></span>
        <span>Donde<strong>${esc(modeLine || "Sin asignar")}</strong></span>
      </div>
      <div class="card-actions">
        <button class="btn secondary" type="button" data-detail-module="sessions" data-detail-id="${session.id}">Ver ficha</button>
      </div>
    </article>`;
  }

  function dayLabel(date){
    return date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  }

  function renderWeekPlanner(sessions){
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(new Date().toDateString());
      date.setDate(date.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      const daySessions = sessions.filter(session => session.date === key);
      return `<article class="calendar-day focused-calendar-day">
        <header><span>${dayLabel(date)}</span><strong>${daySessions.reduce((sum, session) => sum + Number(session.duration || 0), 0)} h</strong></header>
        <div>${daySessions.map(session => {
          const institution = institutionOf(session);
          return `<button class="calendar-chip session-only-chip" type="button" data-detail-module="sessions" data-detail-id="${session.id}">
            <strong>${esc(session.startTime || "Sesion")}</strong>
            <span>${esc(session.title)}</span>
            <small>${esc(institution.name || rel("programs", session.programId))}</small>
          </button>`;
        }).join("") || "<small>Sin sesiones</small>"}</div>
      </article>`;
    }).join("");
    return `<section class="calendar-planner session-week-planner">
      <div class="planner-head">
        <div><p class="eyebrow">Sesiones proximas</p><h3>Esta semana</h3></div>
        <strong>${sessions.reduce((sum, session) => sum + Number(session.duration || 0), 0)} h programadas</strong>
      </div>
      <div class="week-grid">${days}</div>
    </section>`;
  }

  function renderCalendarFocus(){
    const sessions = upcomingWeekSessions();
    $("#pageTitle").textContent = "Calendario";
    $("#app").innerHTML = `<section class="module-head">
      <div><p class="eyebrow">${sessions.length} sesiones proximas</p><h2>Calendario de esta semana</h2></div>
      <button class="btn secondary" type="button" data-route="sessions">Ver sesiones</button>
    </section>
    ${renderWeekPlanner(sessions)}
    <section class="records-grid calendar focused-session-grid">
      ${sessions.length ? sessions.map(sessionCard).join("") : `<div class="empty-state">No hay sesiones proximas esta semana.</div>`}
    </section>`;
    try { if (typeof decorate === "function") decorate(); } catch {}
  }

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender && !globalThis.__docroiCalendarFocusRenderPatched) {
    globalThis.__docroiCalendarFocusRenderPatched = true;
    render = function(){
      originalRender();
      const route = location.hash.replace("#", "").split("?")[0] || "dashboard";
      if (route === "calendar") renderCalendarFocus();
    };
  }

  const originalModuleView = typeof moduleView === "function" ? moduleView : null;
  if (originalModuleView && !globalThis.__docroiCalendarFocusModulePatched) {
    globalThis.__docroiCalendarFocusModulePatched = true;
    moduleView = function(module){
      if (module === "calendar") { renderCalendarFocus(); return; }
      originalModuleView(module);
    };
  }

  const style = document.createElement("style");
  style.textContent = `.session-week-planner .month-list{display:none}.focused-session-grid{margin-top:18px}.calendar-session-card .institution-logo{margin-top:8px}.session-only-chip{display:grid;gap:3px}.session-only-chip small{color:#aac6e7;font-size:.72rem;font-weight:800}.focused-calendar-day .calendar-chip{min-height:72px}.focused-calendar-day .calendar-chip small{text-align:left}`;
  document.head.appendChild(style);

  if ((location.hash.replace("#", "").split("?")[0] || "dashboard") === "calendar") renderCalendarFocus();
})();
