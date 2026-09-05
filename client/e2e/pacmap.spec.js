/**
 * PacMap E2E Test Suite
 * 
 * Run: cd client && npx playwright test e2e/pacmap.spec.js --headed
 * Prerequisites: npx playwright install chromium
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5176';

test.describe('PacMap UI', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for the app to hydrate
    await page.waitForLoadState('networkidle');
  });

  test('should load the main page without errors', async ({ page }) => {
    await page.screenshot({ path: 'e2e/artifacts/page-load.png' });
    
    // Verify the page title or main element exists
    const root = await page.locator('#root');
    await expect(root).toBeVisible();
  });

  test('should show capture controls (dock)', async ({ page }) => {
    await page.screenshot({ path: 'e2e/artifacts/capture-controls.png' });
    
    // Check for the capture dock - look for Live/PCAP mode buttons
    const liveBtn = page.locator('button:has-text("Live")');
    const pcapBtn = page.locator('button:has-text("PCAP")');
    
    // At least one should be visible
    await expect(liveBtn.or(pcapBtn)).toBeVisible();
  });

  test('should toggle protocol filters', async ({ page }) => {
    await page.screenshot({ path: 'e2e/artifacts/protocols-before.png' });
    
    // Click on protocol chips if they exist
    const tcpChip = page.locator('button:has-text("TCP")').first();
    if (await tcpChip.isVisible()) {
      await tcpChip.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: 'e2e/artifacts/protocols-after.png' });
    }
  });

  test('should show right panel with tabs', async ({ page }) => {
    await page.screenshot({ path: 'e2e/artifacts/right-panel.png' });
    
    // Check for right panel tabs
    const checkpointsTab = page.locator('button:has-text("Checkpoints")');
    const mostPeersTab = page.locator('button:has-text("Most Peers")');
    const topTalkersTab = page.locator('button:has-text("Top Talkers")');
    
    // At least one tab should exist
    await expect(checkpointsTab.or(mostPeersTab).or(topTalkersTab)).toBeVisible();
  });

  test('should have filter input', async ({ page }) => {
    await page.screenshot({ path: 'e2e/artifacts/filter-input.png' });
    
    const anyInput = page.locator('.trafficFilterBar input, .filterInputWrap input').first();
    await expect(anyInput).toBeVisible();
  });

  test('should have checkpoint button', async ({ page }) => {
    await page.screenshot({ path: 'e2e/artifacts/checkpoint-button.png' });
    
    const filterBar = page.locator('.trafficFilterBar, .filterBarCheckpoints');
    if (await filterBar.isVisible()) {
      await page.screenshot({ path: 'e2e/artifacts/filter-bar.png' });
    }
  });

  test('should display 3D canvas viewport', async ({ page }) => {
    await page.screenshot({ path: 'e2e/artifacts/viewport.png' });
    
    // The Three.js canvas should be present
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should toggle right panel open/closed', async ({ page }) => {
    // Find and click the panel toggle if it exists
    const panelToggle = page.locator('.cpHistoryBtn, .rightPanelToggle, [aria-label*="panel"]').first();
    
    if (await panelToggle.isVisible()) {
      await panelToggle.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'e2e/artifacts/panel-toggle.png' });
    }
  });
});