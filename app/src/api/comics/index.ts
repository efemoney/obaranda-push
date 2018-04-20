import {RequestHandler} from "express";
import {comics as comicsModel} from "../../models";
import {BasicPaginationLink, LinkHeader} from "../../util/pagination-helper";


export const getAll = <RequestHandler>(async (req, res, next) => {

  let {limit = '20', offset = '0'} = req.query;
  limit = parseInt(limit);
  offset = parseInt(offset);

  try {

    // retrieve comics
    const comics = await comicsModel.getAllComics(limit, offset);
    const totalCount = await comicsModel.getTotalCount();

    // On heroku, req.protocol is always 'http', original user req protocol is in 'X-Forward-Proto'
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const originalUrl = protocol + '://' + req.hostname + req.originalUrl;

    const linkHeader = new LinkHeader();

    if (offset > 0)
      linkHeader.push(new BasicPaginationLink('prev', originalUrl, limit, Math.max(offset - limit, 0)));

    if (offset + comics.length <= totalCount)
      linkHeader.push(new BasicPaginationLink('next', originalUrl, limit, offset + comics.length));

    res
      .status(200)
      .header('Link', linkHeader.get())
      .header('X-Total-Count', totalCount.toString())
      .json(comics)
    ;

  } catch (err) {
    next(err);
  }

});

export const getPage = <RequestHandler>(async (req, res, next) => {

  const page = parseInt(req.params.page);

  try {
    const comic = comicsModel.getComicByPage(page)

  } catch (e) {
    next(e)
  }

  comicsModel.getComicByPage(page)
    .then(comic => res.status(200).json(comic))
    .catch(err => next(err))
  ;

});

export const getLatest = <RequestHandler>(async (req, res, next) => {

  try {
    const comic = comicsModel.getComicByLatest()
  } catch (e) {
    next(e);
  }

  comicsModel.getComicByLatest()
    .then(comic => res.status(200).json(comic))
    .catch(err => next(err))
  ;

});