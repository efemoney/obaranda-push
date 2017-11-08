const model = require('../../models');
const comicsModel = model.comics;

module.exports = {

  getPage: (req, res, next) => {

    let page = parseInt(req.params.page);

    comicsModel.getByPage(page)
      .then(comic => res.status(200).json(comic))
      .catch(err => next(err))
    ;

  },

  getLatest: (req, res, next) => {

    comicsModel.getLatest()
      .then(comic => res.status(200).json(comic))
      .catch(err => next(err))
    ;

  }

};