import * as React from 'react';
import { useState, useMemo, useRef } from 'react';
import { Table, SimpleTableCell, ColumnSorting, SortOrder } from 'azure-devops-ui/Table';
import type { ITableColumn } from 'azure-devops-ui/Table';
import type { IHeaderCommandBarItem } from 'azure-devops-ui/HeaderCommandBar';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';
import { Card } from 'azure-devops-ui/Card';
import { Header, TitleSize } from 'azure-devops-ui/Header';
import { Icon } from 'azure-devops-ui/Icon';
import { Link } from 'azure-devops-ui/Link';
import { MessageCard, MessageCardSeverity } from 'azure-devops-ui/MessageCard';
import { Pill, PillSize, PillVariant } from 'azure-devops-ui/Pill';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';
import { TextField } from 'azure-devops-ui/TextField';

import 'azure-devops-ui/Core/override.css';
import 'azure-devops-ui/Core/core.css';
import 'azure-devops-ui/Components/Card/Card.css';
import 'azure-devops-ui/Components/Header/Header.css';
import 'azure-devops-ui/Components/HeaderCommandBar/HeaderCommandBar.css';
import 'azure-devops-ui/Components/Page/Page.css';
import 'azure-devops-ui/Components/Icon/FluentIcons.css';
import 'azure-devops-ui/Components/Link/Link.css';
import 'azure-devops-ui/Components/MessageCard/MessageCard.css';
import 'azure-devops-ui/Components/Pill/Pill.css';
import 'azure-devops-ui/Components/Spinner/Spinner.css';
import 'azure-devops-ui/Components/Table/Table.css';
import 'azure-devops-ui/Components/TextField/TextField.css';
import './styles.css';

import type { BranchDetail } from './gitService';
import { applyExclusionPatterns, filterBranches, formatTimeAgo, isStale, sortBranches } from './branchService';
import type { SortColumn } from './branchService';
import { SettingsPanel } from './SettingsPanel';
import { branchUrl, projectUrl, repoBranchesUrl } from './urlUtils';

export interface BranchTableProps {
  branches: BranchDetail[];
  collectionUri: string;
  showProjectColumn: boolean;
  exclusionPatterns: string[];
  onNavigate: (url: string) => void;
  onSettingsChange: (patterns: string[]) => Promise<void>;
}

export function LoadingView(): JSX.Element {
  return (
    <div className="flex-grow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner label="Loading your branches…" size={SpinnerSize.large} />
    </div>
  );
}

export function ErrorView({ message }: { message: string }): JSX.Element {
  return (
    <MessageCard className="flex-self-stretch" severity={MessageCardSeverity.Error}>
      {message}
    </MessageCard>
  );
}

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

// 48px covers header cell padding (22px) + sort icon (~20px) + margin of safety.
const COLUMN_EXTRA_WIDTH = 48;

function contentColumnWidth(header: string, values: string[]): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 120;
  ctx.font = '14px "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';
  const measure = (text: string): number => ctx.measureText(text).width;
  const maxTextWidth = values.length > 0
    ? Math.max(measure(header), ...values.map(measure))
    : measure(header);
  return Math.ceil(maxTextWidth) + COLUMN_EXTRA_WIDTH;
}

export function BranchTable({ branches, collectionUri, showProjectColumn, exclusionPatterns, onNavigate, onSettingsChange }: BranchTableProps): JSX.Element {
  const sortColumns: SortColumn[] = showProjectColumn
    ? ['name', 'repositoryName', 'projectName', 'lastCommitDate']
    : ['name', 'repositoryName', 'lastCommitDate'];
  const defaultSortIndex = sortColumns.indexOf('lastCommitDate');

  const [filter, setFilter] = useState('');
  const [sortColumnIndex, setSortColumnIndex] = useState(defaultSortIndex);
  const [sortOrder, setSortOrder] = useState(SortOrder.ascending);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  // Stable ref delegate so ColumnSorting (created once) always calls the latest handler.
  const onSortRef = useRef<(columnIndex: number, order: SortOrder) => void>(() => {});
  onSortRef.current = (columnIndex, order) => {
    setSortColumnIndex(columnIndex);
    setSortOrder(order);
  };
  const sorting = useRef(
    new ColumnSorting<BranchDetail>((columnIndex, proposedSortOrder) =>
      onSortRef.current(columnIndex, proposedSortOrder)
    )
  );

  const sortDirection = sortOrder === SortOrder.ascending ? 'asc' : 'desc';
  const sortColumn = sortColumns[sortColumnIndex];
  const now = useMemo(() => new Date(), []);

  const repoWidth = useMemo(
    () => contentColumnWidth('Repository', branches.map(b => b.repositoryName)),
    [branches]
  );
  const projectWidth = useMemo(
    () => contentColumnWidth('Project', branches.map(b => b.projectName)),
    [branches]
  );
  const dateWidth = useMemo(
    () => contentColumnWidth('Last updated', branches.map(b =>
      b.lastCommitDate ? formatTimeAgo(b.lastCommitDate, now) : '—'
    )),
    [branches, now]
  );

  const afterExclusions = useMemo(
    () => applyExclusionPatterns(branches, exclusionPatterns),
    [branches, exclusionPatterns]
  );
  const excludedCount = branches.length - afterExclusions.length;

  const displayed = useMemo(
    () => sortBranches(filterBranches(afterExclusions, filter), sortColumn, sortDirection),
    [afterExclusions, filter, sortColumn, sortDirection]
  );
  const itemProvider = useMemo(() => new ArrayItemProvider(displayed), [displayed]);

  const columns = useMemo<ITableColumn<BranchDetail>[]>(() => {
    const sortProps = (idx: number) => ({
      sortOrder: sortColumnIndex === idx ? sortOrder : undefined,
    });

    const cols: ITableColumn<BranchDetail>[] = [
      {
        id: 'name',
        name: 'Branch',
        width: -1,
        sortProps: sortProps(0),
        renderCell: (rowIndex, columnIndex, tableColumn, item) => (
          <SimpleTableCell key={`name-${rowIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
            <div className="flex-row flex-center">
              <Icon iconName="BranchMerge" className="flex-noshrink margin-right-4" />
              <span className="mb-cell-link flex-grow">{item.name}</span>
            </div>
          </SimpleTableCell>
        ),
      },
      {
        id: 'repositoryName',
        name: 'Repository',
        width: repoWidth,
        sortProps: sortProps(1),
        renderCell: (rowIndex, columnIndex, tableColumn, item) => (
          <SimpleTableCell key={`repo-${rowIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
            <Link
              className="mb-cell-link"
              href={repoBranchesUrl(collectionUri, item.projectName, item.repositoryName)}
              target="_top"
              onClick={stopPropagation}
              subtle
            >
              {item.repositoryName}
            </Link>
          </SimpleTableCell>
        ),
      },
    ];

    if (showProjectColumn) {
      cols.push({
        id: 'projectName',
        name: 'Project',
        width: projectWidth,
        sortProps: sortProps(2),
        renderCell: (rowIndex, columnIndex, tableColumn, item) => (
          <SimpleTableCell key={`proj-${rowIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
            <Link
              className="mb-cell-link"
              href={projectUrl(collectionUri, item.projectName)}
              target="_top"
              onClick={stopPropagation}
              subtle
            >
              {item.projectName}
            </Link>
          </SimpleTableCell>
        ),
      });
    }

    const dateIdx = sortColumns.indexOf('lastCommitDate');
    cols.push({
      id: 'lastCommitDate',
      name: 'Last updated',
      width: dateWidth,
      sortProps: sortProps(dateIdx),
      renderCell: (rowIndex, columnIndex, tableColumn, item) => (
        <SimpleTableCell key={`date-${rowIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
          <span className={`text-ellipsis${isStale(item.lastCommitDate, now) ? ' mb-stale' : ''}`}>
            {item.lastCommitDate ? formatTimeAgo(item.lastCommitDate, now) : '—'}
          </span>
        </SimpleTableCell>
      ),
    });

    return cols;
  }, [sortColumnIndex, sortOrder, showProjectColumn, collectionUri, sortColumns, now, repoWidth, projectWidth, dateWidth]);

  const countLabel =
    displayed.length === branches.length
      ? String(branches.length)
      : `${displayed.length} of ${branches.length}`;

  const commandBarItems: IHeaderCommandBarItem[] = [
    {
      id: 'settings',
      ariaLabel: 'Settings',
      iconProps: { iconName: 'Settings' },
      important: true,
      onActivate: () => setSettingsPanelOpen(true),
    },
  ];

  return (
    <div className="bolt-page bolt-page-grey flex-grow flex-column">
      <Header
        title={
          <div className="flex-row flex-center rhythm-horizontal-8">
            <span>My Branches</span>
            <Pill size={PillSize.compact} variant={PillVariant.outlined}>
              {countLabel}
            </Pill>
          </div>
        }
        titleSize={TitleSize.Large}
        commandBarItems={commandBarItems}
      />
      {settingsPanelOpen && (
        <SettingsPanel
          exclusionPatterns={exclusionPatterns}
          onSave={async patterns => {
            await onSettingsChange(patterns);
            setSettingsPanelOpen(false);
          }}
          onDismiss={() => setSettingsPanelOpen(false)}
        />
      )}
      <div className="page-content page-content-top flex-grow flex-column">
        {excludedCount > 0 && (
          <MessageCard
            className="margin-bottom-16"
            severity={MessageCardSeverity.Info}
            buttonProps={[{ text: 'Manage settings', onClick: () => setSettingsPanelOpen(true) }]}
          >
            {excludedCount === 1
              ? '1 branch is hidden by your exclusion settings.'
              : `${excludedCount} branches are hidden by your exclusion settings.`}
          </MessageCard>
        )}
        <TextField
          containerClassName="mb-filter-field margin-bottom-16"
          value={filter}
          onChange={(_, value) => setFilter(value ?? '')}
          placeholder="Filter branches… (* = wildcard)"
          prefixIconProps={{ iconName: 'Filter' }}
        />
        <Card className="flex-column bolt-table-card bolt-card-white" contentProps={{ contentPadding: false, className: 'flex-grow flex-column scroll-hidden' }}>
          {displayed.length === 0 ? (
            <div className="secondary-text body-m padding-16">
              {filter ? `No branches match "${filter}"` : 'You have no branches.'}
            </div>
          ) : (
            <Table<BranchDetail>
              behaviors={[sorting.current]}
              columns={columns}
              itemProvider={itemProvider}
              scrollable
              onActivate={(_, row) => {
                const item = row.data;
                if (item) onNavigate(branchUrl(collectionUri, item.projectName, item.repositoryName, item.name));
              }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
