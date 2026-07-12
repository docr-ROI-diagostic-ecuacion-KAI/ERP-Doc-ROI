(function(){
  const VERSION = "20260712-entity-model-1";
  if (globalThis.__docroiEntityModel === VERSION) return;
  globalThis.__docroiEntityModel = VERSION;

  const cfgs = typeof modules !== "undefined" ? modules : (typeof moduleConfig !== "undefined" ? moduleConfig : null);
  const navRef = typeof nav !== "undefined" ? nav : (typeof navItems !== "undefined" ? navItems : null);
  if (!cfgs || !globalThis.state) return;

  const saveX = () => { try { save(); } catch { try { saveState(); } catch {} } };
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const desiredNav = [
    ["dashboard", "Dashboard", "D"],
    ["calendar", "Calendario", "C"],
    ["institutions", "Instituciones", "I"],
    ["programs", "Programas", "P"],
    ["organization", "Organizacion", "O"],
    ["sessions", "Sesiones", "S"],
    ["evaluations", "Evaluaciones", "E"],
    ["documents", "Documentacion", "D"],
    ["contacts", "Contactos", "C"],
    ["economics", "Economics", "EUR+"],
    ["finances", "Finanzas", "EUR"],
    ["alerts", "Alertas", "!"],
    ["settings", "Configuracion", "CFG"]
  ];

  function applyNav(){
    if (!navRef) return;
    desiredNav.forEach(item => {
      const current = navRef.find(row => row[0] === item[0]);
      if (current) {
        current[1] = item[1];
        current[2] = item[2];
      } else {
        navRef.push([...item]);
      }
    });
    navRef.sort((a,b) => desiredNav.findIndex(item => item[0] === a[0]) - desiredNav.findIndex(item => item[0] === b[0]));
  }

  function removeFields(module, shouldRemove){
    const cfg = cfgs[module];
    if (!cfg?.fields) return;
    cfg.fields = cfg.fields.filter(field => !shouldRemove(field));
  }

  function insertAfter(module, afterName, field){
    const cfg = cfgs[module];
    if (!cfg?.fields || cfg.fields.some(item => item[0] === field[0])) return;
    const idx = cfg.fields.findIndex(item => item[0] === afterName);
    cfg.fields.splice(idx >= 0 ? idx + 1 : cfg.fields.length, 0, field);
  }

  function normalizeContacts(){
    const roleField = cfgs.contacts?.fields?.find(field => field[0] === "role");
    if (roleField?.[4] && !roleField[4].includes("Alumno")) {
      const otherIndex = roleField[4].indexOf("Otro");
      roleField[4].splice(otherIndex >= 0 ? otherIndex : roleField[4].length, 0, "Alumno");
    }
  }

  function normalizeOrganization(){
    state.organization ||= [];
    cfgs.organization = {
      title: "Organizacion",
      singular: "persona",
      action: "Nueva persona",
      primary: "Nueva persona",
      fields: [
        ["role", "Rol", "select", true, ["Directora academica", "Director academico", "Director/a de master", "Coordinador/a de master", "Responsable administrativo", "Responsable de finanzas", "Profesor", "Otro"]],
        ["institutionId", "Institucion", "relation:institutions", true],
        ["programId", "Programa", "relation:programs"],
        ["name", "Nombre y apellidos", "text", true],
        ["email", "Email", "email"],
        ["phone", "Telefono", "tel"],
        ["observations", "Observaciones", "textarea"]
      ],
      cols: ["role", "institutionId", "programId", "name", "email", "phone"],
      columns: ["role", "institutionId", "programId", "name", "email", "phone"],
      filters: ["role", "institutionId", "programId"]
    };
  }

  function normalizePrograms(){
    const embeddedPeople = new Set([
      "academicContactId", "adminContactId", "directorOrgId", "coordinatorOrgId", "adminOrgId",
      "directorName", "directorRole", "directorEmail", "directorPhone",
      "coordinatorName", "coordinatorRole", "coordinatorEmail", "coordinatorPhone",
      "adminName", "adminRole", "adminEmail", "adminPhone", "responsibleAdminId"
    ]);
    removeFields("programs", field => {
      const key = field[0];
      const label = norm(field[1]);
      return embeddedPeople.has(key) || /director|catedratico|coordinador|responsable administrativo|rol administrativo|email administrativo|telefono administrativo/.test(label);
    });
    const status = cfgs.programs?.fields?.find(field => field[0] === "status");
    if (status?.[4]) status[4] = status[4].map(value => value === "Programa" ? "En Programacion" : value);
    (state.programs || []).forEach(program => {
      embeddedPeople.forEach(field => delete program[field]);
      if (program.status === "Programa") program.status = "En Programacion";
    });
  }

  function normalizeSessions(){
    (state.sessions || []).forEach(session => {
      const program = (state.programs || []).find(item => item.id === session.programId);
      if (program?.institutionId) session.institutionId = program.institutionId;
    });
    insertAfter("sessions", "title", ["institutionId", "Institucion", "relation:institutions"]);
    const duration = cfgs.sessions?.fields?.find(field => field[0] === "duration");
    if (duration) duration[1] = "Duracion calculada (horas)";
  }

  function minutes(value){
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  }

  function hoursBetween(start, end){
    const s = minutes(start);
    let e = minutes(end);
    if (s == null || e == null) return "";
    if (e < s) e += 24 * 60;
    const hours = (e - s) / 60;
    return hours > 0 ? String(Math.round(hours * 100) / 100) : "";
  }

  function syncSessionDialog(){
    const dialog = document.querySelector("#recordDialog");
    if (!dialog?.open) return;
    const kicker = document.querySelector("#dialogKicker")?.textContent || "";
    const institution = dialog.querySelector('[name="institutionId"]');
    const program = dialog.querySelector('[name="programId"]');
    if (/Sesiones/i.test(kicker)) {
      if (institution && program) {
        [...program.options].forEach(option => {
          if (!option.value) { option.hidden = false; return; }
          const p = (state.programs || []).find(item => item.id === option.value);
          option.hidden = Boolean(institution.value && p?.institutionId && p.institutionId !== institution.value);
        });
        const selectedProgram = (state.programs || []).find(item => item.id === program.value);
        if (selectedProgram?.institutionId && !institution.value) institution.value = selectedProgram.institutionId;
        if (program.selectedOptions[0]?.hidden) program.value = "";
      }
      const duration = dialog.querySelector('[name="duration"]');
      const start = dialog.querySelector('[name="startTime"]');
      const end = dialog.querySelector('[name="endTime"]');
      if (duration && start && end) {
        const calculated = hoursBetween(start.value, end.value);
        duration.readOnly = true;
        duration.placeholder = "Se calcula con inicio y fin";
        if (calculated) duration.value = calculated;
      }
    }
    if (/Organizacion/i.test(kicker) && institution && program) {
      [...program.options].forEach(option => {
        if (!option.value) { option.hidden = false; return; }
        const p = (state.programs || []).find(item => item.id === option.value);
        option.hidden = Boolean(institution.value && p?.institutionId && p.institutionId !== institution.value);
      });
      if (program.selectedOptions[0]?.hidden) program.value = "";
    }
  }

  function applyModel(){
    applyNav();
    normalizeContacts();
    normalizeOrganization();
    normalizePrograms();
    normalizeSessions();
    saveX();
  }

  applyModel();

  document.addEventListener("input", event => {
    if (event.target?.matches?.('#recordDialog [name="startTime"], #recordDialog [name="endTime"]')) syncSessionDialog();
  }, true);
  document.addEventListener("change", event => {
    if (event.target?.matches?.('#recordDialog [name="institutionId"], #recordDialog [name="programId"], #recordDialog [name="startTime"], #recordDialog [name="endTime"]')) syncSessionDialog();
  }, true);
  document.addEventListener("submit", () => syncSessionDialog(), true);

  const originalOpenForm = typeof openForm === "function" ? openForm : null;
  if (originalOpenForm && !globalThis.__docroiEntityModelOpenFormPatched) {
    globalThis.__docroiEntityModelOpenFormPatched = true;
    openForm = function(module, id){
      applyModel();
      originalOpenForm(module, id);
      setTimeout(syncSessionDialog, 0);
    };
  }

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender && !globalThis.__docroiEntityModelRenderPatched) {
    globalThis.__docroiEntityModelRenderPatched = true;
    render = function(){
      applyModel();
      originalRender();
    };
  }

  try { render(); } catch {}
})();
