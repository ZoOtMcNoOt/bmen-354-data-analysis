import React from 'react';

const ResponsiveTable = ({ headers, data, renderRow, className = '' }) => {
  return (
    <div className="overflow-x-auto">
      <table className={`data-table ${className}`}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((rowData, rowIndex) => (
            <tr key={rowIndex}>
              {renderRow(rowData, rowIndex)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResponsiveTable;