import admin = require("firebase-admin");
import {firestore} from 'firebase-functions';

admin.initializeApp();

export const countComics = firestore.document('comics/{page}').onWrite((delta, context) => {

  const comicsMeta = admin.firestore().collection('internal').doc('comics-meta');

  if (delta.before.exists && delta.after.exists) return Promise.resolve(); // Update, do nothing

  if (!delta.before.exists) return comicsMeta.get() // Create
    .then(snapshot => comicsMeta.set({'total-count': (snapshot.get('total-count') || 0) + 1}));

  if (!delta.after.exists) return comicsMeta.get() // Delete
    .then(snapshot => comicsMeta.set({'total-count': (snapshot.get('total-count') || 0) - 1}));

  return Promise.resolve();
});
