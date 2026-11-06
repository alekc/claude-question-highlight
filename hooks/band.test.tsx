import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

type Engine = Parameters<TestBody>[0]
type On = Parameters<TestBody>[1]

const BAND = {
  plugin: 'question-highlight',
  component: 'AbovePrompt',
  surface: 'terminal',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const turn = (answer: string, turnId: string) => ({
  answer,
  durationMs: 1,
  isAborted: false,
  turnId,
  reason: 'answer' as const,
})

const prompt = (text: string) => ({ text, wait: false, origin: { kind: 'composer' as const } })

// Runs one turn whose steps answer with the given texts, as a Stop hook
// block makes a turn take more than one model request.
const steps = async (
  $: Engine,
  on: On,
  texts: string[],
) => {
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.step', async function* (_, e) {
    const text = texts[e.index] ?? ''
    if (text) yield { kind: 'text' as const, index: 0, text }
    return { turnId: e.turnId, index: e.index, answer: text, toolUses: [], stopReason: 'end_turn' as const, usage: null }
  })
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.prompt.submit(prompt('go'))
  for (const [index] of texts.entries()) {
    const run = $.turn.step({ turnId: 't1', index, model: 'opus', messageCount: 1 })
    for await (const _ of run);
  }
  await $.turn.complete(turn(texts.at(-1) ?? '', 't1'))
}

const banded = async ($: Engine) => {
  const ui = await $.ui.mount(BAND)
  const text = (await ui.find({ type: 'Markdown' }))?.text
  await ui.unmount()
  return text
}

test('a question restated after a Stop hook block shows once', async ($, on) => {
  await steps($, on, ['Done.\n\n❓ Shall I push items 1 and 4?', '', 'Logged.\n\n❓ Shall I push item 1 and item 4?'])
  expect(await banded($)).toBe('❓ Shall I push item 1 and item 4?')
})

test('a question asked before a block survives a step that asks nothing', async ($, on) => {
  await steps($, on, ['❓ Shall I push?', 'Updated the brain page.'])
  expect(await banded($)).toBe('❓ Shall I push?')
})

test('the band comes back for a new question after Dismiss', async ($, on) => {
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.prompt.submit(prompt('go'))
  await $.turn.complete(turn('❓ First question?', 't1'))
  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Markdown', text: /First/ }))?.text).toContain('First')
  await ui.press({ key: 'dismiss' })
  await ui.unmount()

  ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /Waiting/ })).toBeUndefined()
  await ui.unmount()

  await $.prompt.submit(prompt('answer'))
  await $.turn.complete(turn('❓ Second question?', 't2'))
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Markdown', text: /Second/ }))?.text).toContain('Second')
  await ui.unmount()
})
