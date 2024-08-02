import {Annotation, computeCoverage} from '../src/computeCoverage'
import { promises as fsPromises } from 'fs';

test('fails if coverage report path is invalid', async () => {
  const input = ''
  const input1 = ''
  await expect(computeCoverage(input, input1)).rejects.toThrow(
    'Unexpected token u in JSON at position 0'
  )
})

// Mocking the fsPromises.readFile function
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

describe('computeCoverage', () => {
  it('should compute coverage annotations', async () => {
    // Arrange
    const mockCoverageReportPath = 'mock/coverageReport.json';
    const mockBaseCoverageReportPath = 'mock/baseCoverageReport.json';

    // Sample mock data
    const mockCoverageData = {
      source_files: [
        {
          name: 'mockFile1.ts',
          coverage: [null, 1, 1, 0, 1, null, null],
          source: 'abc',
        },
        {
          name: 'mockFile2.ts',
          coverage: [null, 1, 1, 1, 1, null, 1],
          source: 'abc1',
        },
        {
          name: 'mockFile3.ts',
          coverage: [null, 1, 1, 1, 1, null, 1],
          source: 'abc2',
        },
      ],
    };

    const mockBaseCoverageData = {
      source_files: [
          {
          name: 'mockFile1.ts',
          coverage: [null, 1, 1, 0, 0, null, null],
            source: 'abc',
        },
        {
          name: 'mockFile2.ts',
          coverage: [null, 1, 1, 1, 1, null, 1],
          source: 'abc1',
        },
      ],
    };

    const mockFsPromises = fsPromises as jest.Mocked<typeof fsPromises>;
    mockFsPromises.readFile.mockResolvedValueOnce(JSON.stringify(mockCoverageData));
    mockFsPromises.readFile.mockResolvedValueOnce(JSON.stringify(mockBaseCoverageData));

    // Act
    const result: Annotation[] = await computeCoverage(mockCoverageReportPath, mockBaseCoverageReportPath);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('mockFile1.ts');
    expect(result[0].start_line).toBe(1);
    expect(result[0].end_line).toBe(1);
    expect(result[0].annotation_level).toBe('failure');
    expect(result[0].message).toContain('Coverage dropped to');
  });
});
