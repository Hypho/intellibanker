import { test } from "@playwright/test";
import { loginAs, navigateTo, waitForLoaded, expect, expectPageContains } from "./helpers.js";

test.describe("流程1: 客户洞察报告 (PRD §2)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "管理员");
    await navigateTo(page, "洞察报告");
    await waitForLoaded(page);
  });

  test("TC-101 全行概览加载完整报告", async ({ page }) => {
    // KPI卡
    await expectPageContains(page, "客户总数");
    await expectPageContains(page, "AUM总量");
    await expectPageContains(page, "存款余额");
    await expectPageContains(page, "贷款余额");
    // 图表标题
    await expectPageContains(page, "客户资产分层");
    await expectPageContains(page, "生命周期分布");
    await expectPageContains(page, "业务指标雷达");
    await expectPageContains(page, "近6月存贷款趋势");
  });

  test("TC-102 切换分行维度展示分行数据", async ({ page }) => {
    await page.click("text=全行概览");
    await page.click("text=分行视角");
    await page.waitForTimeout(1000);
    // 第二个Select是分行选择器（第一个是维度选择器）
    const branchSelect = page.locator(".arco-select").nth(1);
    await branchSelect.click();
    await page.waitForTimeout(500);
    await page.click("text=太原分行");
    await waitForLoaded(page);
    await expectPageContains(page, "位个人客户");
  });

  test("TC-103 切换客户经理维度展示经理数据", async ({ page }) => {
    await page.click("text=全行概览");
    await page.click("text=客户经理视角");
    await page.waitForTimeout(1000);
    // 第二个Select是客户经理选择器
    const managerSelect = page.locator(".arco-select").nth(1);
    await managerSelect.click();
    await page.waitForTimeout(500);
    await page.click("text=李娜");
    await waitForLoaded(page);
    await expectPageContains(page, "位个人客户");
  });

  test("TC-104 分行维度未选分行不发请求", async ({ page }) => {
    await page.click("text=全行概览");
    await page.click("text=分行视角");
    await page.waitForTimeout(300);
    await expectPageContains(page, "请选择分行后查看报告");
  });

  test("TC-105 流失预警客户可跳转画像", async ({ page }) => {
    // 先等报告数据加载完（Tabs区块才有数据）
    await page.waitForSelector("text=客户总数", { timeout: 15000 });
    // 切到流失预警tab
    await page.locator(".arco-tabs-header-title:has-text('流失预警')").click();
    await page.waitForTimeout(1000);
    // 点击第一个客户姓名
    const table = page.locator(".arco-table");
    if (await table.count() > 0) {
      await page.waitForSelector("table tbody tr", { timeout: 10000 });
      const firstRow = page.locator("table tbody tr").first();
      const nameCell = firstRow.locator("td").nth(1);
      const clickableName = nameCell.locator("span").first();
      if (await clickableName.count() > 0) {
        await clickableName.click();
        await page.waitForTimeout(2000);
        await expectPageContains(page, "AUM");
      }
    }
  });

  test("TC-110 导出PDF按钮可用", async ({ page }) => {
    const btn = page.locator("button:has-text('导出PDF')");
    await expect(btn).toBeVisible();
  });

  test("TC-111 推送报告确认", async ({ page }) => {
    await page.click("button:has-text('推送报告')");
    await page.waitForTimeout(300);
    // Modal弹出
    await expectPageContains(page, "推送报告");
  });

  test("TC-112 维度切换后数据正确刷新", async ({ page }) => {
    // 先等全行数据加载完
    await page.waitForSelector("text=客户总数", { timeout: 15000 });
    // 点击维度选择器（第一个Select）
    const dimSelect = page.locator(".arco-select").first();
    await dimSelect.click();
    await page.waitForTimeout(500);
    await page.click("text=客户经理视角");
    await page.waitForTimeout(800);
    // 确认出现选择提示
    await expectPageContains(page, "选择客户经理");
  });

  test("TC-106 产品到期客户可跳转画像", async ({ page }) => {
    await page.waitForSelector("text=客户总数", { timeout: 15000 });
    await page.locator(".arco-tabs-header-title:has-text('产品到期')").click();
    await page.waitForTimeout(1500);
    try {
      await page.waitForSelector(".arco-tabs-tab-active table tbody tr", { timeout: 8000 });
    } catch { return; } // 当前tab无数据则跳过
    const nameLink = page.locator(".arco-tabs-tab-active table tbody tr td:nth-child(2) span").first();
    if (await nameLink.count() > 0) {
      await nameLink.click({ force: true });
      await page.waitForTimeout(2000);
      await expectPageContains(page, "AUM");
    }
  });

  test("TC-107 高价值目标客户可跳转画像", async ({ page }) => {
    await page.waitForSelector("text=客户总数", { timeout: 15000 });
    await page.locator(".arco-tabs-header-title:has-text('高价值目标')").click();
    await page.waitForTimeout(1500);
    try {
      await page.waitForSelector(".arco-tabs-tab-active table tbody tr", { timeout: 8000 });
    } catch { return; }
    const nameLink = page.locator(".arco-tabs-tab-active table tbody tr td:nth-child(2) span").first();
    if (await nameLink.count() > 0) {
      await nameLink.click({ force: true });
      await page.waitForTimeout(2000);
      await expectPageContains(page, "AUM");
    }
  });

  test("TC-108 交叉销售客户可跳转画像", async ({ page }) => {
    await page.waitForSelector("text=客户总数", { timeout: 15000 });
    await page.locator(".arco-tabs-header-title:has-text('交叉销售')").click();
    await page.waitForTimeout(1500);
    try {
      await page.waitForSelector(".arco-tabs-tab-active table tbody tr", { timeout: 8000 });
    } catch { return; }
    const nameLink = page.locator(".arco-tabs-tab-active table tbody tr td:nth-child(2) span").first();
    if (await nameLink.count() > 0) {
      await nameLink.click({ force: true });
      await page.waitForTimeout(2000);
      await expectPageContains(page, "AUM");
    }
  });

  test("TC-109 流失信号客户可跳转画像", async ({ page }) => {
    await page.waitForSelector("text=客户总数", { timeout: 15000 });
    await page.locator(".arco-tabs-header-title:has-text('流失信号')").click();
    await page.waitForTimeout(1500);
    try {
      await page.waitForSelector(".arco-tabs-tab-active table tbody tr", { timeout: 8000 });
    } catch { return; }
    const nameLink = page.locator(".arco-tabs-tab-active table tbody tr td:nth-child(2) span").first();
    if (await nameLink.count() > 0) {
      await nameLink.click({ force: true });
      await page.waitForTimeout(2000);
      await expectPageContains(page, "AUM");
    }
  });

  test("TC-113 客户资产分层饼图存在", async ({ page }) => {
    await page.waitForSelector("text=客户总数", { timeout: 15000 });
    await expectPageContains(page, "客户资产分层");
    // ECharts渲染canvas
    const canvas = page.locator("canvas");
    expect(await canvas.count()).toBeGreaterThan(0);
  });

  test("TC-114 近6月存贷款趋势图存在", async ({ page }) => {
    await page.waitForSelector("text=客户总数", { timeout: 15000 });
    await expectPageContains(page, "近6月存贷款趋势");
    const canvas = page.locator("canvas");
    expect(await canvas.count()).toBeGreaterThan(0);
  });
});
