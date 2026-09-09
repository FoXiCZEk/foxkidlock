/**
 * Google Drive Backup & Report Export Utility
 * Uses Google Identity Services (GSI) for token acquisition and Drive REST API v3
 */

export interface DriveExportResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

// Default Drive OAuth client ID (provided by Google AI Studio setup or fallback)
const OAUTH_CLIENT_ID = '2778472858-aistudio-client.apps.googleusercontent.com';

export async function uploadJsonToGoogleDrive(
  accessToken: string,
  fileName: string,
  content: object
): Promise<DriveExportResult> {
  try {
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      description: 'Záloha statistik a nastavení rodičovského zámku FoXKidLock',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(content, null, 2) +
      closeDelimiter;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Chyba při nahrávání na Disk: ${response.status} ${errText}` };
    }

    const data = await response.json();
    return {
      success: true,
      fileId: data.id,
      webViewLink: data.webViewLink,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba při komunikaci s Google Drive',
    };
  }
}

export function requestGoogleDriveToken(clientId?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services skript se ještě nenačetl. Zkontrolujte připojení.'));
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId || OAUTH_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (resp) => {
          if (resp.error) {
            reject(new Error(resp.error));
          } else if (resp.access_token) {
            resolve(resp.access_token);
          } else {
            reject(new Error('Nebyl vrácen platný přístupový token.'));
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      reject(e instanceof Error ? e : new Error('Chyba při inicializaci OAuth'));
    }
  });
}
