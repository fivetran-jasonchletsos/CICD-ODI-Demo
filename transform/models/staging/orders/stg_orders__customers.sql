with source as (

    select * from {{ source('orders', 'customers') }}

),

renamed as (

    select
        customer_id,
        customer_name,
        region,
        cast(signup_date as date) as signup_date,
        plan_tier

    from source

)

select * from renamed
