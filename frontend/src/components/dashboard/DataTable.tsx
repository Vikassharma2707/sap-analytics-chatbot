'use client';

import React from 'react';

interface Props {
  records: Record<string, unknown>[];
  maxRows?: number;
}

export function DataTable({ records, maxRows = 20 }: Props) {
  if (!records.length) return null;
  const headers = Object.keys(records[0]).slice(0, 8);
  const rows = records.slice(0, maxRows);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-900 border-b border-gray-700">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-gray-800 ${i % 2 === 0 ? 'bg-gray-850' : 'bg-gray-800'} hover:bg-gray-750`}>
              {headers.map((h) => (
                <td key={h} className="px-3 py-2 text-gray-300 whitespace-nowrap max-w-[200px] truncate">
                  {String(row[h] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {records.length > maxRows && (
        <p className="px-3 py-2 text-xs text-gray-500 bg-gray-900">
          Showing {maxRows} of {records.length} rows
        </p>
      )}
    </div>
  );
}
