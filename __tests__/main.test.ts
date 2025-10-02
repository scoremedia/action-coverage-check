import {computeCoverageXML} from '../src/computeCoverageXML'

test('fails if coverage report path is invalid', async () => {
  const input = ''
  await expect(computeCoverageXML(input, '')).rejects.toThrow(
    "ENOENT: no such file or directory, open ''"
  )
})
