import sqlite3
import pandas as pd

import os

conn = sqlite3.connect('neobank.db')

print("=== Q1: Cantidad de dinero que envio cada cliente (Top 5) ===")
q1 = """
SELECT 
    c.customer_id,
    c.name || ' ' || c.last_name AS customer_name,
    COUNT(t.transaction_id) AS total_transactions,
    ROUND(SUM(t.origin_amount_usd), 2) AS total_sent_usd
FROM customer c
JOIN "transaction" t ON c.customer_id = t.customer_id
GROUP BY c.customer_id, customer_name
ORDER BY total_sent_usd DESC
LIMIT 5;
"""
print(pd.read_sql(q1, conn))

print("\n=== Q2: Cantidad de transacciones por producto ===")
q2 = """
SELECT 
    product,
    COUNT(*) AS total_transactions,
    ROUND(SUM(origin_amount_usd), 2) AS total_volume_usd,
    ROUND(SUM(revenue), 2) AS total_revenue
FROM "transaction"
GROUP BY product
ORDER BY total_transactions DESC;
"""
print(pd.read_sql(q2, conn))

print("\n=== Q3: Top 3 de clientes que mas transacciones realizaron por producto ===")
q3 = """
WITH ranked_customers AS (
    SELECT 
        t.product,
        c.customer_id,
        c.name || ' ' || c.last_name AS customer_name,
        COUNT(t.transaction_id) AS transaction_count,
        DENSE_RANK() OVER (
            PARTITION BY t.product 
            ORDER BY COUNT(t.transaction_id) DESC
        ) AS ranking
    FROM "transaction" t
    JOIN customer c ON t.customer_id = c.customer_id
    GROUP BY t.product, c.customer_id, customer_name
)
SELECT 
    product,
    ranking,
    customer_id,
    customer_name,
    transaction_count
FROM ranked_customers
WHERE ranking <= 3
ORDER BY product, ranking, transaction_count DESC;
"""
print(pd.read_sql(q3, conn))

print("\n=== Q4: Obtener la primera transaccion de cada cliente ===")
q4 = """
WITH first_txns AS (
    SELECT 
        customer_id,
        transaction_id,
        transaction_datetime,
        origin_amount,
        origin_amount_usd,
        product,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id 
            ORDER BY transaction_datetime ASC, transaction_id ASC
        ) AS rn
    FROM "transaction"
)
SELECT 
    customer_id,
    transaction_id,
    transaction_datetime,
    origin_amount,
    origin_amount_usd,
    product
FROM first_txns
WHERE rn = 1
ORDER BY customer_id ASC
LIMIT 5;
"""
print(pd.read_sql(q4, conn))

print("\n=== Q5: Top 10 de paises que recibieron mas transacciones ===")
q5 = """
SELECT 
    destiny_country,
    COUNT(*) AS received_transactions,
    ROUND(SUM(destiny_amount_usd), 2) AS total_destiny_usd
FROM "transaction"
GROUP BY destiny_country
ORDER BY received_transactions DESC
LIMIT 10;
"""
print(pd.read_sql(q5, conn))

print("\n=== Q6: Cantidad de transacciones con revenue positivo ===")
q6 = """
SELECT 
    COUNT(*) AS positive_revenue_txns,
    ROUND(SUM(revenue), 2) AS positive_revenue_total
FROM "transaction"
WHERE revenue > 0;
"""
print(pd.read_sql(q6, conn))

print("\n=== Q7: Que cliente es el que mas revenue genero ===")
q7 = """
SELECT 
    c.customer_id,
    c.name || ' ' || c.last_name AS customer_name,
    c.country AS customer_country,
    COUNT(t.transaction_id) AS total_transactions,
    ROUND(SUM(t.revenue), 2) AS total_revenue
FROM customer c
JOIN "transaction" t ON c.customer_id = t.customer_id
GROUP BY c.customer_id, customer_name, c.country
ORDER BY total_revenue DESC
LIMIT 1;
"""
print(pd.read_sql(q7, conn))
