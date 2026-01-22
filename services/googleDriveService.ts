
import { ApiResponse, GoogleFile } from '../types';
import { googleConfig } from './googleConfig';

declare global {
    interface Window {
        google: any;
    }
}

/**
 * Helper to wait for the Google Identity Services script to load.
 */
const waitForGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.accounts) {
            resolve();
            return;
        }

        let retries = 0;
        const interval = setInterval(() => {
            if (window.google && window.google.accounts) {
                clearInterval(interval);
                resolve();
            }
            retries++;
            if (retries > 20) { // Wait up to 2 seconds
                clearInterval(interval);
                reject(new Error("Google Identity Services script failed to load. Please disable ad-blockers and refresh."));
            }
        }, 100);
    });
};

/**
 * Initiates the Google OAuth 2.0 flow to retrieve an Access Token.
 */
export const getGoogleAccessToken = async (): Promise<string> => {
    await waitForGoogleScript();

    return new Promise((resolve, reject) => {
        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: googleConfig.web.client_id,
                scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
                callback: (response: any) => {
                    if (response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject(new Error("Access denied or no token returned."));
                    }
                },
                error_callback: (error: any) => {
                    console.error("Google Auth Error:", error);
                    // Provide a more descriptive error if possible
                    reject(new Error(error.message || "Authorization failed. Check console for details."));
                }
            });

            // Request token directly
            client.requestAccessToken();
        } catch (error: any) {
            reject(new Error(error.message || "Failed to initialize Google Auth"));
        }
    });
};

/**
 * Lists files from Google Drive.
 */
export const apiListGoogleDriveFiles = async (accessToken: string, query: string = ''): Promise<ApiResponse<GoogleFile[]>> => {
    // MOCK MODE CHECK
    if (accessToken.startsWith('demo_mode_')) {
        return mockListFiles(query);
    }

    try {
        let q = "trashed=false";
        if (query) {
            q += ` and name contains '${query}'`;
        }

        const params = new URLSearchParams({
            q: q,
            fields: 'files(id, name, mimeType, webViewLink, thumbnailLink, createdTime, size)',
            pageSize: '100',
            orderBy: 'createdTime desc'
        });

        const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('401 Unauthorized');
            const errData = await response.json();
            throw new Error(errData.error?.message || 'Failed to list files');
        }

        const data = await response.json();
        
        const files: GoogleFile[] = (data.files || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            webViewLink: f.webViewLink,
            thumbnailLink: f.thumbnailLink,
            createdTime: f.createdTime,
            size: f.size ? formatBytes(parseInt(f.size)) : '-'
        }));

        return { success: true, data: files };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Finds a specific folder by name and optional parentId.
 */
export const apiFindFolder = async (name: string, accessToken: string, parentId?: string): Promise<{ id: string, webViewLink?: string } | null> => {
    // MOCK MODE CHECK
    if (accessToken.startsWith('demo_mode_')) {
        return { id: 'mock-folder-' + name + (parentId ? '-' + parentId : ''), webViewLink: '#' };
    }

    try {
        let q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
        if (parentId) {
            q += ` and '${parentId}' in parents`;
        }

        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,webViewLink)`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            return { id: data.files[0].id, webViewLink: data.files[0].webViewLink };
        }
        return null;
    } catch (error) {
        console.error("Error finding folder:", error);
        return null;
    }
};

/**
 * Creates a folder in Google Drive.
 * If parentId is provided, creates inside that folder.
 */
export const apiCreateFolder = async (folderName: string, accessToken: string, parentId?: string): Promise<ApiResponse<{ id: string, webViewLink: string }>> => {
    // MOCK MODE
    if (accessToken.startsWith('demo_mode_')) {
        return { success: true, data: { id: 'mock-folder-' + Date.now(), webViewLink: '#' } };
    }

    try {
        const metadata: any = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        };
        
        if (parentId) {
            metadata.parents = [parentId];
        }

        const response = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(metadata),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to create folder');
        }

        const data = await response.json();
        return { success: true, data: { id: data.id, webViewLink: data.webViewLink } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Uploads a file (Generic). Can specify parent folder ID.
 */
export const apiUploadToGoogleDrive = async (
  blob: Blob | File, 
  fileName: string, 
  accessToken: string,
  parentId?: string
): Promise<ApiResponse<{ id: string, webViewLink: string, thumbnailLink?: string }>> => {
  // MOCK MODE CHECK
  if (accessToken.startsWith('demo_mode_')) {
      return mockUploadFile(fileName);
  }

  try {
    const metadata: any = {
      name: fileName,
      mimeType: blob.type || 'application/octet-stream',
      description: 'Uploaded from Sitrem Portal'
    };

    if (parentId) {
        metadata.parents = [parentId];
    }

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);

    // Added thumbnailLink to fields
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error('401 Unauthorized');
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    return { success: true, data: { id: data.id, webViewLink: data.webViewLink, thumbnailLink: data.thumbnailLink } };

  } catch (error: any) {
    console.error('Google Drive Upload Error:', error);
    return { success: false, error: error.message || "Failed to upload to Google Drive" };
  }
};

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// --- MOCK IMPLEMENTATIONS ---

const mockFiles: GoogleFile[] = [
    { id: '1', name: 'Sitrem_Policy_2025.pdf', mimeType: 'application/pdf', webViewLink: '#', createdTime: new Date().toISOString(), size: '2.4 MB' },
    { id: '2', name: 'Invoice_Template.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', webViewLink: '#', createdTime: new Date(Date.now() - 86400000).toISOString(), size: '15 KB' },
    { id: '3', name: 'Warehouse_Photo_01.jpg', mimeType: 'image/jpeg', webViewLink: '#', thumbnailLink: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&h=200&fit=crop', createdTime: new Date(Date.now() - 172800000).toISOString(), size: '1.2 MB' },
    { id: '4', name: 'Logo_Assets.zip', mimeType: 'application/zip', webViewLink: '#', createdTime: new Date(Date.now() - 400000000).toISOString(), size: '45 MB' },
];

const mockListFiles = async (query: string): Promise<ApiResponse<GoogleFile[]>> => {
    await new Promise(r => setTimeout(r, 800)); // Simulate delay
    if (!query) return { success: true, data: mockFiles };
    return { success: true, data: mockFiles.filter(f => f.name.toLowerCase().includes(query.toLowerCase())) };
};

const mockUploadFile = async (name: string): Promise<ApiResponse<{ id: string, webViewLink: string, thumbnailLink?: string }>> => {
    await new Promise(r => setTimeout(r, 1500)); // Simulate upload
    const newFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        mimeType: name.endsWith('jpg') ? 'image/jpeg' : 'application/octet-stream',
        webViewLink: '#',
        thumbnailLink: 'https://placehold.co/200?text=IMG',
        createdTime: new Date().toISOString(),
        size: '0.5 MB'
    };
    mockFiles.unshift(newFile);
    return { success: true, data: { id: newFile.id, webViewLink: '#', thumbnailLink: newFile.thumbnailLink } };
};
