import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { SettingsPanel } from '../../src/common/SettingsPanel';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
  container.remove();
});

function render(ui: React.ReactElement): void {
  act(() => { ReactDOM.render(ui, container); });
}

function queryAll(selector: string): NodeListOf<Element> {
  return document.body.querySelectorAll(selector);
}

function query(selector: string): Element | null {
  return document.body.querySelector(selector);
}

function click(el: Element | null): void {
  act(() => { el?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

function type(el: Element | null, value: string): void {
  act(() => {
    if (!el) return;
    (el as HTMLInputElement).value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('SettingsPanel', () => {
  it('renders the panel title', () => {
    render(<SettingsPanel exclusionPatterns={[]} onSave={jest.fn()} onDismiss={jest.fn()} />);
    expect(document.body.textContent).toContain('Settings');
  });

  it('shows the empty state when no patterns are provided', () => {
    render(<SettingsPanel exclusionPatterns={[]} onSave={jest.fn()} onDismiss={jest.fn()} />);
    expect(document.body.textContent).toContain('No exclusions defined.');
  });

  it('renders each provided exclusion pattern', () => {
    render(
      <SettingsPanel
        exclusionPatterns={['dependabot/*', 'release/*']}
        onSave={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(document.body.textContent).toContain('dependabot/*');
    expect(document.body.textContent).toContain('release/*');
  });

  it('clicking Cancel calls onDismiss without calling onSave', () => {
    const onSave = jest.fn();
    const onDismiss = jest.fn();
    render(<SettingsPanel exclusionPatterns={[]} onSave={onSave} onDismiss={onDismiss} />);
    const cancelBtn = Array.from(queryAll('button')).find(b => b.textContent?.includes('Cancel'));
    click(cancelBtn ?? null);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('clicking Save calls onSave with the current draft patterns', () => {
    const onSave = jest.fn();
    render(
      <SettingsPanel
        exclusionPatterns={['main', 'dependabot/*']}
        onSave={onSave}
        onDismiss={jest.fn()}
      />
    );
    const saveBtn = Array.from(queryAll('button')).find(b => b.textContent?.includes('Save'));
    click(saveBtn ?? null);
    expect(onSave).toHaveBeenCalledWith(['main', 'dependabot/*']);
  });

  it('clicking a Delete button removes that pattern from the draft', () => {
    const onSave = jest.fn();
    render(
      <SettingsPanel
        exclusionPatterns={['main', 'release/*']}
        onSave={onSave}
        onDismiss={jest.fn()}
      />
    );
    const deleteButtons = Array.from(queryAll('button[aria-label^="Remove pattern"]'));
    click(deleteButtons[0]);
    const saveBtn = Array.from(queryAll('button')).find(b => b.textContent?.includes('Save'));
    click(saveBtn ?? null);
    expect(onSave).toHaveBeenCalledWith(['release/*']);
  });

  it('shows empty state after all patterns are removed', () => {
    render(
      <SettingsPanel exclusionPatterns={['main']} onSave={jest.fn()} onDismiss={jest.fn()} />
    );
    const deleteBtn = query('button[aria-label^="Remove pattern"]');
    click(deleteBtn);
    expect(document.body.textContent).toContain('No exclusions defined.');
  });

  it('Add button is disabled when input is empty', () => {
    render(<SettingsPanel exclusionPatterns={[]} onSave={jest.fn()} onDismiss={jest.fn()} />);
    const addBtn = query('button[aria-label="Add pattern"]') as HTMLButtonElement | null;
    expect(addBtn?.disabled).toBe(true);
  });
});
