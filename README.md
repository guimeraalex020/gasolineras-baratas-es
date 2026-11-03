# ⛽ Gasolineras Baratas España

Buscador de gasolineras baratas en España con datos oficiales del Ministerio para la Transición Ecológica.

🔗 **Demo**: [Ver sitio](https://tu-usuario.github.io/gasolineras-baratas/)

## Características

- 🔍 **Búsqueda** por ciudad, localidad o código postal
- 📍 **Geolocalización** - Encuentra gasolineras cerca de ti
- ⛽ **Múltiples combustibles** - Gasóleo A, Gasolina 95, 98, GLP
- 📊 **Ordenación** por precio o distancia
- 🏙️ **40+ páginas SEO** para las principales ciudades de España
- 📱 **Mobile-first** - Diseño responsive optimizado
- 🔄 **Actualización automática** cada 30-60 minutos via GitHub Actions
- ✅ **Datos oficiales** del Ministerio

## Estructura del proyecto

```
├── index.html              # Página principal
├── css/
│   └── styles.css          # Estilos CSS
├── js/
│   ├── app.js              # Lógica principal
│   └── city.js             # Lógica páginas de ciudad
├── data/
│   └── precios.json        # Datos de precios (~12MB)
├── ciudad/
│   ├── madrid.html
│   ├── barcelona.html
│   └── ...                 # 40 páginas de ciudades
└── .github/
    └── workflows/
        └── update-precios.yml  # GitHub Action para actualizar datos
```

## Configurar GitHub Pages

### Opción 1: Desde raíz (recomendado)

1. Ve a **Settings** → **Pages** en tu repositorio
2. En **Source**, selecciona **Deploy from a branch**
3. Selecciona la rama `main` y carpeta `/ (root)`
4. Haz clic en **Save**
5. El sitio estará disponible en `https://tu-usuario.github.io/repo-name/`

### Opción 2: Usando /docs

Si prefieres la carpeta `/docs`:
1. Mueve todos los archivos a una carpeta `docs/`
2. En Settings → Pages, selecciona carpeta `/docs`

## Actualización automática de precios

El archivo `.github/workflows/update-precios.yml` configura una GitHub Action que:

- Se ejecuta cada 30 minutos automáticamente
- Descarga los últimos precios de la API oficial
- Valida el JSON recibido
- Hace commit y push si hay cambios

### Activar la Action

1. Ve a **Actions** en tu repositorio
2. Si ves "Workflows aren't being run", haz clic en "I understand my workflows, go ahead and enable them"
3. La Action empezará a ejecutarse según el cron definido

### Ejecutar manualmente

También puedes ejecutar la Action manualmente:
1. Ve a **Actions** → **Update Gas Prices**
2. Haz clic en **Run workflow**

## Fuente de datos

Los precios se obtienen de la API pública del Ministerio:

```
https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
```

La API tiene habilitado CORS (`Access-Control-Allow-Origin: *`), pero dado el tamaño (~12MB) se usa un snapshot local actualizado periódicamente para mejor rendimiento.

## Desarrollo local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/gasolineras-baratas.git
cd gasolineras-baratas

# Servir con cualquier servidor HTTP local
python -m http.server 8000
# o
npx serve .
```

Visita `http://localhost:8000` en tu navegador.

## Generar páginas de ciudades

Si necesitas regenerar las páginas de ciudades:

```bash
node generate-cities.js
```

## Slots de publicidad

El sitio incluye contenedores vacíos para anuncios que no rompen el layout:

```html
<div class="ad-slot" data-ad="hero"></div>   <!-- Después del hero -->
<div class="ad-slot" data-ad="results"></div> <!-- Después de resultados -->
<div class="ad-slot" data-ad="bottom"></div>  <!-- Antes del footer -->
```

Para integrar anuncios (AdSense, etc.), inserta el código dentro de estos contenedores.

## Stack técnico

- **HTML5** semántico con Schema.org
- **CSS3** con variables CSS, Flexbox y Grid
- **JavaScript** vanilla (ES6+, sin dependencias)
- **GitHub Actions** para CI/CD y actualización de datos
- **GitHub Pages** para hosting estático gratuito

## Licencia

MIT License - Uso libre para proyectos personales y comerciales.

## Disclaimer

Los precios mostrados son datos oficiales del Ministerio para la Transición Ecológica y el Reto Demográfico. Los precios en surtidor pueden variar. Esta herramienta es solo informativa y no garantiza la exactitud de los precios en el momento de la compra.
