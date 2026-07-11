(function(){
  const VERSION = "20260711-operating-model";
  if (globalThis.__docroiOperatingModel === VERSION) return;
  globalThis.__docroiOperatingModel = VERSION;

  const cfgs = typeof modules !== "undefined" ? modules : (typeof moduleConfig !== "undefined" ? moduleConfig : null);
  const navRef = typeof nav !== "undefined" ? nav : (typeof navItems !== "undefined" ? navItems : null);
  if (!cfgs || !navRef || !globalThis.state) return;

  const $one = (s) => document.querySelector(s);
  const escx = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const titlex = (r) => r?.name || r?.title || r?.concept || "Registro";
  const saveX = () => { try { save(); } catch { try { saveState(); } catch {} } };
  const renderX = () => { try { render(); } catch {} };
  const moneyX = (v) => { try { return eur.format(Number(v || 0)); } catch { try { return money.format(Number(v || 0)); } catch { return new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(Number(v || 0)); } } };
  const dateX = (v) => { try { return fmtDate(v); } catch { try { return formatDate(v); } catch { return v || "Sin fecha"; } } };
  const relX = (mod, id) => { try { return label(mod,id); } catch { try { return relationLabel(mod,id); } catch { const x=(state[mod]||[]).find(r=>r.id===id); return titlex(x) || id || "Sin asignar"; } } };
  const classX = (s) => { try { return cls(s); } catch { try { return statusClass(s); } catch { return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,"-"); } } };
  const daysUntilX = (v) => { if(!v) return 9999; try { return daysUntil(v); } catch { return Math.ceil((new Date(v+"T00:00:00") - new Date(new Date().toDateString())) / 86400000); } };

  function fieldsOf(mod){ return cfgs[mod]?.fields || []; }
  function setColumns(mod, cols){ if(cfgs[mod]?.cols) cfgs[mod].cols = cols; if(cfgs[mod]?.columns) cfgs[mod].columns = cols; }
  function insertField(mod, field, after){
    const fields = fieldsOf(mod);
    if (!fields.length || fields.some(f => f[0] === field[0])) return;
    const idx = fields.findIndex(f => f[0] === after);
    fields.splice(idx >= 0 ? idx + 1 : fields.length, 0, field);
  }
  function upsertNav(id, label, icon, after){
    const existing = navRef.find(i => i[0] === id);
    if (existing) { existing[1] = label; existing[2] = icon; return; }
    const idx = navRef.findIndex(i => i[0] === after);
    navRef.splice(idx >= 0 ? idx + 1 : navRef.length, 0, [id, label, icon]);
  }
  function renameNav(id, label, icon){ const item = navRef.find(i => i[0] === id); if(item){ item[1] = label; if(icon) item[2] = icon; } }

  upsertNav("organization", "Organizacion", "O", "institutions");
  upsertNav("economics", "Economics", "€+", "evaluations");
  renameNav("finances", "Finanzas - costes", "€-");
  const desired = ["dashboard","institutions","organization","programs","sessions","calendar","documents","evaluations","economics","finances","alerts","settings"];
  navRef.sort((a,b) => desired.indexOf(a[0]) - desired.indexOf(b[0]));

  state.organization ||= [];
  if (!state.organization.length && Array.isArray(state.contacts)) {
    state.organization = state.contacts.map(c => ({
      id: `org_${c.id || Date.now()}`,
      name: c.name || "",
      role: /admin|pago/i.test(c.role || c.position || "") ? "Administracion" : (/director|responsable de programa/i.test(c.role || c.position || "") ? "Director Academico" : "Coordinador Master"),
      institutionId: c.institutionId || "",
      programId: (c.programIds || [])[0] || "",
      sessionId: "",
      reportsToId: "",
      email: c.email || "",
      phone: c.phone || "",
      observations: c.notes || c.responsibilities || ""
    }));
  }

  cfgs.organization = {
    title: "Organizacion",
    singular: "persona",
    action: "Nueva persona",
    primary: "Nueva persona",
    fields: [
      ["name", "Nombre y apellidos", "text", true],
      ["role", "Rol", "select", true, ["Director Academico", "Coordinador Master", "Administracion", "Alumno", "Otro"]],
      ["institutionId", "Institucion", "rel:institutions"],
      ["programId", "Programa", "rel:programs"],
      ["sessionId", "Sesion", "rel:sessions"],
      ["reportsToId", "Depende de", "rel:organization"],
      ["email", "Correo", "email"],
      ["phone", "Telefono", "tel"],
      ["observations", "Observaciones", "textarea"]
    ],
    cols: ["name", "role", "institutionId", "programId", "reportsToId"],
    filters: ["role", "institutionId", "programId"]
  };

  insertField("programs", ["directorOrgId", "Director academico", "rel:organization"], "institutionId");
  insertField("programs", ["coordinatorOrgId", "Coordinador de master", "rel:organization"], "directorOrgId");
  insertField("programs", ["adminOrgId", "Administracion / pagos", "rel:organization"], "coordinatorOrgId");
  insertField("programs", ["hourlyRate", "Precio hora", "number"], "plannedHours");
  insertField("sessions", ["incomeStatus", "Estado ingreso", "select", false, ["Previsto", "Pendiente de facturar", "Facturado", "Cobrado", "En pausa", "Cancelado"]], "amount");
  insertField("documents", ["sessionIds", "Sesiones asociadas", "multi:sessions"], "sessionId");
  insertField("documents", ["evaluationIds", "Evaluaciones asociadas", "multi:evaluations"], "evaluationId");
  insertField("evaluations", ["documentIds", "Documentos asociados", "multi:documents"], "documentId");
  setColumns("programs", ["name", "institutionId", "directorOrgId", "coordinatorOrgId", "hourlyRate", "status"]);
  setColumns("sessions", ["title", "programId", "date", "duration", "incomeStatus", "status"]);

  (state.programs || []).forEach(p => {
    const people = (state.organization || []).filter(o => o.institutionId === p.institutionId || o.programId === p.id);
    const director = people.find(o => o.role === "Director Academico") || {};
    const coordinator = people.find(o => o.role === "Coordinador Master") || {};
    const admin = people.find(o => o.role === "Administracion") || {};
    p.directorOrgId ||= director.id || "";
    p.coordinatorOrgId ||= coordinator.id || "";
    p.adminOrgId ||= admin.id || "";
  });
  (state.sessions || []).forEach(s => { s.incomeStatus ||= s.status === "Cancelada" ? "Cancelado" : "Previsto"; });
  (state.documents || []).forEach(d => {
    if (d.sessionId && !Array.isArray(d.sessionIds)) d.sessionIds = [d.sessionId];
    if (d.evaluationId && !Array.isArray(d.evaluationIds)) d.evaluationIds = [d.evaluationId];
  });
  (state.evaluations || []).forEach(e => {
    if (e.documentId && !Array.isArray(e.documentIds)) e.documentIds = [e.documentId];
  });
  saveX();

  function programFor(mod, rec){
    if (!rec) return null;
    if (mod === "programs") return rec;
    if (rec.programId) return (state.programs || []).find(p => p.id === rec.programId) || null;
    if (mod === "sessions") return (state.programs || []).find(p => p.id === rec.programId) || null;
    if (mod === "documents" && rec.sessionIds?.length) {
      const s = (state.sessions || []).find(x => x.id === rec.sessionIds[0]);
      return s ? (state.programs || []).find(p => p.id === s.programId) || null : null;
    }
    if (mod === "evaluations" && rec.sessionId) {
      const s = (state.sessions || []).find(x => x.id === rec.sessionId);
      return s ? (state.programs || []).find(p => p.id === s.programId) || null : null;
    }
    return null;
  }
  function institutionFor(mod, rec){
    if (!rec) return null;
    if (mod === "institutions") return rec;
    if (rec.institutionId) return (state.institutions || []).find(i => i.id === rec.institutionId) || null;
    const p = programFor(mod, rec);
    return p?.institutionId ? (state.institutions || []).find(i => i.id === p.institutionId) || null : null;
  }
  function logoFor(mod, rec){
    const p = programFor(mod, rec);
    const i = institutionFor(mod, rec);
    if (p?.programLogoFileData) return `<img class="institution-logo inherited-logo" src="${p.programLogoFileData}" alt="Logo ${escx(p.name)}">`;
    if (i?.logoFileData) return `<img class="institution-logo inherited-logo" src="${i.logoFileData}" alt="Logo ${escx(i.name)}">`;
    const name = p?.name || i?.name || titlex(rec);
    const ini = String(name || "DR").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
    return `<div class="institution-logo placeholder inherited-logo">${escx(ini)}</div>`;
  }

  function sessionIncome(s){
    const p = (state.programs || []).find(x => x.id === s.programId) || {};
    const hours = Number(s.duration || s.hours || 0);
    const rate = Number(p.hourlyRate || s.hourlyRate || 0);
    const gross = hours * rate;
    const retention = gross * 0.15;
    const net = gross - retention;
    return { hours, rate, gross, retention, net, collected: s.incomeStatus === "Cobrado" ? net : 0, program:p };
  }
  function economicsRows(){ return (state.sessions || []).filter(s => s.status !== "Cancelada").map(s => ({ session:s, ...sessionIncome(s) })); }
  function monthKey(date){ return (date || "Sin fecha").slice(0,7); }
  function monthLabel(key){ if(key === "Sin fecha") return key; const [y,m]=key.split("-"); return `${m}/${y}`; }

  cfgs.economics = { title:"Economics - Ingresos", singular:"ingreso", action:"Nuevo ingreso", primary:"Nuevo ingreso", fields:[], cols:[], filters:[] };

  function renderEconomics(){
    const rows = economicsRows();
    const totals = rows.reduce((a,r)=>({ gross:a.gross+r.gross, retention:a.retention+r.retention, net:a.net+r.net, collected:a.collected+r.collected }), { gross:0, retention:0, net:0, collected:0 });
    const byProgram = (state.programs || []).map(p => {
      const pr = rows.filter(r => r.session.programId === p.id);
      const t = pr.reduce((a,r)=>({ hours:a.hours+r.hours, gross:a.gross+r.gross, retention:a.retention+r.retention, net:a.net+r.net, collected:a.collected+r.collected }), {hours:0,gross:0,retention:0,net:0,collected:0});
      return { program:p, rows:pr, ...t };
    }).filter(x => x.rows.length);
    const months = [...new Set(rows.map(r => monthKey(r.session.date)))].sort();
    const institutions = state.institutions || [];
    return `<section class="module-head"><div><p class="eyebrow">Ingresos por sesion</p><h2>Economics - Ingresos</h2></div><button class="btn secondary" id="exportEconomicsCsv" type="button">Exportar CSV</button></section>
    <section class="finance-strip"><article><span>Bruto acumulado</span><strong>${moneyX(totals.gross)}</strong></article><article><span>Retencion 15%</span><strong>${moneyX(totals.retention)}</strong></article><article><span>Neto acumulado</span><strong>${moneyX(totals.net)}</strong></article><article><span>Neto cobrado</span><strong>${moneyX(totals.collected)}</strong></article></section>
    <section class="economics-grid">${byProgram.map(group => `<article class="panel economics-program">${logoFor("programs", group.program)}<div><h3>${escx(group.program.name)}</h3><p>${escx(relX("institutions", group.program.institutionId))} · ${group.hours} h · ${moneyX(group.program.hourlyRate || 0)}/h</p></div><div class="economics-total"><span>Bruto ${moneyX(group.gross)}</span><span>Ret. ${moneyX(group.retention)}</span><strong>Neto ${moneyX(group.net)}</strong></div><div class="income-lines">${group.rows.map(r => `<button class="income-line" data-detail-module="sessions" data-detail-id="${r.session.id}"><span>${dateX(r.session.date)} · ${escx(r.session.title)}</span><strong>${r.hours} h · ${moneyX(r.net)}</strong><em>${escx(r.session.incomeStatus || "Previsto")}</em></button>`).join("")}</div></article>`).join("") || `<div class="empty-state">No hay sesiones con horas para calcular ingresos.</div>`}</section>
    <section class="panel budget-matrix"><h3>Senda mensual neta</h3><div class="matrix-scroll"><table><thead><tr><th>Institucion</th>${months.map(m=>`<th>${monthLabel(m)}</th>`).join("")}</tr></thead><tbody>${institutions.map(ins => `<tr><th>${escx(ins.name)}</th>${months.map(m => { const subset=rows.filter(r=>monthKey(r.session.date)===m && r.program.institutionId===ins.id); const planned=subset.reduce((s,r)=>s+r.net,0); const collected=subset.reduce((s,r)=>s+r.collected,0); const deviation=collected-planned; return `<td><span>Prev. neto ${moneyX(planned)}</span><span>Cob. ${moneyX(collected)}</span><strong>Desv. ${moneyX(deviation)}</strong></td>`; }).join("")}</tr>`).join("")}</tbody></table></div></section>`;
  }

  function firstPendingChecklist(record){
    const keys = ["academicChecklist","adminChecklist","prepChecklist","checklist"];
    for (const key of keys) {
      const list = Array.isArray(record[key]) ? record[key] : [];
      const idx = list.findIndex(i => i.status === "Pendiente");
      if (idx >= 0) return { key, index:idx, label:list[idx].label };
    }
    return null;
  }
  function predictiveAlerts(){
    const alerts=[];
    (state.programs || []).forEach(p => { const pending=firstPendingChecklist(p); if(pending) alerts.push({ type:"Checklist programa", title:pending.label, target:"programs", id:p.id, meta:`${p.name} · ${relX("institutions",p.institutionId)}` }); });
    (state.sessions || []).forEach(s => { const pending=firstPendingChecklist(s); if(pending) alerts.push({ type:"Checklist sesion", title:pending.label, target:"sessions", id:s.id, meta:`${s.title} · ${dateX(s.date)}` }); const d=daysUntilX(s.date); if(s.incomeStatus !== "Cobrado" && d <= 7) alerts.push({ type:"Ingreso pendiente", title:`Reportar/cobrar ${s.title}`, target:"sessions", id:s.id, meta:`${dateX(s.date)} · ${moneyX(sessionIncome(s).net)} neto` }); });
    (state.finances || []).forEach(f => { const issue=daysUntilX(f.plannedIssueDate); const collect=daysUntilX(f.plannedCollectionDate); if(f.status !== "Cobrado" && issue <= 7) alerts.push({ type:"Factura", title:`Emitir factura: ${f.concept}`, target:"finances", id:f.id, meta:`${dateX(f.plannedIssueDate)} · ${moneyX(f.expectedAmount)}` }); if(f.status !== "Cobrado" && collect <= 7) alerts.push({ type:"Cobro", title:`Vigilar cobro: ${f.concept}`, target:"finances", id:f.id, meta:`${dateX(f.plannedCollectionDate)} · admin ${relX("organization", f.adminOrgId)}` }); });
    return alerts;
  }

  const originalRender = typeof render === "function" ? render : null;
  render = function(){
    if (originalRender) originalRender();
    const route = (location.hash.replace("#","").split("?")[0] || "dashboard");
    if (route === "economics") { $one("#pageTitle").textContent = "Economics - Ingresos"; $one("#app").innerHTML = renderEconomics(); }
    if (route === "dashboard") appendPredictiveDashboard();
  };

  const originalModuleView = typeof moduleView === "function" ? moduleView : null;
  if (originalModuleView) moduleView = function(mod){ if(mod === "economics"){ $one("#app").innerHTML = renderEconomics(); return; } originalModuleView(mod); };

  function appendPredictiveDashboard(){
    const app = $one("#app");
    if(!app || app.querySelector(".predictive-alerts")) return;
    const alerts = predictiveAlerts();
    const html = `<section class="panel predictive-alerts"><div class="panel-head"><h3>Alarmas predictivas</h3><span>${alerts.length ? alerts.length + " pendientes" : "Sin pendientes"}</span></div>${alerts.length ? `<div class="alert-stack">${alerts.slice(0,12).map(a=>`<button class="predictive-row" data-detail-module="${a.target}" data-detail-id="${a.id}"><strong>${escx(a.type)}</strong><span>${escx(a.title)}</span><small>${escx(a.meta)}</small></button>`).join("")}</div>` : `<div class="empty-state">Enhorabuena, no hay siguiente pendiente activo.</div>`}</section>`;
    app.insertAdjacentHTML("afterbegin", html);
  }

  document.addEventListener("click", e => {
    if (e.target.matches("dialog .dialog-head .icon-btn, #closeDetail, #cancelDialog")) {
      e.preventDefault();
      const dialog = e.target.closest("dialog");
      if (dialog) dialog.close();
    }
    if (e.target.id === "exportEconomicsCsv") {
      const rows = economicsRows();
      const csv = ["programa,institucion,sesion,fecha,horas,precio_hora,bruto,retencion,neto,estado", ...rows.map(r => [r.program.name, relX("institutions", r.program.institutionId), r.session.title, r.session.date, r.hours, r.rate, r.gross, r.retention, r.net, r.session.incomeStatus].map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="docroi-economics-ingresos.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }
  }, true);

  const style = document.createElement("style");
  style.textContent = `.economics-grid{display:grid;gap:16px;margin-bottom:18px}.economics-program{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:start}.economics-total{display:grid;gap:5px;min-width:170px}.economics-total span{color:#9eafc5;font-size:.82rem;font-weight:850}.economics-total strong{color:#87f0ff}.income-lines{grid-column:1/-1;display:grid;gap:8px}.income-line,.predictive-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;width:100%;padding:10px 12px;border:1px solid rgba(170,198,231,.16);border-radius:8px;background:rgba(255,255,255,.04);color:#edf6ff;text-align:left}.income-line span,.predictive-row small{color:#9eafc5}.income-line em{color:#ffc76f;font-style:normal;font-weight:900}.budget-matrix{margin-top:18px}.matrix-scroll{overflow:auto}.budget-matrix table{width:100%;border-collapse:separate;border-spacing:0 8px}.budget-matrix th,.budget-matrix td{padding:10px;border:1px solid rgba(170,198,231,.16);background:rgba(255,255,255,.04);text-align:left;vertical-align:top}.budget-matrix td span,.budget-matrix td strong{display:block;white-space:nowrap}.budget-matrix td span{color:#9eafc5;font-size:.78rem}.budget-matrix td strong{color:#87f0ff}.predictive-alerts{margin-bottom:18px}.predictive-alerts .panel-head span{color:#ffc76f;font-weight:900}.alert-stack{display:grid;gap:8px;margin-top:12px}.predictive-row{grid-template-columns:150px minmax(0,1fr) minmax(180px,.6fr)}.predictive-row strong{color:#87f0ff}.predictive-row span{font-weight:900}@media(max-width:900px){.economics-program,.income-line,.predictive-row{grid-template-columns:1fr}.economics-total{min-width:0}}`;
  document.head.appendChild(style);

  renderX();
})();
