import { describe, expect, it } from 'vitest';
import {
  matchBatchFiles,
  parseBatchManifest,
  type BatchManifestItem,
} from '@/lib/batch-upload';

describe('batch upload helpers', () => {
  it('parses a valid CSV manifest row into a batch manifest item', async () => {
    const csv = [
      'brand_name,beverage_type,class_type,alcohol_content,net_contents,bottler_name_address,country_of_origin,requires_government_warning,label_filename',
      'GOOD TIMES,distilled_spirits,STRAIGHT RYE WHISKEY,57.5% ALC./VOL. 115 PROOF,750ML,"BOTTLED BY WHISKEY THIEF DISTILLING CO. FRANKFORT, KENTUCKY, USA",,yes,good-times.png',
    ].join('\n');

    const manifest = new File([csv], 'manifest.csv', { type: 'text/csv' });
    const items = await parseBatchManifest(manifest);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      application: {
        beverage_type: 'distilled_spirits',
        brand_name: 'GOOD TIMES',
        requires_government_warning: true,
      },
      label_filename: 'good-times.png',
      row_number: 1,
    });
  });

  it('matches uploaded label files case-insensitively and reports extras', () => {
    const manifestItems: BatchManifestItem[] = [
      {
        application: {
          alcohol_content: '57.5% ALC./VOL. 115 PROOF',
          beverage_type: 'distilled_spirits',
          bottler_name_address:
            'BOTTLED BY WHISKEY THIEF DISTILLING CO. FRANKFORT, KENTUCKY, USA',
          brand_name: 'GOOD TIMES',
          class_type: 'STRAIGHT RYE WHISKEY',
          country_of_origin: '',
          net_contents: '750ML',
          requires_government_warning: true,
        },
        external_reference: null,
        label_filename: 'GOOD-TIMES.PNG',
        row_number: 1,
      },
    ];

    const files = [
      new File(['label'], 'good-times.png', { type: 'image/png' }),
      new File(['extra'], 'extra-label.png', { type: 'image/png' }),
    ];

    const matched = matchBatchFiles(manifestItems, files);

    expect(matched.filesByLabelFilename.get('GOOD-TIMES.PNG')?.name).toBe('good-times.png');
    expect(matched.missingFilenames).toEqual([]);
    expect(matched.extraFiles.map((file) => file.name)).toEqual(['extra-label.png']);
  });
});
