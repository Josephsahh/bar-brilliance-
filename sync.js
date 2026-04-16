import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envStr = fs.readFileSync(envPath, 'utf8');
const env = {};
envStr.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncStandingStock() {
  console.log("Starting standing stock sync...");

  // 1. Delete all existing records in standing_stock 
  const { error: deleteError } = await supabase
    .from('standing_stock')
    .delete()
    .neq('id', 0); // Hack to delete all rows

  if (deleteError) {
    console.error("Failed to delete existing standing_stock rows:", deleteError);
  } else {
    console.log("Successfully cleared existing standing_stock data.");
  }

  // 2. Fetch all active products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true });

  if (productsError) {
    console.error("Failed to fetch products:", productsError);
    process.exit(1);
  }

  // 3. Filter products that should be in standing stock
  const expectedProducts = products.filter(p => {
    return p.standing_target > 0 || ["beer", "soft_drink", "wine", "draft", "whiskey"].includes(p.category);
  });

  console.log(`Found ${expectedProducts.length} products to map to standing stock.`);

  // 4. Insert into standing stock
  if (expectedProducts.length > 0) {
    const payload = expectedProducts.map(p => ({
      product_id: p.id,
      target_quantity: p.standing_target || 0,
      current_quantity: p.quantity || 0,
      updated_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('standing_stock')
      .insert(payload);

    if (insertError) {
      console.error("Failed to insert new standing_stock rows:", insertError);
    } else {
      console.log("Successfully synced standing_stock with real product data.");
    }
  }

  console.log("Done.");
  process.exit(0);
}

syncStandingStock().catch(e => {
  console.error(e);
  process.exit(1);
});
