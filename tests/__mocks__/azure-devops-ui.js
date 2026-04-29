const React = require('react');

// Minimal stubs for azure-devops-ui components used in tests.
// Each renders plain semantic HTML so tests can query by role/text/aria-label.

const Button = ({ onClick, disabled, ariaLabel, children, iconProps }) =>
  React.createElement('button', { onClick, disabled, 'aria-label': ariaLabel }, children || (iconProps?.iconName ?? null));

const TextField = ({ value, onChange, placeholder, containerClassName, onKeyDown }) =>
  React.createElement('input', {
    value: value ?? '',
    placeholder,
    className: containerClassName,
    onKeyDown,
    onChange: e => onChange && onChange(e, e.target.value),
  });

const Panel = ({ children, onDismiss, titleProps, footerButtonProps }) =>
  React.createElement('div', { role: 'dialog' },
    titleProps?.text ? React.createElement('h2', null, titleProps.text) : null,
    children,
    footerButtonProps?.map((bp, i) =>
      React.createElement('button', { key: i, onClick: bp.onClick, disabled: bp.disabled }, bp.text)
    ),
  );

const PanelContent = ({ children }) => React.createElement('div', null, children);
const PanelFooter = ({ children, buttonProps }) =>
  React.createElement('div', null,
    children,
    buttonProps?.map((bp, i) =>
      React.createElement('button', { key: i, onClick: bp.onClick }, bp.text)
    ),
  );

const Header = ({ title, commandBarItems }) =>
  React.createElement('div', null,
    React.createElement('div', null, title),
    commandBarItems?.map((item, i) =>
      React.createElement('button', { key: i, onClick: item.onActivate, 'aria-label': item.ariaLabel })
    ),
  );

const Pill = ({ children }) => React.createElement('span', null, children);
const Spinner = ({ label }) => React.createElement('div', null, label);
const MessageCard = ({ children }) => React.createElement('div', null, children);
const Card = ({ children, className, contentProps }) =>
  React.createElement('div', { className },
    React.createElement('div', { className: contentProps?.className }, children)
  );
const Link = ({ children, href, className, onClick }) =>
  React.createElement('a', { href, className, onClick }, children);
const Table = ({ columns, itemProvider, behaviors, scrollable, onActivate }) =>
  React.createElement('table', null);
const SimpleTableCell = ({ children }) => React.createElement('td', null, children);
const ArrayItemProvider = function(items) { this.items = items; };

module.exports = {
  Button, TextField, Panel, PanelContent, PanelFooter,
  Header, Pill, Spinner, MessageCard, Card, Link,
  Table, SimpleTableCell, ArrayItemProvider,
  TitleSize: { Large: 'large', Medium: 'medium' },
  PillSize: { compact: 'compact' },
  PillVariant: { outlined: 'outlined' },
  SpinnerSize: { large: 'large' },
  MessageCardSeverity: { Info: 'Info', Warning: 'Warning', Error: 'Error' },
  SortOrder: { ascending: 0, descending: 1 },
  ColumnSorting: function(fn) { this.fn = fn; },
};
