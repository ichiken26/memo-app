import { mediaNotation } from '~~/shared/markdown'
export const useMemoFormatting = (body: Ref<string>, textarea: Ref<HTMLTextAreaElement | null>) => {
  const replaceSelection = (before:string, after=before, placeholder='テキスト') => {
    const el=textarea.value;if(!el)return
    const start=el.selectionStart,end=el.selectionEnd,selection=body.value.slice(start,end)||placeholder
    body.value=body.value.slice(0,start)+before+selection+after+body.value.slice(end)
    nextTick(()=>{el.focus();el.setSelectionRange(start+before.length,start+before.length+selection.length)})
  }
  const format=(kind:'bold'|'italic'|'red')=> kind==='bold'?replaceSelection('**'):kind==='italic'?replaceSelection('*'):replaceSelection('==','=={red}')
  const insertMedia=(type:'img'|'link',label:string,url:string)=>{
    const el=textarea.value;if(!el)return
    const start=el.selectionStart,notation=mediaNotation(type,label,url)
    body.value=body.value.slice(0,start)+notation+body.value.slice(el.selectionEnd)
    nextTick(()=>{const pos=start+notation.length;el.focus();el.setSelectionRange(pos,pos)})
  }
  return { format, insertMedia, replaceSelection }
}
