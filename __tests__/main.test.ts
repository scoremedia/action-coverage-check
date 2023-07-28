import {computeCoverage} from '../src/computeCoverage'

test('fails if coverage report path is invalid', async () => {
  const input = ''
  const input1 = ''
  await expect(computeCoverage(input, input1)).rejects.toThrow(
    'coverage report path is empty'
  )
})
