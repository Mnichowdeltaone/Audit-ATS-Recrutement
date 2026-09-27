import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up pdf.js worker using unpkg or cdnjs, or fallback
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

export interface ExtractedFileResult {
  text: string;
  fileName: string;
  fileSize: number;
  fileType: 'pdf' | 'docx' | 'txt' | 'unknown';
  pageCount?: number;
}

/**
 * Extract plain text from PDF ArrayBuffer
 */
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const textPieces: string[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
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
