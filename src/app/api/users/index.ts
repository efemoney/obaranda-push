import {RequestHandler} from "express";
import {users as usersModel} from "../../models";

export const updateToken = <RequestHandler>((req, res, next) => {

  const uid = req.body.uid;
  const token = req.body.token;

  usersModel.putDeviceToken(uid, token)
    .then(() => res.status(200).json())
    .catch(err => next(err))
  ;

});

export const updateCurrentPage = <RequestHandler>((req, res, next) => {

  const uid = req.body.uid;
  const page = req.body.page;

  usersModel.putCurrentPage(uid, page)
    .then(() => res.status(200).json())
    .catch(err => next(err))
  ;

});
