import {RequestHandler} from "express";
import {comics as comicsModel} from "../../models";

export const getAll = <RequestHandler>((req, res, next) => {

  const {limit = '10', offset = '0'} = req.query;

  comicsModel.getAll(parseInt(limit), parseInt(offset))
    .then(comics => res.status(200).json(comics))
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

  comicsModel.getByLatest()
    .then(comic => res.status(200).json(comic))
    .catch(err => next(err))
  ;

});