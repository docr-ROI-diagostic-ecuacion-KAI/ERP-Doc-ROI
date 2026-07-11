(function(){
  const VERSION = "20260711-menu-order";
  if (globalThis.__docroiMenuOrder === VERSION) return;
  globalThis.__docroiMenuOrder = VERSION;

  const navRef = typeof nav !== "undefined" ? nav : (typeof navItems !== "undefined" ? navItems : null);
  const cfgs = typeof modules !== "undefined" ? modules : (typeof moduleConfig !== "undefined" ? moduleConfig : null);
  if (!navRef) return;

  const labels = {
    dashboard: ["Dashboard", "D"],
    calendar: ["Calendario", "C"],
    institutions: ["Instituciones", "I"],
    organization: ["Organizacion", "O"],
    programs: ["Programas", "P"],
    sessions: ["Sesiones", "S"],
    evaluations: ["Evaluaciones", "E"],
    documents: ["Documentacion", "D"],
    contacts: ["Contactos", "C"],
    economics: ["Economicos", "€+"],
    finances: ["Finanzas", "€"],
    alerts: ["Alertas", "!"],
    settings: ["Configuracion", "CFG"]
  };
  const desired = ["dashboard", "calendar", "institutions", "organization", "programs", "sessions", "evaluations", "documents", "contacts", "economics", "finances", "alerts", "settings"];

  function ensureNav(id){
    let item = navRef.find(row => row[0] === id);
    if (!item) {
      item = [id, labels[id]?.[0] || id, labels[id]?.[1] || id.slice(0,1).toUpperCase()];
      navRef.push(item);
    }
    if (labels[id]) { item[1] = labels[id][0]; item[2] = labels[id][1]; }
  }

  desired.forEach(ensureNav);
  navRef.sort((a,b) => {
    const ia = desired.indexOf(a[0]);
    const ib = desired.indexOf(b[0]);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  if (cfgs) {
    if (cfgs.documents) cfgs.documents.title = "Documentacion";
    if (cfgs.economics) cfgs.economics.title = "Economicos";
    if (cfgs.finances) cfgs.finances.title = "Finanzas";
  }

  function addSeparators(){
    const navEl = document.querySelector("#mainNav");
    if (!navEl) return;
    navEl.querySelectorAll(".nav-separator").forEach(node => node.remove());
    const contacts = navEl.querySelector('[data-route="contacts"]');
    const finances = navEl.querySelector('[data-route="finances"]');
    if (contacts) contacts.insertAdjacentHTML("afterend", '<div class="nav-separator" aria-hidden="true"></div>');
    if (finances) finances.insertAdjacentHTML("afterend", '<div class="nav-separator" aria-hidden="true"></div>');
  }

  const originalRenderNav = typeof renderNav === "function" ? renderNav : null;
  if (originalRenderNav) {
    renderNav = function(){ originalRenderNav(); addSeparators(); };
  }

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender) {
    render = function(){ originalRender(); addSeparators(); };
  }

  const style = document.createElement("style");
  style.textContent = `.sidebar nav{gap:4px}.nav-separator{height:1px;margin:10px 8px;border:0;background:linear-gradient(90deg,transparent,rgba(170,198,231,.28),transparent)}.sidebar nav a[data-route="economics"] span,.sidebar nav a[data-route="finances"] span{font-size:.74rem;letter-spacing:0}`;
  document.head.appendChild(style);

  try { render(); } catch { try { renderNav(); } catch {} }
  addSeparators();
})();
