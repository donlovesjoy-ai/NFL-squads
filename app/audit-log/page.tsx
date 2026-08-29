 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'

type AuditRow={
  id:number
  occurred_at:string
  commissioner_user_id:string
  commissioner_email:string|null
  table_name:string
  operation:'INSERT'|'UPDATE'|'DELETE'
  record_key:string|null
  old_data:Record<string,unknown>|null
  new_data:Record<string,unknown>|null
}

function formatDate(value:string){
  return new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone:'America/New_York',
      month:'short',
      day:'numeric',
      year:'numeric',
      hour:'numeric',
      minute:'2-digit',
      timeZoneName:'short'
    }
  ).format(new Date(value))
}

function formatTableName(value:string){
  const labels:Record<string,string>={
    games:'Games',
    picks:'Picks',
    standings:'Standings',
    squads:'Squads',
    users:'Owners / Roles',
    division_seed_state:'Division Seeds',
    playoff_round_entries:'Playoff Results',
    final_placements:'Final Placements'
  }

  return labels[value]??value
}

function formatOperation(
  value:'INSERT'|'UPDATE'|'DELETE'
){
  if(value==='INSERT'){
    return 'Added'
  }

  if(value==='UPDATE'){
    return 'Changed'
  }

  return 'Deleted'
}

function formatValue(value:unknown){
  if(value===null){
    return 'None'
  }

  if(value===undefined){
    return 'None'
  }

  if(typeof value==='boolean'){
    return value
      ? 'Yes'
      : 'No'
  }

  if(typeof value==='object'){
    return JSON.stringify(value)
  }

  return String(value)
}

function getChangedFields(
  oldData:Record<string,unknown>|null,
  newData:Record<string,unknown>|null
){
  const keys=
    new Set([
      ...Object.keys(oldData??{}),
      ...Object.keys(newData??{})
    ])

  return Array
    .from(keys)
    .filter((key)=>{
      const oldValue=
        oldData?.[key]

      const newValue=
        newData?.[key]

      return JSON.stringify(oldValue)
        !==JSON.stringify(newValue)
    })
}

export default async function AuditLogPage(){
  const supabase=
    await createClient()

  const {
    data:{
      user
    }
  }=
    await supabase.auth
      .getUser()

  if(!user){
    redirect('/login')
  }

  const [
    profileResult,
    auditResult
  ]=
    await Promise.all([
      supabase
        .from('users')
        .select('role')
        .eq('id',user.id)
        .maybeSingle(),

      supabase
        .from('commissioner_change_log')
        .select(`
          id,
          occurred_at,
          commissioner_user_id,
          commissioner_email,
          table_name,
          operation,
          record_key,
          old_data,
          new_data
        `)
        .order(
          'occurred_at',
          {
            ascending:false
          }
        )
        .limit(250)
    ])

  const commissioner=
    profileResult.data?.role
      ==='commissioner'

  const rows=
    (auditResult.data??[]) as AuditRow[]

  return (
    <main className="wrap">
      <Nav commissioner={commissioner}/>

      <section
        className="card"
        style={{
          maxWidth:1000,
          margin:'20px auto 0'
        }}
      >
        <div
          style={{
            marginBottom:20
          }}
        >
          <h1
            style={{
              marginBottom:6
            }}
          >
            Ownership Audit Log
          </h1>

          <p
            style={{
              margin:0,
              opacity:.78,
              lineHeight:1.5
            }}
          >
            This page records commissioner
            changes to protected NFL Squads
            league data. Audit records are
            visible to the ownership group
            and cannot be edited or deleted
            through normal owner or
            commissioner access.
          </p>
        </div>

        {auditResult.error && (
          <div
            style={{
              padding:14,
              border:'1px solid currentColor',
              borderRadius:10
            }}
          >
            Unable to load the audit log.
          </div>
        )}

        {!auditResult.error
          && rows.length===0
          && (
            <div
              style={{
                padding:'28px 12px',
                textAlign:'center',
                opacity:.72
              }}
            >
              No commissioner changes have
              been recorded yet.
            </div>
          )}

        {!auditResult.error
          && rows.length>0
          && (
            <div
              style={{
                display:'grid',
                gap:12
              }}
            >
              {rows.map((row)=>{
                const changedFields=
                  getChangedFields(
                    row.old_data,
                    row.new_data
                  )

                return (
                  <article
                    key={row.id}
                    style={{
                      border:
                        '1px solid rgba(127,127,127,.35)',
                      borderRadius:12,
                      padding:14
                    }}
                  >
                    <div
                      style={{
                        display:'flex',
                        justifyContent:
                          'space-between',
                        alignItems:'flex-start',
                        flexWrap:'wrap',
                        gap:8
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight:800,
                            fontSize:'1rem'
                          }}
                        >
                          {formatOperation(
                            row.operation
                          )}
                          {' '}
                          {formatTableName(
                            row.table_name
                          )}
                        </div>

                        <div
                          style={{
                            marginTop:4,
                            fontSize:'.9rem',
                            opacity:.72
                          }}
                        >
                          {row.commissioner_email
                            ??'Commissioner'}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize:'.85rem',
                          opacity:.72,
                          textAlign:'right'
                        }}
                      >
                        {formatDate(
                          row.occurred_at
                        )}
                      </div>
                    </div>

                    {row.record_key && (
                      <div
                        style={{
                          marginTop:10,
                          fontSize:'.9rem'
                        }}
                      >
                        <b>
                          Record:
                        </b>
                        {' '}
                        {row.record_key}
                      </div>
                    )}

                    {row.operation==='UPDATE'
                      && changedFields.length>0
                      && (
                        <div
                          style={{
                            marginTop:12,
                            display:'grid',
                            gap:8
                          }}
                        >
                          {changedFields.map(
                            (field)=>(
                              <div
                                key={field}
                                style={{
                                  padding:10,
                                  borderRadius:9,
                                  background:
                                    'rgba(127,127,127,.08)'
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight:700,
                                    marginBottom:4
                                  }}
                                >
                                  {field}
                                </div>

                                <div
                                  style={{
                                    fontSize:'.9rem',
                                    lineHeight:1.45
                                  }}
                                >
                                  <span
                                    style={{
                                      opacity:.68
                                    }}
                                  >
                                    Before:
                                  </span>
                                  {' '}
                                  {formatValue(
                                    row.old_data?.[
                                      field
                                    ]
                                  )}
                                </div>

                                <div
                                  style={{
                                    fontSize:'.9rem',
                                    lineHeight:1.45
                                  }}
                                >
                                  <span
                                    style={{
                                      opacity:.68
                                    }}
                                  >
                                    After:
                                  </span>
                                  {' '}
                                  {formatValue(
                                    row.new_data?.[
                                      field
                                    ]
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}

                    {row.operation==='INSERT'
                      && row.new_data
                      && (
                        <details
                          style={{
                            marginTop:12
                          }}
                        >
                          <summary
                            style={{
                              cursor:'pointer',
                              fontWeight:700
                            }}
                          >
                            View added record
                          </summary>

                          <pre
                            style={{
                              marginTop:10,
                              whiteSpace:'pre-wrap',
                              overflowWrap:
                                'anywhere',
                              fontSize:'.82rem'
                            }}
                          >
                            {JSON.stringify(
                              row.new_data,
                              null,
                              2
                            )}
                          </pre>
                        </details>
                      )}

                    {row.operation==='DELETE'
                      && row.old_data
                      && (
                        <details
                          style={{
                            marginTop:12
                          }}
                        >
                          <summary
                            style={{
                              cursor:'pointer',
                              fontWeight:700
                            }}
                          >
                            View deleted record
                          </summary>

                          <pre
                            style={{
                              marginTop:10,
                              whiteSpace:'pre-wrap',
                              overflowWrap:
                                'anywhere',
                              fontSize:'.82rem'
                            }}
                          >
                            {JSON.stringify(
                              row.old_data,
                              null,
                              2
                            )}
                          </pre>
                        </details>
                      )}
                  </article>
                )
              })}
            </div>
          )}
      </section>
    </main>
  )
}