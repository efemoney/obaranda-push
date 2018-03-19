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
npm install
```
and then 
```sh
npm start
```
If successful, the app is now available at http://localhost:8080/.

</br>

## The API

## Author
Efeturi Money ([@efemoney](https://twitter.com/efemoney_)).

## License
This project is available under the MIT license. See the [LICENSE.md](LICENSE.md) file for more info.

[1]: https://firebase.google.com/docs/firestore/
[2]: https://firebase.google.com/docs/functions/
[3]: https://firebase.google.com/docs/cloud-messaging/
