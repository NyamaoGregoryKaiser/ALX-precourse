import { parse } from 'csv-parse';
import fs from 'fs';
import { Readable } from 'stream';

export interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'unknown';
}

/**
 * Infer the type of a value.
 */
function inferType(value: string): ColumnSchema['type'] {
  if (value === null || value === undefined || value.trim() === '') {
    return 'unknown';
  }
  if (!isNaN(Number(value)) && !isNaN(parseFloat(value))) {
    return 'number';
  }
  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
    return 'boolean';
  }
  if (!isNaN(new Date(value).getTime())) {
    return 'date';
  }
  return 'string';
}

/**
 * Parses a CSV stream to extract headers and infer column types.
 * @param stream The readable stream of the CSV file.
 * @returns A promise resolving to an array of ColumnSchema.
 */
export async function parseCsvSchema(stream: Readable): Promise<ColumnSchema[]> {
  return new Promise((resolve, reject) => {
    const parser = parse({
      delimiter: ',',
      columns: true, // Treat the first row as headers
      trim: true,
      skip_empty_lines: true,
      on_record: (record, { lines }) => {
        // Only process the first few lines to infer schema for performance
        return lines <= 100 ? record : null;
      }
    });

    let headers: string[] | null = null;
    const sampleValues: { [key: string]: string[] } = {};

    stream
      .pipe(parser)
      .on('readable', function () {
        let record;
        while ((record = this.read()) !== null) {
          if (!headers) {
            headers = Object.keys(record);
            headers.forEach(h => (sampleValues[h] = []));
          }
          headers.forEach(h => {
            if (sampleValues[h].length < 10) { // Collect up to 10 samples per column
              sampleValues[h].push(record[h]);
            }
          });
        }
      })
      .on('end', () => {
        if (!headers) {
          return reject(new Error('CSV is empty or has no headers.'));
        }

        const schema: ColumnSchema[] = headers.map((header) => {
          let inferredType: ColumnSchema['type'] = 'unknown';
          if (sampleValues[header] && sampleValues[header].length > 0) {
            // Infer type based on the first non-empty value
            const firstValidValue = sampleValues[header].find(v => v !== null && v !== undefined && v.trim() !== '');
            if (firstValidValue) {
              inferredType = inferType(firstValidValue);
            }
          }
          return { name: header, type: inferredType };
        });
        resolve(schema);
      })
      .on('error', reject);
  });
}


/**
 * Parses a CSV stream into an array of objects.
 * @param stream The readable stream of the CSV file.
 * @returns A promise resolving to an array of parsed CSV rows.
 */
export async function parseCsvData(stream: Readable): Promise<object[]> {
  return new Promise((resolve, reject) => {
    const records: object[] = [];
    const parser = parse({
      delimiter: ',',
      columns: true, // Treat the first row as headers
      trim: true,
      skip_empty_lines: true,
    });

    stream
      .pipe(parser)
      .on('readable', function () {
        let record;
        while ((record = this.read()) !== null) {
          records.push(record);
        }
      })
      .on('end', () => {
        resolve(records);
      })
      .on('error', reject);
  });
}
```