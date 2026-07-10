(function(){
  const HOTFIX = "20260710-admin-calendar";
  if (window.__docroiHotfix === HOTFIX) return;
  window.__docroiHotfix = HOTFIX;

  function addField(mod, field, after) {
    const cfg = modules[mod];
    if (!cfg || cfg.fields.some(f => f[0] === field[0])) return;
    const idx = cfg.fields.findIndex(f => f[0] === after);
    cfg.fields.splice(idx >= 0 ? idx + 1 : cfg.fields.length, 0, field);
  }

  addField("institutions", ["academicCoordinatorName", "Coordinador academico - Nombre", "text"], "logoFile");
  addField("institutions", ["academicCoordinatorRole", "Cargo del coordinador", "select", false, ["Director academico", "Coordinador", "Director de master", "Responsable de programa", "Otro"]], "academicCoordinatorName");
  addField("institutions", ["academicCoordinatorEmail", "Email del coordinador", "email"], "academicCoordinatorRole");
  addField("institutions", ["academicCoordinatorPhone", "Telefono del coordinador", "tel"], "academicCoordinatorEmail");
  addField("programs", ["language", "Idioma", "select", false, ["Español", "Ingles", "Bilingue", "Otro"]], "academicYear");
  addField("sessions", ["language", "Idioma", "select", false, ["Español", "Ingles", "Bilingue", "Otro"]], "duration");
  if (modules.institutions && !modules.institutions.cols.includes("academicCoordinatorName")) modules.institutions.cols.push("academicCoordinatorName");
  if (modules.programs && !modules.programs.cols.includes("language")) modules.programs.cols.push("language");
  if (modules.sessions && !modules.sessions.cols.includes("language")) modules.sessions.cols.push("language");

  function coordinatorFor(insId) {
    return (state.contacts || []).find(c => c.institutionId === insId && /coordinador|director/i.test(c.role || c.position || ""));
  }
  (state.institutions || []).forEach(ins => {
    const c = coordinatorFor(ins.id) || {};
    ins.academicCoordinatorName ||= c.name || "";
    ins.academicCoordinatorRole ||= c.position || c.role || "";
    ins.academicCoordinatorEmail ||= c.email || "";
    ins.academicCoordinatorPhone ||= c.phone || "";
  });
  (state.programs || []).forEach(p => { p.language ||= "Español"; });
  (state.sessions || []).forEach(s => {
    const p = (state.programs || []).find(x => x.id === s.programId) || {};
    s.language ||= p.language || "Español";
  });
  save();

  function institutionFor(mod, rec) {
    if (!rec) return null;
    if (mod === "institutions") return rec;
    if (rec.institutionId) return state.institutions.find(i => i.id === rec.institutionId) || null;
    if (mod === "sessions") {
      const p = state.programs.find(x => x.id === rec.programId);
      return p ? state.institutions.find(i => i.id === p.institutionId) || null : null;
    }
    return null;
  }
  function logoHtml(ins, extra = "") {
    if (!ins) return "";
    if (ins.logoFileData) return `<img class="institution-logo ${extra}" src="${ins.logoFileData}" alt="Logo ${esc(ins.name)}">`;
    const ini = String(ins.name || "IN").split(/\s+/).slice(0,2).map(p => p[0]).join("").toUpperCase();
    return `<div class="institution-logo placeholder ${extra}">${esc(ini)}</div>`;
  }
  function logoFor(mod, rec) {
    if (mod === "institutions") return logoHtml(rec);
    if (["programs", "sessions"].includes(mod)) return logoHtml(institutionFor(mod, rec), "inherited-logo");
    return "";
  }

  card = function(mod,x){
    const cfg = modules[mod];
    const meta = cfg.cols.filter(k => !["name","title","concept"].includes(k)).slice(0,4).map(k => `<span>${fieldLabel(mod,k)}<strong>${value(mod,k,x)}</strong></span>`).join("");
    const logo = logoFor(mod, x);
    return `<article class="record-card"><div class="record-top"><span class="status-pill ${cls(x.status||x.priority)}">${esc(x.status||x.type||"Activo")}</span><button class="icon-btn" data-edit-module="${mod}" data-edit-id="${x.id}" aria-label="Editar">Edit</button></div>${logo}<h3>${esc(titleOf(x))}</h3><p>${subtitle(mod,x)}</p><div class="meta-grid">${meta}</div>${progress(x)}<div class="card-actions"><button class="btn secondary" data-detail-module="${mod}" data-detail-id="${x.id}">Ver ficha</button></div></article>`;
  };

  detail = function(mod,id){
    const x = state[mod].find(r => r.id === id);
    if (!x) return;
    const identity = ["institutions", "programs", "sessions"].includes(mod) ? `<div class="detail-identity">${logoFor(mod,x)}</div>` : "";
    $("#detailKicker").textContent = modules[mod].title;
    $("#detailTitle").textContent = titleOf(x);
    $("#detailContent").innerHTML = `${identity}<div class="detail-grid">${modules[mod].fields.map(([n,l,t]) => `<article><span>${l}</span><strong>${detailValue(n,t,x[n],x)}</strong></article>`).join("")}</div>${related(mod,x)}<div class="dialog-actions"><button class="btn primary" data-edit-module="${mod}" data-edit-id="${x.id}">Editar ficha</button></div>`;
    $("#detailDialog").showModal();
  };

  function dateKey(d) { return d.toISOString().slice(0,10); }
  function nextDays(n) { return Array.from({length:n}, (_,i) => { const d = new Date(today); d.setDate(d.getDate()+i); return d; }); }
  function sameMonth(v) { const d = new Date(v + "T00:00:00"); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); }
  function calendarItems() {
    const items = [];
    (state.sessions || []).forEach(s => items.push({date:s.date,time:s.startTime,title:s.title,type:"Sesion",programId:s.programId,institutionId:institutionFor("sessions",s)?.id,status:s.status,amount:s.amount}));
    (state.calendar || []).forEach(c => items.push({date:c.date,time:c.time,title:c.title,type:c.type,programId:c.programId,institutionId:c.institutionId,status:c.status,priority:c.priority}));
    (state.evaluations || []).forEach(e => [["deliveryDate","Entrega"],["correctionDate","Correccion"],["gradesDeadline","Notas"]].forEach(([k,t]) => e[k] && items.push({date:e[k],title:`${t}: ${e.name}`,type:"Evaluacion",programId:e.programId,status:e.status})));
    (state.finances || []).forEach(f => [["plannedIssueDate","Factura"],["plannedCollectionDate","Cobro"]].forEach(([k,t]) => f[k] && items.push({date:f[k],title:`${t}: ${f.concept}`,type:t,programId:f.programId,institutionId:f.institutionId,status:f.status,amount:f.expectedAmount})));
    return items.filter(x => x.date).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  }
  function chip(i) {
    const p = i.programId ? label("programs", i.programId) : (i.institutionId ? label("institutions", i.institutionId) : "DocROI");
    return `<button class="calendar-chip ${cls(i.type)}" data-route="calendar"><strong>${esc(i.time || "")}${i.time ? " - " : ""}${esc(i.title)}</strong><span>${esc(i.type)} · ${esc(p)}${i.amount ? " · " + eur.format(Number(i.amount || 0)) : ""}</span></button>`;
  }
  function renderCalendarPlanner(){
    const items = calendarItems();
    const days = nextDays(7);
    const month = items.filter(i => sameMonth(i.date)).slice(0,14);
    return `<section class="calendar-planner"><div class="planner-head"><div><p class="eyebrow">Ocupacion</p><h3>Semana y mes de trabajo</h3></div><span>${items.length} hitos vivos</span></div><div class="week-grid">${days.map(d => { const k = dateKey(d); const ds = items.filter(i => i.date === k); return `<article class="calendar-day"><div><strong>${day.format(d)}</strong><span>${ds.length} items</span></div>${ds.length ? ds.map(chip).join("") : `<p class="empty-day">Libre</p>`}</article>`; }).join("")}</div><div class="month-list"><h3>Vista mensual</h3>${month.length ? month.map(i => `<button class="month-row" data-route="calendar"><span>${fmtDate(i.date)} ${esc(i.time || "")}</span><strong>${esc(i.title)}</strong><em>${esc(i.type)}</em></button>`).join("") : empty("Sin hitos este mes.")}</div></section>`;
  }

  moduleView = function(mod){
    const cfg = modules[mod];
    let records = (state[mod] || []).filter(matchesSearch).filter(matchesFilter);
    $("#app").innerHTML = `<section class="module-head"><div><p class="eyebrow">${records.length} registros</p><h2>${cfg.title}</h2></div><button class="btn primary" data-new="${mod}">${cfg.action}</button></section><section class="filter-bar">${filters(mod)}${activeFilter ? `<button class="btn ghost" id="clearFilter">Quitar filtro</button>` : ""}</section>${mod === "calendar" ? renderCalendarPlanner() : ""}${mod === "finances" ? financeDash() : ""}<section class="records-grid ${mod}">${records.length ? records.map(x => card(mod,x)).join("") : empty("No hay registros con estos filtros.")}</section>`;
  };

  render();
})();
