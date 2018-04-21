import {firestore} from 'firebase-functions';
import admin = require("firebase-admin");
import winston = require("winston");

const Logger = winston.Logger;
const Console = winston.transports.Console;

const {LoggingWinston} = require('@google-cloud/logging-winston');

const logger = new Logger({
  level: 'info',
  transports: [new Console(), new LoggingWinston()],
});

admin.initializeApp();

export const incComics = firestore.document('comics/{page}').onCreate(async (snapshot, context) => {

  const metaRef = admin.firestore().collection('internal').doc('comics-meta');

  await admin.firestore().runTransaction(async transaction => {
    const count = (await transaction.get(metaRef)).get('total-count') || 0;
    await transaction.set(metaRef, {'total-count': count + 1}, {merge: true});
  });

});

export const decComics = firestore.document('comics/{page}').onDelete(async (snapshot, context) => {

  const metaRef = admin.firestore().collection('internal').doc('comics-meta');

  await admin.firestore().runTransaction(async transaction => {
    const count = (await transaction.get(metaRef)).get('total-count') || 0;
    await transaction.set(metaRef, {'total-count': count - 1}, {merge: true});
  });

});
