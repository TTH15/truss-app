import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing env vars. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const DATA_URL_PATTERN = /^data:(.+?);base64,(.+)$/;

function parseDataUrl(dataUrl) {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64Payload: match[2] };
}

function extensionFromMime(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "bin";
}

async function main() {
  const { data: events, error } = await supabase
    .from("events")
    .select("id,image")
    .like("image", "data:image%");

  if (error) {
    throw error;
  }

  if (!events || events.length === 0) {
    console.info("No data-url images found. Nothing to migrate.");
    return;
  }

  console.info(`Found ${events.length} events to migrate.`);

  let migratedCount = 0;
  for (const event of events) {
    const parsed = parseDataUrl(event.image || "");
    if (!parsed) {
      console.warn(`Skip event ${event.id}: invalid data url.`);
      continue;
    }

    const ext = extensionFromMime(parsed.mimeType);
    const filePath = `migrated/event-${event.id}-${Date.now()}.${ext}`;
    const fileBuffer = Buffer.from(parsed.base64Payload, "base64");

    const { error: uploadError } = await supabase.storage
      .from("event-images")
      .upload(filePath, fileBuffer, {
        contentType: parsed.mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`Upload failed for event ${event.id}: ${uploadError.message}`);
      continue;
    }

    const { data: publicUrlData } = supabase.storage
      .from("event-images")
      .getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("events")
      .update({ image: publicUrl })
      .eq("id", event.id);

    if (updateError) {
      console.error(`Update failed for event ${event.id}: ${updateError.message}`);
      continue;
    }

    migratedCount += 1;
    console.info(`Migrated event ${event.id}`);
  }

  console.info(`Migration completed. ${migratedCount}/${events.length} updated.`);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
