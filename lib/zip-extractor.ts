/**
 * Extrae el archivo de texto de un ZIP exportado de WhatsApp
 * Procesa en cliente para evitar subir archivos grandes al servidor
 */

import JSZip from 'jszip';

interface ExtractResult {
  success: boolean;
  text?: string;
  error?: string;
  filename?: string;
  messageCount?: number;
}

/**
 * Extrae el contenido de texto de un archivo ZIP de WhatsApp
 * @param zipFile - El archivo ZIP subido por el usuario
 * @returns Objeto con el texto extraído o error
 */
export async function extractChatFromZip(zipFile: File): Promise<ExtractResult> {
  try {
    // Validar que es un ZIP
    if (!zipFile.name.endsWith('.zip')) {
      return {
        success: false,
        error: 'El archivo no es un ZIP válido'
      };
    }

    // Cargar el ZIP
    const zip = await JSZip.loadAsync(zipFile);
    
    // Posibles nombres del archivo de chat en WhatsApp
    const possiblePatterns = [
      /_chat\.txt$/i,                    // Nombre estándar: _chat.txt
      /WhatsApp.*\.txt$/i,                // WhatsApp Chat with XXX.txt
      /Conversaci[oó]n.*\.txt$/i,        // Conversación de WhatsApp.txt (ES)
      /chat.*\.txt$/i,                    // Variantes con "chat"
    ];

    let chatFile = null;
    let chatFilename = '';

    // Buscar el archivo de texto en el ZIP
    for (const pattern of possiblePatterns) {
      const files = Object.keys(zip.files).filter(name => pattern.test(name));
      
      if (files.length > 0) {
        // Tomar el primer archivo que coincida
        chatFilename = files[0];
        chatFile = zip.files[chatFilename];
        break;
      }
    }

    // Si no encontró ningún archivo de texto
    if (!chatFile) {
      return {
        success: false,
        error: 'No se encontró el archivo de chat dentro del ZIP. Asegúrate de exportar desde WhatsApp.'
      };
    }

    // Extraer el contenido del archivo
    const chatText = await chatFile.async('text');

    // Validar que tiene contenido
    if (!chatText || chatText.trim().length === 0) {
      return {
        success: false,
        error: 'El archivo de chat está vacío'
      };
    }

    // Contar mensajes aproximados (líneas que parecen mensajes)
    const messageCount = chatText.split('\n').filter(line => {
      // Detectar líneas que parecen mensajes (tienen timestamp y separador)
      return /\d{1,2}\/\d{1,2}\/\d{2,4}.*[-:]\s*.+:/i.test(line);
    }).length;

    return {
      success: true,
      text: chatText,
      filename: chatFilename,
      messageCount
    };

  } catch (error) {
    console.error('Error al procesar ZIP:', error);
    return {
      success: false,
      error: 'Error al procesar el archivo ZIP. Asegúrate de que sea una exportación válida de WhatsApp.'
    };
  }
}

/**
 * Lee un archivo de texto directamente (cuando no es ZIP)
 */
export async function readTextFile(file: File): Promise<ExtractResult> {
  try {
    const text = await file.text();

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'El archivo está vacío'
      };
    }

    // Validar que parece un chat de WhatsApp
    const looksLikeWhatsApp = /\d{1,2}\/\d{1,2}\/\d{2,4}.*[-:]\s*.+:/i.test(text);
    
    if (!looksLikeWhatsApp) {
      return {
        success: false,
        error: 'El archivo no parece ser una exportación de WhatsApp válida'
      };
    }

    const messageCount = text.split('\n').filter(line => {
      return /\d{1,2}\/\d{1,2}\/\d{2,4}.*[-:]\s*.+:/i.test(line);
    }).length;

    return {
      success: true,
      text,
      filename: file.name,
      messageCount
    };

  } catch (error) {
    return {
      success: false,
      error: 'Error al leer el archivo de texto'
    };
  }
}

/**
 * Función principal: detecta el tipo y procesa en consecuencia
 */
export async function processChatFile(file: File): Promise<ExtractResult> {
  // Validar tamaño (máximo 100MB)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return {
      success: false,
      error: `El archivo es muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 100MB.`
    };
  }

  // Detectar tipo de archivo
  if (file.name.endsWith('.zip')) {
    return await extractChatFromZip(file);
  } else if (file.name.endsWith('.txt')) {
    return await readTextFile(file);
  } else {
    return {
      success: false,
      error: 'Solo se aceptan archivos .txt o .zip de WhatsApp'
    };
  }
}

/**
 * Formatea el tamaño de archivo para mostrar al usuario
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
