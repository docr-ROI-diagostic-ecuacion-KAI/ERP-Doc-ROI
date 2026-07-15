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

  function ensureProgramPeopleFields(){
    const cfg = cfgs.programs;
    if (!cfg?.fields) return;
    const defs = {
      directorOrgId: ["directorOrgId", "Directora/director institucional", "relation:organization"],
      coordinatorOrgId: ["coordinatorOrgId", "Coordinador/a de master", "relation:organization"],
      adminOrgId: ["adminOrgId", "Administracion / pagos", "relation:organization"]
    };
    Object.entries(defs).forEach(([key, field]) => {
      const current = cfg.fields.find(item => item[0] === key);
      if (current) {
        current[1] = field[1];
        current[2] = field[2];
      } else {
        const institutionIndex = cfg.fields.findIndex(item => item[0] === "institutionId");
        cfg.fields.splice(Math.max(0, institutionIndex + 1), 0, field);
      }
    });
  }
  ensureProgramPeopleFields();

  function personMatchesInstitution(person, institutionId){
    return !institutionId || !person?.institutionId || person.institutionId === institutionId;
  }

  function personMatchesProgram(person, programId){
    return !programId || !person?.programId || person.programId === programId;
  }

  function allowedProgramPerson(field, person, institutionId, programId){
    if (!personMatchesInstitution(person, institutionId)) return false;
    if (field === "directorOrgId") return inSet(person.role, "institutionLead");
    if (field === "coordinatorOrgId") return personMatchesProgram(person, programId) && (inSet(person.role, "coordinator") || inSet(person.role, "programLead"));
    if (field === "adminOrgId") return personMatchesProgram(person, programId) && inSet(person.role, "admin");
    return true;
  }

  function chooseProgramPeople(program){
    if (!program) return;
    const organization = state.organization || [];
    const find = field => organization.find(person => allowedProgramPerson(field, person, program.institutionId, program.id));
    const currentDirector = organization.find(person => person.id === program.directorOrgId);
    if (!currentDirector || !allowedProgramPerson("directorOrgId", currentDirector, program.institutionId, program.id)) {
      program.directorOrgId = find("directorOrgId")?.id || "";
    }
    const currentCoordinator = organization.find(person => person.id === program.coordinatorOrgId);
    if (!currentCoordinator || !allowedProgramPerson("coordinatorOrgId", currentCoordinator, program.institutionId, program.id)) {
      program.coordinatorOrgId = find("coordinatorOrgId")?.id || "";
    }
    const currentAdmin = organization.find(person => person.id === program.adminOrgId);
    if (!currentAdmin || !allowedProgramPerson("adminOrgId", currentAdmin, program.institutionId, program.id)) {
      program.adminOrgId = find("adminOrgId")?.id || "";
    }
  }
  (state.programs || []).forEach(chooseProgramPeople);

  function optionText(select, value){
    return select ? select.querySelector(`option[value="${CSS.escape(value || "")}"]`)?.textContent || "" : "";
  }

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

  function filterProgramPeopleSelectors(){
    const dialog = document.querySelector("#recordDialog");
    if (!dialog?.open || !/Programas/i.test(document.querySelector("#dialogKicker")?.textContent || "")) return;
    const institution = dialog.querySelector('[name="institutionId"]');
    const programId = dialog.querySelector('[name="id"]')?.value || "";
    const selectedInstitution = institution?.value || "";
    ["directorOrgId", "coordinatorOrgId", "adminOrgId"].forEach(field => {
      const select = dialog.querySelector(`[name="${field}"]`);
      if (!select) return;
      const allowed = [];
      [...select.options].forEach(option => {
        if (!option.value) { option.hidden = false; return; }
        const person = (state.organization || []).find(item => item.id === option.value);
        const ok = Boolean(person && allowedProgramPerson(field, person, selectedInstitution, programId));
        option.hidden = !ok;
        if (ok) allowed.push(option.value);
      });
      if (select.selectedOptions[0]?.hidden) select.value = allowed[0] || "";
      if (!select.value && allowed.length) select.value = allowed[0];
    });
  }

  document.addEventListener("change", event => {
    if (event.target?.matches?.('#recordDialog [name="institutionId"]')) filterProgramOptions();
    if (event.target?.matches?.('#recordDialog [name="institutionId"], #recordDialog [name="programId"]')) filterProgramPeopleSelectors();
  }, true);

  const originalOpenForm = typeof openForm === "function" ? openForm : null;
  if (originalOpenForm && !globalThis.__docroiOrgStructureOpenFormPatched) {
    globalThis.__docroiOrgStructureOpenFormPatched = true;
    openForm = function(module, id){
      syncInstitutionLeads();
      ensureProgramPeopleFields();
      if (module === "programs" && id) chooseProgramPeople((state.programs || []).find(program => program.id === id));
      originalOpenForm(module, id);
      setTimeout(filterProgramOptions, 0);
      setTimeout(filterProgramPeopleSelectors, 0);
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
  script.src = "docroi-entity-model.js?v=20260715-entity-model-6";
  script.defer = true;
  (document.currentScript || document.body).after(script);
})();
