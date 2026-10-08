import sqlite3
import pandas as pd

conn = sqlite3.connect('neobank.db')

# 1. Customer clean
df_cust = pd.read_sql('SELECT * FROM customer', conn)
df_cust.to_csv('customers_clean.csv', index=False, encoding='utf-8')

# 2. Transaction clean
df_txn = pd.read_sql('SELECT * FROM "transaction"', conn)
df_txn.to_csv('transactions_clean.csv', index=False, encoding='utf-8')

# 3. BI Flat Dataset for Looker Studio / Analytics
bi_query = """
SELECT 
    t.transaction_id,
    t.transaction_datetime,
    SUBSTR(t.transaction_datetime, 1, 10) AS transaction_date,
    SUBSTR(t.transaction_datetime, 1, 7) AS transaction_year_month,
    t.product,
    t.customer_id,
    c.name || ' ' || c.last_name AS customer_name,
    c.country AS customer_country,
    c.document_type AS customer_doc_type,
    c.document AS customer_document,
    c.created_at AS customer_created_at,
    SUBSTR(c.created_at, 1, 10) AS customer_registration_date,
    t.origin_country,
    t.destiny_country,
    t.origin_country || ' -> ' || t.destiny_country AS corridor,
    t.origin_amount,
    t.origin_amount_usd,
    t.destiny_amount,
    t.destiny_amount_usd,
    t.discount_amount,
    t.discount_amount_usd,
    t.revenue,
    ROUND(t.revenue / NULLIF(t.origin_amount_usd, 0) * 100, 2) AS take_rate_pct,
    t.beneficiary_name,
    t.beneficiary_doc_type,
    t.beneficiary_account
FROM "transaction" t
JOIN customer c ON t.customer_id = c.customer_id;
"""
df_bi = pd.read_sql(bi_query, conn)
df_bi.to_csv('bi_analytic_dataset.csv', index=False, encoding='utf-8')
print("Exported CSVs successfully!")
print("BI Dataset shape:", df_bi.shape)
