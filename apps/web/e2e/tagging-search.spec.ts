import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M7: búsqueda libre y prendas similares (T7.2–T7.5)', () => {
  test('busca texto libre con MiniSearch y navega por prendas similares del clóset real', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Entrar en modo sin cifrado para flujo rápido
    await page.getByRole('button', { name: 'Continuar sin cifrado' }).click();

    // 2. Ir al Clóset y añadir prendas reales del usuario
    await page.getByRole('link', { name: 'Clóset' }).click();
    for (const [category, name] of [
      ['tshirt', 'Camiseta básica de lino'],
      ['pants', 'Pantalón chino recto'],
      ['tshirt', 'Camiseta fresca de verano'],
    ] as const) {
      await page.getByRole('button', { name: 'Añadir prenda' }).click();
      await page.getByLabel('Categoría *').selectOption(category);
      await page.getByLabel('Nombre *').fill(name);
      await page.getByRole('button', { name: 'Guardar prenda' }).click();
      await expect(page.getByText(name)).toBeVisible();
    }

    // 3. Búsqueda local en texto libre (MiniSearch con stop-words y sin tildes)
    const searchInput = page.getByLabel('Buscar prendas en el clóset');
    await searchInput.fill('camiseta de lino');
    await expect(page.getByText('Camiseta básica de lino')).toBeVisible();
    await expect(page.getByText('Pantalón chino recto')).toHaveCount(0);

    // 4. Seleccionar en el perchero y comprobar giro 3D de foto de referencia (sin "Ficha y detalles")
    await page.locator('[data-closet-rack-item]').first().click();
    await expect(page.getByRole('button', { name: /Ficha y detalles/i })).toHaveCount(0);
    await expect(page.getByTestId('closet-spotlight-flip')).toHaveAttribute('data-flipped', 'false');
    await page.getByRole('button', { name: /Ver foto de referencia/i }).click();
    await expect(page.getByTestId('closet-spotlight-flip')).toHaveAttribute('data-flipped', 'true');
    await page.getByRole('button', { name: /Ver prenda digital/i }).click();
    await expect(page.getByTestId('closet-spotlight-flip')).toHaveAttribute('data-flipped', 'false');
  });
});
