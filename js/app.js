// === Gas Station Finder App ===

const App = {
  stations: [],
  filteredStations: [],
  userLocation: null,
  currentFuelType: 'gasoleoA',
  currentSort: 'price',
  searchQuery: '',
  isLoading: true,
  dataTimestamp: null,

  fuelTypes: {
    gasoleoA: { key: 'Precio Gasoleo A', label: 'Gasóleo A', short: 'Diésel' },
    gasolina95: { key: 'Precio Gasolina 95 E5', label: 'Gasolina 95', short: 'G95' },
    gasolina98: { key: 'Precio Gasolina 98 E5', label: 'Gasolina 98', short: 'G98' },
    gasoleoB: { key: 'Precio Gasoleo B', label: 'Gasóleo B', short: 'Agric.' },
    glp: { key: 'Precio Gases licuados del petróleo', label: 'GLP', short: 'GLP' }
  },

  async init() {
    this.bindEvents();
    this.checkUrlParams();
    await this.loadData();
    this.render();
  },

  bindEvents() {
    const searchInput = document.getElementById('searchInput');
    const fuelSelect = document.getElementById('fuelSelect');
    const searchBtn = document.getElementById('searchBtn');
    const geoBtn = document.getElementById('geoBtn');

    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.searchQuery = searchInput.value.trim();
        this.filterAndSort();
        this.renderResults();
      }, 300));

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.searchQuery = searchInput.value.trim();
          this.filterAndSort();
          this.renderResults();
        }
      });
    }

    if (fuelSelect) {
      fuelSelect.addEventListener('change', () => {
        this.currentFuelType = fuelSelect.value;
        this.filterAndSort();
        this.renderResults();
        this.updateSortButtons();
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this.searchQuery = searchInput?.value.trim() || '';
        this.filterAndSort();
        this.renderResults();
      });
    }

    if (geoBtn) {
      geoBtn.addEventListener('click', () => this.requestGeolocation());
    }

    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentSort = btn.dataset.sort;
        this.updateSortButtons();
        this.filterAndSort();
        this.renderResults();
      });
    });

    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        item.classList.toggle('open');
      });
    });
  },

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const city = params.get('ciudad');
    const cp = params.get('cp');
    const fuel = params.get('combustible');

    if (city) {
      this.searchQuery = city;
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = city;
    } else if (cp) {
      this.searchQuery = cp;
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = cp;
    }

    if (fuel && this.fuelTypes[fuel]) {
      this.currentFuelType = fuel;
      const fuelSelect = document.getElementById('fuelSelect');
      if (fuelSelect) fuelSelect.value = fuel;
    }
  },

  async loadData() {
    this.isLoading = true;
    this.renderLoading();

    try {
      const response = await fetch('data/precios.json');
      if (!response.ok) throw new Error('Failed to load data');

      const data = await response.json();
      this.stations = data.ListaEESSPrecio || [];
      this.dataTimestamp = data.Fecha || null;

      this.preprocessStations();
      this.filterAndSort();
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading data:', error);
      this.isLoading = false;
      this.renderError();
    }
  },

  preprocessStations() {
    this.stations = this.stations.map(station => {
      const lat = this.parseCoord(station['Latitud']);
      const lng = this.parseCoord(station['Longitud (WGS84)']);

      return {
        ...station,
        _lat: lat,
        _lng: lng,
        _municipioNorm: this.normalizeText(station['Municipio'] || ''),
        _localidadNorm: this.normalizeText(station['Localidad'] || ''),
        _provinciaNorm: this.normalizeText(station['Provincia'] || ''),
        _cp: station['C.P.'] || '',
        _gasoleoA: this.parsePrice(station['Precio Gasoleo A']),
        _gasolina95: this.parsePrice(station['Precio Gasolina 95 E5']),
        _gasolina98: this.parsePrice(station['Precio Gasolina 98 E5']),
        _gasoleoB: this.parsePrice(station['Precio Gasoleo B']),
        _glp: this.parsePrice(station['Precio Gases licuados del petróleo'])
      };
    });
  },

  parseCoord(val) {
    if (!val) return null;
    const num = parseFloat(val.replace(',', '.'));
    return isNaN(num) ? null : num;
  },

  parsePrice(val) {
    if (!val || val === '') return null;
    const num = parseFloat(val.replace(',', '.'));
    return isNaN(num) ? null : num;
  },

  normalizeText(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '');
  },

  filterAndSort() {
    const query = this.normalizeText(this.searchQuery);
    const fuelKey = '_' + this.currentFuelType.replace('gasolina', 'gasolina').replace('gasoleo', 'gasoleo');

    let filtered = this.stations;

    if (query) {
      filtered = this.stations.filter(s => {
        return s._municipioNorm.includes(query) ||
               s._localidadNorm.includes(query) ||
               s._provinciaNorm.includes(query) ||
               s._cp.includes(query);
      });
    }

    const priceKey = {
      gasoleoA: '_gasoleoA',
      gasolina95: '_gasolina95',
      gasolina98: '_gasolina98',
      gasoleoB: '_gasoleoB',
      glp: '_glp'
    }[this.currentFuelType];

    if (this.currentSort === 'price') {
      filtered.sort((a, b) => {
        const priceA = a[priceKey];
        const priceB = b[priceKey];
        if (priceA === null && priceB === null) return 0;
        if (priceA === null) return 1;
        if (priceB === null) return -1;
        return priceA - priceB;
      });
    } else if (this.currentSort === 'distance' && this.userLocation) {
      filtered = filtered.map(s => ({
        ...s,
        _distance: this.calculateDistance(
          this.userLocation.lat,
          this.userLocation.lng,
          s._lat,
          s._lng
        )
      }));
      filtered.sort((a, b) => {
        if (a._distance === null && b._distance === null) return 0;
        if (a._distance === null) return 1;
        if (b._distance === null) return -1;
        return a._distance - b._distance;
      });
    }

    this.filteredStations = filtered;
  },

  calculateDistance(lat1, lng1, lat2, lng2) {
    if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
      return null;
    }

    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRad(deg) {
    return deg * (Math.PI / 180);
  },

  requestGeolocation() {
    const geoBtn = document.getElementById('geoBtn');

    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    geoBtn?.classList.add('active');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.currentSort = 'distance';
        this.searchQuery = '';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';

        this.updateSortButtons();
        this.filterAndSort();
        this.renderResults();
      },
      (error) => {
        geoBtn?.classList.remove('active');
        let message = 'No se pudo obtener tu ubicación';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Permiso de ubicación denegado. Actívalo en la configuración de tu navegador.';
        }
        alert(message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  },

  updateSortButtons() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === this.currentSort);
    });
  },

  render() {
    this.renderTrustChip();
    this.renderResults();
  },

  renderTrustChip() {
    const chip = document.getElementById('trustChip');
    if (chip && this.dataTimestamp) {
      chip.innerHTML = `
        <span class="trust-chip-icon">✓</span>
        <span>Datos oficiales Ministerio · Actualizado: ${this.dataTimestamp}</span>
      `;
    }
  },

  renderLoading() {
    const grid = document.getElementById('resultsGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <span class="loading-text">Cargando gasolineras...</span>
        </div>
      `;
    }
  },

  renderError() {
    const grid = document.getElementById('resultsGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="state-message">
          <div class="state-icon">⚠️</div>
          <h3 class="state-title">Error al cargar datos</h3>
          <p class="state-text">No se pudieron cargar los precios. Por favor, recarga la página o inténtalo más tarde.</p>
        </div>
      `;
    }
  },

  renderResults() {
    const grid = document.getElementById('resultsGrid');
    const countEl = document.getElementById('resultsCount');

    if (!grid) return;

    const displayCount = Math.min(this.filteredStations.length, 50);
    const total = this.filteredStations.length;

    if (countEl) {
      if (total === 0) {
        countEl.innerHTML = 'No se encontraron gasolineras';
      } else {
        countEl.innerHTML = `Mostrando <strong>${displayCount}</strong> de <strong>${total.toLocaleString('es-ES')}</strong> gasolineras`;
      }
    }

    if (total === 0) {
      grid.innerHTML = `
        <div class="state-message">
          <div class="state-icon">🔍</div>
          <h3 class="state-title">Sin resultados</h3>
          <p class="state-text">No encontramos gasolineras para "${this.escapeHtml(this.searchQuery)}". Prueba con otro término o código postal.</p>
        </div>
      `;
      return;
    }

    const priceKey = {
      gasoleoA: '_gasoleoA',
      gasolina95: '_gasolina95',
      gasolina98: '_gasolina98',
      gasoleoB: '_gasoleoB',
      glp: '_glp'
    }[this.currentFuelType];

    const stationsToShow = this.filteredStations.slice(0, 50);
    const minPrice = Math.min(...stationsToShow.map(s => s[priceKey]).filter(p => p !== null));

    grid.innerHTML = stationsToShow.map(station => this.renderStationCard(station, minPrice, priceKey)).join('');
  },

  renderStationCard(station, minPrice, priceKey) {
    const brand = station['Rótulo'] || 'Gasolinera';
    const address = station['Dirección'] || '';
    const locality = station['Localidad'] || '';
    const municipality = station['Municipio'] || '';
    const province = station['Provincia'] || '';
    const schedule = station['Horario'] || '';

    const gasoleoA = station._gasoleoA;
    const gasolina95 = station._gasolina95;
    const gasolina98 = station._gasolina98;

    const currentPrice = station[priceKey];
    const isCheapest = currentPrice !== null && currentPrice === minPrice;

    let distanceHtml = '';
    if (this.userLocation && station._distance !== null && station._distance !== undefined) {
      const dist = station._distance;
      distanceHtml = `<span class="station-distance">${dist < 1 ? (dist * 1000).toFixed(0) + ' m' : dist.toFixed(1) + ' km'}</span>`;
    }

    return `
      <article class="station-card">
        <div class="station-header">
          <h3 class="station-brand">${this.escapeHtml(brand)}</h3>
          ${distanceHtml}
        </div>
        <p class="station-address">${this.escapeHtml(address)}</p>
        <p class="station-location">${this.escapeHtml(locality)}${locality && municipality && locality !== municipality ? ', ' + this.escapeHtml(municipality) : ''} · ${this.escapeHtml(province)}</p>
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

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
