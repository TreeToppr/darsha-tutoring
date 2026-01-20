import { supabase } from "./supabaseClient";

export async function logAudit({ action, entityType, entityId = null, metadata = {} }) {
    // Keep metadata small: IDs + amounts + rule outcomes. Avoid names/addresses.
    const { error } = await supabase.from("audit_events").insert({
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
    });

    // Don’t block the user flow if logging fails, but do console it.
    if (error) console.warn("audit log failed:", error.message);
}
