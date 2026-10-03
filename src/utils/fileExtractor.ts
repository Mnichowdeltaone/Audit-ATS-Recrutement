import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import PdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?worker';
import mammoth from 'mammoth';

// Bundle and instantiate the pdf.js worker locally. A worker URL can fall back to a
// broken fake worker in the packaged Electron app.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();
}

export interface ExtractedFileResult {
  text: string;
  fileName: string;
  fileSize: number;
  fileType: 'pdf' | 'docx' | 'txt' | 'unknown';
  pageCount?: number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

/**
 * Extract plain text from PDF ArrayBuffer
 */
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      useWorkerFetch: false,
    });
    const pdf = await withTimeout(
      loadingTask.promise,
      20000,
      "L'extraction du PDF prend trop de temps. Le fichier est peut-être protégé, scanné ou incompatible."
    );
    const pageCount = pdf.numPages;
    const textPieces: string[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await withTimeout(
        pdf.getPage(pageNum),
        10000,
        `La page ${pageNum} du PDF met trop de temps à se charger.`
      );
      const textContent = await withTimeout(
        page.getTextContent(),
        10000,
        `La page ${pageNum} du PDF met trop de temps à extraire son texte.`
      );
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      if (pageText.trim()) {
        textPieces.push(pageText.trim());
      }
    }

    const fullText = textPieces.join('\n\n');
    return {
      text: fullText,
      pageCount,
    };
  } catch (error) {
    console.error('Error parsing PDF with pdfjs-dist:', error);
    throw new Error(
      `Impossible de lire le fichier PDF : ${error instanceof Error ? error.message : 'Format invalide ou fichier protégé.'}`
    );
  }
}

/**
 * Extract plain text from DOCX ArrayBuffer using Mammoth
 */
async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim();
    if (!text) {
      throw new Error('Le document Word semble vide.');
    }
    return text;
  } catch (error) {
    console.error('Error parsing DOCX with mammoth:', error);
    throw new Error(
      `Impossible de lire le fichier DOCX : ${error instanceof Error ? error.message : 'Format Word invalide ou corrompu.'}`
    );
  }
}

/**
 * Universal file parser for CVs (PDF, DOCX, TXT)
 */
export async function parseCvFile(file: File): Promise<ExtractedFileResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const fileName = file.name;
  const fileSize = file.size;

  if (fileSize > 15 * 1024 * 1024) {
    throw new Error('Le fichier est trop volumineux (limite maximale : 15 Mo).');
  }

  if (extension === 'pdf' || file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const { text, pageCount } = await extractTextFromPDF(arrayBuffer);
    if (!text.trim()) {
      throw new Error(
        'Le fichier PDF a été lu mais aucun texte sélectionnable n\'a été trouvé (il s\'agit peut-être d\'un scan ou d\'une image non ocrisée).'
      );
    }
    return {
      text,
      fileName,
      fileSize,
      fileType: 'pdf',
      pageCount,
    };
  }

  if (
    extension === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const text = await extractTextFromDocx(arrayBuffer);
    return {
      text,
      fileName,
      fileSize,
      fileType: 'docx',
    };
  }

  if (extension === 'doc' || file.type === 'application/msword') {
    throw new Error(
      'Le format .doc (ancien Word) n\'est pas supporté directement. Veuillez enregistrer votre fichier au format .docx ou .pdf.'
    );
  }

  if (extension === 'txt' || file.type === 'text/plain') {
    const text = await file.text();
    if (!text.trim()) {
      throw new Error('Le fichier texte est vide.');
    }
    return {
      text: text.trim(),
      fileName,
      fileSize,
      fileType: 'txt',
    };
  }

  throw new Error(
    `Type de fichier non pris en charge (".${extension}"). Veuillez importer un fichier PDF (.pdf), Word (.docx) ou Texte (.txt).`
  );
}
