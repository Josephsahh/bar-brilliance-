import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envStr = fs.readFileSync(".env", "utf8");
const env = {};
envStr.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env["VITE_SUPABASE_URL"];
const supabaseKey = env["VITE_SUPABASE_ANON_KEY"] || env["VITE_SUPABASE_PUBLISHABLE_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from("pos_sales_batches").select("*").limit(1);
  if (error) {
    console.error("pos_sales_batches error:", error);
  } else {
    console.log("pos_sales_batches columns:", data.length ? Object.keys(data[0]) : "No data");
  }

  const { data: d2, error: e2 } = await supabase.from("pos_sale_items").select("*").limit(1);
  if (e2) {
    console.error("pos_sale_items error:", e2);
  } else {
    console.log("pos_sale_items columns:", d2.length ? Object.keys(d2[0]) : "No data");
  }
}

main();
