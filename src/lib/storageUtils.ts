import { supabase } from './supabaseClient';

/** Wyciąga ścieżkę w buckecie z pełnego publicUrl */
export function pathFromPublicUrl(publicUrl: string): string | null {
  const idx = publicUrl.indexOf('/storage/v1/object/public/');
  if (idx === -1) return null;
  // /storage/v1/object/public/cms/THUMBS/...
  const rest = publicUrl.slice(idx + '/storage/v1/object/public/'.length);
  const firstSlash = rest.indexOf('/');
  if (firstSlash === -1) return null;
  // rest = "cms/THUMBS/..."
  return rest; // bucket + ścieżka
}

export async function deleteByPublicUrl(publicUrl: string) {
  const path = pathFromPublicUrl(publicUrl);
  if (!path) return;
  const [bucket, ...parts] = path.split('/');
  const objectPath = parts.join('/');
  await supabase.storage.from(bucket).remove([objectPath]);
}
