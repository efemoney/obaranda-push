import {config as loadEnv} from "dotenv";
import * as cors from 'cors'
import * as express from 'express'
import {ErrorRequestHandler, json, urlencoded} from 'express'
import * as compression from 'compression'

import api from "./api/index";
import poll from "./poll/index";

if (process.env.NODE_ENV !== 'production') loadEnv(); // Load environment variables if necessary

const port = process.env.PORT || 8080; // Heroku sets a PORT env variable

const app = express();

app.use(cors()); // cors
app.use(compression()); // gzip compression
app.use(json());
app.use(urlencoded({extended: true}));

app.options('*', cors());
app.use('/api', api);
app.use('/poll', poll);

app.use(((err, req, res, next) => {

  let error = {
    name: err.name || 'Error',
    message: err.message,
    ...process.env.NODE_ENV !== 'production' && {stack: err.stack}
  };

  return res.status(err.status).send(error);

}) as ErrorRequestHandler);

app.listen(port);
