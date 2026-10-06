import { chromium } from '@playwright/test';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
await page.goto('http://127.0.0.1:6006/iframe.html?id=widgets-governancewidget-showcase--demo&viewMode=story');
await page.waitForLoadState('domcontentloaded');
await page.locator('#storybook-root').waitFor({ state: 'attached' });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
const data = await page.evaluate(() => {
  const widget = document.querySelector('[data-testid="GovernanceWidget-showcase-demo"]');
  const footer = document.querySelector('[data-testid="GovernanceWidget-member-footer"]');
  if (!widget || !footer) return null;
  const widgetRect = widget.getBoundingClientRect();
  const footerRect = footer.getBoundingClientRect();
  const footerStyle = getComputedStyle(footer);
  return {
    widgetRect: { left: widgetRect.left, width: widgetRect.width },
    footerRect: { left: footerRect.left, width: footerRect.width },
    footerStyle: {
      width: footerStyle.width,
      left: footerStyle.left,
      maxWidth: footerStyle.maxWidth,
      transform: footerStyle.transform,
    },
    footerDataStyle: footer.getAttribute('style'),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
