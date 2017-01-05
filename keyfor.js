var Const = require('./constants');

/**
 * Returns a string to be used as key for a firebase db node. Must be a unique per topicUrl.
 *
 * When a pending subscription is requested, a boolean indicating status is stored at
 * <b>subscriptions/pending/(topicUrl)/</b> and cleared when the subscription request has been verified
 *
 * This approach fails because slashes (which are part of a url structure) are not allowed within keys in
 * Firebase DBs and hence the need for this function
 *
 * @return {string} valid and unique key per <code>topicUrl</code>
 */
module.exports = function (topicUrl) {

  // In the future this might just be a stripping function
  // that removes any illegal characters from the topicUrl
  switch (topicUrl) {

    case  Const.SUBCRIBE_TOPIC:
      return 'obaranda';

    default:
      return 'anything';
  }

};