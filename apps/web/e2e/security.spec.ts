import { expect, test } from '@playwright/test';

test.describe('Auditoría e2e de seguridad, privacidad y modo offline (RNF-06, RNF-13)', () => {
  test('cero fugas de red a terceros, resistencia XSS real y operación 100 % offline', async ({
    page,
    context,
  }) => {
    const externalRequests: string[] = [];
    const leakedSecrets: string[] = [];
    const sensitiveTokens = ['ClavePrivada999!', 'PrendaUltraPrivada', 'MarcaConfidencial'];

    page.on('request', (req) => {
      const url = req.url();
      const body = req.postData() ?? '';

      if (!url.startsWith('http://127.0.0.1:4173') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalRequests.push(url);
      }

      for (const secret of sensitiveTokens) {
        if (url.includes(secret) || body.includes(secret)) {
          leakedSecrets.push(`${secret} -> ${url}`);
        }
      }
    });

    await page.goto('/');

    // 1. Crear bóveda cifrada
    await page.getByLabel('Contraseña de la bóveda').fill('ClavePrivada999!');
    await page.getByRole('button', { name: /Crear bóveda cifrada/i }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Entrar a Luca' }).click();

    // 2. Cortar por completo la red (RNF-13: todo lo local debe seguir operando)
    await context.setOffline(true);

    // 3. Modificar medidas y añadir prenda con payload XSS en modo offline
    await page.getByRole('button', { name: 'Panel de medidas' }).click();
    await page.getByLabel('Pecho', { exact: true }).fill('94');
    await page.getByRole('link', { name: 'Clóset' }).click();

    await page.getByRole('button', { name: 'Añadir prenda' }).click();
    const xssName = '<img src=x onerror="window.__lucaXss=true"> PrendaUltraPrivada';
    await page.getByLabel('Nombre *').fill(xssName);
    await page.getByRole('button', { name: 'Guardar prenda' }).click();

    await expect(page.getByText(xssName)).toBeVisible();
    await page.locator('[data-closet-rack-item]').first().click();
    await expect(page.getByTestId('spotlight-recommended-size')).toBeVisible();
    await expect(page.getByTestId('closet-spotlight')).toContainText('PrendaUltraPrivada');

    // 4. Verificar que XSS no ejecutó nada en el navegador real
    const xssExecuted = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__lucaXss === true,
    );
    expect(xssExecuted).toBe(false);

    // 5. Verificar cero tráfico a terceros y cero filtraciones de datos privados (RNF-06)
    expect(externalRequests).toEqual([]);
    expect(leakedSecrets).toEqual([]);
  });
});
