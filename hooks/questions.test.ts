import { describe, expect, test } from 'claude-code/testing'

import { questionsOf, segmentsOf } from './questions'

describe('questionsOf', () => {
  test('plan approval after verify output is found', async () => {
    const text = [
      'verify.sh output:',
      '```\nok 1?\n```',
      '🧠 Why did it pass?',
      'Approve the plan? Reply "yes" to proceed.',
    ].join('\n\n')
    expect(questionsOf(text)).toEqual([])
    const asking = text + '\n\nShall I push this to master?'
    expect(questionsOf(asking)).toEqual(['Shall I push this to master?'])
  })

  test('marker and following options join one question', async () => {
    const text = 'Done.\n\n❓ Which one:\n\n1. A\n2. B\n\nTail.'
    expect(segmentsOf(text).map(s => s.isQuestion)).toEqual([false, true, false])
    expect(questionsOf(text)).toEqual(['❓ Which one:\n\n1. A\n2. B'])
  })

  test('bold question counts, list item alone does not', async () => {
    expect(questionsOf('**Go ahead?**')).toEqual(['**Go ahead?**'])
    expect(questionsOf('- is this a list?')).toEqual([])
  })
})
