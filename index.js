require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(`${process.cwd()}/public`));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});

const Url = mongoose.model('Url', urlSchema);

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;
  
  // URL validation regex
  const urlRegex = /^(https?:\/\/)(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/;
  if (!urlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // Extract hostname for DNS lookup
  const hostname = new URL(originalUrl).hostname;

  dns.lookup(hostname, async (err) => {
    if (err) return res.json({ error: 'invalid url' });

    try {
      let url = await Url.findOne({ original_url: originalUrl });

      if (!url) {
        const count = await Url.countDocuments();
        url = new Url({ original_url: originalUrl, short_url: count + 1 });
        await url.save();
      }
      res.json({ original_url: url.original_url, short_url: url.short_url });
    } catch (error) {
      console.error(error);
      res.status(500).json('Server Error');
    }
  });
});

app.get('/api/shorturl/:short_url', async (req, res) => {
  const { short_url } = req.params;

  try {
    const url = await Url.findOne({ short_url: Number(short_url) });
    if (url) {
      return res.redirect(url.original_url);
    } else {
      res.json({ error: 'No short URL found for the given input' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json('Server Error');
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
