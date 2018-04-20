import {DocumentReference} from '@google-cloud/firestore';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export const countComics = functions.firestore.document('comics/{page}').onWrite((delta, context) => {

  const countRef: DocumentReference = admin.firestore().collection('internal').doc('comics-meta');

  if (delta.before.exists && delta.after.exists) return Promise.resolve(); // Update, do nothing

  if (!delta.before.exists) return countRef.get() // Create
    .then(snapshot => countRef.set({'total-count': (snapshot.get('total-count') || 0) + 1}));

  if (!delta.after.exists) return countRef.get() // Delete
    .then(snapshot => countRef.set({'total-count': (snapshot.get('total-count') || 0) - 1}));

  return Promise.resolve();
});
