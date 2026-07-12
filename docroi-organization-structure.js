(function(){
  const VERSION = "20260712-organization-structure";
  if (globalThis.__docroiOrganizationStructure === VERSION) return;
  globalThis.__docroiOrganizationStructure = VERSION;

  const cfgs = typeof modules !== "undefined" ? modules : (typeof moduleConfig !== "undefined" ? moduleConfig : null);
  const navRef = typeof nav !== "undefined" ? nav : (typeof navItems !== "undefined" ? navItems : null);
  if (!cfgs || !navRef || !globalThis.state) return;

  const saveX = () => { try { save(); } catch { try { saveState(); } catch {} } };
  const renderX = () => { try { render(); } catch { try { renderNav(); } catch {} } };

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
    if (person.role === "Director Academico") person.role = "Director de Master";
    if (person.role === "Coordinador Master") person.role = "Coordinador de Master";
    if (person.role === "Administracion") person.role = "Responsable de Master";
  });

  cfgs.organization = {
    title: "Organizacion",
    singular: "persona",
    action: "Nueva persona",
    primary: "Nueva persona",
    fields: [
      ["role", "Rol", "select", true, ["Director de Master", "Coordinador de Master", "Responsable de Master", "Otro"]],
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
        option.hidden = Boolean(selectedInstitution && person && person.institutionId !== selectedInstitution);
      });
      if (lead.selectedOptions[0]?.hidden) lead.value = "";
    }
  }

  document.addEventListener("change", event => {
    if (event.target?.matches?.('#recordDialog [name="institutionId"]')) filterProgramOptions();
  }, true);

  const originalOpenForm = typeof openForm === "function" ? openForm : null;
  if (originalOpenForm && !globalThis.__docroiOrgStructureOpenFormPatched) {
    globalThis.__docroiOrgStructureOpenFormPatched = true;
    openForm = function(module, id){
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

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender && !globalThis.__docroiOrgStructureRenderPatched) {
    globalThis.__docroiOrgStructureRenderPatched = true;
    render = function(){
      originalRender();
      addSeparators();
    };
  }

  saveX();
  renderX();
  setTimeout(addSeparators, 0);
})();
