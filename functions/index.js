
const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp(functions.config().firebase);


/**
 * @param array {Array}
 * @param size {int}
 * @returns {Array<Array<int>>}
 */
function chunkArray(array, size) {

  if (array.length < size) return [array];

  let temp = [];

  for (let i = 0; i < array.length; i += size) {
    let chunk = array.slice(i, i + size);
    temp.push(chunk);
  }

  return temp;
}

/**
 * @param event {Event<DeltaSnapshot>}
 */
function logEvent(event) {

  console.log("Data: %s", event.data.toJSON());
  console.log("Params: %s", JSON.stringify(event.params));
  console.log("Event: %s", event.eventType);
}

/**
 * @param error {Error}
 */
function logError(error) {

  console.error(error);
}


exports.onNewComic = functions.firestore.doc('comics/{uid}').onWrite(event => {

  logEvent(event);

  let uid = event.params.uid;
  let comic = event.data.current.val();
  let previous = event.data.previous.val();

  /* See https://firebase.google.com/docs/reference/admin/node/admin.messaging.NotificationMessagePayload */
  let payload = {
    notification: {
      title: `${ previous ? 'Updated' : 'New'} comic on OBARANDA!`,
      body: `${comic.title} was uploaded by ${comic.author.name}`,
    },
    data: {
      url: comic.url,
      page: comic.page,
      pubDate: comic.pubDate,
      title: comic.title,
    }
  };

  return admin.database().ref('user-tokens').once('value')
    .then(snapshot => snapshot.val())
    .then(tokens => chunkArray(tokens, 1000))
    .then(chunks => Promise.all(chunks.map(chunk => admin.messaging().sendToDevice(chunk, payload))))
    .then(results => results.forEach((res, pos) => {

      console.log(`Batch ${pos + 1} notifications sent. Failure Count: ${res.failureCount}`);

    }))
    .catch(err => logError(err));

});

exports.onNewDeviceToken = functions.firestore.doc('tokens/{uid}').onWrite(event => {

  logEvent(event);

  let uid = event.params.uid;

  let oldDeviceData = event.data.previous.val();
  let newDeviceData = event.data.current.val();

  if (!oldDeviceData
    || oldDeviceData.brand !== newDeviceData.brand
    || oldDeviceData.model !== newDeviceData.model) return;

  admin.database().ref('user-tokens')
    .child(uid)
    .once('value')
    .then(snapshot => snapshot.val())
    .then(token => {

      if (!token) return Promise.reject('No device token');

      /* See https://firebase.google.com/docs/reference/admin/node/admin.messaging.NotificationMessagePayload */
      let payload = {
        notification: {
          title: `Device change`,
          body: `You just logged into your ${newDeviceData.brand} ${newDeviceData.model} device`,

          tag: 'new-device'
        }
      };

      return admin.messaging().sendToDevice(token, payload)

    })
  ;

});
