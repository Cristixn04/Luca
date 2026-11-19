import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';

describe('AppShell y navegación base (T0.4)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.head.innerHTML = '<meta name="color-scheme" content="light dark">';
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renderiza la marca, la navegación principal y marca la sección activa con aria-current="page"', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Probador de calce' })).toBeInTheDocument();

    const fittingLink = screen.getByRole('link', { name: 'Probador' });
    expect(fittingLink).toHaveAttribute('aria-current', 'page');

    const closetLink = screen.getByRole('link', { name: 'Clóset' });
    await user.click(closetLink);

    expect(screen.getByRole('heading', { level: 1, name: 'Clóset local' })).toBeInTheDocument();
    expect(closetLink).toHaveAttribute('aria-current', 'page');
    expect(fittingLink).not.toHaveAttribute('aria-current');
  });

  it('permite alternar entre tema claro y oscuro desde el encabezado', async () => {
    const user = userEvent.setup();
    render(<App />);

    const toggle = screen.getByRole('button', { name: 'Cambiar a tema oscuro' });
    await user.click(toggle);

    expect(document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content).toBe(
      'dark',
    );
    expect(screen.getByRole('button', { name: 'Cambiar a tema claro' })).toBeInTheDocument();
  });

  it('abre y cierra la navegación móvil con aria-expanded', async () => {
    const user = userEvent.setup();
    render(<App />);

    const menuButton = screen.getByRole('button', { name: 'Abrir menú de navegación' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Navegación móvil' })).toBeInTheDocument();
  });

  it('no contiene emojis en el texto renderizado de la interfaz', () => {
    const { container } = render(<App />);
    const emojiPattern = /\p{Extended_Pictographic}/u;
    expect(container.textContent ?? '').not.toMatch(emojiPattern);
  });
});
