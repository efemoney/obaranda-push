import admin = require("firebase-admin");
import {firestore} from 'firebase-functions';

admin.initializeApp();

export const countComics = firestore.document('comics/{page}').onWrite(async (delta, context) => {

  const internal = admin.firestore().collection('internal');

  if (delta.before.exists && delta.after.exists) return; // Updating item in place, exit early

  const count: number = (await internal.doc('comics-meta').get()).get('total-count') || 0;

  if (!delta.before.exists) { // Create
    await internal.doc('comics-meta').set({'total-count': count + 1}, {merge: true});
    return;
  }

  if (!delta.after.exists) { // Delete
    await internal.doc('comics-meta').set({'total-count': count + 1}, {merge: true});
    return;
  }
});
