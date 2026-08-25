 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import KickoffCountdown from '../components/KickoffCountdown'

function fmtSpread(n:any){
  if(n===null || n===undefined) return 'Line pending'

  const x=Number(n)

  if(x===0) return 'PK'

  return x>0
    ? `+${x}`
    : `${x}`
}

function formatChatTime(value:string){
  return new Date(value).toLocaleString('en-US',{
    timeZone:'America/New_York',
    month:'short',
    day:'numeric',
    hour:'numeric',
    minute:'2-digit'
  })
}

function ordinal(n:number){
  const mod100=n%100

  if(mod100>=11 && mod100<=13){
    return `${n}th`
  }

  switch(n%10){
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

function sameStanding(a:any,b:any){
  return (
    a.wins===b.wins &&
    a.losses===b.losses &&
    a.pushes===b.pushes &&
    Number(a.ats_margin)===Number(b.ats_margin)
  )
}

export default async function Dashboard(){
  const supabase=await createClient()

  const {data:{user}}=await supabase.auth.getUser()

  if(!user){
    redirect('/login')
  }

  const {data:profile}=await supabase
    .from('users')
    .select('role')
    .eq('id',user.id)
    .maybeSingle()

  const commissioner=
    profile?.role==='commissioner'

  const {data:squad}=await supabase
    .from('squads')
    .select(`
      id,
      squad_name,
      division,
      nfl_team_id,
      nfl_teams(
        name,
        abbreviation
      )
    `)
    .eq('user_id',user.id)
    .eq('season_year',2026)
    .maybeSingle()

  let game:any=null
  let pick:any=null

  if(squad){
    const {data:games}=await supabase
      .from('games')
      .select(`
        id,
        nfl_week,
        kickoff_time,
        spread,
        total,
        status,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home:nfl_teams!games_home_team_id_fkey(
          name,
          abbreviation
        ),
        away:nfl_teams!games_away_team_id_fkey(
          name,
          abbreviation
        )
      `)
      .eq('season_year',2026)
      .or(
        `home_team_id.eq.${squad.nfl_team_id},away_team_id.eq.${squad.nfl_team_id}`
      )
      .neq('status','final')
      .order('nfl_week',{ascending:true})
      .order('kickoff_time',{ascending:true})
      .limit(1)

    game=games?.[0]||null

    if(game){
      const {data:p}=await supabase
        .from('picks')
        .select(`
          selection_team_id,
          result,
          ats_margin,
          is_locked,
          revealed,
          is_missed
        `)
        .eq('squad_id',squad.id)
        .eq('game_id',game.id)
        .maybeSingle()

      pick=p
    }
  }

  const {data:divisionNameRow}=squad
    ? await supabase
        .from('division_names')
        .select('division_name')
        .eq('season_year',2026)
        .eq('division',squad.division)
        .maybeSingle()
    : {data:null}

  const divisionTitle=
    divisionNameRow?.division_name ||
    (
      squad
        ? `Division ${squad.division}`
        : ''
    )

  const {data:standings}=await supabase
    .from('standings')
    .select(`
      wins,
      losses,
      pushes,
      ats_margin,
      squads!inner(
        id,
        squad_name,
        division
      )
    `)
    .eq('season_year',2026)

  const divRows=(standings||[])
    .filter(
      (r:any)=>
        r.squads?.division===squad?.division
    )
    .sort(
      (a:any,b:any)=>
        (b.wins-a.wins) ||
        (Number(b.ats_margin)-Number(a.ats_margin)) ||
        (a.squads.id-b.squads.id)
    )

  const rankedDivRows=divRows.map((row:any,index:number)=>{
    const previous=divRows[index-1]

    let rank=1

    if(index>0){
      if(sameStanding(row,previous)){
        rank=(divRows
          .slice(0,index)
          .findIndex((r:any)=>sameStanding(r,row))
        )+1
      }else{
        rank=index+1
      }
    }

    const tied=
      divRows.some(
        (other:any)=>
          other.squads.id!==row.squads.id &&
          sameStanding(other,row)
      )

    return {
      ...row,
      displayRank:rank,
      tied
    }
  })

  const myStanding:any=rankedDivRows
    .find(
      (r:any)=>
        r.squads?.id===squad?.id
    )

  const myPlace=
    myStanding
      ? `${myStanding.tied?'T-':''}${ordinal(myStanding.displayRank)}`
      : null

  const homeSpread=
    game?.spread===null ||
    game?.spread===undefined
      ? null
      : Number(game.spread)

  const awaySpread=
    homeSpread===null
      ? null
      : -homeSpread

  const ownSpread=
    game &&
    squad?.nfl_team_id===game.home_team_id
      ? homeSpread
      : awaySpread

  const ownTeamName=
    (squad as any)?.nfl_teams?.name || 'Team'

  const {data:chatMessages}=await supabase
    .from('chat_messages')
    .select(`
      id,
      message,
      is_commissioner,
      is_system,
      is_pinned,
      created_at,
      squads(
        squad_name,
        owner_name
      )
    `)
    .order(
      'is_pinned',
      {ascending:false}
    )
    .order(
      'pinned_at',
      {
        ascending:false,
        nullsFirst:false
      }
    )
    .order(
      'created_at',
      {ascending:false}
    )
    .limit(5)

  return (
    <main className="wrap">

      <div
        className="top"
        style={{
          justifyContent:'center',
          textAlign:'center'
        }}
      >
        <div>
          <div className="big">
            NFL SQUADS
          </div>

          <div className="muted">
            2026 Season
          </div>
        </div>
      </div>

      <Nav commissioner={commissioner}/>

      {commissioner && (
        <section
          className="card"
          style={{
            textAlign:'center',
            paddingTop:14,
            paddingBottom:14
          }}
        >
          <div
            style={{
              fontSize:'0.7rem',
              fontWeight:900,
              letterSpacing:'0.12em',
              textTransform:'uppercase',
              opacity:0.55,
              marginBottom:6
            }}
          >
            Commissioner
          </div>

          <div
            style={{
              display:'flex',
              justifyContent:'center',
              gap:14,
              flexWrap:'wrap',
              fontSize:'0.9rem'
            }}
          >
            <a href="/commissioner/setup">
              <b>League Setup</b>
            </a>

            <a href="/commissioner/live-feed">
              <b>Live Feed</b>
            </a>

            <a href="/commissioner/results">
              <b>Lines & Results</b>
            </a>
          </div>
        </section>
      )}

      <section
        className="card"
        style={{
          textAlign:'center',
          padding:'22px 16px'
        }}
      >
        <div
          style={{
            fontSize:'0.7rem',
            fontWeight:900,
            letterSpacing:'0.13em',
            textTransform:'uppercase',
            opacity:0.55,
            marginBottom:5
          }}
        >
          {game
            ? `Week ${game.nfl_week}`
            : 'Game Week'}
        </div>

        <h1
          style={{
            margin:'0 0 18px'
          }}
        >
          My Matchup
        </h1>

        {game ? (
          <>
            <div
              style={{
                display:'grid',
                gridTemplateColumns:'minmax(0,1fr) 42px minmax(0,1fr)',
                alignItems:'center',
                maxWidth:520,
                margin:'0 auto 18px',
                gap:4
              }}
            >
              <TeamDisplay
                abbreviation={game.away?.abbreviation}
                name={game.away?.name}
                label="Away"
              />

              <div
                style={{
                  textAlign:'center',
                  fontSize:'0.8rem',
                  fontWeight:900,
                  opacity:0.55
                }}
              >
                AT
              </div>

              <TeamDisplay
                abbreviation={game.home?.abbreviation}
                name={game.home?.name}
                label="Home"
              />
            </div>

            <div
              style={{
                maxWidth:520,
                margin:'0 auto',
                display:'grid',
                gridTemplateColumns:'repeat(2,minmax(0,1fr))',
                gap:10
              }}
            >
              <InfoBox
                label={`${ownTeamName} Line`}
                value={fmtSpread(ownSpread)}
              />

              <InfoBox
                label="Game Total"
                value={
                  game.total ??
                  'Pending'
                }
              />
            </div>

            <div
              style={{
                marginTop:18
              }}
            >
              <div
                style={{
                  fontSize:'0.7rem',
                  fontWeight:900,
                  letterSpacing:'0.1em',
                  textTransform:'uppercase',
                  opacity:0.55,
                  marginBottom:4
                }}
              >
                Kickoff
              </div>

              <div
                style={{
                  fontWeight:800,
                  marginBottom:8
                }}
              >
                {new Date(
                  game.kickoff_time
                ).toLocaleString(
                  'en-US',
                  {
                    timeZone:
                      'America/New_York',
                    month:'short',
                    day:'numeric',
                    hour:'numeric',
                    minute:'2-digit',
                    timeZoneName:'short'
                  }
                )}
              </div>

              <KickoffCountdown
                kickoffTime={
                  game.kickoff_time
                }
              />
            </div>
          </>
        ) : (
          <p className="muted">
            No upcoming game found.
          </p>
        )}
      </section>

      <div
        className="grid"
        style={{
          alignItems:'stretch'
        }}
      >

        <section
          className="card"
          style={{
            textAlign:'center'
          }}
        >
          <div
            style={{
              fontSize:'0.7rem',
              fontWeight:900,
              letterSpacing:'0.12em',
              textTransform:'uppercase',
              opacity:0.55,
              marginBottom:4
            }}
          >
            Franchise
          </div>

          <h2
            style={{
              marginTop:0
            }}
          >
            My Squad
          </h2>

          {squad && (
            <img
              src={`/helmets/${(squad as any)?.nfl_teams?.abbreviation}.png`}
              alt={`${(squad as any)?.nfl_teams?.name || 'NFL team'} logo`}
              width={120}
              height={120}
              style={{
                objectFit:'contain',
                display:'block',
                margin:'4px auto 8px'
              }}
            />
          )}

          <div
            className="big"
            style={{
              marginBottom:4
            }}
          >
            {squad?.squad_name ||
              'Not assigned yet'}
          </div>

          {squad ? (
            <>
              <div
                className="muted"
                style={{
                  marginBottom:16
                }}
              >
                {(squad as any)
                  ?.nfl_teams
                  ?.name || ''}
              </div>

              <div
                style={{
                  borderTop:
                    '1px solid rgba(120,120,120,0.22)',
                  paddingTop:14,
                  display:'grid',
                  gridTemplateColumns:'repeat(3,minmax(0,1fr))',
                  gap:6
                }}
              >
                <MiniStat
                  label="Place"
                  value={
                    myPlace ||
                    '—'
                  }
                />

                <MiniStat
                  label="Record"
                  value={
                    myStanding
                      ? `${myStanding.wins}-${myStanding.losses}-${myStanding.pushes}`
                      : '0-0-0'
                  }
                />

                <MiniStat
                  label="Margin"
                  value={
                    myStanding
                      ? `${
                          Number(
                            myStanding.ats_margin
                          )>0
                            ? '+'
                            : ''
                        }${myStanding.ats_margin}`
                      : '0'
                  }
                />
              </div>

              <div
                style={{
                  marginTop:14,
                  fontSize:'0.88rem',
                  fontWeight:800
                }}
              >
                {divisionTitle}
              </div>
            </>
          ) : (
            <p className="muted">
              Waiting for commissioner assignment.
            </p>
          )}
        </section>

        <section
          className="card"
          style={{
            textAlign:'center',
            display:'flex',
            flexDirection:'column'
          }}
        >
          <div
            style={{
              fontSize:'0.7rem',
              fontWeight:900,
              letterSpacing:'0.12em',
              textTransform:'uppercase',
              opacity:0.55,
              marginBottom:4
            }}
          >
            Game Week
          </div>

          <h2
            style={{
              marginTop:0
            }}
          >
            My Pick
          </h2>

          <div
            style={{
              margin:'14px auto 10px',
              width:78,
              height:78,
              borderRadius:'50%',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              border:
                pick &&
                !pick.is_missed
                  ? '3px solid #16803c'
                  : '3px solid rgba(120,120,120,0.35)',
              fontSize:'1.7rem',
              fontWeight:900
            }}
          >
            {pick &&
             !pick.is_missed
              ? '✓'
              : '?'}
          </div>

          <div
            className="big"
            style={{
              fontSize:'1.1rem',
              marginBottom:8
            }}
          >
            {pick && !pick.is_missed
              ? 'Pick Submitted'
              : 'Pick Needed'}
          </div>

          <p
            className="muted"
            style={{
              maxWidth:330,
              margin:'0 auto 16px',
              lineHeight:1.45
            }}
          >
            {pick?.is_locked
              ? 'Your pick is locked.'
              : game
                ? 'You may change your pick until one minute before kickoff.'
                : 'Waiting for your next matchup.'}
          </p>

          <div
            style={{
              marginTop:'auto'
            }}
          >
            {game &&
             !pick?.is_locked && (
              <a
                href="/my-pick"
                className="submit"
                style={{
                  display:'inline-block',
                  textDecoration:'none',
                  textAlign:'center',
                  minWidth:190
                }}
              >
                {pick &&
                 !pick.is_missed
                  ? 'Review / Update Pick →'
                  : 'MAKE MY PICK →'}
              </a>
            )}

            {pick?.is_locked && (
              <a href="/my-pick">
                <b>
                  View My Pick →
                </b>
              </a>
            )}
          </div>
        </section>

      </div>

      <section
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <div
          style={{
            fontSize:'0.7rem',
            fontWeight:900,
            letterSpacing:'0.12em',
            textTransform:'uppercase',
            opacity:0.55,
            marginBottom:4
          }}
        >
          Division Standings
        </div>

        <h2
          style={{
            marginTop:0
          }}
        >
          {divisionTitle}
        </h2>

        {rankedDivRows.length===0 ? (
          <p className="muted">
            Standings will appear
            after grading.
          </p>
        ) : (
          <div
            style={{
              overflowX:'auto'
            }}
          >
            <table
              style={{
                width:'100%',
                textAlign:'center'
              }}
            >
              <thead>
                <tr>
                  <th style={{textAlign:'center'}}>
                    Place
                  </th>

                  <th style={{textAlign:'center'}}>
                    Squad
                  </th>

                  <th style={{textAlign:'center'}}>
                    Record
                  </th>

                  <th style={{textAlign:'center'}}>
                    Margin
                  </th>
                </tr>
              </thead>

              <tbody>
                {rankedDivRows.map((r:any)=>{
                  const isMe=
                    r.squads?.id===squad?.id

                  return (
                    <tr
                      key={r.squads.id}
                      style={
                        isMe
                          ? {
                              fontWeight:800,
                              background:
                                'rgba(120,120,120,0.08)'
                            }
                          : undefined
                      }
                    >
                      <td style={{textAlign:'center'}}>
                        {r.tied?'T-':''}
                        {ordinal(r.displayRank)}
                      </td>

                      <td style={{textAlign:'center'}}>
                        <b>
                          {r.squads.squad_name}
                        </b>
                      </td>

                      <td style={{textAlign:'center'}}>
                        {r.wins}-{r.losses}-{r.pushes}
                      </td>

                      <td style={{textAlign:'center'}}>
                        {Number(r.ats_margin)>0?'+':''}
                        {r.ats_margin}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <div
          style={{
            fontSize:'0.7rem',
            fontWeight:900,
            letterSpacing:'0.12em',
            textTransform:'uppercase',
            opacity:0.55,
            marginBottom:4
          }}
        >
          League Activity
        </div>

        <h2
          style={{
            marginTop:0
          }}
        >
          League Chat
        </h2>

        {!chatMessages?.length ? (
          <p className="muted">
            No messages yet.
          </p>
        ) : (
          <div
            style={{
              maxWidth:760,
              margin:'0 auto',
              textAlign:'left'
            }}
          >
            {chatMessages.map(
              (m:any)=>{
                const chatSquad=m.squads

                const isSystem=
                  m.is_system===true

                const author=
                  isSystem
                    ? 'NFL SQUADS · League Update'
                    : chatSquad?.owner_name ||
                      chatSquad?.squad_name ||
                      (
                        m.is_commissioner
                          ? 'Commissioner'
                          : 'Owner'
                      )

                return (
                  <div
                    key={m.id}
                    style={{
                      padding:'12px 2px',
                      borderBottom:
                        '1px solid rgba(120,120,120,0.22)'
                    }}
                  >
                    {m.is_pinned && (
                      <div
                        style={{
                          fontWeight:800,
                          fontSize:'0.75rem',
                          marginBottom:5
                        }}
                      >
                        📌 Pinned Announcement
                      </div>
                    )}

                    <div>
                      <b>
                        {isSystem
                          ? '🏈 '
                          : ''}

                        {author}
                      </b>

                      {!isSystem &&
                       chatSquad?.squad_name &&
                       chatSquad.owner_name
                        ? (
                          <span className="muted">
                            {' '}· {chatSquad.squad_name}
                          </span>
                        )
                        : null}
                    </div>

                    <div
                      style={{
                        marginTop:5,
                        lineHeight:1.45
                      }}
                    >
                      {m.message}
                    </div>

                    <div
                      className="muted"
                      style={{
                        marginTop:5,
                        fontSize:'0.78rem'
                      }}
                    >
                      {formatChatTime(
                        m.created_at
                      )}{' '}
                      ET
                    </div>
                  </div>
                )
              }
            )}
          </div>
        )}

        <p
          style={{
            marginTop:16,
            marginBottom:2
          }}
        >
          <a href="/chat">
            <b>
              Open League Chat →
            </b>
          </a>
        </p>
      </section>

    </main>
  )
}

function TeamDisplay({
  abbreviation,
  name,
  label
}:{
  abbreviation?:string
  name?:string
  label:string
}){
  return (
    <div
      style={{
        minWidth:0,
        textAlign:'center'
      }}
    >
      <div
        style={{
          fontSize:'0.64rem',
          fontWeight:900,
          letterSpacing:'0.1em',
          textTransform:'uppercase',
          opacity:0.45,
          marginBottom:4
        }}
      >
        {label}
      </div>

      <img
        src={`/helmets/${abbreviation}.png`}
        alt={`${name || 'NFL team'} logo`}
        width={82}
        height={82}
        style={{
          objectFit:'contain',
          display:'block',
          maxWidth:'100%',
          margin:'0 auto 5px'
        }}
      />

      <div
        style={{
          fontWeight:900,
          fontSize:'0.9rem',
          lineHeight:1.2
        }}
      >
        {name}
      </div>
    </div>
  )
}

function InfoBox({
  label,
  value
}:{
  label:string
  value:React.ReactNode
}){
  return (
    <div
      style={{
        border:'1px solid rgba(120,120,120,0.25)',
        borderRadius:10,
        padding:'10px 8px'
      }}
    >
      <div
        style={{
          fontSize:'0.65rem',
          fontWeight:900,
          letterSpacing:'0.08em',
          textTransform:'uppercase',
          opacity:0.5,
          marginBottom:3
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:'1.05rem',
          fontWeight:900
        }}
      >
        {value}
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value
}:{
  label:string
  value:React.ReactNode
}){
  return (
    <div
      style={{
        minWidth:0
      }}
    >
      <div
        style={{
          fontSize:'0.64rem',
          fontWeight:900,
          textTransform:'uppercase',
          letterSpacing:'0.06em',
          opacity:0.5,
          marginBottom:3
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight:900,
          fontSize:'0.9rem'
        }}
      >
        {value}
      </div>
    </div>
  )
}