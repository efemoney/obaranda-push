const errors = require("../errors");

const admin = require('firebase-admin');
admin.initializeApp(getFirebaseAdminConfig());


const users = {

  putDeviceToken: (uid, token) => admin.firestore()
    .collection('tokens')
    .doc(uid)
    .set({token: token})
  ,

  putCurrentPage: (uid, page) => admin.firestore()
    .collection('current-page')
    .doc(uid)
    .set({page: page})
  ,

};

const comics = {

  /**
   * @param comics {Array}
   * @returns {Promise}
   */
  addAll: comics => Promise.all(comics.map(comic => admin.firestore().collection("comics").add(comic))),

  getLatest: () => admin.firestore()
    .collection('comics')
    .orderBy('page', 'desc').limit(1)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => docs.length !== 1
      ? Promise.reject(new errors.ComicNotFoundError())
      : docs[0].data()
    )
  ,

  /**
   * @param page {int}
   * @return {Promise<DocumentData>}
   */
  getByPage: page => admin.firestore()
    .collection('comics')
    .where('page', '==', page)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => docs.length !== 1
      ? Promise.reject(new errors.ComicNotFoundError())
      : docs[0].data()
    )
  ,

};

const settings = {

  getLastPolledSuccessfullyTime: () => admin.firestore()
    .collection('internal')
    .doc('settings')
    .get()
    .then(doc => doc.exists
      ? (doc.get('last-poll') || 0)
      : 0
    )
  ,

  setLastPolledSuccessfullyTime: time => admin.firestore()
    .collection('internal')
    .doc('settings')
    .set({'last-poll': time}, {merge: true})
  ,

};


module.exports = {

  users: users,

  comics: comics,

  settings: settings,

};


function getFirebaseAdminConfig() {

  return {
    credential: admin.credential.cert(require('../service-account-key')),
    databaseURL: process.env.FIREBASE_DB_URL
  };
}
