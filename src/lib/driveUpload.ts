declare global {
  interface Window {
    gapi: any;
  }
}

export const initGapi = async (): Promise<boolean> => {
  try {
    if (typeof window.gapi === 'undefined') {
      console.error('[Drive] gapi not loaded');
      return false;
    }

    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client', () => {
        window.gapi.client.init({
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
        }).then(() => {
          console.log('[Drive] GAPI initialized successfully');
          resolve();
        }).catch(reject);
      });
    });
    
    return true;
  } catch (error) {
    console.error('[Drive] GAPI init failed:', error);
    return false;
  }
};

export const setDriveToken = (accessToken: string): boolean => {
  if (window.gapi?.client) {
    window.gapi.client.setToken({ access_token: accessToken });
    const isSet = !!window.gapi.client.getToken()?.access_token;
    console.log('[Drive] Token set successfully:', isSet);
    return isSet;
  }
  return false;
};

export const uploadZipToDrive = async (blob: Blob, filename: string): Promise<string> => {
  try {
    console.log('[Drive] Starting upload:', filename);
    
    // Create file metadata
    const metadata = {
      name: filename,
      mimeType: 'application/zip'
    };
    
    // Convert blob to base64 for multipart upload
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:application/zip;base64, prefix
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
    
    // Create multipart body
    const boundary = 'foo_bar_baz';
    const multipartBody = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/zip',
      'Content-Transfer-Encoding: base64',
      '',
      base64Data,
      `--${boundary}--`
    ].join('\r\n');
    
    console.log('[Drive] Uploading multipart data...');
    
    // Use gapi client to upload
    const response = await window.gapi.client.request({
      path: 'https://www.googleapis.com/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: { 
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartBody.length.toString()
      },
      body: multipartBody
    });
    
    if (response.status === 200) {
      const fileId = response.result.id;
      const webViewLink = response.result.webViewLink;
      console.log('[Drive] Upload successful:', { fileId, webViewLink });
      return webViewLink || fileId;
    } else {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
  } catch (error) {
    console.error('[Drive] Upload failed:', error);
    throw new Error(`Drive upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getStoredGoogleToken = (): string | null => {
  return sessionStorage.getItem('google_access_token');
};
