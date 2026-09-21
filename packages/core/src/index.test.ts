import { describe, expect, it } from 'vitest'

import { PACKAGE_NAME } from './index.js'

describe('toolchain', () => {
  it('resolves workspace modules through the configured TypeScript setup', () => {
    expect(PACKAGE_NAME).toBe('@preflight/core')
  })
})
