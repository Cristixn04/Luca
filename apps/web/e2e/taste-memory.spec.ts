import { expect, test } from '@playwright/test';

test.describe('Flujo e2e M10: gustos, panel Memoria, olvido y privacidad de red (T10.5, T10.8)', () => {
  test('aprende gustos, explica afinidades, influye en outfits, permite olvidar y no envía nada a la red', async ({
    page,
  }) => {
    const externalRequests: string[] = [];

    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (
        !url.startsWith('http://127.0.0.1:4173') &&
        !url.startsWith('http://localhost:4173') &&
        !url.startsWith('data:') &&
        !url.startsWith('blob:')
      ) {
        externalRequests.push(url);
      }
      return route.continue();
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Continuar sin cifrado' }).click();

    // 1. Añadir prendas reales en Clóset y dar feedback "Me gusta" en Outfits
    await page.getByRole('link', { name: 'Clóset' }).click();
    for (const [category, name] of [
      ['tshirt', 'Camiseta clásica'],
      ['pants', 'Pantalón recto marino'],
    ] as const) {
      await page.getByRole('button', { name: 'Añadir prenda' }).click();
      await page.getByLabel('Categoría *').selectOption(category);
      await page.getByLabel('Nombre *').fill(name);
      await page.getByRole('button', { name: 'Guardar prenda' }).click();
      await expect(page.getByText(name)).toBeVisible();
    }

    await page.getByRole('link', { name: 'Outfits' }).click();
    await expect(page.getByTestId('outfit-breakdown-card')).toBeVisible();

    await page.getByRole('button', { name: 'Me gusta', exact: true }).click();
    await expect(page.getByText('Me gusta registrado en tu memoria local.')).toBeVisible();

    // 2. Ir a Memoria, comprobar afinidades explicadas y fijar un color explícitamente
    await page.getByRole('link', { name: 'Memoria' }).click();
    await expect(page.getByTestId('taste-memory-section')).toBeVisible();
    await expect(page.getByTestId('taste-memory-section')).toContainText('Aprendiendo (1 / 10)');

    await page.getByRole('button', { name: 'Fijar color Cálido' }).click();
    await expect(page.getByTestId('taste-memory-section')).toContainText('Fijado');

    // 3. Volver a Outfits y verificar que ahora aparece el componente "Gusto" en el desglose
    await page.getByRole('link', { name: 'Outfits' }).click();
    await expect(page.getByTestId('outfit-breakdown-card')).toContainText('Gusto');

    // 4. Volver a Memoria, olvidar todos los gustos y comprobar que desaparece su influencia
    await page.getByRole('link', { name: 'Memoria' }).click();
    await page.getByRole('button', { name: 'Olvidar todos mis gustos' }).click();
    await expect(
      page.getByText('Se olvidaron todos tus gustos y reglas aprendidas.'),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Outfits' }).click();
    await expect(page.getByTestId('outfit-breakdown-card')).not.toContainText('Gusto');

    // 5. Privacidad verificada (T10.8): cero peticiones externas durante todo el flujo
    expect(externalRequests).toEqual([]);
  });
});
