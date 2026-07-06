with source as (

    select * from {{ source('orders', 'orders') }}

),

renamed as (

    select
        order_id,
        customer_id,
        cast(order_date as date) as order_date,
        status,
        channel

    from source

)

select * from renamed
