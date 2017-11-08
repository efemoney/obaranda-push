const errors = require("../errors");

const admin = require('firebase-admin');
admin.initializeApp(getFirebaseAdminConfig());


const users = {

  putDeviceToken: (uid, token, brand, model) => {

    let tokensRef = admin.database().ref("user-tokens");
    let deviceRef = admin.database().ref("user-devices");

    return Promise.all([

      tokensRef.child(uid).set(token),
      deviceRef.child(uid).set({brand: brand, model: model}),

    ]);

  },

  putCurrentPage: (uid, page) => admin.database().ref('user-pages')
    .child(uid)
    .set(page)
  ,

};

const comics = {

  /**
   * @param comics {Array}
   * @returns {Promise}
   */
  addAll: comics => Promise.all(comics.map(comic => admin.firestore()
    .collection("comics")
    .add(comic)
  )),

  getLatest: () => admin.firestore()
    .collection('comics')
    .orderBy('page', 'desc').limit(1)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => docs.length !== 1 ? Promise.reject(new errors.ComicNotFoundError()) : docs[0].data())
  ,

  /**
   * @param page {int}
   * @return {Promise<DocumentSnapshot[]>}
   */
  getByPage: page => admin.firestore()
    .collection('comics')
    .where('page', '==', page)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => docs.length !== 1 ? Promise.reject(new errors.ComicNotFoundError()) : docs[0].data())
  ,

};

const settings = {

  getLastPolledSuccessfullyTime: () => admin.firestore()
    .collection('settings')
    .doc('poll-times')
    .get()
    .then(doc => doc.exists ? (doc.get('latest') || 0) : 0)
  ,

  setLastPolledSuccessfullyTime: time => admin.firestore()
    .collection('settings')
    .doc('poll-times')
    .set({latest: time})
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
