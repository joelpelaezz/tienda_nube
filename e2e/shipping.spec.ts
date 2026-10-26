import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@tienda.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin123';
const PRODUCT_SLUG = 'remera-algod-n-premium';

async function loginAsAdmin(page: Page) {
  await page.goto('/admin/envios');
  if (!page.url().includes('/ingresar')) return;

  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForTimeout(1000);
  if (page.url().includes('/ingresar')) {
    test.skip(true, 'Credenciales E2E de administración no configuradas o inválidas.');
  }
  await page.goto('/admin/envios');
  await page.waitForURL(/\/admin\/envios/, { timeout: 15000 });
}

test.describe('Envíos', () => {
  test('muestra acciones de guardado independientes en administración', async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByText('Cada método y cada regla se guarda con su propio botón')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar cambios del método' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar cambios de regla' }).first()).toBeVisible();
  });

  test('no muestra el calculador cuando no hay método activo', async ({ page }) => {
    const quoteResponse = await page.request.post('/api/shipping/quote', {
      data: { postalCode: '4000', subtotal: 5000 },
    });
    const quoteBody = await quoteResponse.json();

    test.skip(quoteBody.quotes.length > 0, 'El entorno tiene un método de envío activo.');

    await page.goto(`/productos/${PRODUCT_SLUG}`);
    await expect(page.getByText('Medios de envío')).toHaveCount(0);
    await expect(page.getByLabel('Código postal')).toHaveCount(0);
  });
});
