
export type Size = {

  width: string,

  height: string,
}

export type Palette = {

  muted?: string,

  vibrant?: string,
}

export type Image = {

  url: string

  alt?: string

  size?: Size

  palette?: Palette

};

export type ComicImages = Image[]