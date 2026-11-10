test('admin', async ({ page }) => { await page.evaluate(() => localStorage.setItem('role', 'admin')); });
