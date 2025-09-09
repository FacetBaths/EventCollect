import fs from 'fs';
import csv from 'csv-parser';

export interface FacebookCsvLeadRow {
  Created?: string;
  Name?: string;
  Email?: string;
  Source?: string;
  Form?: string;
  Channel?: string;
  Stage?: string;
  Owner?: string;
  Labels?: string;
  Phone?: string;
  'Secondary Phone Number'?: string;
  'WhatsApp Number'?: string;
}

export interface ParsedLead {
  fullName: string;
  email: string;
  phone: string;
  address: { street: string; city: string; state: string; zipCode: string };
  servicesOfInterest: string[];
  tempRating?: number;
  notes?: string;
  wantsAppointment: boolean;
  appointmentDetails?: { preferredDate: string; preferredTime: string; notes?: string };
  eventName?: string;
  referredBy?: string;
  referred_by_type?: string;
  referred_by_id?: number;
  referred_by_note?: string;
}

function normalizePhone(phone?: string): string {
  if (!phone) return '';
  // Remove non-digits, keep leading + if present
  const hasPlus = phone.trim().startsWith('+');
  const digits = phone.replace(/[^0-9]/g, '');
  return hasPlus ? `+${digits}` : digits;
}

export async function parseFacebookCsv(filePath: string): Promise<ParsedLead[]> {
  return new Promise((resolve, reject) => {
    const results: ParsedLead[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row: FacebookCsvLeadRow) => {
        try {
          const fullName = (row.Name || '').trim();
          const email = (row.Email || '').trim().toLowerCase();
          const phone = normalizePhone(row.Phone || row['Secondary Phone Number'] || row['WhatsApp Number']);

          if (!fullName && !email && !phone) {
            return; // skip empty rows
          }

          const parsed: ParsedLead = {
            fullName,
            email: email || 'unknown@example.com',
            phone: phone || '0000000000',
            address: { street: '', city: '', state: '', zipCode: '' },
            servicesOfInterest: [],
            wantsAppointment: false,
            tempRating: undefined,
            notes: `Imported from Facebook on ${row.Created || ''} | Source: ${row.Source || ''} | Channel: ${row.Channel || ''}`.trim(),
            eventName: 'Facebook Lead Ad',
            referredBy: 'Facebook',
            referred_by_type: 'Marketing',
            referred_by_id: 20, // Example: 20 = Facebook (adjust per your LEAP config)
            referred_by_note: (row.Form || 'Facebook Lead Form')?.toString().slice(0, 200),
          };

          results.push(parsed);
        } catch (e) {
          // skip bad row, continue
        }
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}
