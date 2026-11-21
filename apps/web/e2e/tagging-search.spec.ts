import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M7: etiquetado local, búsqueda libre y prendas similares (T7.2–T7.5)', () => {
  test('sugiere etiquetas offline, busca texto libre con MiniSearch y navega por prendas similares', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Entrar en modo sin cifrado para flujo rápido
    await page.getByRole('button', { name: 'Continuar sin cifrado' }).click();

    // 2. Ir al Clóset y cargar 2 prendas de ejemplo
    await page.getByRole('link', { name: 'Clóset' }).click();
    await page.getByRole('button', { name: /Cargar 2 prendas de ejemplo/i }).click();
    await expect(page.getByText('Camiseta básica de lino')).toBeVisible();
    await expect(page.getByText('Pantalón chino recto')).toBeVisible();

    // 3. Añadir una camiseta similar usando el etiquetador local (sin API)
    await page.getByRole('button', { name: 'Añadir prenda' }).click();
    await page.getByLabel('Nombre *').fill('Camiseta fresca de verano');
    await page.getByLabel('Marca').fill('Taller Norte');
    await page.getByRole('button', { name: /Sugerir etiquetas locales/i }).click();

    await expect(page.getByTestId('tag-suggestion-panel')).toBeVisible();
    await expect(page.getByTestId('tag-suggestion-panel')).toContainText('manual-local');

    await page.getByRole('button', { name: 'Aplicar sugerencias' }).click();
    await page.getByRole('button', { name: 'Guardar prenda' }).click();

    await expect(page.getByText('Camiseta fresca de verano')).toBeVisible();

    // 4. Búsqueda local en texto libre (MiniSearch con stop-words y sin tildes)
    const searchInput = page.getByLabel('Buscar prendas en el clóset');
    await searchInput.fill('camiseta de lino para verano');
    await expect(page.getByText('Camiseta básica de lino')).toBeVisible();
    await expect(page.getByText('Pantalón chino recto')).toHaveCount(0);

    // 5. Seleccionar en el perchero, abrir ficha y verificar tarjeta "Prendas similares" y navegación
    await page.locator('[data-closet-rack-item]').first().click();
    await page.getByRole('button', { name: /Ficha y detalles/i }).click();
    await expect(page.getByTestId('similar-garments-card')).toBeVisible();
    await expect(page.getByTestId('similar-garments-card')).toContainText(
      'Camiseta fresca de verano',
    );

    await page
      .getByTestId('similar-garments-card')
      .getByRole('button', { name: /Camiseta fresca de verano/i })
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Camiseta fresca de verano' }),
    ).toBeVisible();
  });
});
