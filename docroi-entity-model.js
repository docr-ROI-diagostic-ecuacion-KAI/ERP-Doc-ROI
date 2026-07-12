(function(){
  const VERSION = "20260712-entity-model-2";
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
      if (current) { current[1] = item[1]; current[2] = item[2]; } else { navRef.push([...item]); }
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

  const relationFields = {
    institutionId: ["Institucion", "institutions", true],
    programId: ["Programa", "programs", false],
    sessionId: ["Sesion", "sessions", false],
    evaluationId: ["Evaluacion", "evaluations", false],
    documentId: ["Documento", "documents", false],
    financeId: ["Factura o pago", "finances", false],
    ownerId: ["Responsable", "contacts", false],
    adminContactId: ["Responsable administrativo", "contacts", false],
    academicContactId: ["Responsable academico", "contacts", false],
    adminOrgId: ["Administracion / pagos", "organization", false],
    coordinatorOrgId: ["Coordinador/a", "organization", false],
    directorOrgId: ["Direccion academica", "organization", false]
  };

  function normalizeRelationFieldTypes(){
    Object.values(cfgs).forEach(cfg => {
      (cfg.fields || []).forEach(field => {
        const rel = relationFields[field[0]];
        if (!rel) return;
        field[1] = field[1] || rel[0];
        field[2] = `relation:${rel[1]}`;
      });
    });
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
    if (cfgs.programs) {
      cfgs.programs.columns = ["name", "institutionId", "type", "myRole", "hourlyRate"];
      cfgs.programs.cols = cfgs.programs.columns;
    }
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
    const sessionFields = cfgs.sessions?.fields || [];
    const existingInstitution = sessionFields.find(field => field[0] === "institutionId");
    if (existingInstitution) {
      existingInstitution[1] = "Institucion";
      existingInstitution[2] = "relation:institutions";
      existingInstitution[3] = true;
    } else {
      insertAfter("sessions", "title", ["institutionId", "Institucion", "relation:institutions", true]);
    }
    const existingProgram = sessionFields.find(field => field[0] === "programId");
    if (existingProgram) {
      existingProgram[1] = "Programa";
      existingProgram[2] = "relation:programs";
      existingProgram[3] = true;
    }
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

  function optionLabel(item){ return item?.name || item?.title || item?.concept || item?.id || "Sin nombre"; }

  function ensureRelationSelect(name, module, labelText, required){
    const dialog = document.querySelector("#recordDialog");
    const current = dialog?.querySelector(`[name="${name}"]`);
    if (!dialog || !current) return null;
    if (current.tagName === "SELECT" && current.options.length > 1) return current;
    const select = document.createElement("select");
    select.name = name;
    if (required) select.required = true;
    select.innerHTML = `<option value="">Sin asignar</option>${(state[module] || []).map(item => `<option value="${item.id}" ${item.id === current.value ? "selected" : ""}>${optionLabel(item)}</option>`).join("")}`;
    const label = current.closest("label");
    if (label) {
      label.innerHTML = "";
      label.append(document.createTextNode(labelText));
      label.appendChild(select);
    } else {
      current.replaceWith(select);
    }
    return select;
  }

  function syncOrganizationDialog(){
    const dialog = document.querySelector("#recordDialog");
    if (!dialog?.open || !/Organizacion/i.test(document.querySelector("#dialogKicker")?.textContent || "")) return;
    const institution = ensureRelationSelect("institutionId", "institutions", "Institucion", true);
    const program = ensureRelationSelect("programId", "programs", "Programa", false);
    if (!institution || !program) return;
    [...program.options].forEach(option => {
      if (!option.value) { option.hidden = false; return; }
      const p = (state.programs || []).find(item => item.id === option.value);
      option.hidden = Boolean(institution.value && p?.institutionId && p.institutionId !== institution.value);
    });
    if (program.selectedOptions[0]?.hidden) program.value = "";
  }

  function syncRelationDialog(){
    const dialog = document.querySelector("#recordDialog");
    if (!dialog?.open) return;
    Object.entries(relationFields).forEach(([name, [label, module, required]]) => {
      if (dialog.querySelector(`[name="${name}"]`)) ensureRelationSelect(name, module, label, required);
    });
    const institution = dialog.querySelector('[name="institutionId"]');
    const program = dialog.querySelector('[name="programId"]');
    if (institution && program && program.tagName === "SELECT") {
      [...program.options].forEach(option => {
        if (!option.value) { option.hidden = false; return; }
        const p = (state.programs || []).find(item => item.id === option.value);
        option.hidden = Boolean(institution.value && p?.institutionId && p.institutionId !== institution.value);
      });
      const selectedProgram = (state.programs || []).find(item => item.id === program.value);
      if (selectedProgram?.institutionId && !institution.value) institution.value = selectedProgram.institutionId;
      if (program.selectedOptions[0]?.hidden) program.value = "";
    }
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
  }

  function relationTextByKey(label, value){
    const key = norm(label);
    const id = String(value || "").trim();
    if (!id || id === "-" || id === "—") return value;
    if (key.includes("institucion")) return optionLabel((state.institutions || []).find(item => item.id === id)) || value;
    if (key.includes("programa")) return optionLabel((state.programs || []).find(item => item.id === id)) || value;
    if (key.includes("sesion")) return optionLabel((state.sessions || []).find(item => item.id === id)) || value;
    if (key.includes("evaluacion")) return optionLabel((state.evaluations || []).find(item => item.id === id)) || value;
    if (key.includes("documento")) return optionLabel((state.documents || []).find(item => item.id === id)) || value;
    if (key.includes("factura") || key.includes("pago")) return optionLabel((state.finances || []).find(item => item.id === id)) || value;
    return value;
  }

  function cleanVisibleRelationIds(){
    document.querySelectorAll(".meta-grid span").forEach(row => {
      const strong = row.querySelector("strong");
      if (!strong) return;
      const text = strong.textContent || "";
      if (!/^(ins|pro|ses|eva|doc|fin|org|con)_/.test(text.trim())) return;
      strong.textContent = relationTextByKey(row.childNodes[0]?.textContent || row.textContent || "", text);
    });
  }

  function applyModel(){
    applyNav();
    normalizeRelationFieldTypes();
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
    if (event.target?.matches?.('#recordDialog [name="institutionId"], #recordDialog [name="programId"], #recordDialog [name="startTime"], #recordDialog [name="endTime"]')) {
      syncRelationDialog();
      syncSessionDialog();
    }
    if (event.target?.matches?.('#recordDialog [name="institutionId"], #recordDialog [name="programId"]')) syncOrganizationDialog();
  }, true);
  document.addEventListener("submit", () => { syncRelationDialog(); syncSessionDialog(); }, true);

  const originalOpenForm = typeof openForm === "function" ? openForm : null;
  if (originalOpenForm && !globalThis.__docroiEntityModelOpenFormPatched) {
    globalThis.__docroiEntityModelOpenFormPatched = true;
    openForm = function(module, id){
      applyModel();
      originalOpenForm(module, id);
      setTimeout(syncRelationDialog, 0);
      setTimeout(syncSessionDialog, 0);
      setTimeout(syncOrganizationDialog, 0);
    };
  }

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender && !globalThis.__docroiEntityModelRenderPatched) {
    globalThis.__docroiEntityModelRenderPatched = true;
    render = function(){
      applyModel();
      originalRender();
      setTimeout(cleanVisibleRelationIds, 0);
    };
  }

  try { render(); } catch {}
  setInterval(syncRelationDialog, 600);
  setInterval(syncOrganizationDialog, 600);
  setInterval(cleanVisibleRelationIds, 800);
})();
