/* Pollis is a reference to the series, The 100 (watch it!) */

import {Router} from "express";
import {AuthenticationError} from "../errors";
import {Palette} from "node-vibrant/lib/color";
import {Comic, ComicImages, comics as comicModel, settings as settingsModel} from "../models";
import * as moment from "moment";
import {unescape} from "he";
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

  muted: string,

  vibrant: string,
}

type ComicImagesMetadatas = ImageMetadata[];


const logError = (error: Error) => console.error(error);

function findMuted(palette: Palette): string | null {

  return palette.Muted ? palette.Muted.getHex() : palette.DarkMuted ? palette.DarkMuted.getHex() : null;
}

function findVibrant(palette: Palette): string | null {

  return palette.Vibrant ? palette.Vibrant.getHex() : palette.DarkVibrant ? palette.DarkVibrant.getHex() : null;
}

function mapItems(items: FeedItem[]): Comic[] {

  if (items.length < 1) return [];

  return items.map(item => ({
    page: item.page,
    url: item.url,
    title: unescape(item.title),
    permalink: item.permalink,
    pubDate: item.date_published,
    images: item.images,
    post: {
      title: !item.post.title ? null : unescape(item.post.title),
      body: !item.post.body ? null : unescape(item.post.body)
    },
    author: item.author
  }) as Comic);
}

async function computeMetadatas(images: ComicImages): Promise<ComicImagesMetadatas> {

  let imagesMetadatas: ComicImagesMetadatas = [];

  for (let i = 0; i < images.length; i++) {

    let image = images[i];

    const palette = await Vibrant.from(image.url).getPalette();
    const {width, height} = await probe(image.url, {timeout: 180_000});

    imagesMetadatas.push({
      width,
      height,
      muted: findMuted(palette),
      vibrant: findVibrant(palette)
    } as ImageMetadata);
  }

  return imagesMetadatas;
}

async function handleUpdatedFeedItems(updatedItems: FeedItem[]) {
  // Updated items can be added/modified or deleted
  // Item is deleted when its images array length is 0 else its added/modified

  const addedItems: FeedItem[] = [];
  const deletedPages: number[] = [];

  updatedItems.forEach(u => u.images.length > 0 ? addedItems.push(u) : deletedPages.push(u.page));

  // noinspection JSIgnoredPromiseFromCall
  await handleDeleted(deletedPages);

  // noinspection JSIgnoredPromiseFromCall
  await handleAdded(mapItems(addedItems));
}

async function handleAdded(comics: Comic[]) {

  if (comics.length < 1) return Promise.resolve();

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

  return await comicModel.putAll(comics);
}

async function handleDeleted(deletedPages: number[]) {

  if (deletedPages.length < 1) return Promise.resolve();

  return await comicModel.deleteAll(deletedPages);
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

  const feedUrl = process.env.OBARANDA_FEED_URL as string;

  const lastPolledTime = moment(await settingsModel.getLastPolledTime());
  const updatedItems: FeedItem[] = [];

  oboe(feedUrl)
    .node('!.items.*', async function (item: FeedItem) {

      let pubdate = moment(item.date_published);

      if (pubdate.isAfter(lastPolledTime)) updatedItems.push(item); else {
        this.abort();
        await handleUpdatedFeedItems(updatedItems);
        await settingsModel.setLastPolledTime(moment().valueOf());
      }

    })
    .done(async function () {
      await handleUpdatedFeedItems(updatedItems);
      await settingsModel.setLastPolledTime(moment().valueOf());
    })
  ;

});


export default router
