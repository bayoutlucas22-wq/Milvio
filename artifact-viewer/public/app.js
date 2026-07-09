document.addEventListener('DOMContentLoaded', () => {
  const fileListEl = document.getElementById('file-list');
  const currentFileNameEl = document.getElementById('current-file-name');
  const contentBodyEl = document.getElementById('content-body');
  
  const knowledgeListEl = document.getElementById('knowledge-list');
  const knowledgeTitleEl = document.getElementById('knowledge-title');
  const knowledgeBodyEl = document.getElementById('knowledge-body');

  let currentActiveItem = null;
  let chartInstances = []; // To keep track and destroy old charts

  // Tab Switching Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabViews = document.querySelectorAll('.tab-view');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
      
      if (targetId === 'knowledge-view' && knowledgeListEl.children.length <= 1) {
        loadKnowledge();
      }
    });
  });

  // Fetch the list of artifact files
  fetch('/api/artifacts')
    .then(res => res.json())
    .then(files => {
      fileListEl.innerHTML = '';
      if (files.length === 0) {
        fileListEl.innerHTML = '<div class="loading">No artifacts found.</div>';
        return;
      }

      files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.textContent = file;
        item.title = file;

        item.addEventListener('click', () => {
          if (currentActiveItem) {
            currentActiveItem.classList.remove('active');
          }
          item.classList.add('active');
          currentActiveItem = item;
          loadFileContent(file);
        });

        fileListEl.appendChild(item);
      });
    })
    .catch(err => {
      console.error(err);
      fileListEl.innerHTML = '<div class="loading" style="color: #ef4444;">Failed to load files.</div>';
    });

  function loadFileContent(filePath) {
    currentFileNameEl.textContent = 'Loading...';
    contentBodyEl.innerHTML = '<div class="loading">Fetching data...</div>';

    // Clear old charts
    chartInstances.forEach(chart => chart.destroy());
    chartInstances = [];

    fetch(`/api/artifacts/content?path=${encodeURIComponent(filePath)}`)
      .then(res => res.json())
      .then(data => {
        currentFileNameEl.textContent = filePath;
        renderData(data);
      })
      .catch(err => {
        console.error(err);
        currentFileNameEl.textContent = 'Error';
        contentBodyEl.innerHTML = '<div class="empty-state">Failed to load content.</div>';
      });
  }

  function renderData(data) {
    contentBodyEl.innerHTML = '';
    
    // Check if it's the specific array format with headers and rows
    if (Array.isArray(data) && data.length > 0 && data[0].headers && data[0].rows) {
      // If it's a commissions report, render dashboard + table
      if (data[0].report_type === 'commissions' || data[0].sheet_name?.includes('Comissão')) {
        renderDashboard(data[0]);
      }
      renderTables(data);
    } else {
      renderJson(data);
    }
  }

  // ==== KNOWLEDGE TAB LOGIC ====
  let currentActiveKnowledge = null;
  
  function loadKnowledge() {
    fetch(`/api/artifacts/content?path=swagger_knowledge.json`)
      .then(res => res.json())
      .then(data => {
        knowledgeListEl.innerHTML = '';
        if (data && data.tags) {
          data.tags.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.textContent = tag.name;
            item.addEventListener('click', () => {
              if (currentActiveKnowledge) {
                currentActiveKnowledge.classList.remove('active');
              }
              item.classList.add('active');
              currentActiveKnowledge = item;
              renderKnowledgeDomain(tag);
            });
            knowledgeListEl.appendChild(item);
          });
          
          // Optionally initialize mermaid if not already
          if (window.mermaid) {
            mermaid.initialize({ startOnLoad: false, theme: 'dark' });
          }
        }
      })
      .catch(err => {
        console.error('Failed to load swagger_knowledge.json', err);
        knowledgeListEl.innerHTML = '<div class="loading" style="color: #ef4444;">Failed to load knowledge.</div>';
      });
  }

  function renderKnowledgeDomain(tag) {
    knowledgeTitleEl.textContent = tag.name;
    
    // Parse Markdown to HTML
    if (window.marked) {
      const htmlContent = marked.parse(tag.description || '*No description available.*');
      knowledgeBodyEl.innerHTML = htmlContent;
      
      // Render mermaid diagrams dynamically
      if (window.mermaid) {
        const mermaidDivs = knowledgeBodyEl.querySelectorAll('.language-mermaid');
        mermaidDivs.forEach((el, index) => {
          const graphDefinition = el.textContent;
          const newDiv = document.createElement('div');
          newDiv.className = 'mermaid';
          const id = `mermaid-${Date.now()}-${index}`;
          newDiv.id = id;
          
          // Replace the <pre><code> block with our mermaid div
          const preElement = el.parentElement;
          preElement.parentNode.replaceChild(newDiv, preElement);
          
          // Render it
          mermaid.render(id + '-svg', graphDefinition).then(({ svg }) => {
            newDiv.innerHTML = svg;
          }).catch(e => {
            console.error('Mermaid rendering failed', e);
          });
        });
      }
    } else {
      knowledgeBodyEl.innerHTML = `<pre>${tag.description}</pre>`;
    }
  }

  // ==== DASHBOARD LOGIC ====
  function parseBrNumber(val) {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  function renderDashboard(section) {
    const rows = section.rows;
    let totalCommission = 0;
    let totalSales = 0;
    const orders = new Set();
    const productCommissionMap = {};
    const dateCommissionMap = {};

    rows.forEach(row => {
      const commTotal = parseBrNumber(row['Comissão Total']);
      const unitPrice = parseBrNumber(row['Preço Unitário de Venda']);
      const qty = parseBrNumber(row['Quantidade']);
      const product = row['Produto'] || 'Unknown';
      const date = row['Data do Pedido'] || 'Unknown';
      const orderId = row['No. do Pedido'];

      totalCommission += commTotal;
      totalSales += (unitPrice * qty);
      if (orderId) orders.add(orderId);

      productCommissionMap[product] = (productCommissionMap[product] || 0) + commTotal;
      dateCommissionMap[date] = (dateCommissionMap[date] || 0) + commTotal;
    });

    const totalOrders = orders.size;
    let topProduct = '-';
    let maxComm = -1;
    for (const [prod, comm] of Object.entries(productCommissionMap)) {
      if (comm > maxComm) {
        maxComm = comm;
        topProduct = prod;
      }
    }

    const dashboardContainer = document.createElement('div');
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'dashboard-grid';

    const kpis = [
      { label: 'Total Commission', value: formatCurrency(totalCommission) },
      { label: 'Total Sales (Gross)', value: formatCurrency(totalSales) },
      { label: 'Total Orders', value: totalOrders },
      { label: 'Top Product (by Comm.)', value: topProduct.length > 25 ? topProduct.substring(0, 25) + '...' : topProduct }
    ];

    kpis.forEach(kpi => {
      const card = document.createElement('div');
      card.className = 'kpi-card';
      card.innerHTML = `
        <div class="kpi-label">${kpi.label}</div>
        <div class="kpi-value">${kpi.value}</div>
      `;
      kpiGrid.appendChild(card);
    });

    dashboardContainer.appendChild(kpiGrid);

    const chartsGrid = document.createElement('div');
    chartsGrid.className = 'charts-grid';

    const sortedProducts = Object.entries(productCommissionMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
      
    const chart1Container = createChartCard('Top 5 Products (Commission)', 'chart-products');
    chartsGrid.appendChild(chart1Container.card);

    const sortedDates = Object.entries(dateCommissionMap)
      .sort((a, b) => new Date(a[0].split('/').reverse().join('-')) - new Date(b[0].split('/').reverse().join('-')));
      
    const chart2Container = createChartCard('Commission over Time', 'chart-timeline');
    chartsGrid.appendChild(chart2Container.card);

    dashboardContainer.appendChild(chartsGrid);
    contentBodyEl.appendChild(dashboardContainer);

    if (window.Chart) {
      Chart.defaults.color = '#9ba1a6';
      Chart.defaults.font.family = 'Inter, sans-serif';

      const ctx1 = chart1Container.canvas.getContext('2d');
      const chart1 = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: sortedProducts.map(p => p[0].length > 15 ? p[0].substring(0, 15) + '...' : p[0]),
          datasets: [{
            label: 'Commission (R$)',
            data: sortedProducts.map(p => p[1]),
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
      chartInstances.push(chart1);

      const ctx2 = chart2Container.canvas.getContext('2d');
      const chart2 = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: sortedDates.map(d => d[0]),
          datasets: [{
            label: 'Commission (R$)',
            data: sortedDates.map(d => d[1]),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
      chartInstances.push(chart2);
    }
  }

  function createChartCard(title, id) {
    const card = document.createElement('div');
    card.className = 'chart-card';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    
    const inner = document.createElement('div');
    inner.className = 'chart-container-inner';
    
    const canvas = document.createElement('canvas');
    canvas.id = id;
    
    inner.appendChild(canvas);
    card.appendChild(h3);
    card.appendChild(inner);
    
    return { card, canvas };
  }

  function renderTables(sections) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '32px';
    container.style.marginTop = '16px';

    const headerTitle = document.createElement('h2');
    headerTitle.textContent = 'Raw Data Table';
    headerTitle.style.color = 'var(--text-primary)';
    headerTitle.style.fontSize = '1.25rem';
    headerTitle.style.borderBottom = '1px solid var(--border-color)';
    headerTitle.style.paddingBottom = '12px';
    container.appendChild(headerTitle);

    sections.forEach(section => {
      const wrapper = document.createElement('div');
      
      const tableContainer = document.createElement('div');
      tableContainer.className = 'table-container';

      const table = document.createElement('table');
      table.className = 'artifact-table';

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      section.headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const displayRows = section.rows; 
      displayRows.forEach(rowObj => {
        const tr = document.createElement('tr');
        section.headers.forEach(headerText => {
          const td = document.createElement('td');
          td.textContent = rowObj[headerText] !== undefined ? rowObj[headerText] : '';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      tableContainer.appendChild(table);
      wrapper.appendChild(tableContainer);
      container.appendChild(wrapper);
    });

    contentBodyEl.appendChild(container);
  }

  function renderJson(data) {
    const container = document.createElement('div');
    container.className = 'json-container';
    
    const pre = document.createElement('pre');
    pre.innerHTML = syntaxHighlight(JSON.stringify(data, null, 2));
    
    container.appendChild(pre);
    contentBodyEl.appendChild(container);
  }

  function syntaxHighlight(json) {
    if (!json) return '';
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
  }
});
