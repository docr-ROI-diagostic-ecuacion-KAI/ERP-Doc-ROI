(function(){
  const VERSION = "20260710-roadmap-controls";
  if (window.__docroiRoadmap === VERSION) return;
  window.__docroiRoadmap = VERSION;

  function esc(v){ return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }
  function moneyFmt(v){ try { return eur.format(Number(v || 0)); } catch { return new Intl.NumberFormat("es-ES", {style:"currency", currency:"EUR", maximumFractionDigits:0}).format(Number(v || 0)); } }
  function dateLabel(v){ try { return fmtDate(v); } catch { return v || "Sin fecha"; } }
  function rel(mod,id){ try { return label(mod,id); } catch { const x=(state[mod]||[]).find(r=>r.id===id); return x?.name || x?.title || x?.concept || id || "Sin asignar"; } }
  function dateKey(d){ return d.toISOString().slice(0,10); }
  function days(v){ if(!v) return 9999; return Math.ceil((new Date(v+"T00:00:00") - new Date(new Date().toDateString())) / 86400000); }

  function calendarFeed(){
    const sessions=(state.sessions||[]).map(s=>({type:"Clase", title:s.title, date:s.date, time:s.startTime, duration:s.duration, meta:`${rel("programs",s.programId)} · ${s.mode||""} · ${s.language||""}`}));
    const milestones=(state.calendar||[]).map(c=>({type:c.type, title:c.title, date:c.date, time:c.time, duration:0, meta:`${rel("programs",c.programId)} · ${c.priority||"Media"}`}));
    const evals=(state.evaluations||[]).map(e=>({type:"Evaluacion", title:e.name, date:e.deliveryDate, time:"", duration:0, meta:rel("programs",e.programId)}));
    const finances=(state.finances||[]).map(f=>({type:"Cobro", title:f.concept, date:f.plannedCollectionDate, time:"", duration:0, meta:moneyFmt(Math.max(Number(f.expectedAmount||0)-Number(f.collectedAmount||0),0))}));
    return [...sessions,...milestones,...evals,...finances].filter(i=>i.date).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  }

  function plan(){
    const count = k => (state[k]||[]).length;
    return [
      ["Autenticacion","Diseñado","Acceso privado por usuario, preparado para email y permisos por rol.","Conectar proveedor de login."],
      ["Base de datos","Listo para conectar",`${count("institutions")} instituciones, ${count("programs")} programas y ${count("sessions")} sesiones ya tienen estructura normalizada.`,"Sincronizar tablas principales."],
      ["Google Calendar","Exportable",`${calendarFeed().length} hitos pueden salir como calendario .ics.`,"Activar sincronizacion bidireccional."],
      ["Google Drive","Preparado",`${count("documents")} documentos y enlaces internos se guardan en fichas.`,"Crear carpetas por institucion y programa."],
      ["Gmail","Operativo base","Se generan borradores con contexto academico y administrativo.","Enviar desde cuenta conectada."],
      ["PDF","Imprimible","La vista actual puede guardarse como PDF desde el navegador.","Plantillas PDF por programa y sesion."],
      ["Excel/CSV","Exportable","Programas, sesiones, documentos, finanzas y contactos salen en CSV.","Importacion masiva con validacion."],
      ["IA para clases","Brief listo","Genera un prompt de preparacion con sesiones, documentos y evaluaciones.","Conectar modelo para propuestas automaticas."],
      ["Multiusuario","Modelo definido","Roles base: propietario, coordinador, docente, administracion y lector.","Permisos por modulo y auditoria."]
    ];
  }

  function roadmapHtml(){
    const items=plan();
    return `<section class="settings-hero"><div><p class="eyebrow">Roadmap operativo</p><h2>De ERP local a cabina conectada</h2><p>Estas mejoras ya tienen una primera capa accionable: backup, CSV, calendario, PDF, borrador de email y briefing de IA mientras queda preparada la conexion real con autenticacion, base de datos y servicios externos.</p></div><div class="settings-score"><strong>${items.length}</strong><span>frentes preparados</span></div></section>
    <section class="settings-actions"><article class="panel action-panel"><h2>Datos y seguridad</h2><p>Backup completo para proteger lo que vas metiendo y migrarlo despues a base de datos.</p><div class="button-row"><button class="btn primary" type="button" id="exportBackup">Exportar backup JSON</button><label class="btn secondary file-action">Importar JSON<input type="file" id="importBackup" accept="application/json"></label></div></article><article class="panel action-panel"><h2>Calendario y productividad</h2><p>Extrae ocupacion, sesiones, cobros y evaluaciones hacia calendario y hojas de calculo.</p><div class="button-row"><button class="btn primary" type="button" id="exportCalendar">Calendario .ics</button><button class="btn secondary" type="button" id="exportCsv">Exportar CSV</button></div></article><article class="panel action-panel"><h2>Clase, PDF y correo</h2><p>Prepara comunicacion, documentacion y apoyo de IA desde los datos capturados.</p><div class="button-row"><button class="btn primary" type="button" id="copyAiBrief">Brief IA</button><button class="btn secondary" type="button" id="draftEmail">Borrador email</button><button class="btn ghost" type="button" id="printPdf">PDF</button></div></article></section>
    <section class="integration-grid">${items.map(i=>`<article class="integration-card"><div><span>${esc(i[1])}</span><h3>${esc(i[0])}</h3></div><p>${esc(i[2])}</p><small>${esc(i[3])}</small></article>`).join("")}</section>
    <section class="settings-grid"><article class="panel"><h2>Modelo de datos</h2><p>La app ya separa instituciones, coordinadores, programas, sesiones, documentos, evaluaciones, finanzas, calendario y alertas. Eso permite mover despues el almacenamiento local a una base de datos sin rediseñar todo.</p></article><article class="panel"><h2>Roles multiusuario</h2><div class="tag-cloud">${["Propietario","Coordinador academico","Docente","Administracion","Lectura"].map(x=>`<span>${x}</span>`).join("")}</div></article><article class="panel"><h2>Datos demo</h2><p>Incluye instituciones, responsables academicos y administrativos, programas, sesiones, documentos, evaluaciones, facturas, pagos y alertas ficticias.</p><button class="btn danger" type="button" id="hardReset">Restablecer datos semilla</button></article></section>`;
  }

  function renderRoadmap(){ const app=document.querySelector("#app"); if(app) app.innerHTML=roadmapHtml(); }
  try { settings = renderRoadmap; } catch {}
  try { renderSettings = renderRoadmap; } catch {}

  function csv(records){
    const keys=[...new Set(records.flatMap(r=>Object.keys(r).filter(k=>!k.endsWith("Data"))))];
    const row=vals=>vals.map(v=>`"${String(Array.isArray(v)?v.join("; "):v??"").replace(/"/g,'""')}"`).join(",");
    return [row(keys),...records.map(r=>row(keys.map(k=>r[k])))].join("\n");
  }
  function download(name, text, type){ const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
  function exportBackup(){ download(`docroi-backup-${dateKey(new Date())}.json`, JSON.stringify({exportedAt:new Date().toISOString(), app:"DocROI", state}, null, 2), "application/json"); }
  function exportCsv(){ const mods=["institutions","contacts","programs","sessions","documents","evaluations","finances","calendar","alerts"]; download(`docroi-export-${dateKey(new Date())}.csv`, mods.map(m=>`# ${m}\n${csv(state[m]||[])}`).join("\n\n"), "text/csv;charset=utf-8"); }
  function icsText(v){ return String(v||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;"); }
  function exportIcs(){ const stamp=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z"; const body=calendarFeed().map((i,n)=>{ const start=`${i.date.replace(/-/g,"")}T${(i.time||"09:00").replace(":","")}00`; const end=`${i.date.replace(/-/g,"")}T${String(Math.min(Number((i.time||"09:00").slice(0,2))+Math.max(1,Number(i.duration||1)),23)).padStart(2,"0")}${(i.time||"09:00").slice(3,5)}00`; return `BEGIN:VEVENT\nUID:docroi-${n}-${i.date}@docroi.local\nDTSTAMP:${stamp}\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${icsText(i.title)}\nDESCRIPTION:${icsText(i.type+" - "+(i.meta||""))}\nEND:VEVENT`; }).join("\n"); download("docroi-calendario.ics", `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DocROI//Academic Control Center//ES\n${body}\nEND:VCALENDAR`, "text/calendar;charset=utf-8"); }
  function draftEmail(){ const s=(state.sessions||[]).filter(x=>days(x.date)>=0).sort((a,b)=>(a.date||"").localeCompare(b.date||""))[0]; const subject=s?`DocROI - preparacion ${s.title}`:"DocROI - seguimiento academico"; const body=s?`Hola,\n\nComparto el contexto de la proxima sesion:\n\nPrograma: ${rel("programs",s.programId)}\nSesion: ${s.title}\nFecha: ${dateLabel(s.date)} ${s.startTime||""}\nMaterial: ${s.materialUrl||"pendiente"}\n\nQuedo atento para confirmar aula/enlace y documentacion.\n\nUn saludo.`:"Hola,\n\nComparto seguimiento academico desde DocROI.\n\nUn saludo."; location.href=`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }
  function aiBrief(){ const upcoming=(state.sessions||[]).filter(x=>days(x.date)>=0).sort((a,b)=>(a.date||"").localeCompare(b.date||"")).slice(0,5); const context=upcoming.map(s=>`- ${s.title} (${dateLabel(s.date)} ${s.startTime||""})\n  Programa: ${rel("programs",s.programId)}\n  Objetivos: ${s.objectives||"pendiente"}\n  Temas: ${s.topics||"pendiente"}\n  Material: ${s.materialUrl||"pendiente"}`).join("\n"); const prompt=`Actua como asistente academico senior de DocROI. Prepara una propuesta de clase accionable con objetivos, guion, materiales, dinamicas, riesgos y recordatorios.\n\nContexto:\n${context||"No hay sesiones futuras registradas."}`; navigator.clipboard?.writeText(prompt); alert("Brief de IA copiado al portapapeles."); }
  function importBackup(file){ if(!file) return; const r=new FileReader(); r.onload=()=>{ try{ const parsed=JSON.parse(r.result); state=parsed.state||parsed; save(); render(); alert("Datos importados correctamente."); } catch { alert("No he podido importar el archivo. Revisa que sea un backup JSON de DocROI."); } }; r.readAsText(file); }

  document.addEventListener("click", e=>{
    if(e.target.id==="exportBackup") exportBackup();
    if(e.target.id==="exportCsv") exportCsv();
    if(e.target.id==="exportCalendar") exportIcs();
    if(e.target.id==="printPdf") window.print();
    if(e.target.id==="draftEmail") draftEmail();
    if(e.target.id==="copyAiBrief") aiBrief();
  });
  document.addEventListener("change", e=>{ if(e.target.id==="importBackup"){ importBackup(e.target.files?.[0]); e.target.value=""; } });

  const style=document.createElement("style");
  style.textContent=`.settings-hero{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:18px;align-items:stretch;margin-bottom:18px;padding:22px;border:1px solid rgba(170,198,231,.16);border-radius:8px;background:linear-gradient(135deg,rgba(13,95,147,.22),rgba(16,24,39,.96));box-shadow:0 20px 60px rgba(0,0,0,.32)}.settings-hero h2{margin:0 0 10px;font-size:clamp(1.7rem,3vw,3rem);line-height:1}.settings-hero p{max-width:820px;color:#9eafc5;line-height:1.6}.settings-score{display:grid;place-items:center;border:1px solid rgba(135,240,255,.22);border-radius:8px;background:rgba(135,240,255,.07);text-align:center}.settings-score strong{color:#87f0ff;font-size:3.5rem}.settings-score span{color:#c1d2e6;font-weight:900}.settings-actions,.integration-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:18px}.action-panel{display:grid;align-content:start;gap:12px}.action-panel p,.integration-card p{color:#9eafc5;line-height:1.55}.button-row{display:flex;flex-wrap:wrap;gap:10px}.file-action{position:relative;overflow:hidden}.file-action input{position:absolute;inset:0;opacity:0;cursor:pointer}.integration-card{display:grid;gap:12px;padding:18px;border:1px solid rgba(170,198,231,.16);border-radius:8px;background:linear-gradient(180deg,rgba(16,24,39,.94),rgba(11,17,29,.94));box-shadow:0 20px 60px rgba(0,0,0,.28)}.integration-card span{display:inline-flex;width:max-content;padding:6px 8px;border:1px solid rgba(135,240,255,.24);border-radius:8px;background:rgba(13,95,147,.16);color:#87f0ff;font-size:.72rem;font-weight:900;text-transform:uppercase}.integration-card h3{margin:8px 0 0}.integration-card small{color:#c1d2e6;font-weight:850}@media(max-width:1100px){.settings-actions,.integration-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.settings-hero{grid-template-columns:1fr}}@media(max-width:760px){.settings-actions,.integration-grid{grid-template-columns:1fr}.settings-score{min-height:140px}}`;
  document.head.appendChild(style);

  if ((location.hash || "").includes("settings")) renderRoadmap();
})();
