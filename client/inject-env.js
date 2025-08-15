const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const filePath = './build/firebase-messaging-sw.js';

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    return console.log(err);
  }
  let result = data;
  for (const key in process.env) {
    if (key.startsWith('REACT_APP_')) {
      const regex = new RegExp(`%${key}%`, 'g');
      result = result.replace(regex, process.env[key]);
    }
  }

  fs.writeFile(filePath, result, 'utf8', (err) => {
    if (err) return console.log(err);
  });
});
