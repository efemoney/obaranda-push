[![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)   

# obaranda-push
A simple nodejs web app that polls www.obaranda.com for comic updates and sends push messages via firebase to registered clients. It also exposes a [REST API](#the-api) for accessing the comics.

## The app
The web app periodically monitors the json feed at www.obaranda.com. An external scheduling service/ cron job is responsible for the timing and should send a `POST` request to `/poll`. The request should be authenticated using `Basic Authentication` with the username and password supplied in the `POLL_USERNAME` and `POLL_PASSWORD` environment variables respectively.

The comics data is cached in [firebase firestore][1] and a [firebase function][2] monitors new additions to firestore and sends push messages using [firebase messaging][3].

### Setup
You need to have [Node JS](https://www.nodejs.org) and [Npm](https://www.npmjs.org) installed.
 - Clone this repo locally
 - Create a `.env` file and add your equivalent of the following variables
   ```
   # Username and password of basic auth for the /poll endpoint
   POLL_USERNAME=<your_value>
   POLL_PASSWORD=<your_value>
   
   # Url for the obaranda comic json feed. See [blob/master/src/app/poll/index.ts#L142]
   OBARANDA_FEED_URL=<your_value>
   
   # See the firebase admin setup [guide](https://firebase.google.com/docs/admin/setup#initialize_the_app)
   FIREBASE_DB_URL=<your_value>
   ```
 - Follow the instructions in [this link](https://firebase.google.com/docs/admin/setup#add_firebase_to_your_app) to download a firebase service account key.
   Add the json file to your project and edit [`service-account-key.ts`](src/app/service-account-key.ts#L3) to export your service account from:
   ```typescript
   export default {} as ServiceAccount;
   ```
   to
   ```typescript
   export default require('path/to/service-account.json') as ServiceAccount;
   ```

### Run locally
```sh
$ npm install
$ npm start
```
If successful, the app is now available at http://localhost:8080/.

### Tests
There are no tests (for now). Contributions are welcome.

</br>

## The API
There is a publicly available API for retrieving comics at https://obaranda-push.herokuapp.com/api/. 
It is an unauhenticated API with no usage limits (yet) and no versioning scheme.

### JSON Only
The API currently supports JSON as the only data format. All requests that return data will return JSON data with a `Content-Type` header of `Content-Type: application/json; charset=utf-8`.

### Pagination
Endpoints that return collections will offer basic pagination via `limit` and `offset` query parameters.
- `limit` specifies the number of items to return
- `offset` specifies the 0-based result offset. This is usually the total count of already retrieved items

The API follows the [RFC5988 convention](https://tools.ietf.org/html/rfc5988) of using the `Link` header to provide URLs for the `next` and `prev` page and an `X-Total-Count` header to provide the total item count for the collection in question. It is recommended to follow this convention than build the pagination URLs manually.

### Error Handling
The API uses HTTP status codes to signify errors. HTTP responses with status `4xx` signify consumer errors while status `5xx` errors are indicative of server failures. It is safe to retry api calls (with exponential backoff) in the case of `5xx` errors. Irregardless of the HTTP status code, errors **always** have a JSON error body like:
```json
{
  "name": "Error | <SpecificConstantErrorName>",
  "message": "Non-localized best effort text trying to explain the cause of the error"
}
```

### Endpoints
- [Get All Comics](#get-comics)
- [Get A Comic by Page](#get-a-comic-by-page)
- [Get Latest Comic](#get-latest-comic)

#### Get Comics
`GET /comics`

*returns:*
</br>
a [paginated collection](#pagination) of `ComicOverview`. The collection is sorted reverse chronologically and **there is currently no way to influence the sort order**.

*query parameters:*
</br>
- `limit`[integer] See [pagination](#pagination)
- `offset`[integer] See [pagination](#pagination)
 
*sample success response:*
</br>
```json
[
  {
    "page": 24,
    "title": "Anti-Artist Block",
    "permalink": "http://www.obaranda.com/comic/24",
    "pubDate": "2018-03-07 00:00:00",
    "previewImg": {
      "url": "http://www.obaranda.com/assets/images/comics/201803070150148273161/0001.jpg",
      "palette": "#9c7464"
    }
  },
  {
    "page": 23,
    "title": "Oh, Lagos",
    "permalink": "http://www.obaranda.com/comic/23",
    "pubDate": "2017-10-23 00:00:00",
    "previewImg": {
      "url": "http://www.obaranda.com/assets/images/comics/201710231401297524381/Gidi1.jpg",
      "palette": "#56819c"
    }
  }
]
```

#### Get A Comic by Page
`GET /comics/{page}`

*returns:*
</br>
the  `Comic` at `:page`.
 
*sample success response:*
</br>
```json
{
  "post": {
    "title": "Happy Independence Day, Everyone!",
    "body": "This is a comic idea I've had for at least two years now, but sheer laziness has prevented me from sketching it. \r\n\r\nHow's your independence day celebration going? Anyone wearing green and white? "
  },
  "title": "Something something Tupac",
  "page": 22,
  "pubDate": "2017-10-01 03:47:25",
  "author": {
    "name": "Justin Irabor"
  },
  "url": "http://www.obaranda.com/comic/22-no-change",
  "permalink": "http://www.obaranda.com/comic/22",
  "images": [
    {
      "palette": {
        "muted": "#867d79",
        "vibrant": "#2a9aeb"
      },
      "alt": "No change",
      "url": "http://www.obaranda.com/assets/images/comics/201710010349399949511/No change.jpg",
      "size": {
        "height": 2380,
        "width": 1000
      }
    }
  ]
}
```

#### Get Latest Comic
`GET /comics/latest`

*returns:*
</br>
the latest `Comic`.
 
*sample success response:*
</br>
```json
{
  "post": {
    "title": "Happy Independence Day, Everyone!",
    "body": "This is a comic idea I've had for at least two years now, but sheer laziness has prevented me from sketching it. \r\n\r\nHow's your independence day celebration going? Anyone wearing green and white? "
  },
  "title": "Something something Tupac",
  "page": 22,
  "pubDate": "2017-10-01 03:47:25",
  "author": {
    "name": "Justin Irabor"
  },
  "url": "http://www.obaranda.com/comic/22-no-change",
  "permalink": "http://www.obaranda.com/comic/22",
  "images": [
    {
      "palette": {
        "muted": "#867d79",
        "vibrant": "#2a9aeb"
      },
      "alt": "No change",
      "url": "http://www.obaranda.com/assets/images/comics/201710010349399949511/No change.jpg",
      "size": {
        "height": 2380,
        "width": 1000
      }
    }
  ]
}
```

## Author
Efeturi Money ([@efemoney](https://twitter.com/efemoney_)).

## License
This project is available under the MIT license. See the [LICENSE.md](LICENSE.md) file for more info.

[1]: https://firebase.google.com/docs/firestore/
[2]: https://firebase.google.com/docs/functions/
[3]: https://firebase.google.com/docs/cloud-messaging/
