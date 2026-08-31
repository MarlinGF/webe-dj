const DATABASE_VERSION = 1;
const TRACK_STORE = 'tracks';
const PLAYLIST_STORE = 'playlists';

export interface LocalTrackRecord {
  id: string;
  ownerId: string;
  title: string;
  artist: string;
  duration: number;
  type: 'song' | 'commercial';
  client?: string;
  source: 'upload' | 'itunes';
  audioBlob?: Blob;
  localUrl?: string;
  musicLibraryPersistentId?: string;
  createdAt: number;
}

export interface LocalPlaylistRecord {
  id: string;
  ownerId: string;
  name: string;
  items: Array<{ id: string; type: 'song' | 'commercial' }>;
  createdAt: number;
}

function openLibrary(ownerId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`webe-dj-library-${ownerId}`, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(TRACK_STORE)) {
        database.createObjectStore(TRACK_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(PLAYLIST_STORE)) {
        database.createObjectStore(PLAYLIST_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runRequest<T>(ownerId: string, storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openLibrary(ownerId);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export const createLocalId = () => crypto.randomUUID();

export async function requestPersistentLocalStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

export async function listLocalTracks(ownerId: string): Promise<LocalTrackRecord[]> {
  const tracks = await runRequest(ownerId, TRACK_STORE, 'readonly', (store) => store.getAll());
  return tracks.sort((a, b) => b.createdAt - a.createdAt);
}

export async function putLocalTrack(ownerId: string, track: LocalTrackRecord): Promise<void> {
  await runRequest(ownerId, TRACK_STORE, 'readwrite', (store) => store.put(track));
}

export async function deleteLocalTrack(ownerId: string, trackId: string): Promise<void> {
  await runRequest(ownerId, TRACK_STORE, 'readwrite', (store) => store.delete(trackId));
  const playlists = await listLocalPlaylists(ownerId);
  await Promise.all(playlists.map((playlist) => putLocalPlaylist(ownerId, {
    ...playlist,
    items: playlist.items.filter((item) => item.id !== trackId),
  })));
}

export async function listLocalPlaylists(ownerId: string): Promise<LocalPlaylistRecord[]> {
  const playlists = await runRequest(ownerId, PLAYLIST_STORE, 'readonly', (store) => store.getAll());
  return playlists.sort((a, b) => b.createdAt - a.createdAt);
}

export async function putLocalPlaylist(ownerId: string, playlist: LocalPlaylistRecord): Promise<void> {
  await runRequest(ownerId, PLAYLIST_STORE, 'readwrite', (store) => store.put(playlist));
}

export async function deleteLocalLibrary(ownerId: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(`webe-dj-library-${ownerId}`);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other We-be DJ tabs and try again.'));
  });
}
