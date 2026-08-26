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

export default function SquadLogo({
  logoPath,
  nflAbbreviation,
  squadName,
  size=64
}:SquadLogoProps){
  const src=
    logoPath
      ? customLogoUrl(
          logoPath
        )
      : nflAbbreviation
        ? `/helmets/${nflAbbreviation}.png`
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