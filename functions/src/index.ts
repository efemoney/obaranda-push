import {firestore} from 'firebase-functions';
import admin = require("firebase-admin");
import winston = require("winston");

admin.initializeApp();

export const countComics = firestore.document('comics/{page}').onWrite(async (delta, context) => {

  winston.info(`${context.authType} calls ${context.eventType} on ${context.resource}`, {params: context.params});

  const page = context.params.page;
  const internal = admin.firestore().collection('internal');

  winston.info(``, {dataBeforeWrite: delta.before.exists, dataAfterWrite: delta.after.exists});

  // Updating item in place, exit early
  if (delta.before.exists && delta.after.exists) {
    winston.info(`Updating comic`, {page});
    winston.info(`Do nothing`);
    return;
  }

  const count: number = (await internal.doc('comics-meta').get()).get('total-count') || 0;

  if (!delta.before.exists) { // Create
    winston.info(`Creating comic`, {page});
    winston.info(`Previous total count = ${count}`);
    winston.info(`Try increment total count`);
    await internal.doc('comics-meta').set({'total-count': count + 1}, {merge: true});
    winston.info(`Increment total count success`);
    return;
  }

  if (!delta.after.exists) { // Delete
    winston.info(`Deleting comic`, {page});
    winston.info(`Previous total count = ${count}`);
    winston.info(`Try decrement total count`);
    await internal.doc('comics-meta').set({'total-count': count - 1}, {merge: true});
    winston.info(`Decrement total count success`);
    return;
  }
});
