import {credential, firestore as store, initializeApp} from "firebase-admin";
import {Firestore, WriteResult} from "@google-cloud/firestore";
import {Comic} from "./comic";
import {ComicNotFoundError} from '../errors'
import serviceAccount from "../service-account-key";

initializeApp(
  {
    credential: credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  }
);

const firestore: Firestore = store();

export {Comic} from "./comic"

export {Author} from "./author"

export {Size, Palette, Image, ComicImages} from "./image"

export {Post} from "./post"

export const users: {

  putDeviceToken: (uid: string, token: string) => Promise<any>;

  putCurrentPage: (uid: string, page: number) => Promise<any>;

} = {

  putDeviceToken: (uid, token) => firestore.collection('tokens')
    .doc(uid)
    .set({token: token})
  ,

  putCurrentPage: (uid, page) => firestore.collection('current-page')
    .doc(uid)
    .set({page: page})
  ,

};

export const comics: {

  putCount: (count: number) => Promise<WriteResult>;

  putAll: (comics: Comic[]) => Promise<any>;

  putComic: (comic: Comic) => Promise<WriteResult>;

  deleteAll: (pages: number[]) => Promise<any>;

  deleteByPage: (page: number) => Promise<WriteResult>;

  getCount: () => Promise<number>;

  getAll: (limit: number, offset: number) => Promise<Comic[]>;

  getByPage: (page: number) => Promise<Comic>;

  getByLatest: () => Promise<Comic>;

} = {

  putCount: count => firestore.collection('internal')
    .doc('comics-meta')
    .set({'total-count': count}, {merge: true})
  ,

  putAll: async comicsArray => {

    const oldCount = await comics.getCount();

    await Promise.all(comicsArray.map(comic => comics.putComic(comic)));

    await comics.putCount(oldCount + comicsArray.length);
  },

  putComic: comic => firestore.collection('comics')
    .doc(`${comic.page}`)
    .set(comic)
  ,

  deleteAll: async pages => {

    const oldCount = await comics.getCount();

    await Promise.all(pages.map(page => comics.deleteByPage(page)));

    await comics.putCount(Math.max(oldCount - pages.length, 0));
  }
  ,

  deleteByPage: page => firestore.collection('comics')
    .doc(`${page}`)
    .delete()
  ,

  getAll: (limit, offset) => firestore.collection('comics')
    .orderBy('page', 'desc')
    .limit(limit)
    .offset(offset)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => docs.map(it => it.data() as Comic))
  ,

  getByLatest: () => firestore.collection('comics')
    .orderBy('page', 'desc')
    .limit(1)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => {
      if (docs.length === 1) return docs[0].data() as Comic;
      throw new ComicNotFoundError('latest')
    })
  ,

  getByPage: page => firestore.collection('comics')
    .where('page', '==', page)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => {
      if (docs.length === 1) return docs[0].data() as Comic;
      throw new ComicNotFoundError(`page ${page}`)
    })
  ,

  getCount: () => firestore.collection('internal')
    .doc('comics-meta')
    .get()
    .then(doc => doc.exists ? (doc.get('total-count') || 0) : 0)
  ,

};

export const settings: {

  getLastPolledTime: () => Promise<number>;

  setLastPolledTime: (time: number) => Promise<any>

} = {

  getLastPolledTime: () => firestore.collection('internal')
    .doc('settings')
    .get()
    .then(doc => doc.exists ? (doc.get('last-poll') || 0) : 0)
  ,

  setLastPolledTime: (time) => firestore.collection('internal')
    .doc('settings')
    .set({'last-poll': time}, {merge: true})
  ,

};