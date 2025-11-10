const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// onCreate trigger for family_tasks
exports.ensureTaskDefaults = functions.firestore
  .document('family_tasks/{taskId}')
  .onCreate(async (snap, ctx) => {
    const data = snap.data() || {};
    const updates = {};

    // Ensure private is boolean (default false)
    if (typeof data.private === 'undefined') updates.private = false;

    // Ensure createdAt and updatedAt exist
    const now = admin.firestore.FieldValue.serverTimestamp();
    if (!data.createdAt) updates.createdAt = now;
    if (!data.updatedAt) updates.updatedAt = now;

    // Ensure repeatDays is array if present but malformed: if not array, remove it (or set to null)
    if ('repeatDays' in data && !Array.isArray(data.repeatDays)) {
      updates.repeatDays = admin.firestore.FieldValue.delete();
    }

    // Only write if we have updates to apply
    if (Object.keys(updates).length > 0) {
      try {
        await snap.ref.update(updates);
        console.log('ensureTaskDefaults applied to', snap.id, updates);
      } catch (err) {
        console.error('Failed to apply defaults for', snap.id, err);
      }
    } else {
      console.log('ensureTaskDefaults: no changes needed for', snap.id);
    }

    return null;
  });
