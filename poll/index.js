/* Yes. Pollis is a reference to a place in the series, The 100 (watch it!) */

const probe = require('probe-image-size');
const Vibrant = require('node-vibrant');

const errors = require('../errors');
const model = require('../models');
const comicModel = model.comics;
const settingsModel = model.settings;

const oboe = require('oboe');
const moment = require('moment');
const router = require('express').Router();

const logError = error => console.error(error);

/**
 * @param items {{
 * id: string,
 * page: int,
 * url: string,
 * permalink: string,
 * title: string,
 * date_published: string,
 * author: {name: string, url: string},
 * images: {url: string, alt: string}[],
 * post: {title: string, body: string}
 * }[]}
 *
 * @return {Promise}
 */
const saveItems = function (items) {

  if (items.length < 1) return Promise.resolve();

  // items were read in reverse chronological order (latest first), correct by reversing
  const comics = items.reverse().map(item =>
    ({ // comic
      url: item.url,
      page: item.page,
      title: item.title,
      pubDate: item.date_published,
      permalink: item.permalink,
      images: item.images,
      post: item.post,
      author: item.author
    })
  );

  // update images of every comic
  const updateImages = Promise.all(comics
    .map(comic => comic.images)
    .map(images => Promise.all(images.map((image, index) => {

      let palette = Vibrant.from(image.url)
        .getPalette()
        .then(palette => ({
          muted: palette.Muted ? palette.Muted.getHex() : null,
          vibrant: palette.Vibrant ? palette.Vibrant.getHex() : null
        }))
      ;

      let size = probe(image.url)
        .then(res => ({
          width: res.width,
          height: res.height
        }))
      ;

      return Promise.all([palette, size]).then(arr => {

        images[index]['palette'] = arr[0];
        images[index]['size'] = arr[1];

        return Promise.resolve();

      });

    }))))
  ;

  return updateImages
    .then(() => comicModel.addAll(comics))
    .catch(e => logError(e))
};

router.post('/', (req, res, next) => {

  const auth = {
    login: process.env.POLL_USERNAME,
    password: process.env.POLL_PASSWORD
  };

  const reqAuth = (req.headers.authorization || ' ').split(' ')[1] || '';
  const [login, password] = new Buffer(reqAuth, 'base64').toString().split(':');

  // Verify login and password are set and correct
  if (!login || !password || login !== auth.login || password !== auth.password) {
    res.set('WWW-Authenticate', 'Basic realm="cron-job"');
    next(new errors.AuthenticationError());
    return;
  }

  settingsModel
    .getLastPolledSuccessfullyTime()
    .then(time => {

      const newItems = [];
      const lastPolledTime = moment(time);

      oboe(process.env.OBARANDA_FEED_URL)
        .node('!.items.*', function (item) {

          let pubdate = moment(item.date_published);

          if (pubdate.isAfter(lastPolledTime)) newItems.push(item);

          else {
            this.abort();

            saveItems(newItems)
              .then(() => settingsModel.setLastPolledSuccessfullyTime(moment().valueOf()))
            ;
          }

        })
        .done(() => {

          saveItems(newItems)
            .then(() => settingsModel.setLastPolledSuccessfullyTime(moment().valueOf()))
          ;

        })
      ;

    })
  ;

  res.sendStatus(200).end();

});

module.exports = router;

