import {config as loadEnv} from "dotenv";

if (process.env.NODE_ENV !== 'production') loadEnv(); // Load environment variables if necessary

import * as cors from 'cors'
import * as express from 'express'
import {ErrorRequestHandler, json, urlencoded} from 'express'
import * as compression from 'compression'

import api from "./api";
import poll from "./poll";
import external from "./external";

const port = process.env.PORT || 8080; // Heroku sets a PORT env variable

const app = express();

if (process.env.NODE_ENV !== 'production') app.set('json spaces', 2);

app.use(cors());
app.use(compression()); // gzip compression
app.use(json());
app.use(urlencoded({extended: true}));

app.options('*', cors());
app.use('/api', api);
app.use('/poll', poll);
app.use('/external', external);

app.use(<ErrorRequestHandler>((err, req, res, next) => {

  let error = {
    name: err.name || 'Error',
    message: err.message,
    ...(req.query.errorStack === 'true') && (process.env.NODE_ENV !== 'production') && {stack: err.stack}
  };

  return res.status(err.status || 500).send(error);

}));

app.listen(port);
