import {credential, firestore as store, initializeApp} from "firebase-admin";
import {Firestore} from "@google-cloud/firestore";
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

  putAll: (comics: Comic[]) => Promise<any>;

  getAll: (limit: number, offset: number) => Promise<Comic[]>;

  getByLatest: () => Promise<Comic>;

  getByPage: (page: number) => Promise<Comic>;

} = {

  putAll: comics => Promise.all(
    comics.map(comic => firestore.collection('comics').add(comic))
  ),

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