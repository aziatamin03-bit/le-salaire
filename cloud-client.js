// Cloud Client & Firebase Firestore Real-Time Sync for OBAYOLI HR
(function() {
  const AUDIT_KEY = 'obayoli-audit-logs';
  let firestoreDb = null;
  let initPromise = null;

  async function getFirestoreDatabase() {
    if (firestoreDb) return firestoreDb;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      let attempts = 0;
      while (!window.FirebaseSDK && attempts < 40) {
        await new Promise(resolve => setTimeout(resolve, 80));
        attempts++;
      }

      if (!window.FirebaseSDK) {
        console.warn('FirebaseSDK not available; using local fallback');
        return null;
      }

      try {
        const response = await fetch('/firebase-applet-config.json');
        const config = await response.json();
        const app = window.FirebaseSDK.initializeApp(config);
        // CRITICAL: Use the exact provisioned firestoreDatabaseId
        firestoreDb = window.FirebaseSDK.getFirestore(app, config.firestoreDatabaseId);
        console.log('Connected to Firebase Firestore:', config.firestoreDatabaseId);
        return firestoreDb;
      } catch (error) {
        console.warn('Could not initialize Firebase Firestore:', error);
        return null;
      }
    })();

    return initPromise;
  }

  function logAudit(action, fields) {
    try {
      const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
      logs.unshift({
        id: Date.now(),
        actor_email: 'admin@obayoli.ma',
        action: action,
        changed_fields: fields || [],
        occurred_at: new Date().toISOString()
      });
      if (logs.length > 100) logs.pop();
      localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
    } catch (e) {}
  }

  window.ObayoliCloud = {
    getCurrentUser: async function() {
      return {
        id: 'user-admin',
        name: 'مدير الموارد البشرية',
        email: 'rh@obayoli.ma',
        role: 'admin',
        mfa: true
      };
    },

    getState: async function(module) {
      const db = await getFirestoreDatabase();
      if (db && window.FirebaseSDK) {
        try {
          const docRef = window.FirebaseSDK.doc(db, 'system', `${module}_state`);
          const docSnap = await window.FirebaseSDK.getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('Loaded state from Firestore:', module, 'rev:', data.revision);
            return {
              revision: Number(data.revision) || 1,
              payload: data.payload
            };
          }
        } catch (err) {
          console.warn('Error reading from Firestore:', err);
        }
      }

      // Fallback to local storage
      try {
        const stored = localStorage.getItem(`obayoli-cloud-${module}`) || localStorage.getItem('obayoli-hr-local-v2');
        if (stored) {
          const rev = Number(localStorage.getItem(`obayoli-cloud-rev-${module}`) || 1);
          return {
            revision: rev,
            payload: JSON.parse(stored)
          };
        }
      } catch (err) {
        console.warn('Error reading module state from storage:', err);
      }
      return { revision: 0, payload: null };
    },

    saveState: async function(module, data, expectedRevision) {
      const nextRev = (Number(expectedRevision) || 0) + 1;
      const serialized = JSON.stringify(data);

      // Local storage backup
      localStorage.setItem(`obayoli-cloud-${module}`, serialized);
      localStorage.setItem('obayoli-hr-local-v2', serialized);
      localStorage.setItem(`obayoli-cloud-rev-${module}`, String(nextRev));
      logAudit('تحديث قاعدة البيانات', [module]);

      // Firebase Firestore persistence
      const db = await getFirestoreDatabase();
      if (db && window.FirebaseSDK) {
        try {
          const docRef = window.FirebaseSDK.doc(db, 'system', `${module}_state`);
          await window.FirebaseSDK.setDoc(docRef, {
            revision: nextRev,
            payload: data,
            updatedAt: new Date().toISOString()
          });
          console.log('Successfully synced to Firestore:', module, 'rev:', nextRev);
        } catch (err) {
          console.error('Failed to sync to Firestore:', err);
        }
      }

      return { success: true, revision: nextRev };
    },

    pollState: async function(module) {
      const db = await getFirestoreDatabase();
      if (db && window.FirebaseSDK) {
        try {
          const docRef = window.FirebaseSDK.doc(db, 'system', `${module}_state`);
          const docSnap = await window.FirebaseSDK.getDoc(docRef);
          if (docSnap.exists()) {
            return { revision: Number(docSnap.data().revision) || 1 };
          }
        } catch (e) {}
      }
      const rev = Number(localStorage.getItem(`obayoli-cloud-rev-${module}`) || 1);
      return { revision: rev };
    },

    request: async function(url, options) {
      options = options || {};
      if (url.includes('/api/audit')) {
        try {
          return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
        } catch (e) {
          return [];
        }
      }
      if (url.includes('/api/admin/state/hr/export')) {
        const data = JSON.parse(localStorage.getItem('obayoli-cloud-hr') || localStorage.getItem('obayoli-hr-local-v2') || 'null');
        return data;
      }
      if (url.includes('/api/admin/state/hr/import')) {
        if (options.body) {
          localStorage.setItem('obayoli-cloud-hr', options.body);
          localStorage.setItem('obayoli-hr-local-v2', options.body);
          logAudit('استرجاع نسخة احتياطية', ['all']);
        }
        return { success: true };
      }
      return {};
    }
  };
})();
