import test from 'node:test'
import assert from 'node:assert/strict'
import { findMediaSpacingWarnings, mediaNotation, parseMemo, safeUrl } from '../shared/markdown'
test('unsafe protocols and HTML are not emitted',()=>{assert.equal(safeUrl('javascript:alert(1)'),null);assert.match((parseMemo('<script>x</script>')[0] as {content:string}).content,/&lt;script&gt;/)})
test('custom media blocks are parsed',()=>{assert.equal(parseMemo('![img]{alt}(https://example.com/a.png)')[0]?.type,'image');assert.equal(parseMemo('![link]{site}(https://example.com)')[0]?.type,'link')})
test('spacing warnings identify adjacent content',()=>{assert.deepEqual(findMediaSpacingWarnings('text\n![img]{a}(https://e.test/a.png)'),[2]);assert.deepEqual(findMediaSpacingWarnings('\n![img]{a}(https://e.test/a.png)\n'),[])})
test('notation surrounds media with blank lines',()=>assert.equal(mediaNotation('link','x','https://e.test'),'\n\n![link]{x}(https://e.test)\n\n'))
test('headings, lists and quotes render safely',()=>{const result=parseMemo('# title\n\n- item\n\n> quote');assert.match((result[0] as {content:string}).content,/<h1>/);assert.match((result[1] as {content:string}).content,/<ul>/);assert.match((result[2] as {content:string}).content,/<blockquote>/)})
