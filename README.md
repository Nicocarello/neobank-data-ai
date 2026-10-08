# Neobank Analytics | Executive BI Dashboard & Copiloto Autónomo Text-to-SQL

Plataforma ejecutiva de Business Intelligence y Copiloto de Inteligencia Artificial para el análisis transaccional multimoneda, monitoreo de Gross Revenue, Take Rate y corredores transfronterizos (Cross-Border) de un **Neobanco Global**.

---

## 🌟 Características Principales

1. **Dashboard Ejecutivo Interactivo**:
   - Monitoreo en tiempo real de **5,000 transacciones auditadas** y **1,000 clientes**.
   - Normalización de volumen multimoneda a **USD ($12,650,673.69 USD)** evitando distorsiones por monedas heterogéneas (CLP, ARS, COP, MXN, PEN).
   - Cálculo preciso de **Gross Revenue ($1,282,364.89 USD)** y **Take Rate Consolidado (10.14%)**.
   - Desglose por líneas de producto: **Remesa, Tarjeta, Exchange y P2P**.
   - Matriz de corredores cross-border origen ➔ destino.

2. **Copiloto BI Autónomo Text-to-SQL**:
   - **Cero Dependencias Externas Requeridas:** Funciona de forma 100% nativa con un motor semántico determinista sin necesidad de claves de API de pago.
   - **Reglas Semánticas Fintech Estrictas:** Previene errores contables, bloquea inyecciones y mutaciones (`DROP`, `DELETE`, `UPDATE`) y ejecuta en modo seguro **SQLite Read-Only**.
   - **Gráficos Dinámicos de Series Temporales:** Renderizado automático con Chart.js con soporte **Dual Y-Axis** (volumen y revenue en escala USD a la izquierda, take rate % a la derecha).
   - **Informes Ejecutivos C-Level:** Genera diagnósticos de negocio detallados con un solo clic.
   - **Conectores Opcionales de IA:** Soporte plug-and-play para conectar **OpenAI (GPT-4o-mini)** o **Google Gemini (Gemini 2.5 Flash Lite)** directamente desde el modal de configuración en la interfaz.

3. **Explorador Transaccional & Auditoría**:
   - Tablas paginadas y filtrables en vivo con búsqueda instantánea.
   - Exportación de resultados a **CSV** y copiado de **SQL ANSI optimizado**.

---

## 🚀 Cómo Ejecutar la Aplicación

El proyecto está diseñado con **cero dependencias externas**: no requiere `npm install`, paquetes Node.js ni librerías de terceros en `pip`. Corre 100% sobre la biblioteca estándar de **Python 3.8+**.

### 📋 Requisitos Previos
- Tener instalado **Python 3.8** o superior ([python.org](https://www.python.org/downloads/)).
- Un navegador web moderno (Chrome, Edge, Firefox, Safari).

---

### Opción 1: El Comando Estándar (Windows, macOS, Linux)

Clona el repositorio e inicia el servidor:

```bash
git clone https://github.com/Nicocarello/neobank-data-ai.git
cd neobank-data-ai
python serve.py
```

#### ¿Qué ocurre al ejecutar este comando?
1. 🔌 **Inicia el servidor web local** en el puerto `8080`.
2. 🔒 **Abre la base de datos** `neobank.db` en modo seguro *Read-Only* (`mode=ro`).
3. ⚡ **Habilita la API REST** con soporte para:
   - `POST /api/chat` (Consultas en lenguaje natural convertidas a SQL + analítica).
   - `POST /api/sql` (Ejecución y validación directa de consultas SQL).
4. 🌐 **Abre automáticamente tu navegador** en:
   ```text
   http://localhost:8080/index.html
   ```

*(Para detener el servidor en cualquier momento, presiona `Ctrl + C` en tu terminal).*

---

### Opción 2: Windows sin Terminal (1 Clic)

Si estás en Windows y prefieres no abrir la consola manualmente:
1. Haz doble clic sobre el archivo:
   ```cmd
   run_dashboard.bat
   ```
2. Se abrirá la ventana de comandos, arrancará el servidor y se lanzará automáticamente tu navegador web con la aplicación lista para usar.

---

### Opción 3: Modo Vista Rápida / Offline (Sin usar Python)

Si deseas inspeccionar el dashboard o no tienes Python a mano:
- Abre directamente el archivo en tu navegador:
  ```text
  dashboard/index.html
  ```
- El dashboard cargará todos los KPIs, gráficos y tablas con total interactividad.
- El **Copiloto AI conmutará automáticamente a su motor semántico en cliente** ejecutando sobre `dashboard/data.js` sin requerir servidor activo.

---

## 🤖 Preguntas Listas para Probar en el Copiloto

Una vez dentro de la pestaña **Copiloto BI AI**, puedes hacer clic en las tarjetas de sugerencia o escribir directamente en lenguaje natural:

| Pregunta / Intención | Qué Responde el Sistema |
| :--- | :--- |
| **`📋 Resumen Ejecutivo del Último Mes`** | Informe C-Level completo de Enero 2025: volumen, run-rate proyectado, take rate por producto y corredores líderes. |
| **`📊 Evolución mensual`** | **Serie temporal de 13 meses** con gráfico interactivo multieje (Volumen USD, Revenue USD y Take Rate %). |
| **`👑 Cliente con más revenue`** | Identifica al cliente líder en facturación histórica (John Peterson, $4,620.06 USD). |
| **`📦 Transacciones por producto`** | Desglose transaccional, ticket promedio, revenue y take rate de los 4 productos. |
| **`🌎 Top 10 países destino`** | Ranking de países receptores de fondos liderado por Perú, Chile y Argentina. |
| **`💵 Dinero enviado por cliente`** | Volumen total consolidado en USD enviado por cada cliente usando `LEFT JOIN`. |
| **`🏆 Top 3 clientes por producto`** | Ranking de clientes con más operaciones por producto utilizando `DENSE_RANK()`. |
| **`🚀 Primera transacción (Cohortes)`** | Cohorte de activación con la fecha y producto de primera compra de cada usuario. |
| **`🌐 Rutas con más volumen USD`** | Análisis de corredores transfronterizos (ej. Colombia ➔ Perú, Perú ➔ México). |
| **`🎟️ Descuentos vs Revenue`** | Impacto de descuentos promocionales frente al Gross Revenue generado. |
| **`💤 Clientes inactivos`** | Respuesta directa con el listado de clientes registrados que aún no han operado. |

---

## 🏛️ Reglas Semánticas & Principios Fintech

El sistema implementa 5 principios financieros irrenunciables para garantizar precisión contable:

1. **Normalización Multimoneda en USD:**  
   Nunca sumar importes nominales en monedas locales heterogéneas (`origin_amount` o `destiny_amount`). Se utiliza exclusivamente `origin_amount_usd` y `destiny_amount_usd`.
2. **Gross Revenue Exacto:**  
   El ingreso generado por el Neobanco está contenido en la columna auditada `revenue` (ya expresada en USD).
3. **Cálculo de Take Rate (%):**  
   `ROUND(SUM(revenue) / NULLIF(SUM(origin_amount_usd), 0) * 100, 2)`.
4. **Preservación de Usuarios (Inactividad):**  
   Para análisis de cohortes o clientes inactivos, se utiliza siempre `LEFT JOIN` para preservar a los usuarios con 0 transacciones.
5. **Seguridad Read-Only:**  
   La réplica de SQLite (`neobank.db`) se abre en modo `mode=ro`, bloqueando cualquier sentencia destructiva o de mutación.

---

## 📁 Estructura del Repositorio

```text
neobank-data-ai/
├── dashboard/                      # Aplicación Web Frontend (Vanilla JS + CSS + HTML5)
│   ├── index.html                  # Dashboard principal y estudio del Copiloto
│   ├── style.css                   # Sistema de diseño moderno, variables CSS y dark accents
│   ├── app.js                      # Lógica reactiva de KPIs, filtros y tablas
│   ├── copilot.js                  # Interfaz de chat, renderizado Chart.js y motor cliente
│   ├── data.js                     # Dataset transaccional optimizado para cliente
│   └── logo.png                    # Identidad visual de Neobank
│
├── copilot_engine.py               # Motor Text-to-SQL determinista con auto-corrección
├── serve.py                        # Servidor HTTP local multi-threaded con API REST
├── neobank.db                      # Base de datos SQLite auditada (customer & transaction)
├── run_dashboard.bat               # Launcher de 1 clic para entornos Windows
│
├── queries_analytics.sql           # Consultas SQL analíticas oficiales y optimizadas
├── verify_queries.py               # Script de verificación y validación de consultas
├── bi_analytic_dataset.csv         # Dataset analítico preparado para BI / Looker Studio
│
├── .gitignore                      # Configuración de exclusión para Git
└── README.md                       # Documentación principal
```

---

## ⚙️ Configuración Opcional de Modelos de Lenguaje (LLMs)

Por defecto, el Copiloto utiliza su **capa semántica interna** que responde con **cero costo y 100% de precisión**.

Si deseas conectar un modelo generativo externo:
1. Abre el dashboard y haz clic en **`⚙️ Configurar IA`** (en el banner del Copiloto).
2. Selecciona **OpenAI** o **Google Gemini**.
3. Pega tu API Key y guarda los cambios (se almacena de forma segura y local en tu navegador).
4. También puedes exportar la clave en tu terminal antes de iniciar el servidor:
   ```bash
   # Para OpenAI:
   export OPENAI_API_KEY="tu-clave-sk"

   # O para Google Gemini:
   export GEMINI_API_KEY="tu-clave-gemini"
   ```

---

## 📄 Licencia & Autoría

Proyecto desarrollado para auditoría analítica y toma de decisiones operativas de **Neobank Analytics**.  
Código libre para propósitos de evaluación y demostración técnica.
