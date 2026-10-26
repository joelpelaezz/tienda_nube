import { test, expect, Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@tienda.com';
const ADMIN_PASSWORD = 'admin123';

async function loginAsAdmin(page: Page) {
  // Check if already logged in by visiting admin
  await page.goto('/admin/productos');
  if (!page.url().includes('/ingresar')) {
    // Already logged in, proceed
    return;
  }

  // Retry up to 2 times if login fails due to session issues
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.goto('/ingresar');

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);

    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    try {
      await page.waitForURL((url) => !url.pathname.includes('/ingresar'), { timeout: 15000 });
      return; // Login succeeded
    } catch {
      // Check if we have an error message
      if (page.url().includes('/ingresar')) {
        const errorEl = page.locator('.auth-error');
        if (await errorEl.isVisible().catch(() => false)) {
          const msg = await errorEl.textContent().catch(() => 'unknown');
          throw new Error('Login failed: ' + msg);
        }
      }
      // Retry if this was attempt 1
      if (attempt < 2) {
        await page.waitForTimeout(1000);
        continue;
      }
      throw new Error('Login failed after 2 attempts, still on: ' + page.url());
    }
  }
}

test.describe('Admin: Crear producto', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/productos/new');
    await expect(page.getByRole('heading', { name: 'Nuevo producto' })).toBeVisible({ timeout: 15000 });
    // Dismiss cookie bar if present
    const cookieBtn = page.locator('.cookie-bar-btn');
    if (await cookieBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cookieBtn.click();
    }
  });

  test('crear producto completo con categoría y variantes', async ({ page }) => {
    const uniqueName = `Remera Capibara ${Date.now()}`;
    // Name
    await page.locator('input[placeholder="Nombre del producto"]').fill(uniqueName);
    
    // Description
    await page.locator('textarea[placeholder="Descripción del producto"]').fill(
      'Remera de algodón con estampa de capibara'
    );

    // Price (first number input)
    await page.locator('input[type="number"]').first().fill('5990');

    // Category
    await page.getByText('Remeras', { exact: true }).locator('..').locator('input[type="checkbox"]').check();

    // Image URL
    await page.locator('input[placeholder*="mitiendanube"]').fill(
      'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130760-6470519c0c2385666f17408796629820-100-0.webp'
    );

    // Variant property: Talle S and M
    await page.getByRole('button', { name: '+ Agregar propiedad' }).click();
    await page.getByRole('button', { name: 'Talle', exact: true }).click();
    await page.locator('label.admin-variant-option-tag').filter({ hasText: /^S$/ }).click();
    await page.locator('label.admin-variant-option-tag').filter({ hasText: /^M$/ }).click();
    await page.getByRole('button', { name: 'Generar combinaciones' }).click();

    const combinationRows = page.locator('.admin-combinations-table tbody tr');
    await combinationRows.nth(0).locator('input[type="number"]').first().fill('10');
    await combinationRows.nth(1).locator('input[type="number"]').first().fill('15');
    await combinationRows.nth(0).locator('input[placeholder="Precio de la variante"]').fill('5990');
    await combinationRows.nth(1).locator('input[placeholder="Precio de la variante"]').fill('5990');

    // Submit
    await page.getByRole('button', { name: 'Crear producto' }).first().click();

    // Wait for redirect to product detail
    await expect(page).toHaveURL(/\/admin\/productos\/\d+/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText(uniqueName, { timeout: 10000 });
  });

  test('crear producto mínimo (campos obligatorios)', async ({ page }) => {
    const uniqueName = `Llavero Unico ${Date.now()}`;

    // Dismiss cookie bar if visible
    const cookieBtn = page.locator('.cookie-bar-btn');
    if (await cookieBtn.isVisible().catch(() => false)) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
    }

    await page.getByPlaceholder('Nombre del producto').fill(uniqueName);
    // Target only the regular price. Offer and transfer prices share the same placeholder.
    await page.locator('input[type="number"][placeholder="0"]').first().fill('3500');

    // Click the FOOTER submit button
    await page.getByRole('button', { name: 'Crear producto' }).last().click({ force: true });

    // Wait for navigation
    await page.waitForURL(/\/admin\/productos\/\d+/, { timeout: 15000 });

    await expect(page.locator('h1')).toContainText(uniqueName, { timeout: 10000 });
  });

  test('validación: sin nombre el formulario no se envía', async ({ page }) => {
    await page.locator('input[type="number"]').first().fill('1000');

    await page.getByRole('button', { name: 'Crear producto' }).first().click();

    // Should stay on the form (required field blocks submit)
    await expect(page).toHaveURL('/admin/productos/new', { timeout: 5000 });
  });
});
