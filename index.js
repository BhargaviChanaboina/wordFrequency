const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const formidable = require('formidable');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.contentType = 'text/html';
  res.sendFile(`${__dirname}/home.html`);
});

// text file contains extra characters and new lines and it should be removed
const cleanData = (text) => {
  if (!text) return;
  return text.replace(/[\n\r]/g, ' ').replace(/[&\/\\#, +()$~%.":*?<>{}`!-^_]/g, ' ');
}

const cleanWord = (word) => {
  if (!word) return;
  if (word[0] === '\'') word = word.substring(1);
  if (word[word.length - 1] === '\'' ) word = word.substring(0, word.length-1);
  return word;  
}

const validateFile = (file) => {
  if (!file) return { message: 'No file exists' };
  if (file.type !== 'text/plain') return { message: 'please choose a text file' };
  if (file.size > 10000000) return { message: 'File size exceeded max limit. Max file size is 10MB' };
}

app.post('/upload', (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req);
  let map = {};
  
  form.on('fileBegin', (name, file) => {
    file.path = `${__dirname}/uploads/${file.name}`;
  });

  form.on('error', (error) => {
    console.log(error);
    return res.status(400).send({
      message: error && error.toString()
    });
  });
  const processData = (data) => {
    const cleanedData = cleanData(data);
      const words = cleanedData ? cleanedData.split(' ') : [];
      for (let i = 0; i < words.length; i++) {
        let word = words[i];
        if (word) {
          word = cleanWord(word);
          if (!map[word]) {
            map[word] = {
              word,
              count: 1,
            }
          } else {
            map[word].count++;
        }
      }
    }
  }
  form.on('file', (name, file) => {
    const obj = validateFile(file);
    if (obj && obj.message) {
      // remove file when there is error
      fs.unlink(file.path, (unlinkEr) => {
        if (unlinkEr) console.log(unlinkEr);
          return res.status(400).send(obj.message);
      });
    } else {
      const readStream = fs.createReadStream(file.path, 'utf8');
       // read the file text in chunks and process it
      readStream.on('data', processData);
      readStream.on('error', (readEr) => {
        fs.unlink(file.path, () => {
          return res.status(400).send({
            message: readEr && readEr.toString()
          });
        });
      });
      readStream.on('end', () => {
        map = Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
        fs.unlink(file.path, (er) => {
          if (er) console.log(er);
          res.send(map);
        });
      });
    }
  });
});

app.listen(4000, (er) => {
  if (er) console.log(er);
  else console.log(' web server listening on port', 4000);
});