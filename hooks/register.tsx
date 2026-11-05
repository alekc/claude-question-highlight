import { atom, read, update } from 'claude-code'
import type { Register, RenderChildren } from 'claude-code'

import { MARKER, questionsOf, segmentsOf } from './questions'

const pending = atom({ plugin: 'question-highlight', key: 'pending' } as const, [] as string[])

const COLOR = 'warning'

export const register: Register = on => {
  // Main-loop reply text of the current turn, so a question asked before a
  // Stop hook blocked and the turn carried on is not lost.
  let buf = ''

  on('prompt.submit', async ($, e, next) => {
    buf = ''
    await update($, pending, () => [])
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId) return yield* next(e)
    let block = -1
    for await (const c of next(e)) {
      if (c.kind === 'text') {
        if (c.index !== block) {
          buf += '\n\n'
          block = c.index
        }
        buf += c.text
      }
      yield c
    }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) return next(e)
    const asked = questionsOf(buf.trim() ? buf : e.answer)
    buf = ''
    if (asked.length > 0) await update($, pending, () => asked)
    return next(e)
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary) return next(e)
    const segments = segmentsOf(e.props.text)
    if (!segments.some(s => s.isQuestion)) return next(e)

    const { Box, Markdown } = $.ui.resolve(e)
    const boxed = (key: string, child: RenderChildren) => (
      <Box key={key} borderStyle="round" borderColor={COLOR} paddingX={1}>
        {child}
      </Box>
    )

    const [first, ...rest] = segments
    if (!first) return next(e)
    const head = await next({ ...e, props: { ...e.props, text: first.text } })
    return (
      <Box flexDirection="column">
        {first.isQuestion ? boxed('q0', head) : head}
        {rest.map((s, i) =>
          s.isQuestion ? (
            <Box key={`s${i}`} marginLeft={2}>
              {boxed(`q${i + 1}`, <Markdown text={s.text} />)}
            </Box>
          ) : (
            <Box key={`s${i}`} marginLeft={2}>
              <Markdown text={s.text} />
            </Box>
          ),
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const asked = await read($, pending)
    if (e.props.hasSurvey || e.props.isWorking || asked.length === 0) return next(e)

    const { Box, Button, Markdown, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={COLOR} paddingX={1}>
        <Box justifyContent="space-between">
          <Text bold color={COLOR}>
            {MARKER} Waiting on your answer
          </Text>
          <Button key="dismiss" label="Dismiss" onPress={() => update($, pending, () => [])} />
        </Box>
        <Markdown text={asked.join('\n\n')} />
      </Box>
    )
  })
}
