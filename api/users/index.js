const usersModel = require('../../models').users;

module.exports = {

  updateToken: (req, res, next) => {

    let uid = req.body.uid;
    let token = req.body.token;
    let brand = req.body.deviceBrand;
    let model = req.body.deviceModel;

    // todo validate

    usersModel.putDeviceToken(uid, token, brand, model)
      .then(() => res.sendStatus(200).json())
      .catch(err => next(err))
    ;

  },

  updateCurrentPage: (req, res, next) => {

    let uid = req.body.uid;
    let page = req.body.page;

    // todo validate

    usersModel.putCurrentPage(uid, page);

    res.sendStatus(200).send();
  }

};