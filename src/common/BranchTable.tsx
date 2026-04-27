import * as React from 'react';
import { useState, useMemo, useRef } from 'react';
import { Table, SimpleTableCell, ColumnSorting, SortOrder } from 'azure-devops-ui/Table';
import type { ITableColumn } from 'azure-devops-ui/Table';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';
import { Card } from 'azure-devops-ui/Card';
import { Header, TitleSize } from 'azure-devops-ui/Header';
import { Link } from 'azure-devops-ui/Link';
import { MessageCard, MessageCardSeverity } from 'azure-devops-ui/MessageCard';
import { Pill, PillSize, PillVariant } from 'azure-devops-ui/Pill';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';
import { TextField } from 'azure-devops-ui/TextField';
import { ZeroData } from 'azure-devops-ui/ZeroData';

import 'azure-devops-ui/Core/core.css';
import 'azure-devops-ui/Components/Card/Card.css';
import 'azure-devops-ui/Components/Header/Header.css';
import 'azure-devops-ui/Components/Link/Link.css';
import 'azure-devops-ui/Components/MessageCard/MessageCard.css';
import 'azure-devops-ui/Components/Pill/Pill.css';
import 'azure-devops-ui/Components/Spinner/Spinner.css';
import 'azure-devops-ui/Components/Table/Table.css';
import 'azure-devops-ui/Components/TextField/TextField.css';
import 'azure-devops-ui/Components/ZeroData/ZeroData.css';
import './styles.css';

import type { BranchDetail } from './gitService';
import { filterBranches, formatTimeAgo, isStale, sortBranches } from './branchService';
import type { SortColumn } from './branchService';
import { branchUrl, projectUrl, repoBranchesUrl } from './urlUtils';

export interface BranchTableProps {
  branches: BranchDetail[];
  collectionUri: string;
  showProjectColumn: boolean;
  onNavigate: (url: string) => void;
}

export function LoadingView(): JSX.Element {
  return (
    <div className="flex-grow flex-column flex-center justify-center">
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

export function BranchTable({ branches, collectionUri, showProjectColumn, onNavigate }: BranchTableProps): JSX.Element {
  const sortColumns: SortColumn[] = showProjectColumn
    ? ['name', 'repositoryName', 'projectName', 'lastCommitDate']
    : ['name', 'repositoryName', 'lastCommitDate'];
  const defaultSortIndex = sortColumns.indexOf('lastCommitDate');

  const [filter, setFilter] = useState('');
  const [sortColumnIndex, setSortColumnIndex] = useState(defaultSortIndex);
  const [sortOrder, setSortOrder] = useState(SortOrder.ascending);

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

  const displayed = useMemo(
    () => sortBranches(filterBranches(branches, filter), sortColumn, sortDirection),
    [branches, filter, sortColumn, sortDirection]
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
        width: -33,
        sortProps: sortProps(0),
        renderCell: (rowIndex, columnIndex, tableColumn, item) => (
          <SimpleTableCell key={`name-${rowIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
            <Link
              className="mb-branch-name"
              href={branchUrl(collectionUri, item.projectName, item.repositoryName, item.name)}
              target="_top"
              onClick={stopPropagation}
              subtle={false}
            >
              {item.name}
            </Link>
          </SimpleTableCell>
        ),
      },
      {
        id: 'repositoryName',
        name: 'Repository',
        width: showProjectColumn ? -25 : -35,
        sortProps: sortProps(1),
        renderCell: (rowIndex, columnIndex, tableColumn, item) => (
          <SimpleTableCell key={`repo-${rowIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
            <Link
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
        width: -22,
        sortProps: sortProps(2),
        renderCell: (rowIndex, columnIndex, tableColumn, item) => (
          <SimpleTableCell key={`proj-${rowIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
            <Link
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
      width: showProjectColumn ? -20 : -32,
      sortProps: sortProps(dateIdx),
      renderCell: (rowIndex, columnIndex, tableColumn, item) => (
        <SimpleTableCell key={`date-${rowIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
          <span className={isStale(item.lastCommitDate, now) ? 'mb-stale' : ''}>
            {item.lastCommitDate ? formatTimeAgo(item.lastCommitDate, now) : '—'}
          </span>
        </SimpleTableCell>
      ),
    });

    return cols;
  }, [sortColumnIndex, sortOrder, showProjectColumn, collectionUri, sortColumns, now]);

  const countLabel =
    displayed.length === branches.length
      ? String(branches.length)
      : `${displayed.length} of ${branches.length}`;

  return (
    <div className="flex-grow flex-column">
      <Header
        title="My Branches"
        titleSize={TitleSize.Large}
      />
      <div className="page-content flex-grow">
        <Card className="flex-grow bolt-table-card" contentProps={{ contentPadding: false }}>
          <div className="flex-row flex-center rhythm-horizontal-8 padding-8">
            <TextField
              className="flex-grow"
              value={filter}
              onChange={(_, value) => setFilter(value ?? '')}
              placeholder="Filter branches… (* = wildcard)"
            />
            <Pill size={PillSize.compact} variant={PillVariant.outlined}>
              {countLabel}
            </Pill>
          </div>
          {displayed.length === 0 ? (
            <ZeroData
              primaryText={
                filter ? `No branches match "${filter}"` : 'You have no branches.'
              }
              imageAltText="No branches"
              className="flex-grow"
            />
          ) : (
            <Table<BranchDetail>
              behaviors={[sorting.current]}
              columns={columns}
              itemProvider={itemProvider}
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
