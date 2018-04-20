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

  getTotalCount: () => Promise<number>;

  putCommentsCount: (page: number, count: number) => Promise<WriteResult>;

  putComic: (comic: Comic) => Promise<any>;

  putAllComics: (comics: Comic[]) => Promise<WriteResult[]>;

  getAllComics: (limit: number, offset: number) => Promise<Comic[]>;

  getComicByPage: (page: number) => Promise<Comic>;

  getComicByLatest: () => Promise<Comic>;

  deleteComicByPage: (page: number) => Promise<WriteResult>;

  deleteComicsByPage: (pages: number[]) => Promise<WriteResult[]>;

  getPageByUrl: (url: string) => Promise<number>;

  putPageToUrl: (page: number, url: string) => Promise<WriteResult>;

  deleteUrlByPage: (page: number) => Promise<WriteResult>;

} = {

  putAllComics: async comicsArray => {

    return await Promise.all(comicsArray.map(comic => comics.putComic(comic)));
  },

  putComic: async comic => {

    const wr = await firestore.collection('comics').doc(`${comic.page}`).set(comic);

    await comics.putPageToUrl(comic.page, comic.url);

    return wr;
  },

  deleteComicsByPage: async pages => {

    const deleteComicAndThenUrl = async (page: number) => {

      const wr = await comics.deleteComicByPage(page);

      await comics.deleteUrlByPage(page);

      return wr;
    };

    return await Promise.all(pages.map(page => deleteComicAndThenUrl(page)));
  },

  deleteComicByPage: page => firestore.collection('comics')
    .doc(`${page}`)
    .delete()
  ,

  getAllComics: (limit, offset) => firestore.collection('comics')
    .orderBy('page', 'desc')
    .limit(limit)
    .offset(offset)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => docs.map(it => it.data() as Comic))
  ,

  getComicByLatest: () => firestore.collection('comics')
    .orderBy('page', 'desc')
    .limit(1)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => {
      if (docs.length === 1) return docs[0].data() as Comic;
      throw new ComicNotFoundError('latest')
    })
  ,

  getComicByPage: page => firestore.collection('comics')
    .where('page', '==', page)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => {
      if (docs.length === 1) return docs[0].data() as Comic;
      throw new ComicNotFoundError(`page ${page}`)
    })
  ,

  getTotalCount: () => firestore.collection('internal')
    .doc('comics-meta')
    .get()
    .then(doc => doc.exists ? (doc.get('total-count') || 0) : 0)
  ,

  putPageToUrl: async (page, url) => await firestore.collection('page-to-url')
    .doc(`${page}`)
    .set({url}, {merge: true})
  ,

  getPageByUrl: url => firestore.collection('page-to-url')
    .where('url', '==', url)
    .get()
    .then(snapshot => snapshot.empty ? 0 : parseInt(snapshot.docs[0].id))
  ,

  deleteUrlByPage: page => firestore.collection('page-to-url')
    .doc(`${page}`)
    .delete()
  ,

  putCommentsCount: async (page, commentsCount) => {

    return await firestore.collection('comics').doc(`${page}`).set({commentsCount}, {merge: true})
  },
};

export const settings: {

  getLastPolledTime: () => Promise<number>;

  getLastPolledCommentTime: () => Promise<number>;

  setLastPolledTime: (time: number) => Promise<any>

  setLastPolledCommentTime: (time: number) => Promise<any>

} = {

  getLastPolledTime: () => firestore.collection('internal')
    .doc('settings')
    .get()
    .then(doc => doc.exists ? (doc.get('last-poll') || 0) : 0)
  ,

  getLastPolledCommentTime: () => firestore.collection('internal')
    .doc('settings')
    .get()
    .then(doc => doc.exists ? (doc.get('last-comment-poll') || 0) : 0)
  ,

  setLastPolledTime: (time) => firestore.collection('internal')
    .doc('settings')
    .set({'last-poll': time}, {merge: true})
  ,

  setLastPolledCommentTime: (time) => firestore.collection('internal')
    .doc('settings')
    .set({'last-comment-poll': time}, {merge: true})
  ,

};