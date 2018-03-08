import {RequestHandler} from "express";
import {comics as comicsModel} from "../../models/index";

export const get = <RequestHandler>((req, res, next) => {

  const page = parseInt(req.params.page);

  comicsModel.getByPage(page)
    .then(comic => res.status(200).json(comic))
    .catch(err => next(err))
  ;

});

export const getPage = <RequestHandler>((req, res, next) => {

  const page = parseInt(req.params.page);

  comicsModel.getByPage(page)
    .then(comic => res.status(200).json(comic))
    .catch(err => next(err))
  ;

});

export const getLatest = <RequestHandler>((req, res, next) => {

  comicsModel.getLatest()
    .then(comic => res.status(200).json(comic))
    .catch(err => next(err))
  ;

});