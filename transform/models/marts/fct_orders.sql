with orders as (

    select * from {{ ref('stg_orders__orders') }}

),

order_items as (

    select * from {{ ref('stg_orders__order_items') }}

),

item_aggregates as (

    select
        order_id,
        sum(line_total) as order_total,
        sum(quantity) as item_count

    from order_items
    group by 1

),

final as (

    select
        orders.order_id,
        orders.customer_id,
        orders.order_date,
        orders.status,
        orders.channel,
        coalesce(item_aggregates.order_total, 0) as order_total,
        coalesce(item_aggregates.item_count, 0) as item_count

    from orders
    left join item_aggregates on orders.order_id = item_aggregates.order_id

)

select * from final
