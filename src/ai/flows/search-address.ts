'use server';
/**
 * @fileOverview Flow to search for an address using OpenStreetMap Nominatim.
 *
 * - searchAddress - A function that searches for an address.
 * - SearchAddressInput - The input type for the searchAddress function.
 * - SearchAddressOutput - The return type for the searchAddress function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SearchAddressInputSchema = z.object({
  query: z.string().min(3).describe('Адресный запрос для поиска.'),
});
export type SearchAddressInput = z.infer<typeof SearchAddressInputSchema>;

const SearchAddressOutputSchema = z.array(z.string()).describe('Список подходящих адресных предложений.');
export type SearchAddressOutput = z.infer<typeof SearchAddressOutputSchema>;

export async function searchAddress(input: SearchAddressInput): Promise<SearchAddressOutput> {
  return searchAddressFlow(input);
}

const searchAddressFlow = ai.defineFlow(
  {
    name: 'searchAddressFlow',
    inputSchema: SearchAddressInputSchema,
    outputSchema: SearchAddressOutputSchema,
  },
  async ({ query }) => {
    // Using OpenStreetMap Nominatim API - free, no API key needed, but has usage policies.
    // See: https://operations.osmfoundation.org/policies/nominatim/
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Чеченская Республика')}&countrycodes=ru&limit=20&addressdetails=1`;
    
    try {
      const response = await fetch(url, {
        headers: {
            // OSM requires a descriptive User-Agent.
            'User-Agent': 'BystryiKurierApp/1.0 (Firebase Studio Demo; mail@example.com)'
        }
      });
      if (!response.ok) {
        console.error('Error fetching from Nominatim:', response.statusText);
        return [];
      }
      const data = await response.json();
      
      // We expect an array of objects with a 'display_name' property
      if (Array.isArray(data)) {
        return data
          .map((item: any) => item.display_name)
          .filter(Boolean);
      }
      
      return [];
    } catch (error) {
      console.error('Error in searchAddressFlow:', error);
      return [];
    }
  }
);
