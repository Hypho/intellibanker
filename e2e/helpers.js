import { expect } from "@playwright/test";

/** 选择角色并进入主界面 */
export async function loginAs(page, roleName) {
  await page.goto("/");
  await page.waitForSelector(".arco-select", { timeout: 10000 });
  await page.locator(".arco-select").first().click();
  // 等待下拉选项出现后再点击
  await page.waitForSelector(`.arco-select-option:has-text("${roleName}")`, { state: "visible", timeout: 5000 });
  await page.locator(`.arco-select-option:has-text("${roleName}")`).click();
  // 等待主界面渲染完成（退出按钮出现=登录成功）
  await page.waitForSelector("text=退出", { timeout: 10000 });
}

/** 点击侧边栏菜单 */
export async function navigateTo(page, menuText) {
  await page.click(`text=${menuText}`);
  await page.waitForTimeout(500);
}

/** 等待页面无Spin加载状态 */
export async function waitForLoaded(page) {
  // 等待可能的Spin消失
  try {
    await page.waitForSelector(".arco-spin-loading", { state: "hidden", timeout: 8000 });
  } catch {
    // 可能没有Spin，继续
  }
}

/** 检查URL或页面内容包含某文本 */
export async function expectPageContains(page, text) {
  await expect(page.locator("body")).toContainText(text);
}

/** 检查页面不包含某文本 */
export async function expectPageNotContains(page, text) {
  await expect(page.locator("body")).not.toContainText(text);
}

/** 在画像页选择客户类型tab */
export async function switchProfileTab(page, tabName) {
  const tab = page.locator(`.arco-tabs-header-title:has-text("${tabName}")`);
  await tab.click();
  await page.waitForTimeout(800);
}

/** 等待画像页右侧内容区加载 */
export async function waitForProfileLoaded(page) {
  await page.waitForTimeout(1000);
  await waitForLoaded(page);
}

export { expect };
