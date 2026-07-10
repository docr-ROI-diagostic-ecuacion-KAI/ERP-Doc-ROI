(function(){
  const VERSION = "20260710-program-contacts";
  if (window.__docroiProgramContacts === VERSION) return;
  window.__docroiProgramContacts = VERSION;

  const cfgs = typeof modules !== "undefined" ? modules : (typeof moduleConfig !== "undefined" ? moduleConfig : null);
  if (!cfgs || !window.state) return;

  const esc2 = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const title2 = (r) => r?.name || r?.title || r?.concept || "Registro";
  const save2 = () => { try { save(); } catch { try { saveState(); } catch {} } };
  const render2 = () => { try { render(); } catch {} };
  const rel2 = (mod, id) => { try { return label(mod, id); } catch { try { return relationLabel(mod, id); } catch { const x=(state[mod]||[]).find(r=>r.id===id); return title2(x) || id || "Sin asignar"; } } };
  const cls2 = (s) => { try { return cls(s); } catch { try { return statusClass(s); } catch { return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,"-"); } } };
  const fieldLabel2 = (mod, key) => { try { return fieldLabel(mod, key); } catch { return (cfgs[mod]?.fields || []).find(f=>f[0]===key)?.[1] || key; } };
  const value2 = (mod, key, rec) => { try { return value(mod, key, rec); } catch { try { return displayValue(mod, key, rec[key], rec); } catch { return esc2(rec?.[key] || "-"); } } };
  const progress2 = (rec) => { try { return progress(rec); } catch { try { return progressHtml(rec); } catch { return ""; } } };

  function fieldsOf(mod){ return cfgs[mod]?.fields || []; }
  function colsOf(mod){ return cfgs[mod]?.cols || cfgs[mod]?.columns || []; }
  function setCols(mod, cols){ if (cfgs[mod]?.cols) cfgs[mod].cols = cols; if (cfgs[mod]?.columns) cfgs[mod].columns = cols; }
  function insertField(mod, field, after){
    const fields = fieldsOf(mod);
    if (!fields.length || fields.some(f => f[0] === field[0])) return;
    const idx = fields.findIndex(f => f[0] === after);
    fields.splice(idx >= 0 ? idx + 1 : fields.length, 0, field);
  }
  function removeFields(mod, names){
    const fields = fieldsOf(mod);
    names.forEach(name => { const idx = fields.findIndex(f => f[0] === name); if (idx >= 0) fields.splice(idx, 1); });
  }

  removeFields("institutions", ["academicCoordinatorName", "academicCoordinatorRole", "academicCoordinatorEmail", "academicCoordinatorPhone"]);
  insertField("institutions", ["institutionAuthorityName", "Contacto institucional principal", "text"], "logoFile");
  insertField("institutions", ["institutionAuthorityRole", "Cargo institucional", "select", false, ["Rector", "Decano", "Director general", "Director academico institucional", "Responsable institucional", "Otro"]], "institutionAuthorityName");
  insertField("institutions", ["institutionAuthorityEmail", "Email institucional", "email"], "institutionAuthorityRole");
  insertField("institutions", ["institutionAuthorityPhone", "Telefono institucional", "tel"], "institutionAuthorityEmail");
  setCols("institutions", ["name", "type", "city", "institutionAuthorityName"]);

  insertField("programs", ["programLogoFile", "Logo o foto del programa", "file"], "name");
  insertField("programs", ["programDirectorName", "Director / catedratico - Nombre", "text"], "academicContactId");
  insertField("programs", ["programDirectorRole", "Rol del director", "select", false, ["Director de master", "Director academico", "Catedratico", "Decano", "Responsable de programa", "Otro"]], "programDirectorName");
  insertField("programs", ["programDirectorEmail", "Email del director", "email"], "programDirectorRole");
  insertField("programs", ["programDirectorPhone", "Telefono del director", "tel"], "programDirectorEmail");
  insertField("programs", ["programCoordinatorName", "Coordinador del programa - Nombre", "text"], "programDirectorPhone");
  insertField("programs", ["programCoordinatorRole", "Rol del coordinador", "select", false, ["Coordinador academico", "Coordinador de master", "Secretaria academica", "Responsable operativo", "Otro"]], "programCoordinatorName");
  insertField("programs", ["programCoordinatorEmail", "Email del coordinador", "email"], "programCoordinatorRole");
  insertField("programs", ["programCoordinatorPhone", "Telefono del coordinador", "tel"], "programCoordinatorEmail");
  insertField("programs", ["programAdminName", "Responsable administrativo - Nombre", "text"], "programCoordinatorPhone");
  insertField("programs", ["programAdminRole", "Rol administrativo", "select", false, ["Responsable administrativo", "Responsable de pagos", "Secretaria", "Gestor academico", "Otro"]], "programAdminName");
  insertField("programs", ["programAdminEmail", "Email administrativo", "email"], "programAdminRole");
  insertField("programs", ["programAdminPhone", "Telefono administrativo", "tel"], "programAdminEmail");
  setCols("programs", ["name", "institutionId", "status", "programDirectorName", "programCoordinatorName", "language"]);
  setCols("sessions", ["title", "programId", "date", "language", "startTime", "status"]);
  setCols("evaluations", ["name", "programId", "type", "deliveryDate", "status"]);
  setCols("documents", ["name", "type", "programId", "status", "deadline"]);

  (state.institutions || []).forEach(ins => {
    ins.institutionAuthorityName ||= ins.mainContactName || "";
    ins.institutionAuthorityRole ||= ins.mainContactRole || "Responsable institucional";
    ins.institutionAuthorityEmail ||= ins.mainContactEmail || "";
    ins.institutionAuthorityPhone ||= ins.mainContactPhone || "";
  });
  (state.programs || []).forEach(program => {
    const contacts = (state.contacts || []).filter(c => c.programIds?.includes(program.id) || c.institutionId === program.institutionId);
    const director = contacts.find(c => /director|catedratico|responsable de programa/i.test(`${c.role || ""} ${c.position || ""}`)) || {};
    const coordinator = contacts.find(c => /coordinador|secretaria/i.test(`${c.role || ""} ${c.position || ""}`)) || {};
    const admin = contacts.find(c => /admin|pago|factura/i.test(`${c.role || ""} ${c.position || ""}`)) || {};
    program.programDirectorName ||= director.name || "";
    program.programDirectorRole ||= director.position || director.role || "";
    program.programDirectorEmail ||= director.email || "";
    program.programDirectorPhone ||= director.phone || "";
    program.programCoordinatorName ||= coordinator.name || "";
    program.programCoordinatorRole ||= coordinator.position || coordinator.role || "";
    program.programCoordinatorEmail ||= coordinator.email || "";
    program.programCoordinatorPhone ||= coordinator.phone || "";
    program.programAdminName ||= admin.name || "";
    program.programAdminRole ||= admin.position || admin.role || "";
    program.programAdminEmail ||= admin.email || "";
    program.programAdminPhone ||= admin.phone || "";
  });
  save2();

  function programFor(mod, rec){
    if (!rec) return null;
    if (mod === "programs") return rec;
    if (rec.programId) return (state.programs || []).find(p => p.id === rec.programId) || null;
    if (mod === "sessions") return (state.programs || []).find(p => p.id === rec.programId) || null;
    if (mod === "documents" && rec.sessionId) {
      const session = (state.sessions || []).find(s => s.id === rec.sessionId);
      return session ? (state.programs || []).find(p => p.id === session.programId) || null : null;
    }
    if (mod === "evaluations" && rec.sessionId) {
      const session = (state.sessions || []).find(s => s.id === rec.sessionId);
      return session ? (state.programs || []).find(p => p.id === session.programId) || null : null;
    }
    if (["calendar", "alerts", "finances"].includes(mod) && rec.programId) return (state.programs || []).find(p => p.id === rec.programId) || null;
    return null;
  }
  function institutionFor2(mod, rec){
    if (!rec) return null;
    if (mod === "institutions") return rec;
    const program = programFor(mod, rec);
    if (program?.institutionId) return (state.institutions || []).find(i => i.id === program.institutionId) || null;
    if (rec.institutionId) return (state.institutions || []).find(i => i.id === rec.institutionId) || null;
    return null;
  }
  function initials(name){ return String(name || "DR").split(/\s+/).slice(0,2).map(p=>p[0]).join("").toUpperCase(); }
  function logoHtmlFor(mod, rec, extra=""){
    const program = programFor(mod, rec);
    const institution = institutionFor2(mod, rec);
    if (program?.programLogoFileData) return `<img class="institution-logo program-logo ${extra}" src="${program.programLogoFileData}" alt="Logo ${esc2(program.name)}">`;
    if (institution?.logoFileData) return `<img class="institution-logo ${extra}" src="${institution.logoFileData}" alt="Logo ${esc2(institution.name)}">`;
    const source = program?.name || institution?.name || title2(rec);
    return `<div class="institution-logo placeholder ${extra}">${esc2(initials(source))}</div>`;
  }

  function subtitle2(mod, x){
    if (mod === "institutions") return `${x.institutionAuthorityRole || "Contacto principal"}: ${x.institutionAuthorityName || "Sin asignar"}`;
    if (mod === "programs") return `${rel2("institutions", x.institutionId)} · ${x.type || ""} · ${x.programDirectorName || x.myRole || "Sin director"}`;
    if (mod === "sessions") return `${rel2("programs", x.programId)} · ${x.date || ""} ${x.startTime || ""}`;
    if (mod === "evaluations" || mod === "documents" || mod === "finances" || mod === "calendar" || mod === "alerts") return `${rel2("programs", x.programId)} · ${rel2("institutions", institutionFor2(mod, x)?.id)}`;
    try { return subtitle(mod, x); } catch { return ""; }
  }

  card = function(mod, x){
    const cfg = cfgs[mod];
    const columns = (cfg?.cols || cfg?.columns || []).filter(k => !["name", "title", "concept"].includes(k)).slice(0,4);
    const meta = columns.map(k => `<span>${fieldLabel2(mod,k)}<strong>${value2(mod,k,x)}</strong></span>`).join("");
    const showLogo = ["institutions", "programs", "sessions", "documents", "evaluations", "finances", "calendar", "alerts"].includes(mod);
    const logo = showLogo ? logoHtmlFor(mod, x, mod === "institutions" ? "" : "inherited-logo") : "";
    return `<article class="record-card"><div class="record-top"><span class="status-pill ${cls2(x.status || x.priority || x.type)}">${esc2(x.status || x.type || "Activo")}</span><button class="icon-btn" data-edit-module="${mod}" data-edit-id="${x.id}" aria-label="Editar">Edit</button></div>${logo}<h3>${esc2(title2(x))}</h3><p>${subtitle2(mod,x)}</p><div class="meta-grid">${meta}</div>${progress2(x)}<div class="card-actions"><button class="btn secondary" data-detail-module="${mod}" data-detail-id="${x.id}">Ver ficha</button></div></article>`;
  };

  const oldRelated = typeof related === "function" ? related : (typeof renderRelated === "function" ? renderRelated : () => "");
  detail = function(mod, id){
    const x = (state[mod] || []).find(r => r.id === id);
    if (!x) return;
    const logo = ["institutions", "programs", "sessions", "documents", "evaluations", "finances", "calendar", "alerts"].includes(mod) ? `<div class="detail-identity">${logoHtmlFor(mod, x, mod === "institutions" ? "" : "inherited-logo")}</div>` : "";
    const fields = fieldsOf(mod);
    document.querySelector("#detailKicker").textContent = cfgs[mod].title;
    document.querySelector("#detailTitle").textContent = title2(x);
    const detailValueFn = typeof detailValue === "function" ? detailValue : (typeof displayValue === "function" ? displayValue : null);
    const body = fields.map(([n,l,t]) => {
      let val = x[n];
      let rendered = detailValueFn ? detailValueFn(n,t,val,x) : esc2(Array.isArray(val) ? val.join(", ") : (val || "-"));
      return `<article><span>${l}</span><strong>${rendered}</strong></article>`;
    }).join("");
    document.querySelector("#detailContent").innerHTML = `${logo}<div class="detail-grid">${body}</div>${oldRelated(mod,x)}<div class="dialog-actions"><button class="btn primary" data-edit-module="${mod}" data-edit-id="${x.id}">Editar ficha</button></div>`;
    document.querySelector("#detailDialog").showModal();
  };
  try { openDetail = detail; } catch {}

  const style = document.createElement("style");
  style.textContent = `.program-logo{box-shadow:0 0 0 1px rgba(135,240,255,.18),0 16px 34px rgba(0,0,0,.28)}.detail-identity{display:flex;align-items:center;gap:14px;margin:0 0 16px}.detail-identity .institution-logo{margin:0}.institution-logo.inherited-logo{width:58px;height:58px;margin:10px 0 4px}.record-card .institution-logo{flex:none}`;
  document.head.appendChild(style);

  render2();
})();
