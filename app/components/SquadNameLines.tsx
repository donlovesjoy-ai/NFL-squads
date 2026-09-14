type SquadNameLinesProps={
  squadName:string
  nflName?:string|null
  prefix?:string
}

function squadNameParts(squadName:string,nflName?:string|null){
  const squadWords=String(squadName||'').trim().split(/\s+/).filter(Boolean)
  const nflWords=String(nflName||'').trim().split(/\s+/).filter(Boolean)

  let shared=0
  while(
    shared<squadWords.length &&
    shared<nflWords.length &&
    squadWords[shared].toLowerCase()===nflWords[shared].toLowerCase()
  ){
    shared++
  }

  if(shared>0 && shared<squadWords.length){
    return {
      area:squadWords.slice(0,shared).join(' '),
      nickname:squadWords.slice(shared).join(' ')
    }
  }

  if(squadWords.length<=1){
    return {area:squadWords[0]||'',nickname:'\u00a0'}
  }

  return {
    area:squadWords[0],
    nickname:squadWords.slice(1).join(' ')
  }
}

export default function SquadNameLines({
  squadName,
  nflName,
  prefix
}:SquadNameLinesProps){
  const name=squadNameParts(squadName,nflName)

  return (
    <span
      style={{
        display:'inline-flex',
        flexDirection:'column',
        alignItems:'center',
        minWidth:0,
        lineHeight:1.05,
        textAlign:'center'
      }}
    >
      <span style={{display:'block',whiteSpace:'nowrap'}}>
        {prefix ? `${prefix} ` : ''}{name.area}
      </span>
      <span style={{display:'block',whiteSpace:'nowrap'}}>
        {name.nickname}
      </span>
    </span>
  )
}
