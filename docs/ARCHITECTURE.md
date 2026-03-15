# Arquitectura del proyecto

## Visión general

Script de Node.js + TypeScript con arquitectura en capas liviana.
Las dependencias apuntan siempre hacia adentro: la lógica de dominio
no conoce ni Supabase ni el filesystem.

```
index.ts  (entry point: carga .env, escribe el archivo Markdown)
    └── src/application/generateLinks.ts  (caso de uso: orquesta todo)
            ├── src/infrastructure/guestRepository.ts  (query a Supabase)
            │       └── src/infrastructure/supabaseClient.ts  (singleton)
            └── src/domain/  (lógica pura, sin dependencias externas)
                    ├── types.ts           (interfaces y tipos centrales)
                    ├── messageTemplate.ts (construye el texto del mensaje)
                    └── whatsappLink.ts    (genera la URL wa.me/...)
```

## Capas

### `src/domain/` — Lógica de negocio pura

Sin dependencias externas. Contiene el vocabulario y las reglas del negocio:

- **types.ts**: Interfaces centrales (`GuestWithGroup`, `WhatsAppLink`, `InvitationOutput`)
- **messageTemplate.ts**: Construye el mensaje personalizado según si el invitado tiene compañeros de grupo o no
- **whatsappLink.ts**: Genera la URL `wa.me/?text=...` y normaliza números argentinos al formato internacional

### `src/infrastructure/` — Acceso a datos

Conoce Supabase, pero no el filesystem ni la presentación:

- **supabaseClient.ts**: Singleton del cliente con validación de variables de entorno al inicio
- **guestRepository.ts**: Query con nested selects (un round-trip) + mapping a tipos del dominio

### `src/application/` — Orquestación

Coordina infraestructura y dominio. No sabe de Supabase ni de archivos:

- **generateLinks.ts**: Caso de uso principal — obtiene datos, genera links, agrupa por familia

### `index.ts` — Entry point

Carga `.env` (primer import, crítico), ejecuta el caso de uso, renderiza Markdown, escribe el archivo.

## Decisiones de diseño

| Decisión                                     | Razón                                                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin tests automatizados                      | YAGNI — script de evento único                                                                                                               |
| `import 'dotenv/config'` como primer import  | En CommonJS, los imports se ejecutan en orden; garantiza que `.env` se cargue antes del cliente Supabase                                     |
| Nested selects de Supabase                   | Un solo round-trip para guests + grupo + miembros del grupo                                                                                  |
| `output/` en `.gitignore`                    | Los archivos contienen datos personales (teléfonos) de los invitados                                                                         |
| Confirmación filtrada en JS                  | Supabase no soporta "NOT EXISTS" en client-side queries; se trae `confirmations` y se filtra en memoria (escala bien para ~50-100 invitados) |
| `eslint-config-prettier` fijado a `>=10.1.8` | CVE-2025-54313: versiones 10.1.6 y 10.1.7 contienen malware. 10.1.8 es la primera versión limpia.                                            |
