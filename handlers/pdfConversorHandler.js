const https = require('https');
const fs = require('fs');
const exec = require('child_process').exec;
const API_KEY = process.env.API_KEY;

// The endpoint receives an URL to a file
// The file will be downloaded and a temp file will be created on the server
// That temp file will be passed as an argument to the unoconv library
// Unoconv will convert the file into a PDF file and then the server will
// convert that file into a base64 and send that as a response to the client.

function unlinkFile(err) {}

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
          fs.unlink(file.path, unlinkFile);
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
      fs.unlink(fileName, unlinkFile);
      callback(file.path);
    });

  }

  const request = https.get(url, pipeToFile);
}

function unoconvExecute(path, response) {
  exec('unoconv -f pdf "' + path + '"', function onExecCommand(err) {
    if (err) {
      fs.unlink(path, unlinkFile);
      return response.status(500).json({
        message: JSON.stringify(err) + ' - user:' + response.user + ' - doc:' + response.document
      });
    }

    fs.readFile(path + '.pdf', null, function onReadFile(err, data) {
      const responseObject = {
        message: 'OK',
        data: data.toString('base64')
      };
      // Remove temp file downloaded
      fs.unlink(path, unlinkFile);
      // Remove pdf file
      fs.unlink(path + '.pdf', unlinkFile);
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