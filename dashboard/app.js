// Neobank BI Executive Dashboard Application
document.addEventListener('DOMContentLoaded', () => {
  const data = window.BI_DATA || window.NEOBANK_DATA;
  if (!data) {
    console.error('Data not loaded');
    return;
  }

  // Formatters
  const fmtCurrency = (n) => {
    return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmtNumber = (n) => {
    return Number(n || 0).toLocaleString('en-US');
  };
  const fmtPct = (n) => {
    return (Number(n || 0)).toFixed(2) + '%';
  };

  // State
  let currentFilter = {
    product: 'ALL',
    origin: 'ALL',
    destiny: 'ALL',
    year: 'ALL'
  };

  let charts = {};
  let rawTxnsPage = 1;
  const rawTxnsPerPage = 25;
  let rawTxnsSearch = '';

  let firstTxnsPage = 1;
  const firstTxnsPerPage = 25;
  let firstTxnsSearch = '';

  // DOM Elements
  const elFilterProduct = document.getElementById('filterProduct');
  const elFilterOrigin = document.getElementById('filterOrigin');
  const elFilterDestiny = document.getElementById('filterDestiny');
  const elFilterYear = document.getElementById('filterYear');
  const elFilteredCountLabel = document.getElementById('filteredCountLabel');
  const elBtnResetFilters = document.getElementById('btnResetFilters');
  const elBtnPrint = document.getElementById('btnPrint');

  // KPIs
  const elKpiVolume = document.getElementById('kpiVolume');
  const elKpiRevenue = document.getElementById('kpiRevenue');
  const elKpiAvgRev = document.getElementById('kpiAvgRev');
  const elKpiTakeRate = document.getElementById('kpiTakeRate');
  const elKpiTxns = document.getElementById('kpiTxns');
  const elKpiTxnSub = document.getElementById('kpiTxnSub');
  const elKpiCustomers = document.getElementById('kpiCustomers');
  const elKpiPositiveTxns = document.getElementById('kpiPositiveTxns');

  // Filter Transactions Logic
  function getFilteredTransactions() {
    return data.transactions.filter(t => {
      if (currentFilter.product !== 'ALL' && t.product !== currentFilter.product) return false;
      if (currentFilter.origin !== 'ALL' && t.origin !== currentFilter.origin) return false;
      if (currentFilter.destiny !== 'ALL' && t.destiny !== currentFilter.destiny) return false;
      if (currentFilter.year !== 'ALL' && !t.date.startsWith(currentFilter.year)) return false;
      return true;
    });
  }

  // Update All Metrics & Views
  function updateDashboard() {
    const txns = getFilteredTransactions();

    // 1. Update KPIs
    const totalVolume = txns.reduce((acc, t) => acc + t.vol_usd, 0);
    const totalRev = txns.reduce((acc, t) => acc + t.rev, 0);
    const countTxns = txns.length;
    const uniqueCusts = new Set(txns.map(t => t.cid)).size;
    const posTxns = txns.filter(t => t.rev > 0).length;
    const takeRate = totalVolume > 0 ? (totalRev / totalVolume) * 100 : 0;
    const avgTicket = countTxns > 0 ? (totalVolume / countTxns) : 0;
    const avgRev = countTxns > 0 ? (totalRev / countTxns) : 0;
    const posPct = countTxns > 0 ? ((posTxns / countTxns) * 100).toFixed(1) : 0;

    elKpiVolume.textContent = fmtCurrency(totalVolume);
    elKpiRevenue.textContent = fmtCurrency(totalRev);
    elKpiAvgRev.textContent = fmtCurrency(avgRev);
    elKpiTakeRate.textContent = fmtPct(takeRate);
    elKpiTxns.textContent = fmtNumber(countTxns);
    elKpiTxnSub.textContent = `Ticket prom: ${fmtCurrency(avgTicket)}`;
    elKpiCustomers.textContent = fmtNumber(uniqueCusts);
    elKpiPositiveTxns.innerHTML = `${fmtNumber(posTxns)} <small style="font-size:1rem;color:var(--success)">(${posPct}%)</small>`;

    elFilteredCountLabel.textContent = `Mostrando ${fmtNumber(countTxns)} transacciones auditadas (${fmtCurrency(totalVolume)})`;

    // 2. Update Charts
    updateProductChart(txns);
    updateTimelineChart(txns);
    updateDestinyChart(txns);
    updateCorridorsChart(txns);

    // 3. Update Tables
    updateTopClientsTable(txns);
    updateTopProductTable(txns);
    renderFirstTxnsTable();
    renderRawTxnsTable(txns);
  }

  // --- CHART 1: PRODUCT CHART ---
  function initProductChart() {
    const ctx = document.getElementById('chartProduct').getContext('2d');
    charts.product = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label || '';
                if (label.includes('USD')) {
                  return `${label}: ${fmtCurrency(ctx.raw)}`;
                }
                return `${label}: ${fmtNumber(ctx.raw)}`;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Cantidad de Transacciones' },
            grid: { color: '#E2E8F0' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Volumen USD ($)' },
            grid: { drawOnChartArea: false },
            ticks: {
              callback: (val) => '$' + (val / 1000000).toFixed(1) + 'M'
            }
          }
        }
      }
    });
  }

  function updateProductChart(txns) {
    const prodMap = {};
    const prods = ['Remesa', 'Exchange', 'Tarjeta', 'P2P'];
    prods.forEach(p => prodMap[p] = { txns: 0, vol: 0 });

    txns.forEach(t => {
      if (!prodMap[t.product]) prodMap[t.product] = { txns: 0, vol: 0 };
      prodMap[t.product].txns += 1;
      prodMap[t.product].vol += t.vol_usd;
    });

    const labels = Object.keys(prodMap);
    const txnsData = labels.map(p => prodMap[p].txns);
    const volData = labels.map(p => prodMap[p].vol);

    charts.product.data = {
      labels: labels,
      datasets: [
        {
          label: 'Transacciones',
          data: txnsData,
          backgroundColor: '#0047FF',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Volumen USD',
          data: volData,
          backgroundColor: '#10B981',
          borderRadius: 6,
          yAxisID: 'y1'
        }
      ]
    };
    charts.product.update();
  }

  // --- CHART 2: TIMELINE CHART ---
  function initTimelineChart() {
    const ctx = document.getElementById('chartTimeline').getContext('2d');
    charts.timeline = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            title: { display: true, text: 'Revenue USD ($)' },
            grid: { color: '#E2E8F0' },
            ticks: { callback: (v) => '$' + (v / 1000).toFixed(0) + 'k' }
          },
          y1: {
            position: 'right',
            title: { display: true, text: 'Volumen USD ($)' },
            grid: { drawOnChartArea: false },
            ticks: { callback: (v) => '$' + (v / 1000000).toFixed(1) + 'M' }
          }
        }
      }
    });
  }

  function updateTimelineChart(txns) {
    const monthMap = {};
    txns.forEach(t => {
      const ym = t.date.substring(0, 7);
      if (!monthMap[ym]) monthMap[ym] = { vol: 0, rev: 0 };
      monthMap[ym].vol += t.vol_usd;
      monthMap[ym].rev += t.rev;
    });

    const sortedMonths = Object.keys(monthMap).sort();
    const revData = sortedMonths.map(m => monthMap[m].rev);
    const volData = sortedMonths.map(m => monthMap[m].vol);

    charts.timeline.data = {
      labels: sortedMonths,
      datasets: [
        {
          label: 'Gross Revenue USD',
          data: revData,
          borderColor: '#0047FF',
          backgroundColor: 'rgba(0, 71, 255, 0.08)',
          fill: true,
          tension: 0.35,
          yAxisID: 'y'
        },
        {
          label: 'Volumen USD',
          data: volData,
          borderColor: '#10B981',
          borderDash: [5, 5],
          tension: 0.35,
          yAxisID: 'y1'
        }
      ]
    };
    charts.timeline.update();
  }

  // --- CHART 3: DESTINY COUNTRIES (TOP 10) ---
  function initDestinyChart() {
    const ctx = document.getElementById('chartDestinyCountries').getContext('2d');
    charts.destiny = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${fmtNumber(ctx.raw)} transacciones recibidas`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Transacciones Recibidas' },
            grid: { color: '#E2E8F0' }
          }
        }
      }
    });
  }

  function updateDestinyChart(txns) {
    const destMap = {};
    txns.forEach(t => {
      destMap[t.dest] = (destMap[t.dest] || 0) + 1;
    });

    const sortedCountries = Object.keys(destMap)
      .map(k => ({ country: k, count: destMap[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    charts.destiny.data = {
      labels: sortedCountries.map(c => c.country),
      datasets: [
        {
          data: sortedCountries.map(c => c.count),
          backgroundColor: ['#0047FF', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'],
          borderRadius: 6
        }
      ]
    };
    charts.destiny.update();
  }

  // --- CHART 4: CORRIDORS ---
  function initCorridorsChart() {
    const ctx = document.getElementById('chartCorridors').getContext('2d');
    charts.corridors = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${fmtNumber(ctx.raw)} txns`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Volumen Transaccional' },
            grid: { color: '#E2E8F0' }
          }
        }
      }
    });
  }

  function updateCorridorsChart(txns) {
    const corridorMap = {};
    txns.forEach(t => {
      const c = `${t.origin} ➔ ${t.dest}`;
      corridorMap[c] = (corridorMap[c] || 0) + 1;
    });

    const topCorridors = Object.keys(corridorMap)
      .map(k => ({ corridor: k, count: corridorMap[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    charts.corridors.data = {
      labels: topCorridors.map(c => c.corridor),
      datasets: [
        {
          data: topCorridors.map(c => c.count),
          backgroundColor: '#8B5CF6',
          borderRadius: 6
        }
      ]
    };
    charts.corridors.update();
  }

  // --- TAB 1: TOP CLIENTES TABLE ---
  function updateTopClientsTable(txns) {
    const tbody = document.getElementById('tbodyTopRevenue');
    const custMap = {};

    txns.forEach(t => {
      if (!custMap[t.cid]) {
        custMap[t.cid] = {
          id: t.cid,
          name: t.cname,
          country: t.ccountry,
          txns: 0,
          vol: 0,
          rev: 0
        };
      }
      custMap[t.cid].txns += 1;
      custMap[t.cid].vol += t.vol_usd;
      custMap[t.cid].rev += t.rev;
    });

    let clients = Object.values(custMap).sort((a, b) => b.rev - a.rev);
    const searchVal = document.getElementById('searchTopClients').value.toLowerCase().trim();
    if (searchVal) {
      clients = clients.filter(c => c.name.toLowerCase().includes(searchVal) || c.country.toLowerCase().includes(searchVal));
    }

    const topList = clients.slice(0, 20); // Top 20
    tbody.innerHTML = topList.map((c, idx) => {
      const rank = idx + 1;
      const isTop1 = rank === 1 && !searchVal;
      const takeRate = c.vol > 0 ? (c.rev / c.vol) * 100 : 0;
      const avgTicket = c.txns > 0 ? (c.vol / c.txns) : 0;

      return `
        <tr class="${isTop1 ? 'highlight-top' : ''}">
          <td class="text-center"><span class="rank-badge ${rank <= 3 ? 'rank-' + rank : ''}">${rank}</span></td>
          <td><strong>#${c.id}</strong></td>
          <td><strong>${c.name}</strong> ${isTop1 ? '<span style="color:#D97706">★ Top 1</span>' : ''}</td>
          <td>${c.country}</td>
          <td class="text-right">${fmtNumber(c.txns)}</td>
          <td class="text-right">${fmtCurrency(c.vol)}</td>
          <td class="text-right" style="color:var(--primary);font-weight:700;">${fmtCurrency(c.rev)}</td>
          <td class="text-right">${fmtPct(takeRate)}</td>
          <td class="text-right">${fmtCurrency(avgTicket)}</td>
        </tr>
      `;
    }).join('');
  }

  // --- TAB 2: TOP 3 CLIENTES POR PRODUCTO (Responde Q3) ---
  function updateTopProductTable(txns) {
    const tbody = document.getElementById('tbodyTopProduct');
    const prods = ['Remesa', 'Exchange', 'Tarjeta', 'P2P'];
    const rows = [];

    prods.forEach(prod => {
      const pTxns = txns.filter(t => t.product === prod);
      const custMap = {};
      pTxns.forEach(t => {
        if (!custMap[t.cid]) {
          custMap[t.cid] = { id: t.cid, name: t.cname, country: t.ccountry, txns: 0, vol: 0 };
        }
        custMap[t.cid].txns += 1;
        custMap[t.cid].vol += t.vol_usd;
      });

      const sortedCusts = Object.values(custMap).sort((a, b) => {
        if (b.txns !== a.txns) return b.txns - a.txns;
        return b.vol - a.vol;
      });

      // Get Top 3
      const top3 = sortedCusts.slice(0, 3);
      top3.forEach((c, idx) => {
        rows.push({
          product: prod,
          rank: idx + 1,
          cid: c.id,
          name: c.name,
          country: c.country,
          txns: c.txns,
          vol: c.vol
        });
      });
    });

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td><span class="badge-tag tag-${r.product.toLowerCase()}">${r.product}</span></td>
        <td class="text-center"><span class="rank-badge rank-${r.rank}">#${r.rank}</span></td>
        <td><strong>#${r.cid}</strong></td>
        <td>${r.name}</td>
        <td>${r.country}</td>
        <td class="text-right"><strong>${fmtNumber(r.txns)}</strong> operaciones</td>
        <td class="text-right">${fmtCurrency(r.vol)}</td>
      </tr>
    `).join('');
  }

  // --- TAB 3: FIRST TRANSACTION PER CUSTOMER (Responde Q4) ---
  function renderFirstTxnsTable() {
    const tbody = document.getElementById('tbodyFirstTxn');
    let items = data.first_txns;

    if (firstTxnsSearch) {
      items = items.filter(f => 
        String(f.cid).includes(firstTxnsSearch) || 
        f.product.toLowerCase().includes(firstTxnsSearch.toLowerCase()) ||
        f.date.includes(firstTxnsSearch)
      );
    }

    const totalPages = Math.ceil(items.length / firstTxnsPerPage) || 1;
    if (firstTxnsPage > totalPages) firstTxnsPage = totalPages;
    if (firstTxnsPage < 1) firstTxnsPage = 1;

    const start = (firstTxnsPage - 1) * firstTxnsPerPage;
    const pageItems = items.slice(start, start + firstTxnsPerPage);

    document.getElementById('pageInfoFirstTxn').textContent = `Página ${firstTxnsPage} de ${totalPages} (${fmtNumber(items.length)} clientes)`;
    document.getElementById('btnPrevFirstTxn').disabled = firstTxnsPage <= 1;
    document.getElementById('btnNextFirstTxn').disabled = firstTxnsPage >= totalPages;

    tbody.innerHTML = pageItems.map(item => `
      <tr>
        <td><strong>Cliente #${item.cid}</strong></td>
        <td>Txn #${item.tid}</td>
        <td>${item.date}</td>
        <td><span class="badge-tag tag-${item.product.toLowerCase()}">${item.product}</span></td>
        <td class="text-right"><strong>${fmtCurrency(item.amount_usd)}</strong></td>
      </tr>
    `).join('');
  }

  // --- TAB 4: RAW TRANSACTIONS EXPLORER ---
  function renderRawTxnsTable(filteredTxns) {
    const tbody = document.getElementById('tbodyRawTxns');
    let items = filteredTxns;

    if (rawTxnsSearch) {
      const q = rawTxnsSearch.toLowerCase();
      items = items.filter(t => 
        String(t.id).includes(q) ||
        t.cname.toLowerCase().includes(q) ||
        t.origin.toLowerCase().includes(q) ||
        t.dest.toLowerCase().includes(q) ||
        t.product.toLowerCase().includes(q)
      );
    }

    const totalPages = Math.ceil(items.length / rawTxnsPerPage) || 1;
    if (rawTxnsPage > totalPages) rawTxnsPage = totalPages;
    if (rawTxnsPage < 1) rawTxnsPage = 1;

    const start = (rawTxnsPage - 1) * rawTxnsPerPage;
    const pageItems = items.slice(start, start + rawTxnsPerPage);

    document.getElementById('pageInfoTxns').textContent = `Página ${rawTxnsPage} de ${totalPages} (${fmtNumber(items.length)} txns)`;
    document.getElementById('btnPrevTxns').disabled = rawTxnsPage <= 1;
    document.getElementById('btnNextTxns').disabled = rawTxnsPage >= totalPages;

    tbody.innerHTML = pageItems.map(t => {
      const netRev = t.rev - t.disc_usd;
      return `
        <tr>
          <td>#${t.id}</td>
          <td>${t.date}</td>
          <td><span class="badge-tag tag-${t.product.toLowerCase()}">${t.product}</span></td>
          <td>${t.cname}</td>
          <td>${t.origin} ➔ ${t.dest}</td>
          <td class="text-right">${fmtCurrency(t.vol_usd)}</td>
          <td class="text-right" style="color:var(--primary);font-weight:600;">${fmtCurrency(t.rev)}</td>
          <td class="text-right" style="color:var(--text-light);">${fmtCurrency(t.disc_usd)}</td>
          <td class="text-right">${fmtCurrency(netRev)}</td>
        </tr>
      `;
    }).join('');
  }

  // --- EVENT LISTENERS ---
  elFilterProduct.addEventListener('change', (e) => {
    currentFilter.product = e.target.value;
    rawTxnsPage = 1;
    updateDashboard();
  });

  elFilterOrigin.addEventListener('change', (e) => {
    currentFilter.origin = e.target.value;
    rawTxnsPage = 1;
    updateDashboard();
  });

  elFilterDestiny.addEventListener('change', (e) => {
    currentFilter.destiny = e.target.value;
    rawTxnsPage = 1;
    updateDashboard();
  });

  elFilterYear.addEventListener('change', (e) => {
    currentFilter.year = e.target.value;
    rawTxnsPage = 1;
    updateDashboard();
  });

  elBtnResetFilters.addEventListener('click', () => {
    currentFilter = { product: 'ALL', origin: 'ALL', destiny: 'ALL', year: 'ALL' };
    elFilterProduct.value = 'ALL';
    elFilterOrigin.value = 'ALL';
    elFilterDestiny.value = 'ALL';
    elFilterYear.value = 'ALL';
    rawTxnsPage = 1;
    updateDashboard();
  });

  elBtnPrint.addEventListener('click', () => {
    window.print();
  });

  // Tabs Switcher
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Search in Top Clients
  document.getElementById('searchTopClients').addEventListener('input', () => {
    updateTopClientsTable(getFilteredTransactions());
  });

  // Pagination First Txns
  document.getElementById('btnPrevFirstTxns')?.addEventListener('click', () => {
    if (firstTxnsPage > 1) {
      firstTxnsPage--;
      renderFirstTxnsTable();
    }
  });
  document.getElementById('btnPrevFirstTxn').addEventListener('click', () => {
    if (firstTxnsPage > 1) {
      firstTxnsPage--;
      renderFirstTxnsTable();
    }
  });
  document.getElementById('btnNextFirstTxn').addEventListener('click', () => {
    firstTxnsPage++;
    renderFirstTxnsTable();
  });
  document.getElementById('searchFirstTxn').addEventListener('input', (e) => {
    firstTxnsSearch = e.target.value.trim();
    firstTxnsPage = 1;
    renderFirstTxnsTable();
  });

  // Pagination Raw Txns
  document.getElementById('btnPrevTxns').addEventListener('click', () => {
    if (rawTxnsPage > 1) {
      rawTxnsPage--;
      renderRawTxnsTable(getFilteredTransactions());
    }
  });
  document.getElementById('btnNextTxns').addEventListener('click', () => {
    rawTxnsPage++;
    renderRawTxnsTable(getFilteredTransactions());
  });
  document.getElementById('searchRawTxns').addEventListener('input', (e) => {
    rawTxnsSearch = e.target.value.trim();
    rawTxnsPage = 1;
    renderRawTxnsTable(getFilteredTransactions());
  });

  // Initialize Charts & App
  initProductChart();
  initTimelineChart();
  initDestinyChart();
  initCorridorsChart();
  updateDashboard();
});
