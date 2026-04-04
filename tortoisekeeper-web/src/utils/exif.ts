// @ts-ignore
const EXIF = (window as any).EXIF;

export function extractExifDate(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!EXIF) return resolve(null);
    EXIF.getData(file, function() {
      // @ts-ignore
      const date = EXIF.getTag(this, 'DateTimeOriginal') || EXIF.getTag(this, 'DateTime');
      resolve(date || null);
    });
  });
}

// Fichier supprimé car EXIF non utilisé
