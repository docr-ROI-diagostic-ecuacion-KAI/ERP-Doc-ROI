(function(){
  const VERSION = "20260716-economics-income-1";
  if (globalThis.__docroiEconomicsIncome === VERSION) return;
  globalThis.__docroiEconomicsIncome = VERSION;

  const cfgs = typeof modules !== "undefined" ? modules : (typeof moduleConfig !== "undefined" ? moduleConfig : null);
  if (!cfgs || !globalThis.state) return;

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const moneyFmt = (v) => {
    try { return money.format(Number(v || 0)); }
    catch { return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v || 0)); }
  };
  const dateFmt = (v) => { try { return formatDate(v); } catch { return v || "Sin fecha"; } };

  function insertField(module, field, afterName){
    const fields = cfgs[module]?.fields || [];
    if (!fields.length || fields.some(item => item[0] === field[0])) return;
    const idx = fields.findIndex(item => item[0] === afterName);
    fields.splice(idx >= 0 ? idx + 1 : fields.length, 0, field);
  }

  function normalizeConfig(){
    insertField("institutions", ["paymentTermsDays", "Modalidad de pago", "select", false, ["Inmediata", "30 dias", "60 dias", "90 dias"]], "web");
    insertField("programs", ["retentionRate", "Retencion IRPF (%)", "number"], "hourlyRate");
    (state.institutions || []).forEach(institution => {
      if (institution.paymentTermsDays === undefined || institution.paymentTermsDays === "") institution.paymentTermsDays = "30 dias";
    });
    (state.programs || []).forEach(program => {
      if (program.retentionRate === undefined || program.retentionRate === "") program.retentionRate = 15;
    });
  }

  function overrides(){
    try { return JSON.parse(localStorage.getItem("docroi.economicsOverrides") || "{}"); }
    catch { return {}; }
  }

  function setOverride(programId, key, value){
    const data = overrides();
    data[programId] ||= {};
    data[programId][key] = value;
    localStorage.setItem("docroi.economicsOverrides", JSON.stringify(data));
  }

  function localDate(value){
    if (!value) return null;
    const [y, m, d] = String(value).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function dateKey(date){
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addDays(value, days){
    const date = localDate(value);
    if (!date) return "";
    date.setDate(date.getDate() + Number(days || 0));
    return dateKey(date);
  }

  function paymentDays(value){
    if (typeof value === "number") return value;
    const text = String(value || "").toLowerCase();
    if (text.includes("90")) return 90;
    if (text.includes("60")) return 60;
    if (text.includes("30")) return 30;
    return 0;
  }

  function institutionOf(program){
    return (state.institutions || []).find(item => item.id === program?.institutionId) || {};
  }

  function logo(institution){
    if (institution.logoFileData) return `<img class="economics-logo" src="${institution.logoFileData}" alt="${esc(institution.name)}">`;
    const initials = String(institution.name || "IN").split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();
    return `<div class="economics-logo economics-logo-placeholder">${esc(initials || "IN")}</div>`;
  }

  function programSessions(programId){
    return (state.sessions || [])
      .filter(session => session.programId === programId && session.status !== "Cancelada")
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.startTime || "").localeCompare(String(b.startTime || "")));
  }

  function programEconomics(program){
    const institution = institutionOf(program);
    const override = overrides()[program.id] || {};
    const hours = Number(program.plannedHours || 0);
    const rate = Number(program.hourlyRate || 0);
    const calculatedGross = hours * rate;
    const gross = override.gross !== undefined && override.gross !== "" ? Number(override.gross) : calculatedGross;
    const retentionRate = override.retentionRate !== undefined && override.retentionRate !== "" ? Number(override.retentionRate) : Number(program.retentionRate ?? 15);
    const retentionAmount = gross * (retentionRate / 100);
    const net = gross - retentionAmount;
    const terms = override.paymentTermsDays !== undefined && override.paymentTermsDays !== "" ? paymentDays(override.paymentTermsDays) : paymentDays(institution.paymentTermsDays);
    const plannedCollectionDate = override.plannedCollectionDate || addDays(program.endDate, terms);
    return { institution, sessions: programSessions(program.id), hours, rate, calculatedGross, gross, retentionRate, retentionAmount, net, terms, plannedCollectionDate };
  }

  function totals(rows){
    return rows.reduce((acc, row) => {
      acc.gross += row.gross;
      acc.retentionAmount += row.retentionAmount;
      acc.net += row.net;
      return acc;
    }, { gross: 0, retentionAmount: 0, net: 0 });
  }

  function renderRows(rows){
    return rows.map(row => {
      const program = row.program;
      return `<tr class="economics-main-row" data-program-id="${program.id}">
        <td>${logo(row.institution)}</td>
        <td><strong>${esc(program.name)}</strong><small>${esc(row.institution.name || "Sin institucion")}</small></td>
        <td>${dateFmt(program.startDate)}</td>
        <td>${dateFmt(program.endDate)}</td>
        <td><input class="eco-input" data-eco-field="plannedCollectionDate" data-program-id="${program.id}" type="date" value="${esc(row.plannedCollectionDate)}"></td>
        <td><span>${row.hours} h x ${moneyFmt(row.rate)}</span><input class="eco-input money" data-eco-field="gross" data-program-id="${program.id}" type="number" step="0.01" value="${row.gross}"></td>
        <td><input class="eco-input percent" data-eco-field="retentionRate" data-program-id="${program.id}" type="number" step="0.01" value="${row.retentionRate}"><span>${moneyFmt(row.retentionAmount)}</span></td>
        <td><strong>${moneyFmt(row.net)}</strong></td>
      </tr>
      <tr class="economics-session-row"><td></td><td colspan="7">
        <details>
          <summary>Sesiones para justificar factura (${row.sessions.length})</summary>
          <div class="session-ledger">
            ${row.sessions.map(session => `<span><b>${dateFmt(session.date)}</b>${esc(session.title)}<em>${Number(session.duration || 0)} h - ${esc(session.startTime || "")}${session.endTime ? " - " + esc(session.endTime) : ""}</em></span>`).join("") || "<small>Sin sesiones registradas todavia.</small>"}
          </div>
        </details>
      </td></tr>`;
    }).join("");
  }

  function renderEconomics(){
    normalizeConfig();
    const rows = (state.programs || []).map(program => ({ program, ...programEconomics(program) }));
    const total = totals(rows);
    $("#pageTitle").textContent = "Economics";
    $("#app").innerHTML = `<section class="module-head">
      <div><p class="eyebrow">Ingresos calculados por programa</p><h2>Economics - ingresos</h2></div>
      <button class="btn secondary" id="exportEconomicsIncome" type="button">Exportar CSV</button>
    </section>
    <section class="finance-strip">
      <article><span>Bruto previsto</span><strong>${moneyFmt(total.gross)}</strong></article>
      <article><span>Retenciones</span><strong>${moneyFmt(total.retentionAmount)}</strong></article>
      <article><span>Neto previsto</span><strong>${moneyFmt(total.net)}</strong></article>
      <article><span>Programas</span><strong>${rows.length}</strong></article>
    </section>
    <section class="economics-income-card">
      <div class="table-scroll">
        <table class="economics-income-table">
          <thead><tr><th>Marca</th><th>Programa</th><th>Inicio</th><th>Fin</th><th>Cobro previsto</th><th>Importe bruto</th><th>Retencion</th><th>Neto</th></tr></thead>
          <tbody>${renderRows(rows)}</tbody>
        </table>
      </div>
    </section>`;
  }

  function exportCsv(){
    const rows = (state.programs || []).map(program => ({ program, ...programEconomics(program) }));
    const csv = [
      "institucion,programa,inicio,fin,cobro_previsto,horas,precio_hora,bruto,retencion_pct,retencion_importe,neto",
      ...rows.map(row => [row.institution.name, row.program.name, row.program.startDate, row.program.endDate, row.plannedCollectionDate, row.hours, row.rate, row.gross, row.retentionRate, row.retentionAmount, row.net].map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "docroi-economics-ingresos-programa.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function injectStyles(){
    if (document.getElementById("docroi-economics-income-style")) return;
    const style = document.createElement("style");
    style.id = "docroi-economics-income-style";
    style.textContent = `
      .economics-income-card{padding:16px;border:1px solid rgba(170,198,231,.16);border-radius:8px;background:rgba(11,17,29,.7)}
      .table-scroll{overflow:auto}
      .economics-income-table{width:100%;border-collapse:separate;border-spacing:0 10px;min-width:1050px}
      .economics-income-table th{padding:0 12px 8px;color:#aac6e7;font-size:.78rem;text-align:left;text-transform:uppercase}
      .economics-income-table td{padding:14px 12px;background:rgba(20,29,46,.92);border-top:1px solid rgba(170,198,231,.14);border-bottom:1px solid rgba(170,198,231,.14);vertical-align:middle}
      .economics-income-table td:first-child{border-left:1px solid rgba(170,198,231,.14);border-radius:8px 0 0 8px}
      .economics-income-table td:last-child{border-right:1px solid rgba(170,198,231,.14);border-radius:0 8px 8px 0}
      .economics-income-table strong{display:block;color:#eef5ff}
      .economics-income-table small,.economics-income-table span{display:block;color:#aac6e7;font-weight:800}
      .economics-logo{width:54px;height:54px;border-radius:8px;background:#fff;object-fit:contain}
      .economics-logo-placeholder{display:grid;place-items:center;background:rgba(135,240,255,.12);color:#87f0ff;font-weight:900}
      .eco-input{width:150px;max-width:100%;padding:10px;border:1px solid rgba(170,198,231,.25);border-radius:8px;background:#111a2a;color:#eef5ff;font-weight:900}
      .eco-input.money{width:120px}.eco-input.percent{width:86px;margin-bottom:4px}
      .economics-session-row td{padding:0 12px 12px;background:transparent;border:0}
      .economics-session-row details{padding:12px;border:1px solid rgba(170,198,231,.12);border-radius:8px;background:rgba(8,13,22,.75)}
      .economics-session-row summary{cursor:pointer;color:#87f0ff;font-weight:900}
      .session-ledger{display:grid;gap:8px;margin-top:10px}
      .session-ledger span{display:grid;grid-template-columns:120px minmax(0,1fr) 180px;gap:10px;padding:8px;border-radius:8px;background:rgba(255,255,255,.04)}
      .session-ledger em{color:#aac6e7;font-style:normal;text-align:right}
      @media(max-width:760px){.session-ledger span{grid-template-columns:1fr}.session-ledger em{text-align:left}}
    `;
    document.head.appendChild(style);
  }

  normalizeConfig();
  injectStyles();

  const originalRender = typeof render === "function" ? render : null;
  if (originalRender && !globalThis.__docroiEconomicsIncomeRenderPatched) {
    globalThis.__docroiEconomicsIncomeRenderPatched = true;
    render = function(){
      originalRender();
      const route = location.hash.replace("#", "").split("?")[0] || "dashboard";
      if (route === "economics") renderEconomics();
    };
  }

  const originalModuleView = typeof moduleView === "function" ? moduleView : null;
  if (originalModuleView && !globalThis.__docroiEconomicsIncomeModulePatched) {
    globalThis.__docroiEconomicsIncomeModulePatched = true;
    moduleView = function(module){
      if (module === "economics") { renderEconomics(); return; }
      originalModuleView(module);
    };
  }

  document.addEventListener("change", event => {
    const input = event.target.closest("[data-eco-field][data-program-id]");
    if (!input) return;
    setOverride(input.dataset.programId, input.dataset.ecoField, input.value);
    renderEconomics();
  }, true);

  document.addEventListener("click", event => {
    if (event.target.id === "exportEconomicsIncome") exportCsv();
  }, true);

  try {
    if ((location.hash.replace("#", "").split("?")[0] || "dashboard") === "economics") renderEconomics();
  } catch {}
})();