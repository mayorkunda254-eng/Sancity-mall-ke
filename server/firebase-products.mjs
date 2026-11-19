const database='projects/sancity-mall-ke/databases/(default)/documents'
const apiKey='AIzaSyBs4dmOpKFcwxvOPhk5vXCFXUBaOeTJtOk'
function unpack(value) {
  if (!value) return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) return (value.arrayValue.values||[]).map(unpack)
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([k,v])=>[k,unpack(v)]))
  throw new Error('Unexpected Firestore value type')
}
export async function fetchFirebaseProductsForBuild() {
  const endpoint='https://firestore.googleapis.com/v1/'+database+':runQuery?key='+encodeURIComponent(apiKey)
  const payload={structuredQuery:{
    from:[{collectionId:'products'}],
    where:{fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'published'}}},
    limit:1200
  }}
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)})
  if(!response.ok)throw new Error('Firebase catalogue query failed HTTP '+response.status+': '+(await response.text()).slice(0,260))
  const rows=await response.json()
  const products=rows.filter(x=>x.document).map(x=>({
    id:x.document.name.split('/').at(-1),
    ...Object.fromEntries(Object.entries(x.document.fields||{}).map(([k,v])=>[k,unpack(v)]))
  }))
  if(products.length===1200)throw new Error('Firebase catalogue limit reached; add pagination')
  return products.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))
}
