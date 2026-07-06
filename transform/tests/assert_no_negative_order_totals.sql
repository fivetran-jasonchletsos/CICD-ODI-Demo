-- Custom singular test: fails (returns rows) if any order in fct_orders has a
-- negative order_total. dbt tests pass when a test query returns zero rows.

select
    order_id,
    order_total
from {{ ref('fct_orders') }}
where order_total < 0
