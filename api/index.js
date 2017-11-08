
const errors = require('errors');
const router = require('express').Router();

const reqLogger = (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}\n`);
  next();
};

const auth = (req, res, next) => {

  let uid = req.header('Auth-Uid');

  if (!uid) {
    next(new errors.InvalidUserError());
    return;
  }

  req.body.uid = uid;

  next();

};

router.use(reqLogger);

const comicsRoute = require('./comics');
router.get('/comics/:page(\\d+)', comicsRoute.getPage);
router.get('/comics/latest', comicsRoute.getLatest);

const usersRoute = require('./users');
router.put('/users/token', auth, usersRoute.updateToken);
router.put('/users/page', auth, usersRoute.updateCurrentPage);


module.exports = router;