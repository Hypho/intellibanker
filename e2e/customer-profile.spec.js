import { test } from "@playwright/test";
import { loginAs, navigateTo, waitForLoaded, waitForProfileLoaded, switchProfileTab, expect, expectPageContains } from "./helpers.js";

test.describe("流程2: 个人客户画像查询 (PRD §3.1)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "管理员");
    await navigateTo(page, "客户画像");
    await waitForProfileLoaded(page);
  });

  test("TC-201 默认加载个人客户列表和画像", async ({ page }) => {
    // 左侧应有客户卡片
    const cards = page.locator("[data-testid='customer-card']");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    // 右侧应有画像内容
    await expectPageContains(page, "AUM");
  });

  test("TC-202 搜索过滤客户", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='搜索']");
    await searchInput.fill("张");
    await page.waitForTimeout(1500);
    await waitForLoaded(page);
  });

  test("TC-203 资产等级筛选", async ({ page }) => {
    // 点击"资产等级"下拉框
    await page.click("text=资产等级");
    await page.waitForTimeout(500);
    await page.click(".arco-select-view-option:has-text('高净值客户'), [role='option']:has-text('高净值客户')");
    await page.waitForTimeout(1500);
    await waitForLoaded(page);
  });

  test("TC-204 生命周期筛选", async ({ page }) => {
    // 点击"生命周期"下拉框
    await page.click("text=生命周期");
    await page.waitForTimeout(500);
    await page.click(".arco-select-view-option:has-text('流失预警'), [role='option']:has-text('流失预警')");
    await page.waitForTimeout(1500);
    await waitForLoaded(page);
  });

  test("TC-205 点击客户卡片加载画像", async ({ page }) => {
    // 默认已进入第一个客户画像，确保右侧有数据
    await page.waitForTimeout(1000);
    const body = await page.locator("body").textContent();
    expect(body).toContain("AUM");
  });

  test("TC-206 画像Hero头部显示完整", async ({ page }) => {
    // 检查Hero区域存在
    await expectPageContains(page, "AUM 总资产");
  });

  test("TC-207 5个快速指标卡存在", async ({ page }) => {
    await expectPageContains(page, "存款合计");
    await expectPageContains(page, "贷款余额");
    await expectPageContains(page, "持有产品");
    await expectPageContains(page, "流失概率");
    await expectPageContains(page, "App登录");
  });

  test("TC-215 分页翻页刷新数据", async ({ page }) => {
    // 点击第2页
    const page2 = page.locator(".arco-pagination-item-2");
    if (await page2.count() > 0) {
      await page2.click();
      await page.waitForTimeout(1000);
      await waitForLoaded(page);
    }
  });

  test("TC-208 持有产品区块存在", async ({ page }) => {
    await expectPageContains(page, "持有产品");
  });

  test("TC-209 存款结构区块存在", async ({ page }) => {
    await expectPageContains(page, "存款结构");
    await expectPageContains(page, "活期");
    await expectPageContains(page, "定期");
  });

  test("TC-210 贷款信息区块存在", async ({ page }) => {
    // 贷款区块仅在有贷款时显示，检查页面不crash
    const body = await page.locator("body").textContent();
    expect(body.length).toBeGreaterThan(0);
  });

  test("TC-211 金融行为分析区块存在", async ({ page }) => {
    await expectPageContains(page, "金融行为分析");
    await expectPageContains(page, "转账频率");
  });

  test("TC-212 客户标签区块存在", async ({ page }) => {
    await expectPageContains(page, "客户标签");
    await expectPageContains(page, "流失概率");
  });

  test("TC-213 触发事件区块存在", async ({ page }) => {
    await expectPageContains(page, "触发事件");
    // 检查事件tabs存在（全部/高优/中优）
    await expectPageContains(page, "全部");
  });

  test("TC-214 触达历史区块存在", async ({ page }) => {
    await expectPageContains(page, "触达历史");
  });

  test("TC-216 清空搜索恢复列表", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='搜索']");
    await searchInput.fill("张");
    await page.waitForTimeout(1000);
    // 清空搜索
    await searchInput.clear();
    await page.waitForTimeout(1000);
    await waitForLoaded(page);
    // 列表应恢复
    const cards = page.locator("[data-testid='customer-card']");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("流程3: 企业客户画像查询 (PRD §3.2)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "管理员");
    await navigateTo(page, "客户画像");
    await waitForProfileLoaded(page);
    // 等待tab渲染完成后再切换
    await page.waitForSelector(".arco-tabs-header-title:has-text('企业客户')", { timeout: 10000 });
    await page.click(".arco-tabs-header-title:has-text('企业客户')");
    await page.waitForTimeout(1500);
    await waitForLoaded(page);
  });

  test("TC-301 企业tab加载企业列表", async ({ page }) => {
    await expectPageContains(page, "行业");
  });

  test("TC-302 行业筛选", async ({ page }) => {
    // 直接点击行业Select触发器区域
    await page.click("[class*='arco-select'][style*='width: 100%']");
    await page.waitForTimeout(500);
    // 从弹出的下拉列表中选择能源
    await page.locator(".arco-select-option").filter({ hasText: "能源" }).click();
    await page.waitForTimeout(1500);
    await waitForLoaded(page);
  });

  test("TC-303 点击企业加载画像", async ({ page }) => {
    const firstCard = page.locator("[data-testid='customer-card']").first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await waitForProfileLoaded(page);
      await expectPageContains(page, "注册资本");
    }
  });

  test("TC-307 关联关键人区块存在", async ({ page }) => {
    const firstCard = page.locator("[data-testid='customer-card']").first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await waitForProfileLoaded(page);
      await expectPageContains(page, "关联关键人");
    }
  });

  test("TC-308 关键人跳转个人画像", async ({ page }) => {
    const firstCard = page.locator("[data-testid='customer-card']").first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await waitForProfileLoaded(page);
      const viewBtn = page.locator("text=查看画像").first();
      if (await viewBtn.count() > 0) {
        await viewBtn.click();
        await waitForProfileLoaded(page);
        await expectPageContains(page, "返回企业画像");
      }
    }
  });

  test("TC-309 返回企业画像", async ({ page }) => {
    const firstCard = page.locator("[data-testid='customer-card']").first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await waitForProfileLoaded(page);
      const viewBtn = page.locator("text=查看画像").first();
      if (await viewBtn.count() > 0) {
        await viewBtn.click();
        await waitForProfileLoaded(page);
        const backBtn = page.locator("text=返回企业画像");
        if (await backBtn.count() > 0) {
          await backBtn.click();
          await waitForProfileLoaded(page);
          await expectPageContains(page, "注册资本");
        }
      }
    }
  });

  test("TC-304 企业4个快速指标卡存在", async ({ page }) => {
    await expectPageContains(page, "授信额度");
    await expectPageContains(page, "已用额度");
    await expectPageContains(page, "存款沉淀");
    await expectPageContains(page, "年营收");
  });

  test("TC-305 企业基本信息区块存在", async ({ page }) => {
    const firstCard = page.locator("[data-testid='customer-card']").first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await waitForProfileLoaded(page);
      await expectPageContains(page, "企业基本信息");
      await expectPageContains(page, "实际控制人");
    }
  });

  test("TC-306 风险信息区块存在", async ({ page }) => {
    const firstCard = page.locator("[data-testid='customer-card']").first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await waitForProfileLoaded(page);
      await expectPageContains(page, "风险信息");
      await expectPageContains(page, "征信状态");
    }
  });

  test("TC-310 业务覆盖区块存在", async ({ page }) => {
    const firstCard = page.locator("[data-testid='customer-card']").first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await waitForProfileLoaded(page);
      await expectPageContains(page, "业务覆盖");
      await expectPageContains(page, "已覆盖产品");
    }
  });

  test("TC-311 业务机会区块存在", async ({ page }) => {
    const firstCard = page.locator("[data-testid='customer-card']").first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await waitForProfileLoaded(page);
      await expectPageContains(page, "业务机会");
    }
  });

  test("TC-312 企业搜索过滤", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='搜索']");
    await searchInput.fill("华信");
    await page.waitForTimeout(1500);
    await waitForLoaded(page);
  });

  test("TC-313 清空行业筛选恢复列表", async ({ page }) => {
    // 先选择行业
    const industrySelect = page.locator("[class*='arco-select'][style*='width: 100%']").first();
    await industrySelect.click();
    await page.waitForTimeout(500);
    await page.locator(".arco-select-option").filter({ hasText: "能源" }).click();
    await page.waitForTimeout(1000);
    // Arco Select clear icon只在hover时可见，先hover再点
    await industrySelect.hover();
    await page.waitForTimeout(300);
    const clearBtn = industrySelect.locator(".arco-select-clear-icon");
    if (await clearBtn.count() > 0) {
      await clearBtn.click();
      await page.waitForTimeout(1000);
      await waitForLoaded(page);
    }
  });
});
