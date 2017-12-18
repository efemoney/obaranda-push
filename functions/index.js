const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp(functions.config().firebase);

/**
 * @param array {[]}
 * @param size {int}
 * @returns {string[][]}
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


exports.onNewComic = functions.firestore
  .document('comics/{id}')
  .onCreate(event => {

    logEvent(event);

    let comic = event.data.data();

    /* See https://firebase.google.com/docs/reference/admin/node/admin.messaging.NotificationMessagePayload */
    let payload = {
      notification: {
        title: 'New comic on OBARANDA!',
        body: `${comic.title} was uploaded by ${comic.author.name}`,
      },
      data: {
        url: comic.url,
        page: comic.page,
        pubDate: comic.pubDate,
        title: comic.title,
      }
    };

    return admin.firestore()
      .collection('tokens')
      .get()
      .then(query => query.docs)
      .then(docs => docs.map((doc) => doc.get('token')))
      .then(tokens => chunkArray(tokens, 1000))
      .then(chunks => Promise.all(chunks.map(chunk => admin.messaging().sendToDevice(chunk, payload))))
      .then(results => results.forEach((res, pos) => {

        console.log(`Batch ${pos + 1} notifications sent. Failure Count: ${res.failureCount}`);

      }))
      .catch(err => logError(err));

  })
;

exports.onNewDeviceToken = functions.firestore
  .document('tokens/{uid}')
  .onWrite(event => {

    logEvent(event);

    let uid = event.params.uid;

    let token = event.data.get('token');
    let oldToken = event.data.previous ? event.data.previous.token : '';

    if (oldToken === token) return;

    admin.firestore()
      .collection('tokens')
      .doc(uid)
      .get()
      .then(doc => doc.get('token'))
      .then(token => {

        if (!token) return Promise.reject('No device token');

        /* See https://firebase.google.com/docs/reference/admin/node/admin.messaging.NotificationMessagePayload */
        let payload = {
          notification: {
            tag: 'new-device',

            title: `Device change`,
            body: `You just logged into your ${newDeviceData.brand} ${newDeviceData.model} device`
          }
        };

        return admin.messaging().sendToDevice(token, payload)

      })
    ;

  })
;
