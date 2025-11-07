import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface FormDataSchema extends DBSchema {
  formData: {
    key: string;
    value: {
      id: string;
      answers: any;
      signature?: string;
      metadata?: any;
      timestamp: number;
      synced: boolean;
      userId: string;
      templateId: string;
    };
  };
  templates: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<FormDataSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FormDataSchema>('ordersnapr-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('formData')) {
          db.createObjectStore('formData', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveFormDataLocally(data: {
  id: string;
  answers: any;
  signature?: string;
  metadata?: any;
  synced: boolean;
  userId: string;
  templateId: string;
}) {
  try {
    const db = await getDB();
    await db.put('formData', {
      ...data,
      timestamp: Date.now(),
    });
    return true;
  } catch (error) {
    console.error('Failed to save form data locally:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem(`form-${data.id}`, JSON.stringify({ ...data, timestamp: Date.now() }));
      return true;
    } catch {
      return false;
    }
  }
}

export async function getFormDataLocally(id: string) {
  try {
    const db = await getDB();
    const data = await db.get('formData', id);
    return data || null;
  } catch (error) {
    console.error('Failed to get form data locally:', error);
    // Fallback to localStorage
    try {
      const data = localStorage.getItem(`form-${id}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}

export async function deleteFormDataLocally(id: string) {
  try {
    const db = await getDB();
    await db.delete('formData', id);
    localStorage.removeItem(`form-${id}`);
  } catch (error) {
    console.error('Failed to delete form data locally:', error);
  }
}

export async function markFormAsSynced(id: string) {
  try {
    const db = await getDB();
    const data = await db.get('formData', id);
    if (data) {
      data.synced = true;
      await db.put('formData', data);
    }
  } catch (error) {
    console.error('Failed to mark form as synced:', error);
  }
}

export async function getAllUnsyncedForms() {
  try {
    const db = await getDB();
    const allData = await db.getAll('formData');
    return allData.filter(item => !item.synced);
  } catch (error) {
    console.error('Failed to get unsynced forms:', error);
    return [];
  }
}

export async function storeTemplateLocally(id: string, data: any) {
  try {
    const db = await getDB();
    await db.put('templates', { id, data, timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to store template locally:', error);
  }
}

export async function getTemplateLocally(id: string) {
  try {
    const db = await getDB();
    return await db.get('templates', id);
  } catch (error) {
    console.error('Failed to get template locally:', error);
    return null;
  }
}

export async function getAllTemplatesLocally() {
  try {
    const db = await getDB();
    return await db.getAll('templates');
  } catch (error) {
    console.error('Failed to get templates locally:', error);
    return [];
  }
}
