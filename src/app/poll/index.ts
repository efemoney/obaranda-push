/* Yes. Pollis is a reference to a place in the series, The 100 (watch it!) */

import {Observable} from "rxjs/Rx";
import {Router} from "express";
import {Palette} from "node-vibrant/lib/color";
import {AuthenticationError} from "../errors";
import {Comic, ComicImages, comics as comicModel, settings as settingsModel} from "../models";
import * as moment from "moment";
import Vibrant = require("node-vibrant");
import oboeFunction = require("oboe");

const probe = require("probe-image-size");


interface FeedItem {

  page: number,

  title: string,

  url: string,

  permalink: string,

  date_published: string,

  author: { name: string },

  images: { url: string, alt?: string }[],

  post: { title?: string, body?: string }
}

interface ImageMetadata {

  width: string,

  height: string,

  muted?: string,

  vibrant?: string,
}

type ComicImagesMetadata = ImageMetadata[];


const logError = (error: Error) => console.error(error);

const findMuted: (palette: Palette) => string | undefined = palette => {

  return palette.Muted ? palette.Muted.getHex() : palette.DarkMuted ? palette.DarkMuted.getHex() : undefined;
};

const findVibrant: (palette: Palette) => string | undefined = palette => {

  return palette.Vibrant ? palette.Vibrant.getHex() : palette.DarkVibrant ? palette.DarkVibrant.getHex() : undefined;
};

const computeImagesMetadata: (comicImages: ComicImages) => Observable<ComicImagesMetadata> = comicImages => {

  return Observable.from(comicImages)
    .flatMap(image => {

      type WidthAndHeight = { width: string, height: string }
      type MutedAndVibrant = { muted?: string, vibrant?: string }

      const size = probe(image.url) as PromiseLike<{ width: string, height: string }>;

      const palette = Vibrant.from(image.url).getPalette();

      const sObservable: Observable<WidthAndHeight> = Observable.fromPromise(size)
        .map(result => ({
          width: result.width,
          height: result.height,
        }))
      ;

      const pObservable: Observable<MutedAndVibrant> = Observable.fromPromise(palette)
        .map(palette => ({
          muted: findMuted(palette),
          vibrant: findVibrant(palette)
        }))
      ;

      return pObservable.zip(sObservable, (p, s) => ({
        width: s.width,
        height: s.height,
        muted: p.muted,
        vibrant: p.vibrant
      }) as ImageMetadata);
    })
    .toArray()
  ;

};

const saveNewItems: (comics: FeedItem[]) => Promise<any> = items => {

  if (items.length < 1) return Promise.resolve();

  // items were read in reverse chronological order (latest first),
  // correct by reversing then map to our own domain object
  const comics: Comic[] = items
    .reverse()
    .map(item => ({
      page: item.page,
      url: item.url,
      title: item.title,
      permalink: item.permalink,
      pubDate: item.date_published,
      images: item.images,
      post: item.post,
      author: item.author,
    }) as Comic)
  ;

  return Observable.from(comics)
    .map(comic => comic.images)
    .flatMap(comicImages => computeImagesMetadata(comicImages))
    .toArray()
    .toPromise()
    .then(arrayOfMetadatas => {

      comics.forEach((comic, i) => {

        let imagesMetadata = arrayOfMetadatas[i];

        comic.images.forEach((image, j) => {

          let metadata = imagesMetadata[j];

          image.palette = {
            muted: metadata.muted,
            vibrant: metadata.vibrant
          };

          image.size = {
            width: metadata.width,
            height: metadata.height
          }

        });
      })

    })
  ;

};


const router: Router = Router();

router.post('/', (req, res, next) => {

  const reqAuth = (req.headers.authorization as string || ' ').split(' ')[1] || '';

  const [login, password] = new Buffer(reqAuth).toString('base64').split(':');

  const auth = {
    login: process.env.POLL_USERNAME,
    password: process.env.POLL_PASSWORD,
  };

  // Verify login and password are set and correct
  if (!login || !password || login !== auth.login || password !== auth.password) {
    res.set('WWW-Authenticate', 'Basic realm="cron-job"');
    next(new AuthenticationError());
    return
  }

  settingsModel.getLastPolledTime()
    .then(time => moment(time))
    .then(lastPolled => {

      const newItems: FeedItem[] = [];
      const feedUrl = process.env.OBARANDA_FEED_URL as string;
      const oboe = oboeFunction(feedUrl);

      oboe
        .node('!.items.*', item => {

          let pubdate = moment(item.date_published);

          if (pubdate.isAfter(lastPolled)) newItems.push(item); else {

            oboe.abort();

            saveNewItems(newItems)
              .then(() => settingsModel.setLastPolledTime(moment().valueOf()))
            ;
          }

        })
        .done(() => {

          saveNewItems(newItems)
            .then(() => settingsModel.setLastPolledTime(moment().valueOf()))
            .catch(e => logError(e))
          ;

        })
      ;

    })
    .catch(e => logError(e))
  ;

  res.sendStatus(200).end()

});

export default router

