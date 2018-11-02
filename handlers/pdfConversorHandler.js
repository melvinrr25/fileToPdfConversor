const https = require('https');
const fs = require('fs');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const API_KEY = process.env.API_KEY;

// The endpoint receives an URL to a file
// The file will be downloaded and a temp file will be created on the server
// That temp file will be passed as an argument to the unoconv library
// Unoconv will convert the file into a PDF file and then the server will
// convert that file into a base64 and send that as a response to the client.

function handleError(err) {}

function processFile(url, maxFileSize, callback) {
  maxFileSize = parseFloat(maxFileSize).toFixed(2);
  const fileName = '/tmp/' + Math.random().toString(26).slice(2);
  const file = fs.createWriteStream(fileName);

  function pipeToFile(response) {

    if (response.statusCode !== 200) {
      return callback('File is not available to download.');
    }

    response.pipe(file);

    file.on('finish', function onFileFinish() {
      try {
        file.close();
        // Convert file size to MB
        const fileInMB = parseFloat(
          parseFloat(file.bytesWritten) / 1000000
          ).toFixed(2);

        if (parseFloat(fileInMB) > parseFloat(maxFileSize)) {
          fs.unlink(file.path, handleError);
          return callback('File is too big to preview');
        }

        callback(null, file.path);
      } catch (err) {
        callback('Internal server error on pipeToFile method.');
      }
    });

    file.on('error', function onFileError(err) {
      if (err) {
        return callback(err);
      }
      fs.unlink(fileName, handleError);
      callback(file.path);
    });

  }

  const request = https.get(url, pipeToFile);
}

function unoconvExecute(path, response) {
  const limitTime = 30000;
  var timeout = null;

  const killProc = "ps aux | grep -i office | awk {'print $2'} | xargs kill -9";

  const proc = spawn('unoconv', ['-f', 'pdf', path]);

  timeout = setTimeout(function() {
    proc.kill();
    exec(killProc, function(err) {})
  }, limitTime);

  proc.stderr.on('data', function(data) {
    exec(killProc, function(err) {})
  });

  proc.on('exit', function() {
    // Remove timeout from executing
    clearTimeout(timeout);
    fs.readFile(path + '.pdf', null, function onReadFile(err, data) {
      if (err) {
        fs.unlink(path, handleError);
        return response.status(500).json({
          message: JSON.stringify(err) + ' - user:' + response.user + ' - doc:' + response.document
        });
      }

      const responseObject = {
        message: 'OK',
        data: data.toString('base64')
      };
      // Remove temp file downloaded
      fs.unlink(path, handleError);
      // Remove pdf file
      fs.unlink(path + '.pdf', handleError);
      return response.json(responseObject);
    });
  });
}

function pdfConversorHandler(request, response) {
  if (request.headers['x-api-key'] !== API_KEY) {
    return response.status(401).json({
      message: 'Unauthorized'
    });
  }

  const url = request.body.url;
  let maxFileSize = parseFloat(request.body.maxFileSize || 1);
  response.document = request.body.document;
  response.user = request.body.user;

  if (isNaN(maxFileSize)) {
    maxFileSize = 1;
  }

  if (!url) {
    const msg = {
      message: 'Missing url in the payload'
    };
    return response.status(400).json(msg);
  }
  processFile(url, maxFileSize, function onProcessFile(err, path) {
    if (err) {
      const msg = {
        message: JSON.stringify(err) + ' - user:' + response.user + ' - doc:' + response.document
      };
      return response.status(500).json(msg);
    }

    unoconvExecute(path, response);

  });
}

module.exports = pdfConversorHandler;