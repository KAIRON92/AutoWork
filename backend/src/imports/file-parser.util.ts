export interface ParsedFileData {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  detectedMapping: Record<string, string>;
}

export class FileParserUtil {
  /**
   * Automatically guesses which file column corresponds to target contact fields
   */
  static detectColumnMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {
      email: '',
      firstName: '',
      lastName: '',
      fullName: '',
      company: '',
      phone: '',
      target: '',
      description: '',
    };

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const h of headers) {
      const norm = normalize(h);

      if (!mapping.email && (norm === 'email' || norm === 'emailaddress' || norm === 'mail' || norm.includes('email'))) {
        mapping.email = h;
      } else if (!mapping.firstName && (norm === 'firstname' || norm === 'fname' || norm === 'first' || norm === 'givenname')) {
        mapping.firstName = h;
      } else if (!mapping.lastName && (norm === 'lastname' || norm === 'lname' || norm === 'last' || norm === 'surname')) {
        mapping.lastName = h;
      } else if (!mapping.fullName && (norm === 'name' || norm === 'fullname' || norm === 'contactname')) {
        mapping.fullName = h;
      } else if (!mapping.company && (norm.startsWith('company') || norm.includes('company') || norm === 'organization' || norm === 'org' || norm === 'business' || norm === 'account')) {
        mapping.company = h;
      } else if (!mapping.phone && (norm === 'phone' || norm === 'phonenumber' || norm === 'mobile' || norm === 'tel')) {
        mapping.phone = h;
      } else if (!mapping.target && (norm === 'target' || norm === 'division' || norm === 'industry' || norm === 'segment')) {
        mapping.target = h;
      } else if (!mapping.description && (norm === 'description' || norm === 'notes' || norm === 'message')) {
        mapping.description = h;
      }
    }

    return mapping;
  }

  /**
   * Parse CSV, TXT (tab or comma separated), or structured lines
   */
  static parseTextOrCsv(content: string): ParsedFileData {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      return { headers: [], rows: [], totalRows: 0, detectedMapping: {} };
    }

    // Determine delimiter (comma, semicolon, tab, or pipe)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
    else if (firstLine.includes('|') && !firstLine.includes(',')) delimiter = '|';

    const parseLine = (line: string): string[] => {
      const values: string[] = [];
      let current = '';
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          insideQuotes = !insideQuotes;
        } else if (char === delimiter && !insideQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ''));
      return values;
    };

    const headers = parseLine(lines[0]);
    const detectedMapping = this.detectColumnMapping(headers);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.every((v) => v === '')) continue; // Skip blank rows
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      rows.push(rowObj);
    }

    return {
      headers,
      rows,
      totalRows: rows.length,
      detectedMapping,
    };
  }
}
