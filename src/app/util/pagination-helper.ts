import {parseUrl, stringify} from "query-string";

type Rel = 'first' | 'prev' | 'next' | 'last';

export interface PaginationLink {
  readonly url: string;
  readonly rel: Rel;
}

export class LinkHeader extends Array<PaginationLink> {

  get(): string {

    return this
      .map(link => `<${link.url}>; rel="${link.rel}"`)
      .join(', ');
  }
}

export class BasicPaginationLink implements PaginationLink {

  get url(): string {

    const parsedUrl = parseUrl(this.originalUrl);

    parsedUrl.query.limit = this.limit;
    parsedUrl.query.offset = this.offset;

    return parsedUrl.url + '?' + stringify(parsedUrl.query);
  }

  constructor(
    readonly rel: Rel,
    private originalUrl: string,
    private limit: number,
    private offset: number
  ) {

  }
}