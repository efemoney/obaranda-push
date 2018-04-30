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

  putComic: (comic: Comic) => Promise<WriteResult>;

  putComics: (comics: Comic[]) => Promise<WriteResult[]>;

  getComics: (limit: number, offset: number) => Promise<Comic[]>;

  getComicByPage: (page: number) => Promise<Comic>;

  getPageByThreadId: (threadId: string) => Promise<number>;

  getComicByLatest: () => Promise<Comic>;

  deleteComicByPage: (page: number) => Promise<WriteResult>;

  deleteComicsByPage: (pages: number[]) => Promise<WriteResult[]>;

} = {

  putCommentsCount: (page, commentsCount) => firestore.collection('comics')
    .doc(`${page}`)
    .set({commentsCount}, {merge: true})
  ,

  putComics: comicsArray => Promise.all(comicsArray.map(comic => comics.putComic(comic))),

  putComic: comic => firestore.collection('comics')
    .doc(`${comic.page}`)
    .set(comic)
  ,

  deleteComicsByPage: pages => Promise.all(pages.map(page => comics.deleteComicByPage(page))),

  deleteComicByPage: page => firestore.collection('comics')
    .doc(`${page}`)
    .delete()
  ,

  getPageByThreadId: threadId => firestore.collection('comics')
    .where('commentsThreadId', '==', threadId)
    .get()
    .then(snapshot => snapshot.empty ? 0 : parseInt(snapshot.docs[0].id))
  ,

  getComics: (limit, offset) => firestore.collection('comics')
    .orderBy('page', 'desc')
    .limit(limit)
    .offset(offset)
    .get()
    .then(snapshot => snapshot.docs)
    .then(docs => docs.map(it => it.data() as Comic))
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

  getTotalCount: () => firestore.collection('internal')
    .doc('comics-meta')
    .get()
    .then(doc => doc.exists ? (doc.get('total-count') || 0) : 0)
  ,

};

export const settings: {

  getLastPolledTime: () => Promise<number>;

  setLastPolledTime: (time: number) => Promise<any>

  getLastPolledCommentTime: () => Promise<number>;

  setLastPolledCommentTime: (time: number) => Promise<any>

} = {

  getLastPolledTime: () => firestore.collection('internal')
    .doc('settings')
    .get()
    .then(doc => doc.get('last-poll') || 0)
  ,

  setLastPolledTime: (time) => firestore.collection('internal')
    .doc('settings')
    .set({'last-poll': time}, {merge: true})
  ,

  getLastPolledCommentTime: () => firestore.collection('internal')
    .doc('settings')
    .get()
    .then(doc => doc.get('last-comment-poll') || 0)
  ,

  setLastPolledCommentTime: (time) => firestore.collection('internal')
    .doc('settings')
    .set({'last-comment-poll': time}, {merge: true})
  ,

};