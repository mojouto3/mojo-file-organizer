import { confirm } from './confirm.js';

let rootsPromise = null;

function getRoots() {
  if (!rootsPromise) rootsPromise = window.api.getCloudSyncRoots();
  return rootsPromise;
}

function normalize(p) {
  return p.toLowerCase().replace(/\\+$/, '');
}

export async function detectCloudSyncFolder(folderPath) {
  if (!folderPath) return null;
  const roots = await getRoots();
  const target = normalize(folderPath);
  for (const root of roots) {
    const rootPath = normalize(root.path);
    if (target === rootPath || target.startsWith(`${rootPath}\\`)) return root.provider;
  }
  return null;
}

const BULK_WARNING_THRESHOLD = 50;

// Shared guard for bulk move/organize actions: shows a confirm dialog when
// the folder is inside a detected cloud-sync root and the operation touches
// enough files to risk triggering a large re-upload. Returns true when it's
// fine to proceed (not a cloud folder, under the threshold, or the user
// confirmed anyway).
export async function confirmBulkCloudOperation(t, folderPath, fileCount) {
  if (fileCount <= BULK_WARNING_THRESHOLD) return true;
  const provider = await detectCloudSyncFolder(folderPath);
  if (!provider) return true;
  return confirm(t('cloudSync.bulkWarning', { provider, count: fileCount }), { confirmLabel: t('cloudSync.continueAnyway') });
}
