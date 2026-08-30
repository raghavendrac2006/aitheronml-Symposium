const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(3000, async () => {
  console.log('Server started on port 3000');
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Check if body is blank
    const html = await page.content();
    console.log('HTML Length:', html.length);
    
    await browser.close();
  } catch (e) {
    console.error(e);
  } finally {
    server.close();
  }
});
