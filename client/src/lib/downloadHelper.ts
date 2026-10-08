/**
 * Universal safe browser file download helper.
 * - Appends anchor to document.body to ensure browser dispatch
 * - Delays revokeObjectURL so browser background downloader has time to stream the blob
 * - Handles extraction of error messages from Blob error responses
 */
export function triggerFileDownload(blobOrData: Blob | string, filename: string, mimeType?: string) {
  const blob =
    typeof blobOrData === 'string'
      ? new Blob([blobOrData], { type: mimeType || 'text/plain;charset=utf-8;' })
      : blobOrData;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.setAttribute('download', filename);

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    try {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    } catch {
      // Ignored cleanup errors
    }
  }, 1500);
}

/**
 * Extracts a human-readable error message from an API error,
 * including reading Blob responses when responseType: 'blob'.
 */
export async function extractErrorMessage(err: any): Promise<string> {
  if (!err) return 'Unknown error occurred.';

  // If response data is a Blob (common in file download APIs)
  if (err.response?.data instanceof Blob) {
    try {
      const text = await err.response.data.text();
      const parsed = JSON.parse(text);
      return parsed.error || parsed.detail || parsed.message || text;
    } catch {
      // Not JSON or parse failed
    }
  }

  if (err.response?.data) {
    if (typeof err.response.data === 'object') {
      return (
        err.response.data.error ||
        err.response.data.detail ||
        err.response.data.message ||
        JSON.stringify(err.response.data)
      );
    }
    if (typeof err.response.data === 'string') {
      return err.response.data;
    }
  }

  return err.message || 'Operation failed.';
}
