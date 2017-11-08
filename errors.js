
const errors = require('errors');

errors.stacks(true);

errors.create({
  status: '403',
  name: 'InvalidUserError',
  defaultMessage: 'Invalid or No User. Please login'
});
errors.create({
  status: '401',
  name: 'AuthenticationError',
  defaultMessage: 'You shall not pass'
});
errors.create({
  status: '404',
  name: 'ComicNotFoundError',
  defaultMessage: 'Could not find comic'
});

module.exports = errors;