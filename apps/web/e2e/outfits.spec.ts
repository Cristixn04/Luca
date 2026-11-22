import { expect, test, type Page } from '@playwright/test';

async function addRealClosetGarment(
  page: Page,
  category: 'tshirt' | 'long_sleeve' | 'pants' | 'shorts' | 'jacket' | 'dress',
  name: string,
) {
  await page.getByRole('button', { name: 'Añadir prenda' }).click();
  await page.getByLabel('Categoría *').selectOption(category);
  await page.getByLabel('Nombre *').fill(name);
  await page.getByRole('button', { name: 'Guardar prenda' }).click();
  await expect(page.getByText(name)).toBeVisible();
}

test.describe('Flujo e2e M9: clóset real → probador → outfits → registrar uso (T9.9)', () => {
  test('conecta clóset real con probador y outfits, genera 3 propuestas diversas, guarda outfit y registra uso', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continuar sin cifrado' }).click();

    // 1. Abrir Outfits con clóset vacío -> redirige al Clóset (sin botones de ejemplo)
    await page.getByRole('link', { name: 'Outfits' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Outfits' })).toBeVisible();
    await expect(page.getByRole('button', { name: /ejemplo/i })).toHaveCount(0);

    await page.getByRole('button', { name: /Ir al Clóset a añadir prendas/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Clóset local' })).toBeVisible();

    // 2. Añadir prendas reales del usuario en Clóset (2 superiores + 2 inferiores)
    await addRealClosetGarment(page, 'tshirt', 'Camiseta blanca básica');
    await addRealClosetGarment(page, 'long_sleeve', 'Camisa azul oxford');
    await addRealClosetGarment(page, 'pants', 'Pantalón recto azul');
    await addRealClosetGarment(page, 'shorts', 'Short arena verano');

    // 3. Verificar que en Probador aparecen exclusivamente esas prendas del clóset
    await page.getByRole('link', { name: 'Probador' }).click();
    await expect(page.locator('[data-spatial-carousel="upper"]')).toBeVisible();
    await expect(page.locator('[data-spatial-carousel="lower"]')).toBeVisible();

    // 4. Ir a Outfits y verificar 3 propuestas diversas con desglose
    await page.getByRole('link', { name: 'Outfits' }).click();
    await expect(page.getByRole('tab', { name: /Opción 1/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Opción 2/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Opción 3/i })).toBeVisible();
    await expect(page.getByTestId('outfit-breakdown-card')).toBeVisible();

    // 5. Guardar outfit y registrar uso hoy
    await page.getByRole('button', { name: 'Guardar outfit' }).click();
    await expect(page.getByTestId('saved-outfits-card')).toBeVisible();

    await page.getByRole('button', { name: 'Usé este outfit hoy' }).click();
    await expect(page.getByText('Uso registrado para hoy.')).toBeVisible();

    // 6. Ir al Clóset, ubicar la prenda usada hoy (1 uso) en el perchero y comprobar incremento de usos
    await page.getByRole('link', { name: 'Clóset' }).click();
    const wornHanger = page.locator('[data-closet-rack-item]', { hasText: '1 uso(s)' }).first();
    await expect(wornHanger).toBeVisible();
    await wornHanger.click();
    await page.getByRole('button', { name: /Ficha y detalles/i }).click();
    await expect(page.getByTestId('garment-usage-card')).toBeVisible();
    await expect(page.getByTestId('garment-wear-count')).toHaveText('1');

    await page.getByRole('button', { name: 'Registrar uso hoy' }).click();
    await expect(page.getByTestId('garment-wear-count')).toHaveText('2');
  });
});
