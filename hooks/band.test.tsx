import { expect, test } from 'claude-code/testing'

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
  reason: 'end_turn' as const,
})

test('the band comes back for a new question after Dismiss', async ($, on) => {
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.prompt.submit({ text: 'go' })
  await $.turn.complete(turn('❓ First question?', 't1'))
  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Markdown', text: /First/ }))?.text).toContain('First')
  await ui.press({ key: 'dismiss' })
  await ui.unmount()

  ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /Waiting/ })).toBeUndefined()
  await ui.unmount()

  await $.prompt.submit({ text: 'answer' })
  await $.turn.complete(turn('❓ Second question?', 't2'))
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Markdown', text: /Second/ }))?.text).toContain('Second')
  await ui.unmount()
})
