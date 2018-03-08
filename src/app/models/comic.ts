import {ComicImages, Image} from "./image";
import {Post} from "./post";
import {Author} from "./author";

export type Comic = {

  page: number,

  url: string,

  title: string,

  permalink: string,

  pubDate: string,

  images: ComicImages,

  post: Post

  author: Author,
}