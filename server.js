// Load environment variables
require('dotenv').load();

var keyFor = require('./keyfor');
var Constants = require('./constants');

var firebase = require("firebase");
firebase.initializeApp(getFirebaseConfig());

var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Get a request object that sets baseUrl to the superfeedr push url
var request = require('request').defaults({baseUrl: Constants.SUPERFEEDR_PUSH_URL});



/**
 * Callback to receive failed subscription and verify calls from superfeedr
 */
app.get('/superfeedr/callback/', function (req, res) {

  var hub = {
    mode: req.query['hub.mode'], // Constant
    topic: req.query['hub.topic'], // Constant

    reason: req.query['hub.reason'], // Set for validation denied notification

    challenge: req.query['hub.challenge'], // Set for verification request
    lease_seconds: req.query['hub.lease_seconds'] // Set for verification request
  };

  if (!hub.mode || !hub.topic) { //

    res.sendStatus(404);
    res.end();
    return;
  }

  // Subscription validation denied
  if (hub.mode === Constants.DENIED) {

    console.log('Subscription attempt to %s has been denied.\nReason: %s', hub.topic, hub.reason);

    res.sendStatus(200);
    res.end();
    return;
  }

  // Subscription verification request
  if (hub.mode === Constants.SUBSCRIBE) { // Check if a subscription is pending for this topic

    var key = keyFor(hub.topic);
    var pendingTopic = firebase.database().ref('subscriptions/pending/' + key);

    pendingTopic.once('value', function (snapshot) {

      if (!snapshot || !snapshot.val()) { // No pending subscription for this topic

        res.sendStatus(404); // Send a 404 Not Found!
        res.end();
        return;
      }

      // Pending subscription, update db and confirm verification request

      pendingTopic.set(null);

      // fixme Accept every subscribe request
      // var subscribedTopic = firebase.database().ref('subscriptions/subscribed/' + key);
      // subscribedTopic.set(true);

      res.status(200).send(hub.challenge);
      res.end();

    });

    return;
  }

  // Not a subscription validation or verification request
  res.sendStatus(404);
  res.end();

});


/**
 * Callback to receive notification messages from superfeedr
 */
app.post('/superfeedr/callback/', function (req, res) {

  res.sendStatus(200);
  res.end();

  console.log(JSON.stringify(req.body, undefined, 2));

  if (req.body.updated) console.log('Updated. Retrieve data now');

});


// Heroku sets an env variable (PORT) so we use it or port 80
app.listen(process.env.PORT || 80, function () {

  // Check for the current subscription state

  var key = keyFor(Constants.SUBCRIBE_TOPIC);
  var obarandaSubscription = firebase.database().ref('subscriptions/subscribed/' + key);

  obarandaSubscription.once('value', function(snapshot) {

    // if state doesn't exist OR isn't set
    if (!snapshot || !snapshot.val()) subscribeForPush();

  });

});



/**
 * Subscribe to Obaranda RSS if we havent subscribed before
 */
function subscribeForPush() {

  // Begin a subscription request
  var subRequest = {
    auth: getSubscribeAuthParams(),
    form: getSubscribeParams()
  };

  request.post('/', subRequest, function (error, response, body) {

    if (error) return console.error(error);

    if (response.statusCode !== 202) { // Subscription request rejected

      console.log(response.statusCode);
      console.log(response.body);
      return;
    }

    var key = keyFor(Constants.SUBCRIBE_TOPIC);
    var obarandaPending = firebase.database().ref('subscriptions/pending/' + key);

    obarandaPending.set(true);

  });
}


function getFirebaseConfig() {
  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DB_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  }
}

function getSubscribeParams() {

  return {
    'hub.mode': Constants.SUBSCRIBE, // Subscribe command
    'hub.topic': Constants.SUBCRIBE_TOPIC, // The resource to subscribe to
    'hub.callback': Constants.SUBSCRIBE_CALLBACK_URL, // Callback Url

    'hub.verify': 'async', // | sync ... Verify the request asynchronously | synchronously
    'format': 'json',
    'retrieve': 'true'
  };
}

function getSubscribeAuthParams() {

  return {
    user: process.env.SUPERFEEDR_LOGIN, // Superfeedr user Id
    pass: process.env.SUPERFEEDR_TOKEN, // Superfeedr token

    sendImmediately: true
  }
}

function getUnsubscribeParams() {

  return {
    'hub.mode': Constants.UNSUBSCRIBE, // Unsubscribe command
    'hub.topic': SUBCRIBE_TOPIC, // The resource to unsubscribe from
    'hub.callback': SUBSCRIBE_CALLBACK_URL, // Callback Url

    'hub.verify': 'async',
    'format': 'json'
  };
}
