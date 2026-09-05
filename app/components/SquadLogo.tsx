type SquadLogoProps={
  logoPath?:string|null
  nflAbbreviation?:string|null
  squadName?:string|null
  size?:number
}

function customLogoUrl(
  logoPath:string
){
  const base=
    process.env
      .NEXT_PUBLIC_SUPABASE_URL

  if(!base){
    return ''
  }

  const encodedPath=
    logoPath
      .split('/')
      .map(
        part=>
          encodeURIComponent(part)
      )
      .join('/')

  return (
    `${base}/storage/v1/object/public/squad-logos/${encodedPath}`
  )
}

function helmetAbbreviation(
  nflAbbreviation?:string|null
){
  if(!nflAbbreviation){
    return null
  }

  return nflAbbreviation==='WAS'
    ? 'WSH'
    : nflAbbreviation
}

export default function SquadLogo({
  logoPath,
  nflAbbreviation,
  squadName,
  size=64
}:SquadLogoProps){
  const helmetCode=helmetAbbreviation(nflAbbreviation)

  const src=
    logoPath
      ? customLogoUrl(
          logoPath
        )
      : helmetCode
        ? `/helmets/${helmetCode}.png`
        : null

  if(!src){
    return null
  }

  return (
    <img
      src={src}
      alt={
        squadName
          ? `${squadName} logo`
          : 'Squad logo'
      }
      width={size}
      height={size}
      style={{
        width:size,
        height:size,
        objectFit:'contain',
        display:'block',
        flexShrink:0
      }}
    />
  )
}
