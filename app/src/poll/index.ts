/* Pollis is a reference to the series, The 100 (watch it!) */

import {Router} from "express";
import {AuthenticationError} from "../errors";
import {Palette} from "node-vibrant/lib/color";
import {Comic, ComicImages, comics as comicModel, settings as settingsModel} from "../models";
import * as moment from "moment-timezone";
import {unescape} from "he";
import oboe = require("oboe");
import Vibrant = require("node-vibrant");

const Disqus = require("neo-disqus");
const probe = require("probe-image-size");

moment.tz.setDefault("Africa/Lagos");

const client = new Disqus({
  access_token: process.env.DISQUS_ACCESS_TOKEN,
  api_key: process.env.DISQUS_PUB_KEY,
  api_secret: process.env.DISQUS_SECRET_KEY,
});
client.options.request_options.useQuerystring = true; // Depends upon implementation details --- I'M SORRY :'(
client.options.request_options.timeout = 180_000;


interface FeedItem {

  page: number,

  url: string,

  title: string,

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
    pubDate: moment(item.date_published).format(),
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

async function findCommentsThread(url: string) { // Why am I doing this to myself???

  const forum = process.env.DISQUS_FORUM as string;

  // first use comic.url as is
  try {
    const opts = {forum, 'thread:link': url};
    const response: any[] = (await client.get("threads/set", opts)).response;
    if (response && response.length > 0) {
      return response[0];
    }
  } catch (e) {}

  // next try to fetch thread with or without a 'www' in the url
  const www = 'www.';
  const slashes = '://';
  const indexOfWWW = url.indexOf(www);
  const newUrl = indexOfWWW === -1 ? url.replace(slashes, slashes.concat(www)) : url.replace(www, '');

  const opts1 = {forum, 'thread:link': newUrl};
  const response1: any[] = (await client.get("threads/set", opts1)).response;
  if (response1 && response1.length > 0) {
    return response1[0];
  }

  throw Error();
}

async function handleUpdatedFeedItems(updatedItems: FeedItem[]) {
  // Updated items can be added/modified or deleted
  // Item is deleted when its images array length is 0 else its added/modified

  const addedItems: FeedItem[] = [];
  const deletedPages: number[] = [];

  updatedItems.forEach(u => u.images.length > 0 ? addedItems.push(u) : deletedPages.push(u.page));

  await handleDeleted(deletedPages);
  await handleAdded(mapItems(addedItems));
}

async function handleAdded(comics: Comic[]) {

  if (comics.length < 1) return Promise.resolve();

  for (let i = 0; i < comics.length; i++) {
    let comic = comics[i];

    // Disqus api brouhaha
    let thread = await findCommentsThread(comic.url);
    comic.commentsThreadId = thread.id;
    comic.commentsCount = thread.posts;

    let images = comic.images;
    let imagesMetadatas = await computeMetadatas(images);

    images.forEach((image, index) => {

      const {width, height, muted, vibrant} = imagesMetadatas[index];

      image.palette = {muted, vibrant};
      image.size = {width, height};
    });
  }

  return await comicModel.putComics(comics);
}

async function handleDeleted(deletedPages: number[]) {

  if (deletedPages.length < 1) return Promise.resolve();

  return await comicModel.deleteComicsByPage(deletedPages);
}

async function updateComicItems() {

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
}

async function updateOlderCommentCounts() {

  // Strategy is; get all the latest disqus comments after the last time we checked
  // Map comments to their respective threads ids and de-dup the list
  // Get the set of threads by id and update the comments count for all of them

  const forum = process.env.DISQUS_FORUM as string;
  const limit = 100; // set maximum limit

  const lastPolledCommentTime = (await settingsModel.getLastPolledCommentTime() || moment.unix(0).format());

  const opts1: any = {forum, limit, start: lastPolledCommentTime};
  const posts: any[] = (await client.get('posts/list', opts1)).response;

  if (posts && posts.length > 0) {
    const threadIds = Array.from(new Set(posts.map(post => post.thread)));

    const opts2: any = {forum, thread: threadIds};
    const threads: any[] = (await client.get('threads/set', opts2)).response;

    for (let thread of threads) {

      const page = await comicModel.getPageByThreadId(thread.id);
      if (page === 0) continue;

      await comicModel.putCommentsCount(page, thread.posts); // update comments count for thread
    }
  }

  await settingsModel.setLastPolledCommentTime(moment().format())
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

  // update comment counts for existing comics
  await updateOlderCommentCounts();

  // handle added and deleted comics
  await updateComicItems();

});

export default router
