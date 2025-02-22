/* eslint-env jest */
import { sandbox } from 'development-sandbox'
import { FileRef, nextTestSetup } from 'e2e-utils'
import path from 'path'
import { outdent } from 'outdent'

// TODO: figure out why snapshots mismatch on GitHub actions
// specifically but work in docker and locally
describe.skip('ReactRefreshLogBox scss app', () => {
  const { next } = nextTestSetup({
    files: new FileRef(path.join(__dirname, 'fixtures', 'default-template')),
    dependencies: {
      sass: 'latest',
      react: '19.0.0-beta-04b058868c-20240508',
      'react-dom': '19.0.0-beta-04b058868c-20240508',
    },
    skipStart: true,
  })

  test('scss syntax errors', async () => {
    const { session, cleanup } = await sandbox(next)

    await session.write('index.module.scss', `.button { font-size: 5px; }`)
    await session.patch(
      'index.js',
      outdent`
        import './index.module.scss';
        export default () => {
          return (
            <div>
              <p>Hello World</p>
            </div>
          )
        }
      `
    )

    expect(await session.hasRedbox()).toBe(false)

    // Syntax error
    await session.patch('index.module.scss', `.button { font-size: :5px; }`)
    expect(await session.hasRedbox()).toBe(true)
    const source = await session.getRedboxSource()
    expect(source).toMatchSnapshot()

    // Fix syntax error
    await session.patch('index.module.scss', `.button { font-size: 5px; }`)
    expect(await session.hasRedbox()).toBe(false)

    await cleanup()
  })

  test('scss module pure selector error', async () => {
    const { session, cleanup } = await sandbox(next)

    await session.write('index.module.scss', `.button { font-size: 5px; }`)
    await session.patch(
      'index.js',
      outdent`
        import './index.module.scss';
        export default () => {
          return (
            <div>
              <p>Hello World</p>
            </div>
          )
        }
      `
    )

    // Checks for selectors that can't be prefixed.
    // Selector "button" is not pure (pure selectors must contain at least one local class or id)
    await session.patch('index.module.scss', `button { font-size: 5px; }`)
    expect(await session.hasRedbox()).toBe(true)
    const source2 = await session.getRedboxSource()
    expect(source2).toMatchSnapshot()

    await cleanup()
  })
})
