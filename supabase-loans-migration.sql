-- Supabase SQL Migration: Loan Management
-- Run this script in your Supabase SQL Editor.

-- Storage setup for receipts
-- Ensure you have a 'receipts' bucket.
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true)
on conflict do nothing;

create policy "Public Access" on storage.objects for select using (bucket_id = 'receipts');
create policy "Authenticated Users can upload" on storage.objects for insert with check (bucket_id = 'receipts' and auth.role() = 'authenticated');

-- Table: loan_transactions
create table if not exists public.loan_transactions (
    id uuid default gen_random_uuid() primary key,
    loan_date date not null,
    loan_type text not null check (loan_type in ('borrow_in', 'lend_out')),
    product_id uuid references public.products(id) on delete set null,
    product_code text not null,
    product_name text not null,
    quantity numeric not null,
    person_name text not null,
    status text not null check (status in ('open', 'returned', 'paid', 'partial')) default 'open',
    settlement_type text check (settlement_type in ('payment', 'exchange') or settlement_type is null),
    payment_method text,
    receipt_url text,
    returned_quantity numeric default 0,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Table: loan_returns
create table if not exists public.loan_returns (
    id uuid default gen_random_uuid() primary key,
    loan_transaction_id uuid references public.loan_transactions(id) on delete cascade,
    return_date date not null,
    settlement_type text not null check (settlement_type in ('payment', 'exchange')),
    quantity numeric, -- relevant if exchange
    amount numeric, -- relevant if payment
    payment_method text,
    receipt_url text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS Policies
alter table public.loan_transactions enable row level security;
alter table public.loan_returns enable row level security;

create policy "Enable all access for authenticated users on loan_transactions" 
on public.loan_transactions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Enable all access for authenticated users on loan_returns" 
on public.loan_returns for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
