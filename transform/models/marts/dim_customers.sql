with customers as (

    select * from {{ ref('stg_orders__customers') }}

),

orders as (

    select * from {{ ref('stg_orders__orders') }}

),

order_items as (

    select * from {{ ref('stg_orders__order_items') }}

),

order_totals as (

    select
        order_id,
        sum(line_total) as order_total

    from order_items
    group by 1

),

order_totals_by_customer as (

    select
        orders.customer_id,
        count(distinct orders.order_id) as lifetime_order_count,
        coalesce(sum(order_totals.order_total), 0) as lifetime_revenue

    from orders
    left join order_totals on orders.order_id = order_totals.order_id
    group by 1

),

final as (

    select
        customers.customer_id,
        customers.customer_name,
        customers.region,
        customers.plan_tier,
        customers.signup_date,
        coalesce(order_totals_by_customer.lifetime_order_count, 0) as lifetime_order_count,
        coalesce(order_totals_by_customer.lifetime_revenue, 0) as lifetime_revenue

    from customers
    left join order_totals_by_customer on customers.customer_id = order_totals_by_customer.customer_id

)

select * from final
