import { test, expect } from '@playwright/test';

test('scraping grocery prices', async ({ page}) => {
    await page.goto('https://www.fairprice.com.sg/');
    await page.screenshot({path: "test.jpg"});
})
