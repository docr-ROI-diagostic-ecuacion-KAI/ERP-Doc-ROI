(function(){
  const VERSION = "20260712-organization-hierarchy";
  if (globalThis.__docroiOrganizationStructure === VERSION) return;
  globalThis.__docroiOrganizationStructure = VERSION;

  const cfgs = typeof modules !== "undefined" ? modules : (typeof moduleConfig !== "undefined" ? moduleConfig : null);
  const navRef = typeof nav !== "undefined" ? nav : (typeof navItems !== "undefined" ? navItems : null);
  if (!cfgs || !navRef || !globalThis.state) return;

  const saveX = () => { try { save(); } catch { try { saveState(); } catch {} } };
  const renderX = () => { try { render(); } catch { try { renderNav(); } catch {} } };
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const slug = value => norm(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 42) || "persona";

  const roleSets = {
    institutionLead: ["director/a institucional", "director institucional", "directora institucional", "director academico", "directora academica"],
    programLead: ["director de master", "directora de master", "responsable de master", "responsable de programa"],
    coordinator: ["coordinador de master", "coordinadora de master", "coordinador master", "coordinadora master"],
    admin: ["staff administrativo", "personal administrativo", "administracion / pagos", "administracion", "responsable administrativo", "responsable de pagos"]
  };
  const inSet = (role, set) => roleSets[set].some(item => norm(role).includes(item));

  const labels = {
    dashboard: ["Dashboard", "D"],
    calendar: ["Calendario", "C"],
    institutions: ["Instituciones", "I"],
    programs: ["Programas", "P"],
    organization: ["Organizacion", "O"],
    sessions: ["Sesiones", "S"],
    evaluations: ["Evaluaciones", "E"],
    documents: ["Documentacion", "D"],
    contacts: ["Contactos", "C"],
    economics: ["Economicos", "EUR+"],
    finances: ["Finanzas", "EUR"],
    alerts: ["Alertas", "!"],
    settings: ["Configuracion", "CFG"]
  };
  const desired = ["dashboard", "calendar", "institutions", "programs", "organization", "sessions", "evaluations", "documents", "contacts", "economics", "finances", "alerts", "settings"];

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

  state.organization ||= [];
  state.organization.forEach(person => {
    if (person.reportsToId && !person.institutionLeadId) person.institutionLeadId = person.reportsToId;
    delete person.sessionId;
    delete person.reportsToId;
    if (person.role === "Director Academico") person.role = "Director/a institucional";
    if (person.role === "Coordinador Master") person.role = "Coordinador de Master";
    if (person.role === "Administracion") person.role = "Administracion / pagos";
  });

  function readInstitutionLead(institution){
    if (!institution) return null;
    const name = institution.institutionLeadName || institution.leadName || institution.mainContactName || institution.academicCoordinatorName || institution.directorName || institution.contactName;
    if (!name) return null;
    return {
      name,
      role: institution.institutionLeadRole || institution.leadRole || institution.academicCoordinatorRole || "Director/a institucional",
      email: institution.institutionLeadEmail || institution.leadEmail || institution.mainContactEmail || institution.academicCoordinatorEmail || institution.directorEmail || institution.contactEmail || "",
      phone: institution.institutionLeadPhone || institution.leadPhone || institution.mainContactPhone || institution.academicCoordinatorPhone || institution.directorPhone || institution.contactPhone || "",
      observations: institution.institutionLeadNotes || institution.leadNotes || institution.observations || ""
    };
  }

  function syncInstitutionLeads(){
    (state.institutions || []).forEach(institution => {
      const lead = readInstitutionLead(institution);
      if (!lead) return;
      const existing = state.organization.find(person =>
        person.institutionId === institution.id &&
        (norm(person.email) && norm(person.email) === norm(lead.email) || norm(person.name) === norm(lead.name))
      );
      if (existing) {
        existing.name ||= lead.name;
        existing.role = "Director/a institucional";
        existing.email ||= lead.email;
        existing.phone ||= lead.phone;
        existing.programId = "";
        existing.institutionLeadId = "";
        return;
      }
      state.organization.push({
        id: `org_lead_${institution.id}_${slug(lead.name)}`,
        role: "Director/a institucional",
        institutionId: institution.id,
        programId: "",
        institutionLeadId: "",
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        observations: lead.observations ? `Desde ficha de institucion. ${lead.observations}` : "Desde ficha de institucion."
      });
    });
  }
  syncInstitutionLeads();

  cfgs.organization = {
    title: "Organizacion",
    singular: "persona",
    action: "Nueva persona",
    primary: "Nueva persona",
    fields: [
      ["role", "Rol", "select", true, ["Director de Master", "Coordinador de Master", "Responsable de Master", "Staff administrativo", "Administracion / pagos", "Otro"]],
      ["institutionId", "Institucion", "relation:institutions", true],
      ["programId", "Programa", "relation:programs"],
      ["institutionLeadId", "Responsable institucional vinculado", "relation:organization"],
      ["name", "Nombre y apellidos", "text", true],
      ["email", "Email", "email"],
      ["phone", "Telefono", "tel"],
      ["observations", "Observaciones", "textarea"]
    ],
    cols: ["role", "institutionId", "programId", "name", "email", "phone"],
    columns: ["role", "institutionId", "programId", "name", "email", "phone"],
    filters: ["role", "institutionId", "programId"]
  };

  function filterProgramOptions(){
    const dialog = document.querySelector("#recordDialog");
    if (!dialog?.open || !/Organizacion/i.test(document.querySelector("#dialogKicker")?.textContent || "")) return;
    const institution = dialog.querySelector('[name="institutionId"]');
    const program = dialog.querySelector('[name="programId"]');
    const lead = dialog.querySelector('[name="institutionLeadId"]');
    if (!institution || !program) return;
    const selectedInstitution = institution.value;
    [...program.options].forEach(option => {
      if (!option.value) { option.hidden = false; return; }
      const p = (state.programs || []).find(item => item.id === option.value);
      option.hidden = Boolean(selectedInstitution && p && p.institutionId !== selectedInstitution);
    });
    if (program.selectedOptions[0]?.hidden) program.value = "";
    if (lead) {
      [...lead.options].forEach(option => {
        if (!option.value) { option.hidden = false; return; }
        const person = (state.organization || []).find(item => item.id === option.value);
        option.hidden = !person || !personMatchesInstitution(person, selectedInstitution) || !inSet(person.role, "institutionLead");
      });
      if (lead.selectedOptions[0]?.hidden) lead.value = "";
    }
  }

  function personMatchesInstitution(person, institutionId){
    return !institutionId || !person?.institutionId || person.institutionId === institutionId;
  }

  const originalOpenForm = typeof openForm === "function" ? openForm : null;
  if (originalOpenForm && !globalThis.__docroiOrgStructureOpenFormPatched) {
    globalThis.__docroiOrgStructureOpenFormPatched = true;
    openForm = function(module, id){
      syncInstitutionLeads();
      originalOpenForm(module, id);
      setTimeout(filterProgramOptions, 0);
    };
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

  function numberValue(value){
    const parsed = Number(String(value || 0).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function computeProgramIncome(){
    return (state.programs || []).map(program => {
      const sessions = (state.sessions || []).filter(session => session.programId === program.id);
      const hours = sessions.reduce((sum, session) => sum + numberValue(session.duration || session.hours || session.horas), 0);
      const hourlyRate = numberValue(program.hourlyRate || program.priceHour || program.precioHora);
      const gross = hours * hourlyRate;
      const retention = gross * 0.15;
      const net = gross - retention;
      return { program, sessions, hours, hourlyRate, gross, retention, net };
    }).filter(row => row.hours || row.hourlyRate || row.gross);
  }

  function formatEuro(value){
    return `${Math.round(value).toLocaleString("es-ES")} EUR`;
  }

  function institutionFor(program){
    return (state.institutions || []).find(institution => institution.id === program?.institutionId);
  }

  function addComputedEconomics(){
    const app = document.querySelector("#app");
    if (!app) return;
    app.querySelectorAll(".computed-economics-panel").forEach(node => node.remove());
    const route = (location.hash || "#dashboard").replace("#", "").split("?")[0] || "dashboard";
    if (!["dashboard", "economics"].includes(route)) return;
    const rows = computeProgramIncome();
    const totals = rows.reduce((acc, row) => {
      acc.gross += row.gross;
      acc.retention += row.retention;
      acc.net += row.net;
      acc.hours += row.hours;
      return acc;
    }, { gross: 0, retention: 0, net: 0, hours: 0 });
    const panel = document.createElement("section");
    panel.className = "computed-economics-panel panel";
    panel.innerHTML = `
      <div class="section-head">
        <div>
          <p class="eyebrow">Economics calculado</p>
          <h2>Ingresos por horas declaradas</h2>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><span>Bruto</span><strong>${formatEuro(totals.gross)}</strong></div>
        <div class="stat-card"><span>Retencion 15%</span><strong>${formatEuro(totals.retention)}</strong></div>
        <div class="stat-card"><span>Neto</span><strong>${formatEuro(totals.net)}</strong></div>
        <div class="stat-card"><span>Horas</span><strong>${totals.hours.toLocaleString("es-ES")}</strong></div>
      </div>
      <div class="chip-list economic-program-list">
        ${rows.map(row => {
          const institution = institutionFor(row.program);
          const color = institution?.color || institution?.brandColor || "#54d6e8";
          return `<button class="chip economic-program-chip" type="button" data-route="programs" data-id="${row.program.id}" style="--institution-color:${color};border-color:${color};background:${color}22">
            <span>${institution?.name || "Sin institucion"}</span>
            <strong>${row.program.name || "Programa"}</strong>
            <span>${row.hours.toLocaleString("es-ES")} h x ${formatEuro(row.hourlyRate)} = ${formatEuro(row.gross)} bruto / ${formatEuro(row.net)} neto</span>
          </button>`;
        }).join("") || `<span class="chip">Sin sesiones con horas o programas con precio hora</span>`}
      </div>
    `;
    app.prepend(panel);
    panel.querySelectorAll("[data-route][data-id]").forEach(button => {
      button.addEventListener("click", () => {
        location.hash = button.dataset.route;
        setTimeout(() => { try { openForm(button.dataset.route, button.dataset.id); } catch {} }, 80);
      });
    });
  }

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender && !globalThis.__docroiOrgStructureRenderPatched) {
    globalThis.__docroiOrgStructureRenderPatched = true;
    render = function(){
      originalRender();
      addSeparators();
      addComputedEconomics();
    };
  }

  saveX();
  renderX();
  setTimeout(addSeparators, 0);
  setTimeout(addComputedEconomics, 0);
})();

(function(){
  if (document.querySelector('script[src*="docroi-entity-model.js"]')) return;
  const script = document.createElement("script");
  script.src = "docroi-entity-model.js?v=20260712-entity-model-1";
  script.defer = true;
  (document.currentScript || document.body).after(script);
})();
