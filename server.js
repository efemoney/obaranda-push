require('dotenv').load(); /* Load environment variables */

var Const = require('./constants');
var model = require('./model');

var request = require('request').defaults(getRequestDefaults());

var bodyParser = require('body-parser');
var express = require('express');
var app = express();

var superfeedr = require('./routes/superfeedr');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/superfeedr', superfeedr);

// Heroku sets an env variable (PORT) so we use it or port 80
app.listen(process.env.PORT || 80, function () {

  // Check for the current subscription state
  model.getSubscribedStatus(Const.SUBCRIBE_TOPIC, function (isSubscribed) {

    if (!isSubscribed) subscribeForPush();

  });

});


/**
 * Subscribe to Obaranda RSS if we haven't subscribed before
 */
function subscribeForPush() {

  // Begin a subscription request
  var subRequest = {
    auth: getSubscribeAuthParams(),
    form: getSubscribeParams()
  };

  request.post('/', subRequest, function (error, response, body) {

    if (error) return console.error(error);

    var code = response.statusCode;

    if (code !== 200 && code !== 202) { // Subscription request rejected

      console.log(response.statusCode);
      console.log(response.body);
      return;
    }

    model.setPending(Const.SUBCRIBE_TOPIC, true);

  });
}

function getRequestDefaults() {

  return {
    baseUrl: Const.SUPERFEEDR_PUSH_URL
  };

}

function getSubscribeParams() {

  return {
    'hub.mode': Const.SUBSCRIBE, // Subscribe command
    'hub.topic': Const.SUBCRIBE_TOPIC, // The resource to subscribe to
    'hub.callback': Const.SUBSCRIBE_CALLBACK_URL, // Callback Url

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
    'hub.mode': Const.UNSUBSCRIBE, // Unsubscribe command
    'hub.topic': SUBCRIBE_TOPIC, // The resource to unsubscribe from
    'hub.callback': SUBSCRIBE_CALLBACK_URL, // Callback Url

    'hub.verify': 'async',
    'format': 'json'
  };
}
