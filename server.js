const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;
const port = process.env.PORT || 8080; // Heroku sets a PORT env variable

const dotenv = require('dotenv');
if (isDevelopment) dotenv.load(); // Load environment variables if necessary

const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');

const app = express();

app.use(compression());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.all('/*', (req, res, next) => { // cors

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');

  if (req.method === 'OPTIONS') res.status(200).end(); else next();

});

app.use('/api', require('./api'));
app.use('/poll', require('./poll'));

app.use((req, res, next) => {

  res
    .status(404)
    .send({
      error: 'UnimplementedError',
      message: `No route defined for ${req.method} ${req.originalUrl}`
    })
  ;

});

app.use((err, req, res, next) => {

  res
    .status(err.status || 500)
    .send({
      error: err.name || 'Error',
      message: err.message,
      // stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    })
  ;

});

app.listen(port);
