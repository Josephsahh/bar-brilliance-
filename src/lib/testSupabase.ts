import { supabase } from "@/integrations/supabase/client";

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from("products_test")
    .select("*")
    .limit(5);

  console.log("DATA:", data);
  console.log("ERROR:", error);
  console.log("ERROR MESSAGE:", error?.message);

  return { data, error };
}