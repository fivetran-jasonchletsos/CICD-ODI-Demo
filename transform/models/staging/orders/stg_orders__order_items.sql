with source as (

    select * from {{ source('orders', 'order_items') }}

),

renamed as (

    select
        order_item_id,
        order_id,
        sku,
        product_name,
        category,
        quantity,
        unit_price,
        quantity * unit_price as line_total

    from source

)

select * from renamed
