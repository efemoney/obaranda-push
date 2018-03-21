import {RequestHandler} from "express";
import {comics as comicsModel} from "../../models";
import {BasicPaginationLink, LinkHeader} from "../../util/pagination-helper";


export const getAll = <RequestHandler>(async (req, res, next) => {

  let {limit = '20', offset = '0'} = req.query;
  limit = parseInt(limit);
  offset = parseInt(offset);

  try {

    // retrieve comics
    let comics: any[] = await comicsModel.getAll(limit, offset);

    // lighten payload. would've been great if could be done in firestore but sub document queries aren't supported
    comics = comics.map(it => ({
      page: it.page,
      title: it.title,
      permalink: it.permalink,
      pubDate: it.pubDate,
      previewImg: {
        url: it.images[0].url,
        palette: it.images[0].palette.muted || it.images[0].palette.vibrant
      }
    }));

    const totalCount = await comicsModel.getCount();

    // From heroku, req.protocol is always 'http', original user req protocol is in 'X-Forward-Proto'
    const originalUrl = req.get('X-Forwarded-Proto') + '://' + req.hostname + req.originalUrl;

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