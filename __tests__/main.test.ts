import {computeCoverage} from '../src/computeCoverage'

test('fails if coverage report path is invalid', async () => {
    const input = ''
    await expect(computeCoverage(input)).rejects.toThrow('coverage report path is empty')
})