import { test, expect, Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@tienda.com';
const ADMIN_PASSWORD = 'admin123';

async function loginAsAdmin(page: Page) {
  await page.goto('/ingresar');

  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);

  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  
  // Wait for URL to leave /ingresar
  await page.waitForURL((url) => !url.pathname.includes('/ingresar'), { timeout: 15000 });
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
    await page.locator('select').first().selectOption({ label: 'Remeras' });

    // Image URL
    await page.locator('input[placeholder*="mitiendanube"]').fill(
      'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130760-6470519c0c2385666f17408796629820-100-0.webp'
    );

    // First variant: Talle S, stock 10
    await page.locator('input[placeholder="Ej: Talle M"]').first().fill('Talle S');
    await page.locator('input[type="number"]').nth(1).fill('10');

    // Add second variant
    await page.getByRole('button', { name: '+ Agregar variante' }).click();

    // Fill second variant row: Talle M, stock 15
    const variantRows = page.locator('.admin-variant-row');
    await variantRows.nth(1).locator('input[type="text"]').fill('Talle M');
    await variantRows.nth(1).locator('input[type="number"]').fill('15');

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

    // Fill using plain JS to bypass React event system issues
    await page.evaluate((data: { name: string; price: string }) => {
      // Find inputs by placeholder and set their values directly
      const inputs = document.querySelectorAll<HTMLInputElement>('#new-product-form input');
      inputs.forEach(input => {
        if (input.placeholder.includes('Nombre del producto')) {
          // React needs us to set the value and dispatch an input event
          const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as PropertyDescriptor).set;
          nativeInputValueSetter.call(input, data.name);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (input.type === 'number' && input.placeholder === '0') {
          const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as PropertyDescriptor).set;
          nativeInputValueSetter.call(input, data.price);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }, { name: uniqueName, price: '3500' });

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
