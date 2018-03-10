/* Pollis is a reference to the series, The 100 (watch it!) */

import {Router} from "express";
import {AuthenticationError} from "../errors";
import {Palette} from "node-vibrant/lib/color";
import {Comic, ComicImages, comics as comicModel, settings as settingsModel} from "../models";
import * as moment from "moment";
import oboe = require("oboe");
import Vibrant = require("node-vibrant");

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

type ComicImagesMetadatas = ImageMetadata[];


const logError = (error: Error) => console.error(error);

const findMuted: (palette: Palette) => string | undefined = palette => {

  return palette.Muted ? palette.Muted.getHex() : palette.DarkMuted ? palette.DarkMuted.getHex() : undefined;
};

const findVibrant: (palette: Palette) => string | undefined = palette => {

  return palette.Vibrant ? palette.Vibrant.getHex() : palette.DarkVibrant ? palette.DarkVibrant.getHex() : undefined;
};

async function computeMetadatas(images: ComicImages): Promise<ComicImagesMetadatas> {

  let imagesMetadatas = [];

  for (let i = 0; i < images.length; i++) {

    let image = images[i];

    const palette = await Vibrant.from(image.url).getPalette();
    const {width, height} = await probe(image.url, {timeout: 120_000});

    imagesMetadatas.push({
      width,
      height,
      muted: findMuted(palette),
      vibrant: findVibrant(palette)
    } as ImageMetadata);
  }

  return imagesMetadatas;
}

async function mapAndUpdateItems(items: FeedItem[]): Promise<Comic[]> {

  if (items.length < 1) return [];

  // items were read in reverse chronological order (latest first),
  // correct by reversing then map to our own domain object
  const comics = items.map(item => ({
    page: item.page,
    url: item.url,
    title: item.title,
    permalink: item.permalink,
    pubDate: item.date_published,
    images: item.images,
    post: item.post,
    author: item.author,
  }) as Comic);

  for (let i = 0; i < comics.length; i++) {

    let comic = comics[i];
    let images = comic.images;
    let imagesMetadatas = await computeMetadatas(images);

    images.forEach((image, index) => {

      const {width, height, muted, vibrant} = imagesMetadatas[index];

      image.palette = {muted, vibrant};
      image.size = {width, height};
    });
  }

  return comics;

}


const router: Router = Router();

router.post('/', async (req, res, next) => {

  const reqAuth = (req.headers.authorization as string || ' ').split(' ')[1] || '';

  const [login, password] = new Buffer(reqAuth, 'base64').toString().split(':');

  const auth = {login: process.env.POLL_USERNAME, password: process.env.POLL_PASSWORD};

  // Verify login and password are set and correct
  if (!login || !password || login !== auth.login || password !== auth.password) {
    res.set('WWW-Authenticate', 'Basic realm="cron-job"');
    next(new AuthenticationError());
    return
  }

  res.sendStatus(204).end();

  const time = await settingsModel.getLastPolledTime();

  const lastPolled = moment(time);

  const feedUrl = process.env.OBARANDA_FEED_URL as string;

  const newItems: FeedItem[] = [];

  oboe(feedUrl)
    .node('!.items.*', async function (item: FeedItem) {

      let pubdate = moment(item.date_published);

      if (pubdate.isAfter(lastPolled)) newItems.push(item); else {

        this.abort();

        const comics = await mapAndUpdateItems(newItems);

        await comicModel.putAll(comics);

        await settingsModel.setLastPolledTime(moment().valueOf());
      }

    })
    .done(async function () {

      const comics = await mapAndUpdateItems(newItems);

      await comicModel.putAll(comics);

      await settingsModel.setLastPolledTime(moment().valueOf());

    })
  ;

});

export default router

