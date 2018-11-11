// Author: Melvin Rodriguez
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const pdfConversorHandler = require('./handlers/pdfConversorHandler');
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.post('/pdfconv', pdfConversorHandler);

app.get('/', function(req, res){
  res.sendStatus(200);
});

app.get('/test', function(req, res){
  res.json({name: 'test'});
});

app.get('*', function(req, res){
  res.sendStatus(404);
});

function onError(error) {
  var fs = require('fs');

  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      process.exit(1);
      break;

    case 'EADDRINUSE':
      process.exit(1);
      break;

    default:
      throw error;
  }
}

app.listen(PORT).on('error', onError);
