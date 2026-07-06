with orders as (

    select * from {{ ref('fct_orders') }}

),

calendar as (

    {{ dbt_utils.date_spine(
        datepart="day",
        start_date="(select min(order_date) from " ~ ref('fct_orders') ~ ")",
        end_date="(select max(order_date) + interval 1 day from " ~ ref('fct_orders') ~ ")"
    ) }}

),

daily as (

    select
        cast(date_day as date) as order_date,
        count(distinct order_id) as order_count,
        sum(order_total) as revenue

    from calendar
    left join orders on cast(calendar.date_day as date) = orders.order_date
    group by 1

),

final as (

    select
        order_date,
        order_count,
        coalesce(revenue, 0) as revenue,
        case
            when order_count > 0 then coalesce(revenue, 0) / order_count
            else 0
        end as avg_order_value

    from daily

)

select * from final
order by order_date
