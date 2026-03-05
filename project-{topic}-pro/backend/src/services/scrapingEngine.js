const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const config = require('../config');

// Helper to extract text or attribute
const extract = ($, element, selector, attr) => {
  if (!element) return null;
  const target = selector ? $(element).find(selector) : $(element);
  if (!target.length) return null;
  return attr ? target.attr(attr) : target.text().trim();
};

const scrapeWithCheerio = async (url, selectorsJson) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const selectors = JSON.parse(selectorsJson);
    const results = [];

    $(selectors.item).each((i, element) => {
      const itemData = {};
      for (const fieldName in selectors.fields) {
        const fieldSelector = selectors.fields[fieldName];
        if (typeof fieldSelector === 'string') {
          itemData[fieldName] = extract($, element, fieldSelector);
        } else if (typeof fieldSelector === 'object' && fieldSelector.selector) {
          itemData[fieldName] = extract($, element, fieldSelector.selector, fieldSelector.attr);
        }
      }
      results.push(itemData);
    });

    return results;
  } catch (error) {
    logger.error(`Cheerio scraping failed for ${url}: ${error.message}`);
    throw error;
  }
};

const scrapeWithPuppeteer = async (url, selectorsJson) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: config.puppeteer.headless });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const results = await page.evaluate((selectorsJsonEvaluated) => {
      const selectors = JSON.parse(selectorsJsonEvaluated);
      const items = Array.from(document.querySelectorAll(selectors.item));
      return items.map(element => {
        const itemData = {};
        for (const fieldName in selectors.fields) {
          const fieldSelector = selectors.fields[fieldName];
          let value = null;
          if (typeof fieldSelector === 'string') {
            const el = element.querySelector(fieldSelector);
            if (el) value = el.textContent.trim();
          } else if (typeof fieldSelector === 'object' && fieldSelector.selector) {
            const el = element.querySelector(fieldSelector.selector);
            if (el) value = fieldSelector.attr ? el.getAttribute(fieldSelector.attr) : el.textContent.trim();
          }
          itemData[fieldName] = value;
        }
        return itemData;
      });
    }, selectorsJson);

    return results;
  } catch (error) {
    logger.error(`Puppeteer scraping failed for ${url}: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = {
  scrapeWithCheerio,
  scrapeWithPuppeteer,
};