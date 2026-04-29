import * as React from 'react';
import { useState } from 'react';
import { Panel } from 'azure-devops-ui/Panel';
import { PanelContent } from 'azure-devops-ui/Panel';
import { PanelFooter } from 'azure-devops-ui/Panel';
import { Button } from 'azure-devops-ui/Button';
import { TextField } from 'azure-devops-ui/TextField';

import 'azure-devops-ui/Components/Panel/Panel.css';
import 'azure-devops-ui/Components/Button/Button.css';
import 'azure-devops-ui/Components/TextField/TextField.css';

export interface SettingsPanelProps {
  exclusionPatterns: string[];
  onSave: (patterns: string[]) => void;
  onDismiss: () => void;
}

export function SettingsPanel({ exclusionPatterns, onSave, onDismiss }: SettingsPanelProps): JSX.Element {
  const [draftPatterns, setDraftPatterns] = useState<string[]>([...exclusionPatterns]);
  const [newPattern, setNewPattern] = useState('');

  function addPattern(): void {
    const trimmed = newPattern.trim();
    if (!trimmed) return;
    setDraftPatterns(prev => [...prev, trimmed]);
    setNewPattern('');
  }

  function removePattern(index: number): void {
    setDraftPatterns(prev => prev.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') addPattern();
  }

  return (
    <Panel
      onDismiss={onDismiss}
      titleProps={{ text: 'Settings' }}
      footerButtonProps={[
        { text: 'Save', primary: true, onClick: () => onSave(draftPatterns) },
        { text: 'Cancel', onClick: onDismiss },
      ]}
    >
      <PanelContent>
        <div className="flex-column rhythm-vertical-16">
          <div className="flex-column rhythm-vertical-8">
            <span className="body-m font-weight-semibold">Excluded branch patterns</span>
            <span className="body-s secondary-text">
              Branches matching any pattern are hidden from the list.
              Patterns are case-insensitive; use * as a wildcard.
            </span>
          </div>

          <div className="flex-column">
            {draftPatterns.length === 0 ? (
              <span className="body-s secondary-text padding-8">No exclusions defined.</span>
            ) : (
              draftPatterns.map((pattern, index) => (
                <div key={index} className="flex-row flex-center rhythm-horizontal-8 mb-pattern-row">
                  <span className="flex-grow body-m text-ellipsis">{pattern}</span>
                  <Button
                    iconProps={{ iconName: 'Delete' }}
                    ariaLabel={`Remove pattern ${pattern}`}
                    subtle
                    onClick={() => removePattern(index)}
                  />
                </div>
              ))
            )}
          </div>

          <div className="flex-row flex-center rhythm-horizontal-8">
            <TextField
              containerClassName="flex-grow"
              value={newPattern}
              onChange={(_, value) => setNewPattern(value ?? '')}
              placeholder="e.g. main or release/*"
              onKeyDown={handleKeyDown}
            />
            <Button
              iconProps={{ iconName: 'Add' }}
              ariaLabel="Add pattern"
              onClick={addPattern}
              disabled={!newPattern.trim()}
            />
          </div>
        </div>
      </PanelContent>
    </Panel>
  );
}
