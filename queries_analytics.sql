/*
================================================================================
NEOBANK BI ANALYTICS - SQL SOLUTIONS
EXPLOTACIÓN DE DATOS TRANSACCIONALES
================================================================================
Motor de base de datos: Compatible con ANSI SQL / PostgreSQL / Google BigQuery / Snowflake / MySQL 8.0+
Autor: Desarrollador BI Candidate
Fecha: Octubre 2026

NOTAS GENERALES DE DISEÑO Y MODELADO:
1. Multi-moneda: En plataformas financieras cross-border, sumar importes en moneda local
   (ARS, CLP, COP, MXN, PEN) directamente genera una distorsión aritmética grave.
   Por tal motivo, las agregaciones financieras globales se realizan sobre los importes normalizados
   en USD (`origin_amount_usd` y `destiny_amount_usd`).
2. Tablas utilizadas:
   - `customer` (PK: customer_id)
   - `transaction` (PK: transaction_id, FK: customer_id)
================================================================================
*/


-- =============================================================================
-- CONSULTA 1: Cantidad de dinero que envió cada cliente
-- =============================================================================
/*
OBJETIVO:
Calcular el volumen total enviado por cada cliente, junto con el número de operaciones realizadas.
Se calcula tanto el monto total normalizado en USD (métrica oficial consolidada)
como la cantidad de transacciones. Se utiliza LEFT JOIN para no excluir clientes registrados sin transacciones.
*/

SELECT 
    c.customer_id,
    c.name || ' ' || c.last_name AS customer_name,
    c.country AS customer_country,
    COUNT(t.transaction_id) AS total_transactions,
    COALESCE(ROUND(SUM(t.origin_amount_usd), 2), 0.00) AS total_sent_usd
FROM customer c
LEFT JOIN "transaction" t ON c.customer_id = t.customer_id
GROUP BY 
    c.customer_id, 
    c.name, 
    c.last_name, 
    c.country
ORDER BY 
    total_sent_usd DESC;


-- =============================================================================
-- CONSULTA 2: Cantidad de transacciones por producto
-- =============================================================================
/*
OBJETIVO:
Obtener la distribución transaccional por producto del Neobanco (Remesa, Exchange, Tarjeta, P2P),
enriqueciendo el resultado con el volumen total operado en USD, ticket promedio y revenue total.
*/

SELECT 
    product,
    COUNT(*) AS total_transactions,
    ROUND(SUM(origin_amount_usd), 2) AS total_volume_usd,
    ROUND(AVG(origin_amount_usd), 2) AS avg_ticket_usd,
    ROUND(SUM(revenue), 2) AS total_revenue_usd,
    ROUND(SUM(revenue) / NULLIF(SUM(origin_amount_usd), 0) * 100, 2) AS take_rate_pct
FROM "transaction"
GROUP BY 
    product
ORDER BY 
    total_transactions DESC;


-- =============================================================================
-- CONSULTA 3: Top 3 de clientes que más transacciones realizaron por producto
-- =============================================================================
/*
OBJETIVO:
Identificar los 3 clientes con mayor volumen transaccional para cada uno de los productos.
CRITERIO DE RANKING:
Se implementa `DENSE_RANK()` para manejar empates de forma equitativa (si 2 clientes
comparten la misma cantidad máxima, ambos ocupan la posición correspondiente sin saltar rangos).
Si la regla de negocio requiere cortar estrictamente en 3 registros por producto, se reemplaza por `ROW_NUMBER()`.
*/

WITH customer_product_volume AS (
    SELECT 
        t.product,
        c.customer_id,
        c.name || ' ' || c.last_name AS customer_name,
        c.country AS customer_country,
        COUNT(t.transaction_id) AS transaction_count,
        ROUND(SUM(t.origin_amount_usd), 2) AS total_amount_usd,
        DENSE_RANK() OVER (
            PARTITION BY t.product 
            ORDER BY COUNT(t.transaction_id) DESC, SUM(t.origin_amount_usd) DESC
        ) AS ranking
    FROM "transaction" t
    JOIN customer c ON t.customer_id = c.customer_id
    GROUP BY 
        t.product, 
        c.customer_id, 
        c.name, 
        c.last_name, 
        c.country
)
SELECT 
    product,
    ranking,
    customer_id,
    customer_name,
    customer_country,
    transaction_count,
    total_amount_usd
FROM customer_product_volume
WHERE ranking <= 3
ORDER BY 
    product ASC, 
    ranking ASC, 
    transaction_count DESC;


-- =============================================================================
-- CONSULTA 4: Obtener la primera transacción de cada cliente identificando fecha, monto y producto
-- =============================================================================
/*
OBJETIVO:
Obtener la primera transacción histórica de cada cliente que haya operado.
Se utiliza una CTE con `ROW_NUMBER()` particionada por `customer_id` y ordenada
cronológicamente por `transaction_datetime ASC`. En caso de empate en la misma fecha/hora,
se desempata por `transaction_id ASC`.
*/

WITH client_first_transaction AS (
    SELECT 
        t.customer_id,
        c.name || ' ' || c.last_name AS customer_name,
        t.transaction_id,
        t.transaction_datetime AS first_transaction_date,
        t.product AS first_product,
        t.origin_amount AS first_origin_amount_local,
        t.origin_amount_usd AS first_origin_amount_usd,
        t.origin_country,
        t.destiny_country,
        ROW_NUMBER() OVER (
            PARTITION BY t.customer_id 
            ORDER BY t.transaction_datetime ASC, t.transaction_id ASC
        ) AS txn_order
    FROM "transaction" t
    JOIN customer c ON t.customer_id = c.customer_id
)
SELECT 
    customer_id,
    customer_name,
    transaction_id,
    first_transaction_date,
    first_product,
    first_origin_amount_local,
    first_origin_amount_usd,
    origin_country,
    destiny_country
FROM client_first_transaction
WHERE txn_order = 1
ORDER BY 
    customer_id ASC;


-- =============================================================================
-- CONSULTA 5: Top 10 de países que recibieron más transacciones
-- =============================================================================
/*
OBJETIVO:
Identificar los 10 principales países receptores de dinero/transacciones (corredor de destino).
Adicionalmente, se incluye el volumen recibido en USD y el ticket promedio para brindar
contexto de negocio al ranking.
*/

SELECT 
    destiny_country,
    COUNT(*) AS total_received_transactions,
    ROUND(SUM(destiny_amount_usd), 2) AS total_received_usd,
    ROUND(AVG(destiny_amount_usd), 2) AS avg_received_usd,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS pct_of_total_txns
FROM "transaction"
GROUP BY 
    destiny_country
ORDER BY 
    total_received_transactions DESC
LIMIT 10;


-- =============================================================================
-- CONSULTA 6: Cantidad de transacciones con revenue positivo
-- =============================================================================
/*
OBJETIVO:
Contabilizar todas las operaciones que generaron un margen de ingreso positivo (revenue > 0)
para la compañía, así como el revenue total generado por estas transacciones.
*/

SELECT 
    COUNT(*) AS positive_revenue_txns,
    ROUND(SUM(revenue), 2) AS total_positive_revenue_usd,
    ROUND(AVG(revenue), 2) AS avg_revenue_per_txn,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "transaction"), 2) AS pct_positive_revenue_txns
FROM "transaction"
WHERE 
    revenue > 0;


-- =============================================================================
-- CONSULTA 7: ¿Qué cliente es el que más revenue generó?
-- =============================================================================
/*
OBJETIVO:
Identificar el cliente con mayor aporte al margen financiero (revenue acumulado).
Se presenta la consulta con `LIMIT 1` para respuesta inmediata, y se añade
una estructura con `RANK()` por si existiese empate en el primer puesto.
*/

SELECT 
    c.customer_id,
    c.name || ' ' || c.last_name AS customer_name,
    c.country AS customer_country,
    c.document_type || ': ' || CAST(c.document AS VARCHAR) AS customer_document,
    COUNT(t.transaction_id) AS total_transactions,
    ROUND(SUM(t.origin_amount_usd), 2) AS total_volume_sent_usd,
    ROUND(SUM(t.revenue), 2) AS total_revenue_generated_usd
FROM customer c
JOIN "transaction" t ON c.customer_id = t.customer_id
GROUP BY 
    c.customer_id, 
    c.name, 
    c.last_name, 
    c.country, 
    c.document_type, 
    c.document
ORDER BY 
    total_revenue_generated_usd DESC
LIMIT 1;
