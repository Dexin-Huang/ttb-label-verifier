import { describe, expect, it } from 'vitest';
import {
  matchBatchFiles,
  parseBatchManifest,
  validateBatchLabelFiles,
} from '@/lib/batch-upload';

describe('parseBatchManifest', () => {
  it('parses a valid manifest row into an application record', async () => {
    const file = new File(
      [
        [
          'external_reference,label_filename,beverage_type,brand_name,class_type,alcohol_content,net_contents,bottler_name_address,country_of_origin,requires_government_warning',
          'SAMPLE-001,label.png,distilled_spirits,GOOD TIMES,STRAIGHT RYE WHISKEY,57.5% ALC./VOL. 115 PROOF,750ML,"WHISKEY THIEF DISTILLING CO. FRANKFORT, KENTUCKY, USA",,true',
        ].join('\n'),
      ],
      'manifest.csv',
      { type: 'text/csv' }
    );

    const result = await parseBatchManifest(file);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      application: {
        beverage_type: 'distilled_spirits',
        brand_name: 'GOOD TIMES',
      },
      external_reference: 'SAMPLE-001',
      label_filename: 'label.png',
      row_number: 1,
    });
  });
});

describe('matchBatchFiles', () => {
  it('matches files by label filename and reports extras', () => {
    const manifestItems = [
      {
        application: {
          alcohol_content: '45% Alc./Vol. (90 Proof)',
          beverage_type: 'distilled_spirits' as const,
          bottler_name_address: 'Old Tom Distillery, Bardstown, KY',
          brand_name: 'OLD TOM',
          class_type: 'Bourbon Whiskey',
          country_of_origin: '',
          net_contents: '750 mL',
          requires_government_warning: true,
        },
        external_reference: 'EXT-1',
        label_filename: 'Label-One.PNG',
        row_number: 1,
      },
    ];

    const files = [
      new File(['a'], 'label-one.png', { type: 'image/png' }),
      new File(['b'], 'extra.pdf', { type: 'application/pdf' }),
    ];

    const result = matchBatchFiles(manifestItems, files);

    expect(result.missingFilenames).toEqual([]);
    expect(result.extraFiles.map((file) => file.name)).toEqual(['extra.pdf']);
    expect(result.filesByLabelFilename.get('Label-One.PNG')?.name).toBe('label-one.png');
  });
});

describe('validateBatchLabelFiles', () => {
  it('rejects unsupported file types', () => {
    expect(() =>
      validateBatchLabelFiles([new File(['bad'], 'notes.txt', { type: 'text/plain' })])
    ).toThrow('Use PNG, JPG, or PDF label files for batch review.');
  });
});
