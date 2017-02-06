var express = require('express');
var router = express.Router();

var model = require('../model');

/**
 * Callback to receive failed subscription and verify calls from superfeedr
 */
router.get('/callback', function (req, res) {

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

  if (hub.mode === Constants.DENIED) { // Subscription validation denied

    console.log('Subscription attempt to %s has been denied.\nReason: %s', hub.topic, hub.reason);

    res.sendStatus(200).end();
    return;
  }

  if (hub.mode === Constants.SUBSCRIBE) { // Check if a subscription is pending for this topic
                                          // Subscription verification request

    model.getPendingStatus(hub.topic, function (hasPendingSub) {

      if (!hasPendingSub) { // No pending subscription for this topic

        res.sendStatus(404); // Send a 404 Not Found!
        res.end();
        return;
      }

      // Pending subscription, update db and confirm verification request
      model.setPendingStatus(hub.topic, false);
      model.setSubscribedStatus(hub.topic, true);

      res.status(200)
        .send(hub.challenge)
        .end()
      ;

    });

    return;
  }

  // Not a subscription validation or verification request
  res.sendStatus(404).end();

});

/**
 * Callback to receive notification messages from superfeedr
 */
router.post('/callback', function (req, res) {

  res.sendStatus(200);
  res.end();

  console.log(JSON.stringify(req.body, undefined, 2));

  if (req.body.updated) console.log('Updated. Retrieve data now');

});

module.exports = router;
