// ═══════════════ CONFIG ═══════════════
const STATI = ['freddo','contattato','trattativa','offerta','cliente','perso'];
const STATO_COLORS = {
  freddo:'bg-slate-100 text-slate-600',
  contattato:'bg-blue-100 text-blue-700',
  trattativa:'bg-amber-100 text-amber-700',
  offerta:'bg-orange-100 text-orange-700',
  cliente:'bg-eco-100 text-eco-700',
  perso:'bg-red-100 text-red-600'
};
const TIPO_AZIENDA_COLORS = {
  metalli:                'bg-slate-200 text-slate-700',
  meccanica:              'bg-blue-100 text-blue-700',
  legno:                  'bg-amber-100 text-amber-800',
  chimica:                'bg-cyan-100 text-cyan-700',
  navale:                 'bg-sky-100 text-sky-700',
  militare:               'bg-gray-200 text-gray-700',
  alimentare:             'bg-lime-100 text-lime-700',
  plastica:               'bg-violet-100 text-violet-700',
  recycling:              'bg-emerald-100 text-emerald-700',
  biomassa:               'bg-green-100 text-green-700',
  essiccazione:           'bg-orange-100 text-orange-700',
  manutenzione:           'bg-yellow-100 text-yellow-700',
  impiantista:            'bg-blue-100 text-blue-700',
  biogas:                 'bg-teal-100 text-teal-700',
  edilizia:               'bg-stone-100 text-stone-700',
  impiantista_industriale:'bg-indigo-100 text-indigo-700',
  engineering:            'bg-purple-100 text-purple-700',
  rivenditore:            'bg-amber-100 text-amber-700',
  altro:                  'bg-slate-100 text-slate-600',
};
const TIPO_LABELS = {
  metalli:'Metalli', meccanica:'Meccanica', legno:'Legno', chimica:'Chimica',
  navale:'Navale', militare:'Militare', alimentare:'Alimentare', plastica:'Plastica',
  recycling:'Recycling', biomassa:'Biomassa', essiccazione:'Essiccazione',
  manutenzione:'Manutenzione', impiantista:'Impiantista', biogas:'Biogas',
  edilizia:'Edilizia', impiantista_industriale:'Imp. Industriale',
  engineering:'Engineering', rivenditore:'Rivenditore', altro:'Altro',
};
const TIPO_ATT_ICONS = {
  chiamata:'📞', email:'✉️', visita:'🏢', offerta:'📄'
};
const ETICHETTA_COLORS = {
  rosso:'#ef4444', giallo:'#f59e0b', verde:'#22c55e',
  viola:'#8b5cf6', nero:'#1e293b', blu:'#3b82f6',
};
const ETICHETTA_LABELS = {
  rosso:'Non contattare', giallo:'In trattativa', verde:'Cliente',
  viola:'Interessante', nero:'Persa', blu:'Da valutare',
};

let oppChart = null;
let csvFile = null;
let csvColumns = [];
let modalCtx = {};  // { type, id, onSave }
let confirmFn = null;

// ═══════════════ API HELPERS ═══════════════
const API = {
  async req(method, url, body){
    const opts = { method, headers:{} };
    if(body && !(body instanceof FormData)){
      opts.headers['Content-Type']='application/json';
      opts.body = JSON.stringify(body);
    } else if(body){
      opts.body = body;
    }
    const r = await fetch(url, opts);
    if(!r.ok){
      let msg;
      try{ msg = (await r.json()).detail || r.statusText; }
      catch{ msg = r.statusText; }
      throw new Error(msg);
    }
    return r.json();
  },
  get:  (u)    => API.req('GET',u),
  post: (u,b)  => API.req('POST',u,b),
  put:  (u,b)  => API.req('PUT',u,b),
  patch:(u,b)  => API.req('PATCH',u,b),
  del:  (u)    => API.req('DELETE',u),
};

// ═══════════════ TOAST ═══════════════
function toast(msg, type='success'){
  const el = document.createElement('div');
  el.className = `toast-anim px-5 py-3 rounded-lg text-white text-sm font-medium shadow-lg ${type==='success'?'bg-eco-600':'bg-red-600'}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(()=>el.remove(), 3000);
}

// ═══════════════ NAVIGATION ═══════════════
function navigate(view){
  document.querySelectorAll('.nav-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach(el=>{
    el.classList.toggle('active', el.id === `view-${view}`);
  });
  const labels = {dashboard:'Cruscotto',aziende:'Aziende',contatti:'Contatti',pipeline:'Pipeline',attivita:'Attività',import:'Import CSV'};
  document.getElementById('breadcrumb').textContent = labels[view] || view;
  loadView(view);
}

async function loadView(view){
  try{
    switch(view){
      case 'dashboard': await loadDashboard(); break;
      case 'aziende':   await Promise.all([loadAziende(), loadAziendeDropdowns()]); break;
      case 'contatti':  await loadContatti();  break;
      case 'pipeline':  await loadPipeline();  break;
      case 'attivita':  await loadAttivita();  break;
    }
  } catch(e){ toast('Errore caricamento: '+e.message,'error'); }
}

// ═══════════════ ETICHETTE ═══════════════

function _etichettaPaletteHTML(current){
  const noneActive = !current;
  const noneShadow = noneActive ? 'box-shadow:0 0 0 2px white,0 0 0 4px #94a3b8;' : '';
  let html = `<label class="label">Etichetta</label>
    <div class="flex items-center gap-2 mt-1.5">
      <button type="button" data-et="" class="modal-et-btn w-8 h-8 rounded-full border-2 flex items-center justify-center text-slate-400 bg-slate-100 border-slate-200 hover:border-slate-400 transition-all" style="${noneShadow}" onclick="selectModalEtichetta('')">✕</button>`;
  for(const [c, col] of Object.entries(ETICHETTA_COLORS)){
    const sel = current===c;
    const shadow = sel ? `box-shadow:0 0 0 2px white,0 0 0 4px ${col};` : '';
    const check  = sel ? `<span style="color:white;font-size:13px;font-weight:700;line-height:1">✓</span>` : '';
    html += `<button type="button" data-et="${c}" class="modal-et-btn w-8 h-8 rounded-full border-2 border-transparent hover:opacity-75 transition-all flex items-center justify-center" style="background:${col};${shadow}" onclick="selectModalEtichetta('${c}')" title="${ETICHETTA_LABELS[c]||c}">${check}</button>`;
  }
  html += `</div><input type="hidden" id="f-etichetta" value="${current||''}" />`;
  return html;
}

function selectModalEtichetta(val){
  document.getElementById('f-etichetta').value = val||'';
  document.querySelectorAll('.modal-et-btn').forEach(btn=>{
    const bval = btn.dataset.et||'';
    const isSelected = bval === (val||'');
    if(isSelected){
      const color = ETICHETTA_COLORS[val]||'#94a3b8';
      btn.style.boxShadow = `0 0 0 2px white, 0 0 0 4px ${color}`;
      btn.innerHTML = val ? `<span style="color:white;font-size:13px;font-weight:700;line-height:1">✓</span>` : '✕';
    } else {
      btn.style.boxShadow = '';
      btn.innerHTML = bval ? '' : '✕';
    }
  });
}

function setAzEtichettaFilter(val){
  azEtichettaFilter = val;
  document.querySelectorAll('.az-et-btn').forEach(btn=>{ btn.style.boxShadow=''; });
  const active = [...document.querySelectorAll('.az-et-btn')].find(b=>(b.dataset.et||'')===val);
  if(active){
    const color = ETICHETTA_COLORS[val]||'#94a3b8';
    active.style.boxShadow = `0 0 0 2px white, 0 0 0 4px ${color}`;
  }
  azPage=1; loadAziende();
}

function toggleLegendaAz(){
  const el = document.getElementById('legenda-az');
  const arrow = document.getElementById('legenda-az-arrow');
  const open = el.classList.toggle('hidden');
  arrow.textContent = open ? '▶' : '▼';
}

// ═══════════════ DASHBOARD ═══════════════
async function loadDashboard(){
  const kpi = await API.get('/api/dashboard/kpi');

  document.getElementById('kpi-aziende').textContent = kpi.total_aziende;
  document.getElementById('kpi-clienti').textContent = kpi.clienti_attivi;
  document.getElementById('kpi-opp').textContent     = kpi.opp_in_corso;
  document.getElementById('kpi-valore').textContent  = formatEuro(kpi.valore_pipeline);

  // Chart
  const labels = STATI.map(s=>s.charAt(0).toUpperCase()+s.slice(1));
  const values = STATI.map(s=>kpi.opp_per_stato[s]||0);
  const colors = ['#94a3b8','#3b82f6','#f59e0b','#f97316','#22c55e','#ef4444'];

  if(oppChart) oppChart.destroy();
  const ctx = document.getElementById('opp-chart').getContext('2d');
  oppChart = new Chart(ctx,{
    type:'bar',
    data:{ labels, datasets:[{ data:values, backgroundColor:colors, borderRadius:6, borderSkipped:false }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{ y:{beginAtZero:true, ticks:{stepSize:1}, grid:{color:'#f1f5f9'}}, x:{grid:{display:false}} }
    }
  });

  // Recent activities
  const el = document.getElementById('attivita-recenti');
  el.innerHTML = kpi.attivita_recenti.length
    ? kpi.attivita_recenti.map(a=>`
        <div class="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
          <span class="text-base flex-shrink-0">${TIPO_ATT_ICONS[a.tipo]||'•'}</span>
          <div class="min-w-0">
            <div class="text-xs font-medium text-slate-700 truncate">${esc(a.azienda_nome||'—')}</div>
            <div class="text-xs text-slate-400">${fmtDate(a.data)} · ${esc(a.tipo)}</div>
          </div>
        </div>`).join('')
    : '<div class="text-sm text-slate-400">Nessuna attività recente</div>';

  // Populate filter dropdowns with values from DB
  populateSelect('az-provincia', kpi.province, 'Tutte');
  populateSelect('az-regione',   kpi.regioni,  'Tutte');

  // Populate province regione filter
  populateSelect('prov-regione-filter', kpi.regioni, 'Tutte le regioni');

  // Load province stats
  await loadProvince();
  await loadFollowupScaduti();
}

// ═══════════════ FOLLOW-UP SCADUTI ═══════════════
async function loadFollowupScaduti(){
  const list = await API.get('/api/dashboard/followup-scaduti');

  const navBadge = document.getElementById('nav-dashboard-badge');
  if(navBadge){
    navBadge.textContent = list.length || '';
    navBadge.classList.toggle('hidden', list.length === 0);
  }

  const badge = document.getElementById('followup-count-badge');
  if(badge){
    badge.textContent = list.length;
    badge.classList.toggle('hidden', list.length === 0);
  }

  const container = document.getElementById('followup-list');
  if(!container) return;

  if(!list.length){
    container.innerHTML = '<p class="text-sm text-eco-600 flex items-center gap-1.5"><svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Nessun follow-up in scadenza</p>';
    return;
  }

  const todayISO = new Date().toISOString().slice(0,10);
  container.innerHTML = list.map(o=>{
    const d = o.prossimo_followup;
    const isPast  = d < todayISO;
    const isToday = d === todayISO;
    const dateCls = isPast ? 'text-red-600 font-semibold' : isToday ? 'text-amber-600 font-semibold' : 'text-slate-500';
    return `
      <div class="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-800">${esc(o.azienda_nome||'—')}</div>
          <div class="text-xs text-slate-500 truncate">${esc(o.titolo)}</div>
        </div>
        <span class="text-xs whitespace-nowrap ${dateCls}">${fmtDate(d)}</span>
        <button onclick="openLogChiamata(${o.id_azienda})" class="flex-shrink-0 text-xs bg-eco-50 text-eco-700 hover:bg-eco-100 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">📞 Chiama</button>
      </div>`;
  }).join('');
}

// ═══════════════ AZIENDE ═══════════════
let aziendeData = [];
let selectedAziende = new Set();
let azPage = 1;
let azPageSize = 50;
let azTotal = 0;
let azEtichettaFilter = '';

function _buildAzParams(){
  const params = new URLSearchParams();
  const s = document.getElementById('az-search').value;
  const p = document.getElementById('az-provincia').value;
  const r = document.getElementById('az-regione').value;
  const t = document.getElementById('az-tipo').value;
  const fl = document.getElementById('az-fonte_lead').value;
  if(s) params.set('search',s);
  if(p) params.set('provincia',p);
  if(r) params.set('regione',r);
  if(t) params.set('tipo',t);
  if(fl) params.set('fonte_lead',fl);
  if(azEtichettaFilter) params.set('etichetta',azEtichettaFilter);
  return params;
}

async function loadAziende(page){
  if(page !== undefined) azPage = page;
  const params = _buildAzParams();
  params.set('skip', (azPage-1)*azPageSize);
  params.set('limit', azPageSize);
  const res = await API.get('/api/aziende?'+params);
  azTotal = res.total;
  aziendeData = res.data;
  selectedAziende.clear();
  updateAzBatchBar();
  renderAziende(aziendeData);
  renderAzPagination();
}

function loadAziendeDropdowns(){ /* replaced by autocomplete */ }

function renderAzPagination(){
  const totalPages = Math.ceil(azTotal / azPageSize);
  const from = azTotal === 0 ? 0 : (azPage-1)*azPageSize + 1;
  const to = Math.min(azPage*azPageSize, azTotal);
  document.getElementById('az-page-info').textContent =
    azTotal === 0 ? 'Nessun risultato' : `${from}–${to} di ${azTotal} lead`;

  // Keep page size select in sync
  const psel = document.getElementById('az-page-size');
  if(psel) psel.value = String(azPageSize);

  const container = document.getElementById('az-pagination');
  if(!container) return;
  if(totalPages <= 1){ container.innerHTML=''; return; }

  const btnCls = (active, disabled) =>
    'px-2.5 py-1 text-xs rounded border transition-colors ' +
    (active   ? 'bg-eco-600 text-white border-eco-600 font-semibold' :
     disabled ? 'text-slate-300 border-slate-100 cursor-not-allowed' :
                'text-slate-600 border-slate-200 hover:bg-slate-50');

  const btn = (label, targetPage, disabled, active=false) =>
    `<button class="${btnCls(active,disabled)}" ${disabled?'disabled':''} ${!disabled?`onclick="loadAziende(${targetPage})"`:''}>${label}</button>`;

  // Page numbers: always show 1, last, current-1…current+1 with ellipsis
  const show = new Set([1, totalPages, azPage-1, azPage, azPage+1].filter(p=>p>=1&&p<=totalPages));
  const sorted = [...show].sort((a,b)=>a-b);
  let nums = '';
  let prev = 0;
  for(const p of sorted){
    if(p > prev+1) nums += `<span class="px-1 text-slate-300 text-xs select-none">…</span>`;
    nums += btn(p, p, false, p===azPage);
    prev = p;
  }

  container.innerHTML =
    btn('«', 1,          azPage===1,         false) +
    btn('‹', azPage-1,   azPage===1,         false) +
    nums +
    btn('›', azPage+1,   azPage===totalPages, false) +
    btn('»', totalPages, azPage===totalPages, false);
}

function azChangePageSize(val){
  azPageSize = parseInt(val);
  azPage = 1;
  loadAziende();
}

function renderAziende(list){
  const tbody = document.getElementById('aziende-tbody');
  const empty = document.getElementById('aziende-empty');
  const selAll = document.getElementById('az-select-all');
  if(!list.length){ tbody.innerHTML=''; empty.classList.remove('hidden'); if(selAll){selAll.checked=false;selAll.indeterminate=false;} return; }
  empty.classList.add('hidden');
  if(selAll){ selAll.checked=false; selAll.indeterminate=false; }
  tbody.innerHTML = list.map(a=>`
    <tr class="tr-row">
      <td class="p-0" style="width:4px;min-width:4px;background-color:${ETICHETTA_COLORS[a.etichetta]||'transparent'}"></td>
      <td class="td text-center w-10"><input type="checkbox" class="az-row-cb cursor-pointer rounded" data-id="${a.id}" onchange="toggleAziendaSelection(${a.id},this.checked)" ${selectedAziende.has(a.id)?'checked':''}></td>
      <td class="td"><button onclick="openAziendaScheda(${a.id})" class="font-medium text-left hover:text-eco-700 hover:underline transition-colors">${esc(a.ragione_sociale)}</button></td>
      <td class="td text-slate-500">${esc(a.partita_iva||'—')}</td>
      <td class="td">${esc(a.citta||'—')}</td>
      <td class="td"><span class="font-mono text-xs">${esc(a.provincia||'—')}</span></td>
      <td class="td"><span class="badge ${TIPO_AZIENDA_COLORS[a.tipo]||'bg-slate-100 text-slate-600'}">${esc(TIPO_LABELS[a.tipo]||a.tipo||'—')}</span></td>
      <td class="td">${a.telefono_aziendale?`<a href="tel:${esc(a.telefono_aziendale)}" class="text-eco-700 hover:underline">${esc(a.telefono_aziendale)}</a>`:'—'}</td>
      <td class="td">${a.email_aziendale?`<a href="mailto:${esc(a.email_aziendale)}" class="text-eco-700 hover:underline">${esc(a.email_aziendale)}</a>`:'—'}</td>
      <td class="td text-center">${a.website?`<a href="${esc(a.website)}" target="_blank" rel="noopener" title="${esc(a.website)}" class="inline-flex items-center text-eco-600 hover:text-eco-800"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></a>`:'—'}</td>
      <td class="td text-center text-slate-400">${a.n_contatti}</td>
      <td class="td text-center text-slate-400">${a.n_opportunita}</td>
      <td class="td text-center">${a.ordine?'<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs font-bold" title="Ha ordinato">✓</span>':'<span class="text-slate-300 text-xs">—</span>'}</td>
      <td class="td text-right whitespace-nowrap">
        <button onclick="openLogChiamata(${a.id})" class="icon-btn" title="Log chiamata">📞</button>
        <button onclick="emailAzienda(${a.id})" class="icon-btn" title="Invia email">✉️</button>
        <button onclick="openAziendaModal(${a.id})" class="icon-btn" title="Modifica">✏️</button>
        <button onclick="confirmDeleteById('azienda',${a.id})" class="icon-btn" title="Elimina">🗑️</button>
      </td>
    </tr>`).join('');
}

function applyAzFilter(){ azPage=1; loadAziende(); }
function resetAzFilter(){
  ['az-search','az-provincia','az-regione','az-tipo','az-fonte_lead'].forEach(id=>{
    document.getElementById(id).value='';
  });
  azEtichettaFilter='';
  document.querySelectorAll('.az-et-btn').forEach(b=>b.style.boxShadow='');
  azPage=1; loadAziende();
}

async function openAziendaModal(id=null){
  const isEdit = id !== null;
  let data = {};
  if(isEdit) data = await API.get(`/api/aziende/${id}`);

  document.getElementById('modal-title').textContent = isEdit ? 'Modifica Azienda' : 'Nuova Azienda';
  document.getElementById('modal-body').innerHTML = `
    <div class="grid grid-cols-1 gap-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="label">Ragione Sociale *</label>
          <input id="f-ragione_sociale" class="input" value="${esc(data.ragione_sociale||'')}" placeholder="Es. Acme Impianti S.r.l." ${!isEdit ? 'oninput="_debouncedCheckDup()"' : ''} />
          <div id="dup-banner" class="hidden mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            ⚠️ Aziende simili già presenti: <span id="dup-list"></span>
            <button class="ml-2 underline text-amber-700 hover:text-amber-900" onclick="document.getElementById('dup-banner').classList.add('hidden')">Ignora</button>
          </div>
        </div>
        <div>
          <label class="label">Partita IVA</label>
          <input id="f-partita_iva" class="input" value="${esc(data.partita_iva||'')}" placeholder="12345678901" maxlength="11" />
        </div>
        <div>
          <label class="label">Tipo *</label>
          <select id="f-tipo" class="input">
            <option value="">— Seleziona —</option>
            ${[['metalli','Metalli'],['meccanica','Meccanica'],['legno','Legno'],['chimica','Chimica'],['navale','Navale'],['militare','Militare'],['alimentare','Alimentare'],['plastica','Plastica'],['recycling','Recycling'],['biomassa','Biomassa'],['essiccazione','Essiccazione'],['manutenzione','Manutenzione'],['impiantista','Impiantista'],['biogas','Biogas'],['edilizia','Edilizia'],['impiantista_industriale','Imp. Industriale'],['engineering','Engineering'],['rivenditore','Rivenditore'],['altro','Altro']].map(([v,l])=>`<option value="${v}" ${data.tipo===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">Indirizzo</label>
          <input id="f-indirizzo" class="input" value="${esc(data.indirizzo||'')}" placeholder="Via Roma 1" />
        </div>
        <div>
          <label class="label">Città</label>
          <input id="f-citta" class="input" value="${esc(data.citta||'')}" placeholder="Trento" />
        </div>
        <div>
          <label class="label">Provincia</label>
          <input id="f-provincia" class="input" value="${esc(data.provincia||'')}" placeholder="TN" maxlength="2" style="text-transform:uppercase" />
        </div>
        <div>
          <label class="label">Regione</label>
          <input id="f-regione" class="input" value="${esc(data.regione||'')}" placeholder="Trentino-Alto Adige" />
        </div>
        <div>
          <label class="label">Codice ATECO</label>
          <input id="f-codice_ateco" class="input" value="${esc(data.codice_ateco||'')}" placeholder="28.29.09" />
        </div>
        <div>
          <label class="label">Telefono Aziendale</label>
          <input id="f-telefono_aziendale" class="input" type="tel" value="${esc(data.telefono_aziendale||'')}" placeholder="+39 0461 000000" />
        </div>
        <div>
          <label class="label">Email Aziendale</label>
          <input id="f-email_aziendale" class="input" type="email" value="${esc(data.email_aziendale||'')}" placeholder="info@azienda.it" />
        </div>
        <div>
          <label class="label">Fonte Lead</label>
          <select id="f-fonte_lead" class="input">
            <option value="">— Seleziona —</option>
            ${['Sito','Spider','Fiera','Passaparola','Altro'].map(v=>`<option value="${v}" ${data.fonte_lead===v?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="col-span-2">
          <label class="label">Attività / Descrizione Settore</label>
          <input id="f-attivita_descrizione" class="input" value="${esc(data.attivita_descrizione||'')}" placeholder="Es. Filtrazione Aria / Impianti verniciatura" />
        </div>
        <div>
          <label class="label">Prodotto / Interesse</label>
          <input id="f-prodotto_interesse" class="input" value="${esc(data.prodotto_interesse||'')}" placeholder="Es. Tuberia e Filtro" />
        </div>
        <div>
          <label class="label">Commessa (€)</label>
          <input id="f-commessa_euro" class="input" type="number" min="0" step="100" value="${data.commessa_euro||''}" placeholder="0" />
        </div>
        <div class="col-span-2 flex items-center gap-3 py-1 border-t border-slate-100 mt-1 pt-3">
          <input id="f-ordine" type="checkbox" class="w-4 h-4 cursor-pointer rounded accent-green-600" ${data.ordine?'checked':''} />
          <label for="f-ordine" class="text-sm font-medium text-slate-700 cursor-pointer select-none">Ha già effettuato un ordine</label>
        </div>
        <div class="col-span-2">
          <label class="label">Sito Web</label>
          <input id="f-website" class="input" type="url" value="${esc(data.website||'')}" placeholder="https://www.esempio.it" />
        </div>
        <div class="col-span-2">
          ${_etichettaPaletteHTML(data.etichetta||null)}
        </div>
        <div class="col-span-2">
          <label class="label">Note</label>
          <textarea id="f-note" class="input h-20 resize-none" placeholder="Note libere…">${esc(data.note||'')}</textarea>
        </div>
      </div>
    </div>`;

  modalCtx = {
    type: 'azienda', id,
    async onSave(){
      const payload = {
        ragione_sociale:      gv('f-ragione_sociale'),
        partita_iva:          gv('f-partita_iva')||null,
        indirizzo:            gv('f-indirizzo')||null,
        citta:                gv('f-citta')||null,
        provincia:            (gv('f-provincia')||'').toUpperCase()||null,
        regione:              gv('f-regione')||null,
        codice_ateco:         gv('f-codice_ateco')||null,
        tipo:                 gv('f-tipo')||null,
        telefono_aziendale:   gv('f-telefono_aziendale')||null,
        email_aziendale:      gv('f-email_aziendale')||null,
        website:              gv('f-website')||null,
        note:                 gv('f-note')||null,
        attivita_descrizione: gv('f-attivita_descrizione')||null,
        prodotto_interesse:   gv('f-prodotto_interesse')||null,
        fonte_lead:           gv('f-fonte_lead')||null,
        ordine:               document.getElementById('f-ordine').checked,
        commessa_euro:        parseFloat(gv('f-commessa_euro'))||null,
        etichetta:            gv('f-etichetta')||null,
      };
      if(!payload.ragione_sociale){ toast('Ragione sociale obbligatoria','error'); return false; }
      if(isEdit) await API.put(`/api/aziende/${id}`, payload);
      else await API.post('/api/aziende', payload);
      return true;
    }
  };
  showModal();
}

async function saveModal(){
  try{
    const ok = await modalCtx.onSave();
    if(ok === false) return;
    hideModal();
    toast(modalCtx.id ? 'Aggiornato con successo' : 'Creato con successo');
    loadView(getCurrentView());
  }catch(e){ toast(e.message,'error'); }
}

async function deleteAzienda(id){
  await API.del(`/api/aziende/${id}`);
  toast('Azienda eliminata');
  loadAziende(); loadAziendeDropdowns();
}

// ═══════════════ SCHEDA AZIENDA (sola lettura) ═══════════════

function closeSchedaBack(){
  hideScheda();
  navigate('aziende');
}

async function openAziendaScheda(id){
  const [az, contatti, opps] = await Promise.all([
    API.get(`/api/aziende/${id}`),
    API.get(`/api/contatti?id_azienda=${id}`),
    API.get(`/api/opportunita?id_azienda=${id}&limit=100`),
  ]);
  document.getElementById('scheda-content').innerHTML = buildSchedaHTML(az, contatti, opps);
  document.getElementById('scheda-close-btn').onclick = closeSchedaBack;
  document.getElementById('scheda-edit-btn').onclick = ()=>{ hideScheda(); openAziendaModal(id); };
  document.getElementById('scheda-chiamata-btn').onclick = ()=>{ hideScheda(); _logChiamataAzId=id; document.getElementById('log-chiamata-az').textContent=az.ragione_sociale; document.getElementById('log-chiamata-esito').value=''; document.getElementById('log-chiamata-followup').value=''; document.getElementById('log-chiamata-overlay').classList.remove('hidden'); };
  document.getElementById('scheda-email-btn').onclick = ()=>emailGenerico(az.email_aziendale, az.ragione_sociale);
  document.getElementById('scheda-overlay').classList.remove('hidden');
}

function hideScheda(){
  document.getElementById('scheda-overlay').classList.add('hidden');
}

function closeScheda(e){
  if(e.target.id==='scheda-overlay') hideScheda();
}

function buildSchedaHTML(az, contatti, opps){
  const tipoBadge = az.tipo
    ? `<span class="badge ${TIPO_AZIENDA_COLORS[az.tipo]||'bg-slate-100 text-slate-600'}">${esc(TIPO_LABELS[az.tipo]||az.tipo)}</span>` : '';
  const ordineBadge = az.ordine
    ? '<span class="badge bg-green-100 text-green-700">✓ Ha ordinato</span>' : '';
  const fonteBadge = az.fonte_lead
    ? `<span class="badge bg-sky-50 text-sky-600">${esc(az.fonte_lead)}</span>` : '';
  const etichettaBadge = az.etichetta
    ? `<span class="badge" style="background:${ETICHETTA_COLORS[az.etichetta]}18;color:${ETICHETTA_COLORS[az.etichetta]};border:1px solid ${ETICHETTA_COLORS[az.etichetta]}40">● ${esc(ETICHETTA_LABELS[az.etichetta]||az.etichetta)}</span>` : '';

  // Dati azienda: coppie [label, HTML-value]
  const campi = [
    ['P.IVA',               az.partita_iva],
    ['Indirizzo',           az.indirizzo],
    ['Città',              az.citta],
    ['Provincia',          az.provincia ? `<span class="font-mono">${esc(az.provincia)}</span>` : null],
    ['Regione',            az.regione],
    ['Cod. ATECO',         az.codice_ateco],
    ['Attività',           az.attivita_descrizione],
    ['Prodotto/Interesse', az.prodotto_interesse],
    ['Commessa',           az.commessa_euro ? `<span class="font-semibold text-eco-700">${formatEuro(az.commessa_euro)}</span>` : null],
    ['Telefono',           az.telefono_aziendale ? `<a href="tel:${esc(az.telefono_aziendale)}" class="text-eco-700 hover:underline">${esc(az.telefono_aziendale)}</a>` : null],
    ['Email',              az.email_aziendale ? `<a href="mailto:${esc(az.email_aziendale)}" class="text-eco-700 hover:underline">${esc(az.email_aziendale)}</a>` : null],
    ['Sito Web',           az.website ? `<a href="${esc(az.website)}" target="_blank" rel="noopener" class="text-eco-700 hover:underline break-all">${esc(az.website)}</a>` : null],
  ].filter(([,v])=>v!=null && v!=='');

  const datiHTML = campi.map(([label, val])=>`
    <div class="flex gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <span class="text-xs text-slate-400 font-medium uppercase tracking-wide w-36 flex-shrink-0 pt-0.5">${esc(label)}</span>
      <span class="text-sm text-slate-800 flex-1">${typeof val==='string'&&!val.startsWith('<')?esc(val):val}</span>
    </div>`).join('');

  // Contatti
  const contHTML = contatti.length ? contatti.map(c=>`
    <div class="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">${esc((c.nome||'?')[0].toUpperCase()+(c.cognome||'')[0]||'')}</div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-slate-800">${esc(c.nome)} ${esc(c.cognome)}</div>
        ${c.ruolo?`<div class="text-xs text-slate-500 mb-0.5">${esc(c.ruolo)}</div>`:''}
        <div class="flex flex-wrap gap-3">
          ${c.telefono?`<a href="tel:${esc(c.telefono)}" class="text-xs text-eco-700 hover:underline">${esc(c.telefono)}</a>`:''}
          ${c.email?`<a href="mailto:${esc(c.email)}" class="text-xs text-eco-700 hover:underline">${esc(c.email)}</a>`:''}
        </div>
      </div>
    </div>`).join('')
    : '<p class="text-sm text-slate-400 py-1">Nessun contatto collegato</p>';

  // Opportunità
  const oppHTML = opps.length ? opps.map(o=>`
    <div class="py-2.5 border-b border-slate-50 last:border-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm font-medium text-slate-800">${esc(o.titolo)}</span>
        <span class="badge ${STATO_COLORS[o.stato]||'bg-slate-100 text-slate-600'}">${esc(o.stato)}</span>
        ${o.valore_stimato?`<span class="text-xs font-semibold text-eco-700">${formatEuro(o.valore_stimato)}</span>`:''}
        ${o.data_ultimo_contatto?`<span class="text-xs text-slate-400">${fmtDate(o.data_ultimo_contatto)}</span>`:''}
      </div>
      ${o.note?`<p class="text-xs text-slate-500 mt-1 line-clamp-2">${esc(o.note)}</p>`:''}
    </div>`).join('')
    : '<p class="text-sm text-slate-400 py-1">Nessuna opportunità collegata</p>';

  const noteHTML = az.note ? `
    <div>
      <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Note</h3>
      <p class="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">${esc(az.note)}</p>
    </div>` : '';

  return `
    <div class="px-6 pt-6 pb-5 border-b border-slate-100">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold text-slate-800 leading-tight">${esc(az.ragione_sociale)}</h2>
          <div class="flex flex-wrap items-center gap-2 mt-2">${etichettaBadge}${tipoBadge}${ordineBadge}${fonteBadge}</div>
        </div>
        <button onclick="closeSchedaBack()" class="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 mt-1 p-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
    <div class="px-6 py-5 space-y-6">
      <div>
        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dati Azienda</h3>
        <div>${datiHTML||'<p class="text-sm text-slate-400">—</p>'}</div>
      </div>
      <div>
        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contatti collegati <span class="text-slate-400 font-normal normal-case">(${contatti.length})</span></h3>
        ${contHTML}
      </div>
      <div>
        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Opportunità collegate <span class="text-slate-400 font-normal normal-case">(${opps.length})</span></h3>
        ${oppHTML}
      </div>
      ${noteHTML}
    </div>`;
}

function toggleSelectAllAziende(checked){
  if(checked) aziendeData.forEach(a=>selectedAziende.add(a.id));
  else aziendeData.forEach(a=>selectedAziende.delete(a.id));
  document.querySelectorAll('.az-row-cb').forEach(cb=>cb.checked=checked);
  updateAzBatchBar();
}

function toggleAziendaSelection(id, checked){
  if(checked) selectedAziende.add(id);
  else selectedAziende.delete(id);
  const visible = aziendeData.map(a=>a.id);
  const nSel = visible.filter(i=>selectedAziende.has(i)).length;
  const selAll = document.getElementById('az-select-all');
  if(selAll){
    selAll.checked = nSel === visible.length && visible.length > 0;
    selAll.indeterminate = nSel > 0 && nSel < visible.length;
  }
  updateAzBatchBar();
}

function updateAzBatchBar(){
  const n = selectedAziende.size;
  const bar = document.getElementById('az-batch-bar');
  if(!bar) return;
  document.getElementById('az-batch-n').textContent = n;
  document.getElementById('az-batch-n2').textContent = n;
  if(n > 0) bar.classList.remove('hidden');
  else bar.classList.add('hidden');
}

function confirmBatchDeleteAziende(){
  const n = selectedAziende.size;
  if(!n) return;
  const label = n === 1 ? '1 azienda selezionata' : `${n} aziende selezionate`;
  confirmDelete(
    `Eliminare ${label}? L'operazione non è reversibile.`,
    batchDeleteAziende
  );
}

async function batchDeleteAziende(){
  const ids = Array.from(selectedAziende);
  await API.req('DELETE', '/api/aziende/batch', { ids });
  const n = ids.length;
  selectedAziende.clear();
  updateAzBatchBar();
  toast(`${n} aziend${n===1?'a eliminata':'e eliminate'}`);
  loadAziende(); loadAziendeDropdowns();
}

// ═══════════════ SCHEDA CONTATTO (sola lettura) ═══════════════

async function openContattoScheda(id){
  const [ct, opps] = await Promise.all([
    API.get(`/api/contatti/${id}`),
    API.get(`/api/opportunita?id_contatto=${id}&limit=100`),
  ]);
  document.getElementById('scheda-ct-content').innerHTML = buildSchedaContattoHTML(ct, opps);
  document.getElementById('scheda-ct-edit-btn').onclick = ()=>{ hideSchedaContatto(); openContattoModal(id); };
  document.getElementById('scheda-ct-email-btn').onclick = ()=>emailGenerico(ct.email, ct.azienda_nome || `${ct.nome} ${ct.cognome}`);
  document.getElementById('scheda-ct-overlay').classList.remove('hidden');
}

function hideSchedaContatto(){
  document.getElementById('scheda-ct-overlay').classList.add('hidden');
}

function closeSchedaContatto(e){
  if(e.target.id==='scheda-ct-overlay') hideSchedaContatto();
}

function buildSchedaContattoHTML(ct, opps){
  const initials = (ct.nome||'?')[0].toUpperCase() + (ct.cognome||'?')[0].toUpperCase();
  const oppHTML = opps.length ? opps.map(o=>`
    <div class="py-2.5 border-b border-slate-50 last:border-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm font-medium text-slate-800">${esc(o.titolo)}</span>
        <span class="badge ${STATO_COLORS[o.stato]||'bg-slate-100 text-slate-600'}">${esc(o.stato)}</span>
        ${o.valore_stimato?`<span class="text-xs font-semibold text-eco-700">${formatEuro(o.valore_stimato)}</span>`:''}
        ${o.prossimo_followup?`<span class="text-xs text-slate-400">Follow-up: ${fmtDate(o.prossimo_followup)}</span>`:''}
      </div>
      ${o.note?`<p class="text-xs text-slate-500 mt-1 line-clamp-2">${esc(o.note)}</p>`:''}
    </div>`).join('')
    : '<p class="text-sm text-slate-400 py-1">Nessuna opportunità collegata</p>';

  const noteHTML = ct.note ? `
    <div>
      <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Note</h3>
      <p class="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">${esc(ct.note)}</p>
    </div>` : '';

  return `
    <div class="px-6 pt-6 pb-5 border-b border-slate-100">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-full bg-eco-100 flex items-center justify-center text-lg font-bold text-eco-700 flex-shrink-0">${esc(initials)}</div>
          <div>
            <h2 class="text-2xl font-bold text-slate-800 leading-tight">${esc(ct.nome)} ${esc(ct.cognome)}</h2>
            ${ct.ruolo?`<p class="text-sm text-slate-500 mt-0.5">${esc(ct.ruolo)}</p>`:''}
            ${ct.azienda_nome?`<button onclick="hideSchedaContatto();openAziendaScheda(${ct.id_azienda})" class="mt-1 badge bg-eco-50 text-eco-700 hover:bg-eco-100 transition-colors">${esc(ct.azienda_nome)}</button>`:''}
          </div>
        </div>
        <button onclick="hideSchedaContatto()" class="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 mt-1 p-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
    <div class="px-6 py-5 space-y-6">
      <div>
        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contatti</h3>
        <div class="space-y-2">
          ${ct.telefono?`<div class="flex items-center gap-2"><span class="text-xs text-slate-400 w-16">Telefono</span><a href="tel:${esc(ct.telefono)}" class="text-sm text-eco-700 hover:underline">${esc(ct.telefono)}</a></div>`:''}
          ${ct.email?`<div class="flex items-center gap-2"><span class="text-xs text-slate-400 w-16">Email</span><a href="mailto:${esc(ct.email)}" class="text-sm text-eco-700 hover:underline">${esc(ct.email)}</a></div>`:''}
          ${!ct.telefono&&!ct.email?'<p class="text-sm text-slate-400">Nessun recapito</p>':''}
        </div>
      </div>
      <div>
        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Opportunità collegate <span class="text-slate-400 font-normal normal-case">(${opps.length})</span></h3>
        ${oppHTML}
      </div>
      ${noteHTML}
    </div>`;
}

// ═══════════════ LOG CHIAMATA RAPIDO ═══════════════

let _logChiamataAzId = null;

function openLogChiamata(azId){
  const az = aziendeData.find(a=>a.id===azId);
  _logChiamataAzId = azId;
  document.getElementById('log-chiamata-az').textContent = az ? az.ragione_sociale : `Azienda #${azId}`;
  document.getElementById('log-chiamata-esito').value = '';
  document.getElementById('log-chiamata-followup').value = '';
  document.getElementById('log-chiamata-overlay').classList.remove('hidden');
  setTimeout(()=>document.getElementById('log-chiamata-esito').focus(), 100);
}

function hideLogChiamata(){
  document.getElementById('log-chiamata-overlay').classList.add('hidden');
}

async function saveLogChiamata(){
  const esito = document.getElementById('log-chiamata-esito').value.trim();
  if(!esito){ toast("Inserisci l'esito della chiamata",'error'); return; }
  const followup = document.getElementById('log-chiamata-followup').value;
  const now = new Date().toISOString();
  await API.post('/api/attivita', {
    id_azienda: _logChiamataAzId,
    tipo: 'chiamata',
    data: now,
    esito,
  });
  if(followup){
    const opps = await API.get(`/api/opportunita?id_azienda=${_logChiamataAzId}&limit=10`);
    const active = opps.filter(o=>!['perso','cliente'].includes(o.stato));
    if(active.length){
      await API.put(`/api/opportunita/${active[0].id}`, {
        prossimo_followup: followup,
        data_ultimo_contatto: now,
      });
    }
  }
  hideLogChiamata();
  toast('Chiamata registrata');
  if(getCurrentView()==='dashboard') loadDashboard();
}

// ═══════════════ EMAIL DIRETTA ═══════════════

function emailAzienda(azId){
  const az = aziendeData.find(a=>a.id===azId);
  if(!az){ return; }
  if(!az.email_aziendale){ toast('Nessuna email registrata per questa azienda','error'); return; }
  const subj = encodeURIComponent(`Ecotrentino S.r.l. — ${az.ragione_sociale}`);
  window.location.href = `mailto:${az.email_aziendale}?subject=${subj}`;
}

function emailGenerico(email, label){
  if(!email){ toast(`Nessuna email registrata per ${label}`,'error'); return; }
  const subj = encodeURIComponent(`Ecotrentino S.r.l. — ${label}`);
  window.location.href = `mailto:${email}?subject=${subj}`;
}

// ═══════════════ DUPLICATI INTELLIGENTI ═══════════════

function _debounce(fn, ms){ let t; return function(...a){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a),ms); }; }
const _debouncedCheckDup = _debounce(checkDuplicatiAzienda, 450);

async function checkDuplicatiAzienda(){
  const val = (document.getElementById('f-ragione_sociale')?.value||'').trim();
  const banner = document.getElementById('dup-banner');
  if(!banner) return;
  if(val.length < 3){ banner.classList.add('hidden'); return; }
  const results = await API.get(`/api/aziende/check-duplicati?nome=${encodeURIComponent(val)}`);
  if(!results.length){ banner.classList.add('hidden'); return; }
  document.getElementById('dup-list').innerHTML = results.map(a=>
    `<button class="font-semibold underline hover:text-amber-900 mr-1" onclick="hideModal();openAziendaScheda(${a.id})">${esc(a.ragione_sociale)}</button>`
  ).join('');
  banner.classList.remove('hidden');
}

// ═══════════════ STATISTICHE PROVINCE ═══════════════

let provinceData = [];
let provinceSortCol = 'n_aziende';
let provinceSortAsc = false;
let provinceChart = null;

async function loadProvince(){
  const regione = document.getElementById('prov-regione-filter')?.value || '';
  const url = '/api/dashboard/province' + (regione ? `?regione=${encodeURIComponent(regione)}` : '');
  provinceData = await API.get(url);
  renderProvinceTable();
  renderProvinceChart();
}

function sortProvince(col){
  if(provinceSortCol === col) provinceSortAsc = !provinceSortAsc;
  else { provinceSortCol = col; provinceSortAsc = col === 'provincia' || col === 'regione'; }
  renderProvinceTable();
}

function renderProvinceTable(){
  // Update sort icons
  ['provincia','regione','n_aziende','n_clienti','n_opp_attive','valore_pipeline'].forEach(c=>{
    const el = document.getElementById(`sort-icon-${c}`);
    if(el) el.textContent = c === provinceSortCol ? (provinceSortAsc ? '▲' : '▼') : '';
  });

  const sorted = [...provinceData].sort((a,b)=>{
    const av = a[provinceSortCol], bv = b[provinceSortCol];
    if(typeof av === 'string') return provinceSortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return provinceSortAsc ? av - bv : bv - av;
  });

  const tbody = document.getElementById('province-tbody');
  if(!tbody) return;
  tbody.innerHTML = sorted.map(r=>`
    <tr class="tr-row">
      <td class="td font-mono font-semibold">${esc(r.provincia)}</td>
      <td class="td text-slate-500 text-xs">${esc(r.regione||'—')}</td>
      <td class="td text-right font-medium">${r.n_aziende}</td>
      <td class="td text-right text-eco-700">${r.n_clienti||'—'}</td>
      <td class="td text-right text-amber-600">${r.n_opp_attive||'—'}</td>
      <td class="td text-right text-blue-600">${r.valore_pipeline ? formatEuro(r.valore_pipeline) : '—'}</td>
    </tr>`).join('');
}

function renderProvinceChart(){
  const top15 = [...provinceData].sort((a,b)=>b.n_aziende-a.n_aziende).slice(0,15);
  const ctx = document.getElementById('province-chart');
  if(!ctx) return;
  if(provinceChart) provinceChart.destroy();
  provinceChart = new Chart(ctx.getContext('2d'),{
    type:'bar',
    data:{
      labels: top15.map(r=>r.provincia),
      datasets:[{
        label:'Aziende',
        data: top15.map(r=>r.n_aziende),
        backgroundColor:'#16a34a',
        borderRadius:4,
        borderSkipped:false,
      },{
        label:'Clienti',
        data: top15.map(r=>r.n_clienti),
        backgroundColor:'#bbf7d0',
        borderRadius:4,
        borderSkipped:false,
      }]
    },
    options:{
      indexAxis:'y',
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:true, position:'top', labels:{boxWidth:12,font:{size:11}}} },
      scales:{
        x:{beginAtZero:true, ticks:{stepSize:1}, grid:{color:'#f1f5f9'}},
        y:{grid:{display:false}, ticks:{font:{size:11}}}
      }
    }
  });
}

// ═══════════════ EXPORT CSV AZIENDE ═══════════════

async function exportAziendeCSV(){
  if(!selectedAziende.size) return;
  const opps = await API.get('/api/opportunita?limit=2000');
  const oppByAz = {};
  for(const o of opps){
    if(!oppByAz[o.id_azienda]) oppByAz[o.id_azienda] = [];
    oppByAz[o.id_azienda].push(o);
  }
  const rows = aziendeData.filter(a=>selectedAziende.has(a.id)).map(a=>{
    const azOpps = oppByAz[a.id]||[];
    const lastOpp = azOpps.sort((x,y)=>(y.data_ultimo_contatto||'').localeCompare(x.data_ultimo_contatto||''))[0];
    const cols = [
      a.ragione_sociale,
      a.partita_iva||'',
      a.attivita_descrizione||'',
      a.indirizzo||'',
      a.citta||'',
      a.provincia||'',
      a.regione||'',
      a.website||'',
      a.email_aziendale||'',
      a.telefono_aziendale||'',
      a.tipo||'',
      a.prodotto_interesse||'',
      a.fonte_lead||'',
      lastOpp ? lastOpp.stato : '',
      lastOpp ? (lastOpp.data_ultimo_contatto ? fmtDate(lastOpp.data_ultimo_contatto) : '') : '',
      lastOpp ? (lastOpp.prossimo_followup ? fmtDate(lastOpp.prossimo_followup) : '') : '',
      a.note||'',
      a.ordine ? 'Sì' : 'No',
      a.commessa_euro!=null ? String(a.commessa_euro).replace('.',',') : '',
    ];
    return cols.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';');
  });
  const header = ['Ragione Sociale','P.IVA','Attività','Indirizzo','Città','Provincia','Regione','Sito Web','Email','Telefono','Tipo','Prodotto/Interesse','Fonte Lead','Stato Opportunità','Ultimo Contatto','Prossimo Follow-up','Note','Ordine','Commessa €']
    .map(h=>'"'+h+'"').join(';');
  const csv = '﻿' + header + '\n' + rows.join('\n');
  const today = new Date().toISOString().slice(0,10);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}));
  a.download = `ecotrentino_prospect_${today}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Esportate ${selectedAziende.size} aziende in CSV`);
}

// ═══════════════ CONTATTI ═══════════════
async function loadContatti(){
  const s = (document.getElementById('ct-search')||{}).value||'';
  const az = (document.getElementById('ct-azienda')||{}).value||'';
  const params = new URLSearchParams();
  if(s) params.set('search',s);
  if(az) params.set('id_azienda',az);
  const list = await API.get('/api/contatti?'+params);
  renderContatti(list);
}

function renderContatti(list){
  const tbody = document.getElementById('contatti-tbody');
  const empty = document.getElementById('contatti-empty');
  if(!list.length){ tbody.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  tbody.innerHTML = list.map(c=>`
    <tr class="tr-row">
      <td class="td font-medium"><button onclick="openContattoScheda(${c.id})" class="text-left hover:text-eco-700 hover:underline transition-colors">${esc(c.nome)} ${esc(c.cognome)}</button></td>
      <td class="td text-slate-500">${esc(c.ruolo||'—')}</td>
      <td class="td">
        <button class="text-eco-700 hover:underline text-sm" onclick="openAziendaScheda(${c.id_azienda})">${esc(c.azienda_nome||'—')}</button>
      </td>
      <td class="td">${c.telefono?`<a href="tel:${esc(c.telefono)}" class="text-eco-700">${esc(c.telefono)}</a>`:'—'}</td>
      <td class="td">${c.email?`<a href="mailto:${esc(c.email)}" class="text-eco-700">${esc(c.email)}</a>`:'—'}</td>
      <td class="td text-right">
        <button onclick="openContattoModal(${c.id})" class="icon-btn">✏️</button>
        <button onclick="confirmDeleteById('contatto',${c.id})" class="icon-btn">🗑️</button>
      </td>
    </tr>`).join('');
}

function applyCtFilter(){ loadContatti(); }
function resetCtFilter(){ document.getElementById('ct-search').value=''; _azfClear('ct-azienda'); loadContatti(); }

async function openContattoModal(id=null){
  const isEdit = id !== null;
  let data = {};
  if(isEdit) data = await API.get(`/api/contatti/${id}`);
  document.getElementById('modal-title').textContent = isEdit ? 'Modifica Contatto' : 'Nuovo Contatto';
  document.getElementById('modal-body').innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="label">Nome *</label>
        <input id="f-nome" class="input" value="${esc(data.nome||'')}" />
      </div>
      <div>
        <label class="label">Cognome *</label>
        <input id="f-cognome" class="input" value="${esc(data.cognome||'')}" />
      </div>
      <div class="col-span-2">
        <label class="label">Azienda *</label>
        ${buildAziendaAcField('f-id_azienda', data.id_azienda||'', data.azienda_nome||'')}
      </div>
      <div>
        <label class="label">Ruolo</label>
        <input id="f-ruolo" class="input" value="${esc(data.ruolo||'')}" placeholder="Es. Responsabile acquisti" />
      </div>
      <div>
        <label class="label">Telefono</label>
        <input id="f-telefono" class="input" value="${esc(data.telefono||'')}" type="tel" />
      </div>
      <div class="col-span-2">
        <label class="label">Email</label>
        <input id="f-email" class="input" value="${esc(data.email||'')}" type="email" />
      </div>
      <div class="col-span-2">
        <label class="label">Note</label>
        <textarea id="f-note" class="input h-20 resize-none">${esc(data.note||'')}</textarea>
      </div>
    </div>`;

  modalCtx = {
    type:'contatto', id,
    async onSave(){
      const payload = {
        id_azienda: parseInt(gv('f-id_azienda')),
        nome:       gv('f-nome'),
        cognome:    gv('f-cognome'),
        ruolo:      gv('f-ruolo')||null,
        telefono:   gv('f-telefono')||null,
        email:      gv('f-email')||null,
        note:       gv('f-note')||null,
      };
      if(!payload.nome||!payload.cognome){ toast('Nome e cognome obbligatori','error'); return false; }
      if(!payload.id_azienda){ toast('Seleziona un\'azienda','error'); return false; }
      if(isEdit) await API.put(`/api/contatti/${id}`, payload);
      else await API.post('/api/contatti', payload);
      return true;
    }
  };
  showModal();
}

async function deleteContatto(id){
  await API.del(`/api/contatti/${id}`);
  toast('Contatto eliminato');
  loadContatti();
}

// ═══════════════ PIPELINE (KANBAN) ═══════════════
async function loadPipeline(){
  const list = await API.get('/api/opportunita?limit=500');
  renderPipeline(list);
}

function renderPipeline(list){
  const board = document.getElementById('pipeline-board');
  const statoLabels = {freddo:'❄️ Freddo',contattato:'📞 Contattato',trattativa:'🤝 Trattativa',offerta:'📄 Offerta',cliente:'✅ Cliente',perso:'❌ Perso'};

  board.innerHTML = STATI.map(stato=>{
    const cards = list.filter(o=>o.stato===stato);
    const total = cards.reduce((s,c)=>s+(c.valore_stimato||0),0);
    return `
      <div class="kanban-col flex-shrink-0 w-72 bg-slate-100 rounded-xl p-3 flex flex-col gap-2">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-semibold text-slate-700">${statoLabels[stato]}</span>
          <span class="badge ${STATO_COLORS[stato]}">${cards.length}</span>
        </div>
        ${total>0?`<div class="text-xs text-slate-400 mb-1">${formatEuro(total)}</div>`:''}
        <div class="kanban-cards flex flex-col gap-2 min-h-12 flex-1"
             data-stato="${stato}"
             ondragover="event.preventDefault();this.classList.add('drag-over')"
             ondragleave="this.classList.remove('drag-over')"
             ondrop="handleKanbanDrop(event,'${stato}')">
          ${cards.map(c=>kanbanCard(c)).join('')}
        </div>
        <button onclick="openOppModal(null,'${stato}')" class="text-xs text-slate-400 hover:text-eco-600 mt-1 py-1 rounded hover:bg-white transition-colors">+ Aggiungi</button>
      </div>`;
  }).join('');
}

function kanbanCard(o){
  return `
    <div class="kanban-card bg-white rounded-lg p-3 shadow-sm border border-slate-100 cursor-grab"
         draggable="true"
         ondragstart="handleKanbanDragStart(event,${o.id})"
         ondragend="document.querySelectorAll('.kanban-cards').forEach(el=>el.classList.remove('drag-over'))">
      <div class="font-medium text-sm text-slate-800 mb-1 leading-snug">${esc(o.titolo)}</div>
      <div class="text-xs text-slate-500 mb-2">${esc(o.azienda_nome||'—')}</div>
      ${o.valore_stimato?`<div class="text-xs font-semibold text-eco-700 mb-1">${formatEuro(o.valore_stimato)}</div>`:''}
      <div class="flex items-center justify-between mt-1">
        ${o.data_ultimo_contatto?`<span class="text-xs text-slate-400">${fmtDate(o.data_ultimo_contatto)}</span>`:'<span></span>'}
        <div class="flex gap-1">
          <button onclick="openOppModal(${o.id})" class="icon-btn-sm" title="Modifica">✏️</button>
          <button onclick="confirmDeleteById('opportunita',${o.id})" class="icon-btn-sm" title="Elimina">🗑️</button>
        </div>
      </div>
    </div>`;
}

let dragOppId = null;
function handleKanbanDragStart(e, id){ dragOppId = id; e.dataTransfer.effectAllowed='move'; }
async function handleKanbanDrop(e, stato){
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if(!dragOppId) return;
  try{
    await API.patch(`/api/opportunita/${dragOppId}/stato`, {stato});
    await loadPipeline();
    toast(`Spostato in "${stato}"`);
  }catch(err){ toast(err.message,'error'); }
  dragOppId = null;
}

async function openOppModal(id=null, defaultStato='freddo'){
  const isEdit = id !== null;
  let data = {};
  if(isEdit) data = await API.get(`/api/opportunita/${id}`);
  document.getElementById('modal-title').textContent = isEdit ? 'Modifica Opportunità' : 'Nuova Opportunità';
  document.getElementById('modal-body').innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="label">Titolo *</label>
        <input id="f-titolo" class="input" value="${esc(data.titolo||'')}" placeholder="Es. Impianto filtrazione acque — Fabbrica Nord" />
      </div>
      <div>
        <label class="label">Azienda *</label>
        ${buildAziendaAcField('f-id_azienda', data.id_azienda||'', data.azienda_nome||'', loadContattiForAzienda)}
      </div>
      <div>
        <label class="label">Contatto</label>
        <select id="f-id_contatto" class="input"><option value="">— nessuno —</option></select>
      </div>
      <div>
        <label class="label">Stato</label>
        <select id="f-stato" class="input">
          ${STATI.map(s=>`<option value="${s}" ${(data.stato||defaultStato)===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="label">Valore Stimato (€)</label>
        <input id="f-valore_stimato" class="input" type="number" min="0" step="100" value="${data.valore_stimato||''}" placeholder="0" />
      </div>
      <div>
        <label class="label">Primo Contatto</label>
        <input id="f-data_primo_contatto" class="input" type="date" value="${fmtDateInput(data.data_primo_contatto)}" />
      </div>
      <div>
        <label class="label">Ultimo Contatto</label>
        <input id="f-data_ultimo_contatto" class="input" type="date" value="${fmtDateInput(data.data_ultimo_contatto)}" />
      </div>
      <div>
        <label class="label">Prossimo Follow-up</label>
        <input id="f-prossimo_followup" class="input" type="date" value="${fmtDateInput(data.prossimo_followup)}" />
      </div>
      <div>
        <label class="label">Offerte Collegate</label>
        <input id="f-offerte_collegate" class="input" value="${esc(data.offerte_collegate||'')}" placeholder="Es. OFF-2024-001" />
      </div>
      <div class="col-span-2">
        <label class="label">Note</label>
        <textarea id="f-note" class="input h-20 resize-none">${esc(data.note||'')}</textarea>
      </div>
    </div>`;

  if(data.id_azienda) await loadContattiForAzienda(data.id_contatto);

  modalCtx = {
    type:'opportunita', id,
    async onSave(){
      const azId = parseInt(gv('f-id_azienda'));
      const payload = {
        id_azienda:           azId,
        id_contatto:          parseInt(gv('f-id_contatto'))||null,
        titolo:               gv('f-titolo'),
        stato:                gv('f-stato'),
        valore_stimato:       parseFloat(gv('f-valore_stimato'))||null,
        data_primo_contatto:  gv('f-data_primo_contatto')||null,
        data_ultimo_contatto: gv('f-data_ultimo_contatto')||null,
        prossimo_followup:    gv('f-prossimo_followup')||null,
        offerte_collegate:    gv('f-offerte_collegate')||null,
        note:                 gv('f-note')||null,
      };
      if(!payload.titolo){ toast('Titolo obbligatorio','error'); return false; }
      if(!payload.id_azienda){ toast('Seleziona un\'azienda','error'); return false; }
      if(isEdit) await API.put(`/api/opportunita/${id}`, payload);
      else await API.post('/api/opportunita', payload);
      return true;
    }
  };
  showModal();
}

async function loadContattiForAzienda(selectedId=null){
  const azId = gv('f-id_azienda');
  const sel = document.getElementById('f-id_contatto');
  if(!azId){ sel.innerHTML='<option value="">— nessuno —</option>'; return; }
  const list = await API.get(`/api/contatti?id_azienda=${azId}`);
  sel.innerHTML = '<option value="">— nessuno —</option>' +
    list.map(c=>`<option value="${c.id}" ${selectedId==c.id?'selected':''}>${esc(c.nome)} ${esc(c.cognome)}</option>`).join('');
}

async function deleteOpp(id){
  await API.del(`/api/opportunita/${id}`);
  toast('Opportunità eliminata');
  loadPipeline();
}

// ═══════════════ ATTIVITÀ ═══════════════
async function loadAttivita(){
  const tipo = document.getElementById('att-tipo').value;
  const azId = document.getElementById('att-azienda').value;
  const params = new URLSearchParams();
  if(tipo) params.set('tipo',tipo);
  if(azId) params.set('id_azienda',azId);
  const list = await API.get('/api/attivita?'+params);
  renderAttivita(list);
}

function renderAttivita(list){
  const tbody = document.getElementById('attivita-tbody');
  const empty = document.getElementById('attivita-empty');
  if(!list.length){ tbody.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  tbody.innerHTML = list.map(a=>`
    <tr class="tr-row">
      <td class="td text-slate-500 whitespace-nowrap">${fmtDate(a.data)}</td>
      <td class="td"><span class="badge bg-slate-100 text-slate-700">${TIPO_ATT_ICONS[a.tipo]||''} ${esc(a.tipo)}</span></td>
      <td class="td font-medium">${esc(a.azienda_nome||'—')}</td>
      <td class="td text-slate-500 text-xs">${esc(a.opportunita_titolo||'—')}</td>
      <td class="td text-slate-600 max-w-xs truncate" title="${esc(a.descrizione||'')}">${esc(a.descrizione||'—')}</td>
      <td class="td text-slate-500 max-w-xs truncate" title="${esc(a.esito||'')}">${esc(a.esito||'—')}</td>
      <td class="td text-right">
        <button onclick="openAttivitaModal(${a.id})" class="icon-btn">✏️</button>
        <button onclick="confirmDeleteById('attivita',${a.id})" class="icon-btn">🗑️</button>
      </td>
    </tr>`).join('');
}

async function openAttivitaModal(id=null){
  const isEdit = id !== null;
  let data = {};
  if(isEdit) data = await API.get(`/api/attivita/${id}`);
  const opps = data.id_azienda ? await API.get(`/api/opportunita?id_azienda=${data.id_azienda}`) : [];

  document.getElementById('modal-title').textContent = isEdit ? 'Modifica Attività' : 'Nuova Attività';
  document.getElementById('modal-body').innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="label">Azienda *</label>
        ${buildAziendaAcField('f-id_azienda', data.id_azienda||'', data.azienda_nome||'', loadOppForAttivita)}
      </div>
      <div>
        <label class="label">Opportunità</label>
        <select id="f-id_opportunita" class="input">
          <option value="">— nessuna —</option>
          ${opps.map(o=>`<option value="${o.id}" ${data.id_opportunita==o.id?'selected':''}>${esc(o.titolo)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="label">Tipo *</label>
        <select id="f-tipo" class="input">
          ${['chiamata','email','visita','offerta'].map(t=>`<option value="${t}" ${data.tipo===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="label">Data *</label>
        <input id="f-data" class="input" type="datetime-local" value="${fmtDatetimeInput(data.data)}" />
      </div>
      <div class="col-span-2">
        <label class="label">Descrizione</label>
        <textarea id="f-descrizione" class="input h-20 resize-none" placeholder="Dettagli dell'attività…">${esc(data.descrizione||'')}</textarea>
      </div>
      <div class="col-span-2">
        <label class="label">Esito</label>
        <textarea id="f-esito" class="input h-16 resize-none" placeholder="Risultato, prossimi passi…">${esc(data.esito||'')}</textarea>
      </div>
    </div>`;

  modalCtx = {
    type:'attivita', id,
    async onSave(){
      const payload = {
        id_azienda:     parseInt(gv('f-id_azienda')),
        id_opportunita: parseInt(gv('f-id_opportunita'))||null,
        tipo:           gv('f-tipo'),
        data:           gv('f-data'),
        descrizione:    gv('f-descrizione')||null,
        esito:          gv('f-esito')||null,
      };
      if(!payload.id_azienda){ toast('Seleziona un\'azienda','error'); return false; }
      if(!payload.data){ toast('Data obbligatoria','error'); return false; }
      if(isEdit) await API.put(`/api/attivita/${id}`, payload);
      else await API.post('/api/attivita', payload);
      return true;
    }
  };
  showModal();
}

async function loadOppForAttivita(){
  const azId = gv('f-id_azienda');
  const sel = document.getElementById('f-id_opportunita');
  if(!azId){ sel.innerHTML='<option value="">— nessuna —</option>'; return; }
  const opps = await API.get(`/api/opportunita?id_azienda=${azId}`);
  sel.innerHTML = '<option value="">— nessuna —</option>' +
    opps.map(o=>`<option value="${o.id}">${esc(o.titolo)}</option>`).join('');
}

async function deleteAttivita(id){
  await API.del(`/api/attivita/${id}`);
  toast('Attività eliminata');
  loadAttivita();
}

// ═══════════════ IMPORT CSV ═══════════════
const DB_FIELD_LABELS = {
  ragione_sociale:'Ragione Sociale *',
  partita_iva:'Partita IVA',
  indirizzo:'Indirizzo',
  citta:'Città',
  provincia:'Provincia',
  regione:'Regione',
  codice_ateco:'Codice ATECO',
  tipo:'Tipo',
  email_aziendale:'Email Aziendale',
  telefono_aziendale:'Telefono Aziendale',
  website:'Sito Web',
  attivita_descrizione:'Attività / Descrizione',
  prodotto_interesse:'Prodotto / Interesse',
  fonte_lead:'Fonte Lead',
  note:'Note',
};

function handleFileDrop(e){
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('border-eco-500');
  const file = e.dataTransfer.files[0];
  if(file) processCSVFile(file);
}

function handleFileSelect(e){
  const file = e.target.files[0];
  if(file) processCSVFile(file);
}

async function processCSVFile(file){
  csvFile = file;
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-selected').classList.remove('hidden');

  const fd = new FormData();
  fd.append('file', file);
  try{
    const res = await API.req('POST','/api/import/preview', fd);
    csvColumns = res.columns;

    // Preview table
    const previewHtml = `
      <p class="text-xs text-slate-500 mb-1">Anteprima prime righe:</p>
      <div class="overflow-x-auto rounded border border-slate-200 mb-2">
        <table class="text-xs">
          <thead class="bg-slate-50"><tr>${res.columns.map(c=>`<th class="px-2 py-1 text-slate-500 font-medium whitespace-nowrap">${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>${res.preview.map(row=>`<tr class="border-t border-slate-100">${res.columns.map(c=>`<td class="px-2 py-1 text-slate-600 whitespace-nowrap">${esc(row[c]||'')}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`;
    document.getElementById('csv-preview').innerHTML = previewHtml;

    // Mapping rows — auto-match by similarity
    const tbody = document.getElementById('mapping-tbody');
    tbody.innerHTML = Object.entries(DB_FIELD_LABELS).map(([field, label])=>{
      const autoMatch = csvColumns.find(c=>c.toLowerCase().replace(/\s/g,'_').includes(field.replace(/_/g,'')) || field.includes(c.toLowerCase().replace(/\s/g,'')));
      return `<tr class="border-b border-slate-100">
        <td class="py-2 pr-4 text-sm font-medium text-slate-700">${label}</td>
        <td class="py-2">
          <select id="map-${field}" class="input text-sm">
            <option value="">— Non importare —</option>
            ${csvColumns.map(c=>`<option value="${esc(c)}" ${autoMatch===c?'selected':''}>${esc(c)}</option>`).join('')}
          </select>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('import-step2').classList.remove('hidden');
  }catch(e){ toast('Errore lettura CSV: '+e.message,'error'); }
}

async function executeImport(){
  const mapping = {};
  Object.keys(DB_FIELD_LABELS).forEach(field=>{
    const val = document.getElementById(`map-${field}`)?.value;
    if(val) mapping[field]=val;
  });
  if(!mapping.ragione_sociale){ toast('Devi mappare il campo Ragione Sociale','error'); return; }

  const fd = new FormData();
  fd.append('file', csvFile);
  fd.append('mapping', JSON.stringify(mapping));

  try{
    const res = await API.req('POST','/api/import/execute', fd);
    document.getElementById('import-result-content').innerHTML = `
      <div class="flex gap-4 mb-3">
        <div class="bg-eco-50 border border-eco-200 rounded-lg p-4 flex-1 text-center">
          <div class="text-2xl font-bold text-eco-700">${res.imported}</div>
          <div class="text-xs text-slate-500 mt-1">Aziende importate</div>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 flex-1 text-center">
          <div class="text-2xl font-bold text-slate-500">${res.skipped}</div>
          <div class="text-xs text-slate-500 mt-1">Saltate (duplicati)</div>
        </div>
      </div>
      ${res.errors.length?`<div class="text-xs text-red-600 bg-red-50 rounded p-3"><b>Errori:</b><br>${res.errors.map(e=>esc(e)).join('<br>')}</div>`:''}`;
    document.getElementById('import-result').classList.remove('hidden');
    toast(`Importate ${res.imported} aziende`);
  }catch(e){ toast('Errore import: '+e.message,'error'); }
}

function resetImport(){
  csvFile=null; csvColumns=[];
  document.getElementById('csv-file-input').value='';
  document.getElementById('file-selected').classList.add('hidden');
  document.getElementById('import-step2').classList.add('hidden');
  document.getElementById('import-result').classList.add('hidden');
}

// ═══════════════ GLOBAL SEARCH ═══════════════
let searchTimeout;
function onGlobalSearch(val){
  clearTimeout(searchTimeout);
  const container = document.getElementById('search-results');
  if(val.length<2){ container.classList.add('hidden'); return; }
  searchTimeout = setTimeout(async()=>{
    const res = await API.get(`/api/dashboard/search?q=${encodeURIComponent(val)}`);
    let html = '';
    if(res.aziende.length){
      html += `<div class="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase bg-slate-50">Aziende</div>`;
      html += res.aziende.map(a=>`<button onclick="navigate('aziende');document.getElementById('global-search').value='';hideSearch()" class="block w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"><span class="font-medium">${esc(a.label)}</span> <span class="text-slate-400 text-xs ml-1">${esc(a.tipo||'')}</span></button>`).join('');
    }
    if(res.opportunita.length){
      html += `<div class="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase bg-slate-50">Opportunità</div>`;
      html += res.opportunita.map(o=>`<button onclick="navigate('pipeline');hideSearch()" class="block w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"><span class="font-medium">${esc(o.label)}</span> <span class="badge ${STATO_COLORS[o.stato]||''} ml-1">${esc(o.stato)}</span></button>`).join('');
    }
    if(!html) html = '<div class="px-3 py-4 text-sm text-slate-400 text-center">Nessun risultato</div>';
    container.innerHTML = html;
    container.classList.remove('hidden');
  }, 300);
}
function hideSearch(){ document.getElementById('search-results').classList.add('hidden'); }
document.addEventListener('click', e=>{ if(!e.target.closest('#global-search')&&!e.target.closest('#search-results')) hideSearch(); });

// ═══════════════ MODAL ═══════════════
function showModal(){ document.getElementById('modal-overlay').classList.remove('hidden'); }
function hideModal(){ document.getElementById('modal-overlay').classList.add('hidden'); modalCtx={}; }
function closeModal(e){ if(e.target.id==='modal-overlay') hideModal(); }

// ═══════════════ CONFIRM DELETE ═══════════════
function confirmDelete(msg, fn){
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-overlay').classList.remove('hidden');
  confirmFn = fn;
}
function confirmDeleteById(type, id){
  const msgs = {
    azienda:     'Eliminare questa azienda e tutti i dati correlati?',
    contatto:    'Eliminare questo contatto?',
    opportunita: 'Eliminare questa opportunità?',
    attivita:    'Eliminare questa attività?',
  };
  const fns = {
    azienda:     ()=>deleteAzienda(id),
    contatto:    ()=>deleteContatto(id),
    opportunita: ()=>deleteOpp(id),
    attivita:    ()=>deleteAttivita(id),
  };
  confirmDelete(msgs[type]||'Eliminare?', fns[type]||(()=>{}));
}
function hideConfirm(){ document.getElementById('confirm-overlay').classList.add('hidden'); confirmFn=null; }
document.getElementById('confirm-ok').onclick = async()=>{
  if(confirmFn){ try{ await confirmFn(); }catch(e){ toast(e.message,'error'); } }
  hideConfirm();
};

// ═══════════════ UTILITIES ═══════════════
function gv(id){ return (document.getElementById(id)?.value||'').trim(); }
function esc(s){ if(s==null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function getCurrentView(){ return document.querySelector('.view.active')?.id?.replace('view-',''); }

function formatEuro(val){
  if(!val && val!==0) return '—';
  if(val>=1000000) return '€'+(val/1000000).toFixed(1)+'M';
  if(val>=1000) return '€'+(val/1000).toFixed(0)+'K';
  return '€'+val.toLocaleString('it-IT');
}

function fmtDate(iso){
  if(!iso) return '—';
  try{
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
  }catch{ return iso; }
}

function fmtDateInput(iso){
  if(!iso) return '';
  try{ return new Date(iso).toISOString().split('T')[0]; }catch{ return ''; }
}

function fmtDatetimeInput(iso){
  if(!iso) return '';
  try{ return new Date(iso).toISOString().slice(0,16); }catch{ return ''; }
}

function populateSelect(id, values, placeholder){
  const el = document.getElementById(id);
  if(!el) return;
  const cur = el.value;
  el.innerHTML = `<option value="">${placeholder}</option>` +
    values.filter(Boolean).map(v=>`<option value="${esc(v)}" ${cur===v?'selected':''}>${esc(v)}</option>`).join('');
}

function populateSelectObjs(id, items, placeholder){
  const el = document.getElementById(id);
  if(!el) return;
  const cur = el.value;
  el.innerHTML = `<option value="">${placeholder}</option>` +
    items.map(i=>`<option value="${i.value}" ${String(cur)===String(i.value)?'selected':''}>${esc(i.label)}</option>`).join('');
}


// ═══════════════ AZIENDA AUTOCOMPLETE ═══════════════
const _azCallbacks = {};
const _azTimers = {};

function buildAziendaAcField(id, selectedId='', selectedLabel='', onSelect=null){
  if(onSelect) _azCallbacks[id] = onSelect;
  else delete _azCallbacks[id];
  return `
    <div class="relative">
      <input type="text" id="${id}-input" class="input pr-8" placeholder="Cerca azienda…" autocomplete="off"
        oninput="_azfInput('${id}')" onfocus="_azfTrigger('${id}')" value="${esc(selectedLabel)}" />
      <button type="button" class="${selectedLabel?'':'hidden'} absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 leading-none" id="${id}-clear" onclick="_azfClear('${id}')" tabindex="-1">✕</button>
      <div id="${id}-list" class="hidden absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto text-sm"></div>
    </div>
    <input type="hidden" id="${id}" value="${selectedId}" />`;
}

function _azfInput(id, cb){
  if(cb !== undefined) _azCallbacks[id] = cb;
  const val = (document.getElementById(id+'-input')||{}).value?.trim()||'';
  const clearBtn = document.getElementById(id+'-clear');
  if(clearBtn) clearBtn.classList.toggle('hidden', !val);
  if(!val){
    const hid = document.getElementById(id);
    if(hid) hid.value='';
    const lst = document.getElementById(id+'-list');
    if(lst) lst.classList.add('hidden');
    if(_azCallbacks[id]) _azCallbacks[id]();
    return;
  }
  clearTimeout(_azTimers[id]);
  _azTimers[id] = setTimeout(()=>_azfSearch(id, val), 250);
}

async function _azfSearch(id, q){
  const lst = document.getElementById(id+'-list');
  if(!lst) return;
  const res = await API.get(`/api/aziende?search=${encodeURIComponent(q)}&limit=20`);
  const items = res.data||[];
  lst.innerHTML = '';
  if(!items.length){
    const msg = document.createElement('div');
    msg.className = 'px-3 py-2 text-slate-400 italic';
    msg.textContent = 'Nessun risultato';
    lst.appendChild(msg);
    lst.classList.remove('hidden');
    return;
  }
  items.forEach(a => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'w-full text-left px-3 py-2 hover:bg-eco-50 transition-colors';
    btn.textContent = a.ragione_sociale;
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => _azfSelect(id, a.id, a.ragione_sociale));
    lst.appendChild(btn);
  });
  lst.classList.remove('hidden');
}

function _azfSelect(id, azId, azName){
  const inp = document.getElementById(id+'-input');
  const hid = document.getElementById(id);
  const clr = document.getElementById(id+'-clear');
  const lst = document.getElementById(id+'-list');
  if(inp) inp.value = azName;
  if(hid) hid.value = azId;
  if(clr) clr.classList.remove('hidden');
  if(lst) lst.classList.add('hidden');
  if(_azCallbacks[id]) _azCallbacks[id]();
}

function _azfClear(id){
  const inp = document.getElementById(id+'-input');
  const hid = document.getElementById(id);
  const clr = document.getElementById(id+'-clear');
  const lst = document.getElementById(id+'-list');
  if(inp) inp.value='';
  if(hid) hid.value='';
  if(clr) clr.classList.add('hidden');
  if(lst) lst.classList.add('hidden');
  if(_azCallbacks[id]) _azCallbacks[id]();
}

function _azfTrigger(id){
  const val = (document.getElementById(id+'-input')||{}).value?.trim()||'';
  if(val) _azfSearch(id, val);
}

document.addEventListener('click', e=>{
  document.querySelectorAll('[id$="-list"].absolute').forEach(lst=>{
    const id = lst.id.replace('-list','');
    const inp = document.getElementById(id+'-input');
    if(inp && !inp.contains(e.target) && !lst.contains(e.target)) lst.classList.add('hidden');
  });
});

// ═══════════════ INIT ═══════════════
navigate('dashboard');
