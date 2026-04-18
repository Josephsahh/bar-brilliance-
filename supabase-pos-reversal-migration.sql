-- Supabase SQL Migration: POS Reversal Tracking
-- Run this script in your Supabase SQL Editor.

-- Add tracking columns to pos_sale_items
ALTER TABLE public.pos_sale_items ADD COLUMN IF NOT EXISTS deducted_from_standing numeric DEFAULT 0;
ALTER TABLE public.pos_sale_items ADD COLUMN IF NOT EXISTS deducted_from_store numeric DEFAULT 0;
