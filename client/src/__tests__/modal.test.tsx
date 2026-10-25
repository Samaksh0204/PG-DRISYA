import { describe, expect, test, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../components/ui';

// The map/dialog overlap bug: dialogs rendered inside the page could be painted
// over by Leaflet panes (z-index up to 1000). Dialogs must now live directly under
// <body> in their own top layer, and keep focus/keyboard behaviour correct.
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="leaflet-container"><div className="leaflet-pane" style={{ zIndex: 400 }}>map</div></div>
      <button onClick={() => setOpen(true)}>Book a visit</button>
      {open && (
        <Modal title="Book a visit" onClose={() => setOpen(false)}>
          <input aria-label="Note" />
          <button onClick={() => setOpen(false)}>Cancel</button>
          <button>Request visit</button>
        </Modal>
      )}
    </>
  );
}

function mountInRoot() {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  const utils = render(<Harness />, { container: root });
  return { root, ...utils };
}

describe('Modal', () => {
  test('renders in a top layer outside the page, not inside the map stacking context', async () => {
    const { root, unmount } = mountInRoot();
    await userEvent.click(screen.getByText('Book a visit'));
    const dialog = screen.getByRole('dialog', { name: 'Book a visit' });
    const layer = dialog.parentElement!;
    expect(layer.parentElement).toBe(document.body);
    expect(root.contains(dialog)).toBe(false);
    expect(layer.className).toContain('z-modal');
    unmount();
    root.remove();
  });

  test('makes the page inert, closes on Escape and restores focus', async () => {
    const { root, unmount } = mountInRoot();
    const trigger = screen.getByText('Book a visit');
    trigger.focus();
    await userEvent.click(trigger);
    expect(root.inert).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(root.inert).toBe(false);
    expect(document.activeElement).toBe(trigger);
    unmount();
    root.remove();
  });

  test('keeps Tab focus inside the dialog', async () => {
    const { root, unmount } = mountInRoot();
    await userEvent.click(screen.getByText('Book a visit'));
    const last = screen.getByText('Request visit');
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    unmount();
    root.remove();
  });

  test('survives repeated opening and closing', async () => {
    const onClose = vi.fn();
    const { rerender, unmount } = render(<Modal title="One" onClose={onClose}>x</Modal>);
    rerender(<Modal title="One" onClose={() => onClose()}>y</Modal>);
    // A new onClose each render must not re-run the open effect (no focus jumps).
    expect(screen.getByRole('dialog')).toHaveTextContent('y');
    unmount();
    for (let i = 0; i < 3; i++) {
      const r = render(<Modal title={`Open ${i}`} onClose={() => {}}>z</Modal>);
      expect(screen.getByRole('dialog', { name: `Open ${i}` })).toBeInTheDocument();
      r.unmount();
    }
    expect(document.body.style.overflow).toBe('');
  });
});
