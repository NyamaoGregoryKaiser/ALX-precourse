import fs from 'fs';
import { parse } from 'csv-parse';

export const parseCsvFile = (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        return reject(err);
      }
      parse(data, {
        columns: true, // Treat the first row as column names
        skip_empty_lines: true,
      }, (err, records) => {
        if (err) {
          return reject(err);
        }
        resolve(records);
      });
    });
  });
};