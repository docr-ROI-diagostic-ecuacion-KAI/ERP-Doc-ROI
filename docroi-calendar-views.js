(function(){
  const VERSION = "20260718-calendar-views-1";
  if (globalThis.__docroiCalendarViews === VERSION) return;
  globalThis.__docroiCalendarViews = VERSION;

  if (!globalThis.state) return;

  const storageMode = "docroi.calendarViewMode";
  const storageAnchor = "docroi.calendarAnchorDate";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]));

  function localDate(value){
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  function dateKey(date){
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function todayKey(){ return dateKey(new Date()); }

  function addDays(date, days){
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function addMonths(date, months){ return new Date(date.getFullYear(), date.getMonth() + months, 1); }
  function mondayOf(date){ return addDays(date, 1 - (date.getDay() || 7)); }

  function monthGrid(anchor){
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = mondayOf(first);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }

  function minutes(value){
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function sessionEnd(session){
    const start = minutes(session.startTime);
    if (start == null) return null;
    const explicit = minutes(session.endTime);
    if (explicit != null) return explicit < start ? explicit + 1440 : explicit;
    const duration = Number(session.duration || session.calculatedDuration || 0);
    return duration > 0 ? start + duration * 60 : null;
  }

  function durationHours(session){
    const start = minutes(session.startTime);
    const end = sessionEnd(session);
    if (start == null || end == null) return Number(session.duration || 0);
    return Math.max(0, Math.round(((end - start) / 60) * 100) / 100);
  }

  function daysTo(value){
    const target = localDate(value);
    if (!target) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.ceil((target - today) / 86400000);
  }

  function dayText(value){
    const date = typeof value === "string" ? localDate(value) : value;
    return date ? date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }).replace(".", "") : "Sin fecha";
  }

  function monthTitle(date){ return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" }); }

  function rangeTitle(mode, anchor){
    if (mode === "day") return `${dayText(anchor)} - 00:01 - 23:59`;
    if (mode === "month") return monthTitle(anchor);
    const start = mondayOf(anchor);
    const end = addDays(start, 6);
    return `${dayText(start)} - ${dayText(end)} - 00:01 - 23:59`;
  }

  function getMode(){
    const mode = localStorage.getItem(storageMode);
    return ["day", "week", "month"].includes(mode) ? mode : "week";
  }

  function getAnchor(){ return localDate(localStorage.getItem(storageAnchor)) || localDate(todayKey()); }
  function setAnchor(date){ localStorage.setItem(storageAnchor, dateKey(date)); }

  function programOf(session){ return (state.programs || []).find(program => program.id === session.programId) || null; }

  function institutionOf(session){
    const direct = (state.institutions || []).find(item => item.id === session.institutionId);
    if (direct) return direct;
    const program = programOf(session);
    return (state.institutions || []).find(item => item.id === program?.institutionId) || null;
  }

  function institutionColor(institution){ return institution?.brandColor || institution?.color || institution?.institutionColor || "#6f5cff"; }

  function logoHtml(institution){
    if (!institution) return "";
    if (institution.logoFileData) return `<img class="calendar-view-logo" src="${institution.logoFileData}" alt="${esc(institution.name || "Institucion")}">`;
    const initials = String(institution.name || "IN").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
    return `<span class="calendar-view-logo placeholder">${esc(initials || "IN")}</span>`;
  }

  function sessions(){
    return [...(state.sessions || [])]
      .filter(session => session.date && session.status !== "Cancelada")
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.startTime || "").localeCompare(String(b.startTime || "")));
  }

  function sessionsOn(key){ return sessions().filter(session => session.date === key); }

  function conflictIds(){
    const ids = new Set();
    const list = sessions().filter(session => session.date && session.startTime);
    list.forEach((a, index) => {
      const aStart = minutes(a.startTime);
      const aEnd = sessionEnd(a);
      if (aStart == null || aEnd == null) return;
      list.slice(index + 1).forEach(b => {
        if (a.date !== b.date) return;
        const bStart = minutes(b.startTime);
        const bEnd = sessionEnd(b);
        if (bStart == null || bEnd == null) return;
        if (aStart < bEnd && bStart < aEnd) {
          ids.add(a.id);
          ids.add(b.id);
        }
      });
    });
    return ids;
  }

  function activeSessions(mode, anchor){
    if (mode === "day") return sessionsOn(dateKey(anchor));
    if (mode === "month") {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return sessions().filter(session => {
        const date = localDate(session.date);
        return date && date >= first && date <= last;
      });
    }
    const start = mondayOf(anchor);
    const end = addDays(start, 6);
    return sessions().filter(session => {
      const date = localDate(session.date);
      return date && date >= start && date <= end;
    });
  }

  function countdownLabel(session){
    const diff = daysTo(session.date);
    if (diff == null) return "Sin fecha";
    if (diff < 0) return `Hace ${Math.abs(diff)} dias`;
    if (diff === 0) return "Hoy";
    return `${diff} dias`;
  }

  function eventHtml(session, compact){
    const program = programOf(session);
    const institution = institutionOf(session);
    const color = institutionColor(institution);
    const conflict = conflictIds().has(session.id);
    const time = `${session.startTime || "Sin hora"}${session.endTime ? " - " + session.endTime : ""}`;
    return `<button class="calendar-view-event ${compact ? "compact" : ""} ${conflict ? "has-conflict" : ""}" type="button" data-detail-module="sessions" data-detail-id="${esc(session.id)}" style="--inst-color:${esc(color)}">
      <span class="event-brand">${logoHtml(institution)}<span>${esc(institution?.name || "Sin institucion")}</span></span>
      <strong>${esc(time)}</strong>
      <span>${esc(session.title || "Sesion")}</span>
      ${compact ? "" : `<small>${esc(program?.name || "Sin programa")} - ${esc(countdownLabel(session))}</small>`}
      ${conflict ? `<em>Solape</em>` : ""}
    </button>`;
  }

  function renderControls(mode, anchor){
    return `<section class="calendar-view-toolbar">
      <div><p class="eyebrow">Calendario operativo</p><h2>${esc(rangeTitle(mode, anchor))}</h2></div>
      <div class="calendar-view-actions">
        <button class="btn secondary" type="button" data-cal-nav="prev">Anterior</button>
        <button class="btn secondary" type="button" data-cal-nav="today">Hoy</button>
        <button class="btn secondary" type="button" data-cal-nav="next">Siguiente</button>
        <span class="segmented">
          <button type="button" data-cal-mode="day" class="${mode === "day" ? "active" : ""}">Dia</button>
          <button type="button" data-cal-mode="week" class="${mode === "week" ? "active" : ""}">Semana</button>
          <button type="button" data-cal-mode="month" class="${mode === "month" ? "active" : ""}">Mes</button>
        </span>
      </div>
    </section>`;
  }

  function renderMetrics(mode, anchor){
    const list = activeSessions(mode, anchor);
    const conflicts = conflictIds();
    const overlapCount = list.filter(session => conflicts.has(session.id)).length;
    const hours = list.reduce((sum, session) => sum + durationHours(session), 0);
    return `<section class="calendar-view-metrics">
      <button type="button" data-route="sessions"><span>Sesiones</span><strong>${list.length}</strong></button>
      <button type="button" data-route="sessions"><span>Horas</span><strong>${hours.toLocaleString("es-ES")}</strong></button>
      <button type="button" data-route="alerts"><span>Solapes</span><strong>${overlapCount}</strong></button>
    </section>`;
  }

  function renderDay(anchor){
    const list = sessionsOn(dateKey(anchor));
    return `<section class="calendar-day-view"><article class="calendar-full-day"><header><strong>${esc(dayText(anchor))}</strong><span>00:01 - 23:59</span></header><div class="calendar-day-events">${list.length ? list.map(session => eventHtml(session)).join("") : `<div class="empty-state">Sin sesiones en este dia.</div>`}</div></article></section>`;
  }

  function renderWeek(anchor){
    const start = mondayOf(anchor);
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    return `<section class="calendar-week-view">${days.map(day => {
      const key = dateKey(day);
      const list = sessionsOn(key);
      return `<article class="calendar-week-day ${key === todayKey() ? "today" : ""}"><header><strong>${esc(dayText(day))}</strong><span>${list.reduce((sum, session) => sum + durationHours(session), 0).toLocaleString("es-ES")} h</span></header><div>${list.length ? list.map(session => eventHtml(session, true)).join("") : `<small>Sin sesiones</small>`}</div></article>`;
    }).join("")}</section>`;
  }

  function renderMonth(anchor){
    const days = monthGrid(anchor);
    return `<section class="calendar-month-view">
      ${["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map(day => `<strong class="month-head">${day}</strong>`).join("")}
      ${days.map(day => {
        const key = dateKey(day);
        const list = sessionsOn(key);
        const outside = day.getMonth() !== anchor.getMonth();
        return `<article class="calendar-month-day ${outside ? "muted" : ""} ${key === todayKey() ? "today" : ""}"><header><strong>${day.getDate()}</strong><span>${list.length ? `${list.length} ses.` : ""}</span></header><div>${list.slice(0, 4).map(session => eventHtml(session, true)).join("")}${list.length > 4 ? `<small>+${list.length - 4} mas</small>` : ""}</div></article>`;
      }).join("")}
    </section>`;
  }

  function renderCalendarViews(){
    const app = document.querySelector("#app");
    const title = document.querySelector("#pageTitle");
    if (!app) return;
    const mode = getMode();
    const anchor = getAnchor();
    if (title) title.textContent = "Calendario";
    const body = mode === "day" ? renderDay(anchor) : mode === "month" ? renderMonth(anchor) : renderWeek(anchor);
    app.innerHTML = `${renderControls(mode, anchor)}${renderMetrics(mode, anchor)}${body}`;
    try { if (typeof decorate === "function") decorate(); } catch {}
  }

  function navigateCalendar(action){
    const mode = getMode();
    const anchor = getAnchor();
    if (action === "today") return setAnchor(localDate(todayKey()));
    if (mode === "month") return setAnchor(addMonths(anchor, action === "prev" ? -1 : 1));
    if (mode === "week") return setAnchor(addDays(anchor, action === "prev" ? -7 : 7));
    setAnchor(addDays(anchor, action === "prev" ? -1 : 1));
  }

  function injectStyles(){
    if (document.getElementById("docroi-calendar-views-style")) return;
    const style = document.createElement("style");
    style.id = "docroi-calendar-views-style";
    style.textContent = `
      .calendar-view-toolbar{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(160,190,230,.14)}
      .calendar-view-toolbar h2{margin:0;text-align:left}.calendar-view-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
      .segmented{display:inline-flex;border:1px solid rgba(160,190,230,.24);border-radius:8px;overflow:hidden;background:rgba(20,32,49,.78)}
      .segmented button{border:0;border-right:1px solid rgba(160,190,230,.18);padding:10px 13px;background:transparent;color:#aac6e7;font-weight:900;cursor:pointer}.segmented button:last-child{border-right:0}.segmented button.active{background:rgba(107,221,255,.18);color:#7defff}
      .calendar-view-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}.calendar-view-metrics button{display:grid;gap:3px;text-align:left;border:1px solid rgba(160,190,230,.18);border-radius:8px;background:rgba(16,26,42,.82);padding:12px;color:#aac6e7;cursor:pointer}.calendar-view-metrics strong{color:#eef5ff;font-size:1.55rem}
      .calendar-week-view{display:grid;grid-template-columns:repeat(7,minmax(190px,1fr));gap:10px;overflow-x:auto;padding-bottom:8px}.calendar-week-day,.calendar-full-day,.calendar-month-day{border:1px solid rgba(160,190,230,.16);border-radius:8px;background:rgba(10,17,29,.82)}.calendar-week-day{min-height:520px;padding:10px}.calendar-week-day.today,.calendar-month-day.today{outline:2px solid rgba(125,239,255,.32)}
      .calendar-week-day header,.calendar-full-day header,.calendar-month-day header{display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;color:#aac6e7}.calendar-week-day header{margin-bottom:10px}.calendar-week-day header strong,.calendar-full-day header strong{color:#dcecff}.calendar-week-day small,.calendar-month-day small{color:#aac6e7;font-weight:800}
      .calendar-view-event{position:relative;display:grid;width:100%;gap:5px;text-align:left;margin:0 0 8px;padding:10px;border:1px solid color-mix(in srgb,var(--inst-color) 56%,transparent);border-left:4px solid var(--inst-color);border-radius:8px;background:linear-gradient(90deg,color-mix(in srgb,var(--inst-color) 16%,transparent),rgba(15,24,39,.86));color:#eef5ff;cursor:pointer}.calendar-view-event.compact{padding:8px}.calendar-view-event strong{color:#fff}.calendar-view-event span{font-weight:900}.calendar-view-event small{color:#aac6e7;font-weight:800}.calendar-view-event em{position:absolute;right:8px;top:8px;padding:3px 7px;border-radius:999px;background:rgba(255,72,95,.18);color:#ff9cad;font-style:normal;font-weight:900}.calendar-view-event.has-conflict{border-color:rgba(255,72,95,.7);box-shadow:0 0 0 2px rgba(255,72,95,.12)}
      .event-brand{display:flex!important;align-items:center;gap:7px;color:#aac6e7!important;font-size:.78rem;min-width:0}.event-brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.calendar-view-logo{width:24px;height:24px;object-fit:contain;border-radius:5px;background:#fff;padding:2px;border:1px solid rgba(255,255,255,.2)}.calendar-view-logo.placeholder{display:inline-grid;place-items:center;background:rgba(125,239,255,.14);color:#7defff;font-size:.7rem;font-weight:900}
      .calendar-full-day{padding:12px}.calendar-full-day header{margin-bottom:12px}.calendar-day-events{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}.calendar-month-view{display:grid;grid-template-columns:repeat(7,minmax(150px,1fr));gap:8px;overflow-x:auto}.month-head{color:#aac6e7;text-align:left;padding:0 4px}.calendar-month-day{min-height:148px;padding:8px}.calendar-month-day.muted{opacity:.45}.calendar-month-day .calendar-view-event{font-size:.78rem;padding:7px}.calendar-month-day .calendar-view-event small,.calendar-month-day .calendar-view-event em{display:none}
      @media (max-width:900px){.calendar-view-toolbar{display:grid}.calendar-view-actions{justify-content:flex-start}.calendar-view-metrics{grid-template-columns:1fr}.calendar-week-view,.calendar-month-view{grid-template-columns:1fr}.calendar-week-day{min-height:auto}}
    `;
    document.head.appendChild(style);
  }

  document.addEventListener("click", event => {
    const modeButton = event.target.closest("[data-cal-mode]");
    if (modeButton) {
      localStorage.setItem(storageMode, modeButton.dataset.calMode);
      renderCalendarViews();
      return;
    }
    const navButton = event.target.closest("[data-cal-nav]");
    if (navButton) {
      navigateCalendar(navButton.dataset.calNav);
      renderCalendarViews();
    }
  });

  injectStyles();

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender && !globalThis.__docroiCalendarViewsRenderPatched) {
    globalThis.__docroiCalendarViewsRenderPatched = true;
    render = function(){
      originalRender();
      const route = location.hash.replace("#", "").split("?")[0] || "dashboard";
      if (route === "calendar") renderCalendarViews();
    };
  }

  const originalModuleView = typeof moduleView === "function" ? moduleView : null;
  if (originalModuleView && !globalThis.__docroiCalendarViewsModulePatched) {
    globalThis.__docroiCalendarViewsModulePatched = true;
    moduleView = function(module){
      if (module === "calendar") { renderCalendarViews(); return; }
      originalModuleView(module);
    };
  }

  if ((location.hash.replace("#", "").split("?")[0] || "dashboard") === "calendar") renderCalendarViews();
})();
