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

function resultDisplay(pick:any){
  if(!pick){
    return null
  }

  const result=
    String(
      pick.result||''
    ).toLowerCase()

  if(
    result==='win' ||
    result==='won'
  ){
    return {
      label:'WIN',
      color:'green'
    }
  }

  if(
    result==='loss' ||
    result==='lost'
  ){
    return {
      label:'LOSS',
      color:'red'
    }
  }

  if(
    result==='push' ||
    result==='tie'
  ){
    return {
      label:'PUSH',
      color:'#1565c0'
    }
  }

  if(
    pick.ats_margin!==null &&
    pick.ats_margin!==undefined
  ){
    const margin=
      Number(
        pick.ats_margin
      )

    if(margin>0){
      return {
        label:'WIN',
        color:'green'
      }
    }

    if(margin<0){
      return {
        label:'LOSS',
        color:'red'
      }
    }

    return {
      label:'PUSH',
      color:'#1565c0'
    }
  }

  return null
}

export default async function Dashboard(){
  const supabase=await createClient()

  const {data:{user}}=
    await supabase.auth.getUser()

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
      owner_name,
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

    game=
      games?.[0]||null

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
        (
          Number(b.ats_margin)-
          Number(a.ats_margin)
        ) ||
        (
          a.squads.id-
          b.squads.id
        )
    )

  const rankedDivRows=
    divRows.map(
      (row:any,index:number)=>{
        const previous=
          divRows[index-1]

        let rank=1

        if(index>0){
          if(
            sameStanding(
              row,
              previous
            )
          ){
            rank=
              (
                divRows
                  .slice(0,index)
                  .findIndex(
                    (r:any)=>
                      sameStanding(
                        r,
                        row
                      )
                  )
              )+1
          }else{
            rank=index+1
          }
        }

        const tied=
          divRows.some(
            (other:any)=>
              other.squads.id!==
                row.squads.id &&
              sameStanding(
                other,
                row
              )
          )

        return {
          ...row,
          displayRank:rank,
          tied
        }
      }
    )

  const myStanding:any=
    rankedDivRows.find(
      (r:any)=>
        r.squads?.id===squad?.id
    )

  const myPlace=
    myStanding
      ? `${
          myStanding.tied
            ? 'T-'
            : ''
        }${ordinal(
          myStanding.displayRank
        )}`
      : null

  const homeSpread=
    game?.spread===null ||
    game?.spread===undefined
      ? null
      : Number(
          game.spread
        )

  const awaySpread=
    homeSpread===null
      ? null
      : -homeSpread

  const ownSpread=
    game &&
    Number(
      squad?.nfl_team_id
    )===
    Number(
      game.home_team_id
    )
      ? homeSpread
      : awaySpread

  const ownTeamName=
    (squad as any)
      ?.nfl_teams
      ?.name || 'Team'

  const pickDeadline=
    game
      ? new Date(
          new Date(
            game.kickoff_time
          ).getTime()-60_000
        )
      : null

  const gameStatus=
    String(
      game?.status||''
    ).toLowerCase()

  const gameStarted=
    gameStatus==='live' ||
    gameStatus==='final'

  const deadlinePassed=
    pickDeadline
      ? new Date()>=pickDeadline
      : false

  const pickLocked=
    Boolean(
      pick?.is_locked===true ||
      gameStarted ||
      deadlinePassed
    )

  const pickedHome=
    Boolean(
      game &&
      pick &&
      Number(
        pick.selection_team_id
      )===
      Number(
        game.home_team_id
      )
    )

  const pickedAway=
    Boolean(
      game &&
      pick &&
      Number(
        pick.selection_team_id
      )===
      Number(
        game.away_team_id
      )
    )

  const pickedTeam=
    pickedHome
      ? game?.home
      : pickedAway
        ? game?.away
        : null

  const pickedSpread=
    !pick ||
    homeSpread===null
      ? null
      : pickedHome
        ? homeSpread
        : pickedAway
          ? awaySpread
          : null

  const pickResult=
    resultDisplay(
      pick
    )

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
            textAlign:'center'
          }}
        >
          <h2>
            Commissioner
          </h2>

          <p>
            <a href="/commissioner/setup">
              <b>
                League Setup
              </b>
            </a>

            {' · '}

            <a href="/commissioner/live-feed">
              <b>
                Live Feed
              </b>
            </a>

            {' · '}

            <a href="/commissioner/results">
              <b>
                Lines & Results
              </b>
            </a>
          </p>
        </section>
      )}

      <div className="grid">

        {/* SQUAD CARD */}

        <section
          className="card"
          style={{
            textAlign:'center'
          }}
        >
          {squad && (
            <img
              src={`/helmets/${(squad as any)?.nfl_teams?.abbreviation}.png`}
              alt={`${(squad as any)?.nfl_teams?.name || 'NFL team'} logo`}
              width={143}
              height={143}
              style={{
                objectFit:'contain',
                display:'block',
                margin:'0 auto 6px'
              }}
            />
          )}

          <div
            className="big"
            style={{
              marginTop:4
            }}
          >
            {squad?.squad_name ||
              'Not assigned yet'}
          </div>

          {squad?.owner_name && (
            <div
              className="muted"
              style={{
                marginTop:3,
                marginBottom:14,
                fontSize:'0.8rem'
              }}
            >
              {squad.owner_name}, Owner
            </div>
          )}

          {squad ? (
            <>
              <p>
                {(squad as any)
                  ?.nfl_teams
                  ?.name || ''}
              </p>

              <p>
                <b>
                  {divisionTitle}

                  {myPlace
                    ? ` · ${myPlace} Place`
                    : ''}
                </b>
              </p>

              <p>
                <b>
                  Record:
                </b>
                {' '}

                {myStanding
                  ? `${myStanding.wins}-${myStanding.losses}-${myStanding.pushes}`
                  : '0-0-0'}
              </p>

              <p>
                <b>
                  ATS Margin:
                </b>
                {' '}

                {myStanding
                  ? `${
                      Number(
                        myStanding.ats_margin
                      )>0
                        ? '+'
                        : ''
                    }${myStanding.ats_margin}`
                  : '0'}
              </p>
            </>
          ) : (
            <p className="muted">
              Waiting for commissioner assignment.
            </p>
          )}
        </section>

        {/* NFL MATCHUP */}

        <section
          className="card"
          style={{
            textAlign:'center'
          }}
        >
          <h2>
            {game
              ? `Week ${game.nfl_week} NFL Game`
              : 'My Matchup'}
          </h2>

          {game ? (
            <>
              <div
                style={{
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:16,
                  marginBottom:12,
                  flexWrap:'nowrap'
                }}
              >
                <div
                  style={{
                    textAlign:'center',
                    minWidth:100
                  }}
                >
                  <img
                    src={`/helmets/${game.away?.abbreviation}.png`}
                    alt={`${game.away?.name || 'Away team'} logo`}
                    width={64}
                    height={64}
                    style={{
                      objectFit:'contain'
                    }}
                  />

                  <div>
                    <b>
                      {game.away?.name}
                    </b>
                  </div>
                </div>

                <div
                  style={{
                    flexShrink:0
                  }}
                >
                  <b>
                    at
                  </b>
                </div>

                <div
                  style={{
                    textAlign:'center',
                    minWidth:100
                  }}
                >
                  <img
                    src={`/helmets/${game.home?.abbreviation}.png`}
                    alt={`${game.home?.name || 'Home team'} logo`}
                    width={64}
                    height={64}
                    style={{
                      objectFit:'contain'
                    }}
                  />

                  <div>
                    <b>
                      {game.home?.name}
                    </b>
                  </div>
                </div>
              </div>

              <p>
                <b>
                  {ownTeamName}:
                </b>
                {' '}
                {fmtSpread(
                  ownSpread
                )}
              </p>

              <p>
                <b>
                  Game total:
                </b>
                {' '}
                {game.total ?? 'Pending'}
              </p>

              <p>
                <b>
                  Kickoff:
                </b>
                {' '}

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
              </p>

              <div
                style={{
                  textAlign:'center'
                }}
              >
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

        {/* MY PICK */}

        <section
          className="card"
          style={{
            textAlign:'center'
          }}
        >
          <h2>
            My Pick
          </h2>

          {pick &&
           !pick.is_missed &&
           pickedTeam ? (
            <>
              <img
                src={`/helmets/${pickedTeam?.abbreviation}.png`}
                alt={`${pickedTeam?.name || 'Selected team'} logo`}
                width={86}
                height={86}
                style={{
                  objectFit:'contain',
                  display:'block',
                  margin:'4px auto 6px'
                }}
              />

              <div
                className="big"
                style={{
                  fontSize:'1.1rem',
                  marginBottom:4
                }}
              >
                {pickedTeam?.name}
              </div>

              <div
                style={{
                  fontSize:'1rem',
                  fontWeight:800,
                  marginBottom:10
                }}
              >
                {fmtSpread(
                  pickedSpread
                )}
              </div>

              {pickResult && (
                <div
                  style={{
                    color:
                      pickResult.color,
                    fontWeight:900,
                    fontSize:'1rem',
                    marginBottom:8
                  }}
                >
                  {pickResult.label}
                </div>
              )}

              <p
                className="muted"
                style={{
                  marginTop:4
                }}
              >
                {pickLocked
                  ? 'Your pick is locked.'
                  : 'You may change your pick until one minute before kickoff.'}
              </p>

              {game &&
               !pickLocked && (
                <p>
                  <a
                    href="/my-pick"
                    className="submit"
                    style={{
                      display:'inline-block',
                      textDecoration:'none',
                      textAlign:'center'
                    }}
                  >
                    Review / Update My Pick →
                  </a>
                </p>
              )}

              {pickLocked && (
                <p>
                  <a href="/my-pick">
                    <b>
                      View My Pick →
                    </b>
                  </a>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="big">
                Pick Needed
              </p>

              <p className="muted">
                {game
                  ? pickLocked
                    ? 'The pick window is closed.'
                    : 'You may make your pick until one minute before kickoff.'
                  : 'Waiting for your next matchup.'}
              </p>

              {game &&
               !pickLocked && (
                <p>
                  <a
                    href="/my-pick"
                    className="submit"
                    style={{
                      display:'inline-block',
                      textDecoration:'none',
                      textAlign:'center'
                    }}
                  >
                    MAKE MY PICK →
                  </a>
                </p>
              )}

              {game &&
               pickLocked && (
                <p>
                  <a href="/my-pick">
                    <b>
                      View My Pick →
                    </b>
                  </a>
                </p>
              )}
            </>
          )}
        </section>

      </div>

      {/* DIVISION STANDINGS */}

      <section
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <h2>
          {divisionTitle}
        </h2>

        {rankedDivRows.length===0 ? (
          <p className="muted">
            Standings will appear after grading.
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
                    Team
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
                {rankedDivRows.map(
                  (r:any)=>(
                    <tr key={r.squads.id}>
                      <td style={{textAlign:'center'}}>
                        {r.tied?'T-':''}
                        {ordinal(
                          r.displayRank
                        )}
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
                        {Number(
                          r.ats_margin
                        )>0
                          ? '+'
                          : ''}
                        {r.ats_margin}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* LEAGUE CHAT */}

      <section
        className="card"
        style={{
          textAlign:'center'
        }}
      >
        <h2>
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
                const chatSquad=
                  m.squads

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
                      padding:'10px 0',
                      borderBottom:
                        '1px solid #ddd'
                    }}
                  >
                    {m.is_pinned && (
                      <div
                        style={{
                          fontWeight:700,
                          marginBottom:4
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
                            {' '}
                            ·{' '}
                            {chatSquad.squad_name}
                          </span>
                        )
                        : null}
                    </div>

                    <div
                      style={{
                        marginTop:4
                      }}
                    >
                      {m.message}
                    </div>

                    <div
                      className="muted"
                      style={{
                        marginTop:4,
                        fontSize:'0.85rem'
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
            marginTop:14
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