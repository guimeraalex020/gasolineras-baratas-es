// === City Page Logic ===

const CityApp = {
  stations: [],
  cityStations: [],
  cityName: '',
  citySearch: '',
  currentFuelType: 'gasoleoA',
  currentSort: 'price',
  dataTimestamp: null,

  fuelTypes: {
    gasoleoA: { key: 'Precio Gasoleo A', label: 'Gasóleo A' },
    gasolina95: { key: 'Precio Gasolina 95 E5', label: 'Gasolina 95' },
    gasolina98: { key: 'Precio Gasolina 98 E5', label: 'Gasolina 98' }
  },

  async init(cityName, searchTerms) {
    this.cityName = cityName;
    this.citySearch = searchTerms || cityName;
    this.bindEvents();
    await this.loadData();
  },

  bindEvents() {
    const fuelSelect = document.getElementById('fuelSelect');
    if (fuelSelect) {
      fuelSelect.addEventListener('change', () => {
        this.currentFuelType = fuelSelect.value;
        this.sortStations();
        this.render();
      });
    }

    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentSort = btn.dataset.sort;
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.sortStations();
        this.render();
      });
    });

    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.faq-item').classList.toggle('open');
      });
    });
  },

  async loadData() {
    try {
      const response = await fetch('../data/precios.json');
      if (!response.ok) throw new Error('Failed to load data');

      const data = await response.json();
      this.stations = data.ListaEESSPrecio || [];
      this.dataTimestamp = data.Fecha || null;

      this.filterCity();
      this.sortStations();
      this.render();
      this.updateStats();
    } catch (error) {
      console.error('Error loading data:', error);
      this.renderError();
    }
  },

  normalizeText(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '');
  },

  parsePrice(val) {
    if (!val || val === '') return null;
    const num = parseFloat(val.replace(',', '.'));
    return isNaN(num) ? null : num;
  },

  filterCity() {
    const searchTerms = this.citySearch.split(',').map(t => this.normalizeText(t.trim()));

    this.cityStations = this.stations.filter(s => {
      const muni = this.normalizeText(s['Municipio'] || '');
      const loc = this.normalizeText(s['Localidad'] || '');
      return searchTerms.some(term => muni.includes(term) || loc.includes(term));
    }).map(s => ({
      ...s,
      _gasoleoA: this.parsePrice(s['Precio Gasoleo A']),
      _gasolina95: this.parsePrice(s['Precio Gasolina 95 E5']),
      _gasolina98: this.parsePrice(s['Precio Gasolina 98 E5'])
    }));
  },

  sortStations() {
    const priceKey = {
      gasoleoA: '_gasoleoA',
      gasolina95: '_gasolina95',
      gasolina98: '_gasolina98'
    }[this.currentFuelType];

    this.cityStations.sort((a, b) => {
      const priceA = a[priceKey];
      const priceB = b[priceKey];
      if (priceA === null && priceB === null) return 0;
      if (priceA === null) return 1;
      if (priceB === null) return -1;
      return priceA - priceB;
    });
  },

  updateStats() {
    const countEl = document.getElementById('stationCount');
    const minDieselEl = document.getElementById('minDiesel');
    const min95El = document.getElementById('min95');
    const timestampEl = document.getElementById('timestamp');

    if (countEl) countEl.textContent = this.cityStations.length;

    const dieselPrices = this.cityStations.map(s => s._gasoleoA).filter(p => p !== null);
    const g95Prices = this.cityStations.map(s => s._gasolina95).filter(p => p !== null);

    if (minDieselEl && dieselPrices.length) {
      minDieselEl.textContent = Math.min(...dieselPrices).toFixed(3).replace('.', ',') + ' €';
    }
    if (min95El && g95Prices.length) {
      min95El.textContent = Math.min(...g95Prices).toFixed(3).replace('.', ',') + ' €';
    }
    if (timestampEl && this.dataTimestamp) {
      timestampEl.textContent = this.dataTimestamp;
    }
  },

  render() {
    const grid = document.getElementById('resultsGrid');
    const countEl = document.getElementById('resultsCount');

    if (!grid) return;

    const total = this.cityStations.length;

    if (countEl) {
      countEl.innerHTML = `<strong>${total}</strong> gasolineras en ${this.cityName}`;
    }

    if (total === 0) {
      grid.innerHTML = `
        <div class="state-message">
          <div class="state-icon">🔍</div>
          <h3 class="state-title">Sin resultados</h3>
          <p class="state-text">No encontramos gasolineras en ${this.cityName}.</p>
        </div>
      `;
      return;
    }

    const priceKey = {
      gasoleoA: '_gasoleoA',
      gasolina95: '_gasolina95',
      gasolina98: '_gasolina98'
    }[this.currentFuelType];

    const displayStations = this.cityStations.slice(0, 50);
    const minPrice = Math.min(...displayStations.map(s => s[priceKey]).filter(p => p !== null));

    grid.innerHTML = displayStations.map(station => this.renderCard(station, minPrice, priceKey)).join('');
  },

  renderCard(station, minPrice, priceKey) {
    const brand = station['Rótulo'] || 'Gasolinera';
    const address = station['Dirección'] || '';
    const locality = station['Localidad'] || '';
    const schedule = station['Horario'] || '';

    const gasoleoA = station._gasoleoA;
    const gasolina95 = station._gasolina95;
    const gasolina98 = station._gasolina98;

    const currentPrice = station[priceKey];
    const isCheapest = currentPrice !== null && currentPrice === minPrice;

    return `
      <article class="station-card">
        <div class="station-header">
          <h3 class="station-brand">${this.escapeHtml(brand)}</h3>
        </div>
        <p class="station-address">${this.escapeHtml(address)}</p>
        <p class="station-location">${this.escapeHtml(locality)}</p>
        <div class="station-prices">
          <div class="price-item">
            <div class="price-label">Gasóleo A</div>
            <div class="price-value ${gasoleoA !== null && priceKey === '_gasoleoA' && isCheapest ? 'cheapest' : ''} ${gasoleoA === null ? 'na' : ''}">${gasoleoA !== null ? gasoleoA.toFixed(3).replace('.', ',') + ' €' : 'N/D'}</div>
          </div>
          <div class="price-item">
            <div class="price-label">Gasolina 95</div>
            <div class="price-value ${gasolina95 !== null && priceKey === '_gasolina95' && isCheapest ? 'cheapest' : ''} ${gasolina95 === null ? 'na' : ''}">${gasolina95 !== null ? gasolina95.toFixed(3).replace('.', ',') + ' €' : 'N/D'}</div>
          </div>
          <div class="price-item">
            <div class="price-label">Gasolina 98</div>
            <div class="price-value ${gasolina98 !== null && priceKey === '_gasolina98' && isCheapest ? 'cheapest' : ''} ${gasolina98 === null ? 'na' : ''}">${gasolina98 !== null ? gasolina98.toFixed(3).replace('.', ',') + ' €' : 'N/D'}</div>
          </div>
        </div>
        ${schedule ? `<div class="station-schedule"><span class="station-schedule-icon">🕐</span> ${this.escapeHtml(schedule)}</div>` : ''}
      </article>
    `;
  },

  renderError() {
    const grid = document.getElementById('resultsGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="state-message">
          <div class="state-icon">⚠️</div>
          <h3 class="state-title">Error al cargar datos</h3>
          <p class="state-text">No se pudieron cargar los precios. Por favor, recarga la página.</p>
        </div>
      `;
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
