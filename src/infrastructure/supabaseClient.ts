/**
 * Cliente Supabase — Singleton de infraestructura.
 *
 * Centraliza la creación del cliente y valida las variables de entorno
 * necesarias antes de inicializarlo. Es el único lugar de la aplicación
 * donde se instancia el cliente Supabase.
 *
 * IMPORTANTE: Este módulo lee las variables de entorno al momento de ser
 * importado. Asegurarse de que dotenv esté cargado antes de importarlo
 * (ver index.ts donde se usa `import 'dotenv/config'` como primer import).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Valida las variables de entorno y crea el cliente Supabase.
 *
 * @throws Error con mensaje descriptivo si falta alguna variable de entorno
 * @returns Cliente Supabase inicializado
 */
function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];

  if (!supabaseUrl) {
    throw new Error(
      "❌ Variable de entorno faltante: SUPABASE_URL\n" +
        "   Copiá .env.example a .env y completá los valores."
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "❌ Variable de entorno faltante: SUPABASE_ANON_KEY\n" +
        "   Copiá .env.example a .env y completá los valores."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // No se necesita sesión de auth — el acceso es de lectura por anon key
      persistSession: false,
    },
  });
}

/** Instancia singleton del cliente Supabase */
export const supabase = createSupabaseClient();
