 import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'

export default async function RulesPage(){
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

  const {
    data:profile
  }=
    await supabase
      .from('users')
      .select('role')
      .eq('id',user.id)
      .maybeSingle()

  const commissioner=
    profile?.role==='commissioner'

  return (
    <main className="wrap">
      <Nav commissioner={commissioner}/>

      <section
        className="card"
        style={{
          maxWidth:900,
          margin:'20px auto 0',
          lineHeight:1.55
        }}
      >
        <div
          style={{
            textAlign:'center',
            marginBottom:24
          }}
        >
          <h1
            style={{
              marginBottom:4
            }}
          >
            NFL SQUADS 2026
          </h1>

          <div
            style={{
              fontWeight:800,
              fontSize:'1.05rem'
            }}
          >
            OFFICIAL RULES
          </div>
        </div>

        <h2>
          League Format
        </h2>

        <p>
          NFL Squads consists of 16 owners divided
          into four divisions of four squads.
          Each owner is assigned one NFL team.
        </p>

        <p>
          During the regular season, each squad&apos;s
          direct competition is only against the
          other three squads in its division.
        </p>

        <p>
          The regular season runs from NFL Week 1
          through Week 15.
        </p>

        <p>
          The playoff matrix is played during
          Weeks 16, 17, and 18, and all 16 squads
          participate in all three playoff weeks.
        </p>

        <h2>
          Weekly Picks
        </h2>

        <p>
          Each owner makes one against-the-spread
          selection on the NFL game involving
          their assigned NFL team. The owner may
          select either team in that game.
        </p>

        <p>
          The official spread is the selected
          bookmaker&apos;s closing line at kickoff.
          Lines shown before kickoff are subject
          to change.
        </p>

        <h2>
          Pick Deadline
        </h2>

        <p>
          A pick may be submitted or changed until
          one minute before scheduled kickoff.
          Once the deadline is reached, or once
          the game begins, the pick is locked and
          cannot be changed.
        </p>

        <h2>
          Pick Privacy
        </h2>

        <p>
          Picks remain private before kickoff.
          Owners may view their own pick, but other
          owners&apos; selections remain hidden until
          kickoff.
        </p>

        <h2>
          Regular-Season Scoring
        </h2>

        <p>
          A submitted pick is graded as a Win,
          Loss, or Push against the official
          closing spread.
        </p>

        <p>
          A Push occurs when the NFL game result
          lands exactly on the spread.
        </p>

        <h2>
          Missed Picks
        </h2>

        <p>
          A missed regular-season pick is always
          recorded as a Loss, regardless of the
          actual scoring outcome.
        </p>

        <h2>
          Regular-Season Standings
        </h2>

        <p>
          Division standings are based on results
          through Week 15.
        </p>

        <p>
          A Push counts as one-half of a win for
          winning-percentage purposes.
        </p>

        <p>
          Division ranking is determined by:
        </p>

        <ol>
          <li>
            Winning percentage
          </li>

          <li>
            Season ATS margin
          </li>

          <li>
            Coin toss if still exactly tied
          </li>
        </ol>

        <p>
          Any required coin toss must be performed
          live in front of at least one other NFL
          Squads owner.
        </p>

        <p>
          Division seeds 1 and 2 advance to the
          Championship Bracket. Division seeds 3
          and 4 advance to the Consolation Bracket.
        </p>

        <h2>
          Playoff Pick Requirements
        </h2>

        <p>
          During Weeks 16, 17, and 18, every owner
          must submit both an against-the-spread
          selection and a Game Total Prediction.
        </p>

        <p>
          The Game Total Prediction is the predicted
          combined score of both NFL teams.
        </p>

        <h2>
          Playoff Ranking
        </h2>

        <p>
          Squads within each playoff group are
          ranked in this order:
        </p>

        <ol>
          <li>
            Win &gt; Push &gt; Loss
          </li>

          <li>
            Smallest absolute Game Total error
          </li>

          <li>
            Better regular-season ATS margin
          </li>

          <li>
            Coin toss if still exactly tied
          </li>
        </ol>

        <p>
          Any playoff coin toss must also be
          performed live in front of at least
          one other NFL Squads owner.
        </p>

        <h2>
          Missed Playoff Pick
        </h2>

        <p>
          A missed playoff pick results in an
          automatic last-place finish within that
          playoff group.
        </p>

        <p>
          In an eight-squad group, the missed pick
          finishes eighth. In a four-squad group,
          it finishes fourth. In a two-squad
          placement matchup, it receives the lower
          final position.
        </p>

        <p>
          If multiple missed picks create a tie
          that affects advancement or placement,
          the tie is resolved by coin toss.
        </p>

        <h2>
          Week 16
        </h2>

        <p>
          The Championship Bracket contains the top
          two squads from each division. The
          Consolation Bracket contains the third-
          and fourth-place squads from each division.
        </p>

        <p>
          Each bracket contains eight squads.
          After ranking:
        </p>

        <p>
          Championship places 1–4 advance to the
          Week 17 1–4 group. Championship places
          5–8 move to the Week 17 5–8 group.
        </p>

        <p>
          Consolation places 1–4 move to the Week 17
          9–12 group. Consolation places 5–8 move
          to the Week 17 13–16 group.
        </p>

        <h2>
          Week 17
        </h2>

        <p>
          Four groups of four squads compete:
        </p>

        <ul>
          <li>
            1–4: top two advance to 1–2, bottom two
            to 3–4
          </li>

          <li>
            5–8: top two advance to 5–6, bottom two
            to 7–8
          </li>

          <li>
            9–12: top two advance to 9–10, bottom
            two to 11–12
          </li>

          <li>
            13–16: top two advance to 13–14, bottom
            two to 15–16
          </li>
        </ul>

        <h2>
          Week 18
        </h2>

        <p>
          Week 18 determines all final league
          positions.
        </p>

        <ul>
          <li>
            1–2 — Squads Bowl
          </li>

          <li>
            3–4 — Third Place
          </li>

          <li>
            5–6 — Fifth Place
          </li>

          <li>
            7–8 — Seventh Place
          </li>

          <li>
            9–10
          </li>

          <li>
            11–12
          </li>

          <li>
            13–14
          </li>

          <li>
            15–16
          </li>
        </ul>

        <h2>
          Final Payouts
        </h2>

        <div
          style={{
            display:'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(220px,1fr))',
            gap:20
          }}
        >
          <div>
            <h3>
              Championship
            </h3>

            <p>1st: +$250</p>
            <p>2nd: +$200</p>
            <p>3rd: +$175</p>
            <p>4th: +$150</p>
            <p>5th: +$125</p>
            <p>6th: +$100</p>
            <p>7th: +$75</p>
            <p>8th: +$50</p>
          </div>

          <div>
            <h3>
              Consolation
            </h3>

            <p>9th: -$50</p>
            <p>10th: -$75</p>
            <p>11th: -$100</p>
            <p>12th: -$125</p>
            <p>13th: -$150</p>
            <p>14th: -$175</p>
            <p>15th: -$200</p>
            <p>16th: -$250</p>
          </div>
        </div>

        <h2>
          Commissioner Transparency
        </h2>

        <p>
          The commissioner is responsible for
          administering the league but may not
          make hidden competitive changes.
        </p>

        <p>
          Commissioner changes to important league
          data are recorded in the commissioner
          audit system. This includes changes to
          games, picks, standings, squads, locked
          division seeds, playoff results, and
          final placements.
        </p>

        <p>
          Owners are entitled to review the
          commissioner change log. System-generated
          commissioner change notices are protected
          from ordinary commissioner editing or
          deletion.
        </p>

        <h2>
          Official League Record
        </h2>

        <p>
          The NFL Squads website and its database
          records serve as the official league
          record for picks, missed picks, closing
          lines, results, standings, playoff
          advancement, tiebreakers, final
          placements, and payouts.
        </p>
      </section>
    </main>
  )
}