const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/news', async (req, res) => {
  const url = req.query.url || 'https://spo-13.mskobr.ru/';
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const html = await page.content();
    await browser.close();
    res.send(html);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).send('Ошибка сервера');
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});