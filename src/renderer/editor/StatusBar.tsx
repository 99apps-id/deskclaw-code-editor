import React from 'react';

interface StatusBarProps {
  line: number;
  column: number;
  language: string;
  // placeholder for future git branch info
  gitBranch?: string;
  // diagnostics counts
  errors?: number;
  warnings?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  line,
  column,
  language,
  gitBranch = '',
  errors = 0,
  warnings = 0,
}) => {
  return (
    <div className="flex h-6 items-center justify-between border-t border-[var(--color-rule)] bg-[var(--color-paper-2)] px-2 text-xs text-[var(--color-ink-2)]">
      <div className="flex space-x-4">
        <span>{language}</span>
        {gitBranch && <span> {gitBranch}</span>}
        {errors > 0 && <span className="text-[var(--color-danger)]">{errors} Errors</span>}
        {warnings > 0 && <span className="text-[var(--color-warning)]">{warnings} Warnings</span>}
      </div>
      <div className="flex space-x-2">
        <span>Ln {line}, Col {column}</span>
      </div>
    </div>
  );
};
