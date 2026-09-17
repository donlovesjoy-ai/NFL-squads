import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../components'
import SquadLogo from '../components/SquadLogo'
import SquadNameLines from '../components/SquadNameLines'
import PickDeadlineCountdown from './PickDeadlineCountdown'
import LiveRefresh from './LiveRefresh'
import { submitPick } from './actions'

const PICKED_STAMP_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAYAAACLz2ctAACfEElEQVR42uy9ZZxd1dk+fN1r7X38jEsymYm7EyUhRIAkJMFhBndIcCkFip4ZCsW9SHBpCMwgIa4kE6IQI+4Tz7gc3bbWej+cGUpbKvRp+3/6vLk/8ZtfOOfsta91y3UbcEJOyAk5ISfkhJyQE3JCTsgJOSEn5ISckBNyQk7ICTkhJ+SEnJATckJOyAk5ISfkhJyQE3JCTsgJOSEn5ISckP92oRNH8PdFKUUAUFxcTCgGUPxn/6AYKEax+vFQidSJUzsBwF98FqFQiLb32k7V26qpfHu5QhkUAPlPfh5DIWhUz1GU0ytH9dzWU5UUlygQToDzBACTEgqF2DIsY81gE3+KHgIHh8Y1xJ1Eatm2Mu8PB35wx5WTVt9USVVGlNweptJcqShIbyu4EnWDuwyWk9pPino1T1QIAQEJ+ef4LQRHz1EUKh4tS3ACkP//AqACFZYVsrJtZYQSOD8Fm1CS3t/6fv6SvSu61tTV9Gw0m3pErFiHmBNrDSDbsK0U2zZ1oSm35VjwwweH2VAa4GIuONKJp2gpTqo70BS2ozV+zVvnJe/BgMe7LS+73e6TsrvtuveUew/ppNnOT7FeCF5YWIiywjL5/0cw0v9fNF0JSthPQefTvXh4ySNdV1asH3Y8Vjmq3ggPjJqRTiYsv00CpjShGxw+txeNogGwGKAkfPA1eoMeJk3hth2hxZnBpHAAxghKgTEGyQEQQeMcqZ4ATGHDbepWwBU4GPT4f8j1Z3/bp1WvVS9OfGYLJ2bKFtyFoIWKQ7KESuQJAP5f0XZFZT/6cUopfcoXtw7bUrljUqVRMy5shHvFtIRuwYE0BeAoQJIkIgklESC/o/l00WQ1epnJIKTNOqS0q3WluLWdlbvT3C6vIhMkXApKSOXAIUZckiAoDYoxpmAJOI7DoDHGPDo0xqA0hYDwIqgH9mR5s5Z2a9X5608ufH85IxZVSTASSgsZ/n+gFf/vAVApQjHxFm3nhgu3lt190opjq4tqnNrzao3G7nEnBgEJJIBsX3qsXja5lQ0GIgKBoKCUlMrr9SX6pHff9f3h9X0lE/DYHmNYtyELvqvfeEEiasDv98Fne5pM7jDHsP0aZ+GwigZJEBQn0qGR33EhwS1ma1KRhCJTKWhMWtLWwSS4W4OXPEhzpRzM9Wd/PbRg0CfvnfPmWkOaP2pFFEP8XwUi/V/SeCjGj8BTSnknvn1u4UF59Mqq+urT7ITJPG4fAtwfOxA95Ha53GQYCd4rtWvd4ejxlDAijEFTUikGKAZNgTSGHGSgQYYBneBiOvJkbk0ixc5uCDeAJNCrVY8jx2oqsyL+qCcXWeH9kYMpNheAraCkBCSDrutSCiGl7RAkUYo7KCMyqpGtpJRSKg0MLs68mgtuzYUsV8bKzqkd3593zYzPiCj6fxmI9H/iGUrBUJT07Geum5n15MoXrj+qKq9tSoS7WQkTtsuGy9RFQAVYSqvUaGW02h+viSErPTPRsVXHxP7jFVlN/gjshAO3cEGT3PK4PVU66RVBEThOXrYjqHuPZgWyG+yEY/u9wfCyAysO5LqCnpyM1plu0oPKpwWP1x3PilpRl9/tGxg1wm0ckh0T0mhlkeOxhJnUuspBgZafaIo0csMxNX9qkAxmkh7XnJycnGN76yoKoEBetxsZWvr+Dun5b9034q53z+l+Ti0AoLSQo6hMnADg/wb5ycv4cu2XmU98/+Ith42jN5tWvDUJBvLzhF4FJlLg6tiq/YYO/nxza+XO3IPxI50cJZHnbwWbOWjFc483onGjX/rWZ7sy1p6U22vjq+e/esxR9o+HpKDAwKGgYCnbVR2rzvApnwwEAo0ezW1BALI5ulVIenI6ufD4N49nLar4dmBlvHpwk9U0NObEB9qm09pWFmIsDp10+E1vOMUXrK1WjR0s0wSzoISmlOKSu9xuZLhSj3UMtH1p5Y3fvE5EMQAsFAqhpOS/P1j57wRgCAwAUAKplPKc/PaYWyoaD95dbzbkO46DbhmdN+09sre3O+jWfG5/zIwmPH38PRb17dlvdnWk7p71xzZ2gI4tPulbmOXJmLv85oXLGZGT5P403Dv/voJVlet7xOPGSQ1mY0fHER0s08wSJNNs7rgUlMcltYAipiwyo2TB0ZVma7pe53F76jSig0EtWBHw+Tb3zui67a0L39rnKBsKCi7NjeGvn37qwciRsQlKTGxorBs4vtvpRwzNObpw06KBRIygEwcARZAQkFKTmsutI5ul7+rWqnPxiquXfGopO2mWSyCA/16zTP+F4NNQAkeHhjHvnHne1sZdj9U6jX0swwQJcpgpeGZqZr0ecPNYXSRAPsYaVT3r5eoNN2mbunXs/lE8Zi6fe3nZehs2dLhwxRdX9N50bNcZTVb01LhM9DWseFuLOS6bBGzhQNkCkApoybApJP9b/fQIFQAGcAJxBo04dGhwSU26PZ5jfs39Q7qeuqJtVsGSuZd+/b2tTGjQcOY7554Enz56+9Httx1Wxzo6loAmuZKmlMoluZd5YCUsRX4mLGFrHrcbue6sBae2GXbfx4XvblYtNNN/qTb87wGgAqEIDGUQv53/24IPt5Y+d0zUFMWtBMgkh0AcTJFSUnX1t687hGMpkklXejhV+LK8c3NTW7237rpvZ9jKhgsunPr+2NHHGisvarQiY+J2vGeCTFjCBuxmqlDnACNojIOBgUkGzWbgYLZgIs65RlBQQgiAwJliAYc5yewHSThKQCmZBKZSABF0rsMLN3zcsy/Vk7asdUZO2errli0whQk3uTDonVHnHwkfvaW2qfaMuG6CDKU8UpcJZXKf2yc8bq9TH2/UoCueQgGjY2r7xzfctvIpIhKFpYW87L/QN/zvAGCzr6dDw9BXR1+7tWHns00snKlMSCIGImIQCpAQ0i15mj8IFoGdnpE+rZu3x8sLJn+xSUHh8i+v67H52I7rKsPV50YR75KQCUjTSZ4CT6bdXEqDm7nr3Ezf59E9e/0+/44gTzmsmDzYiufWdcvp6FhmtDHVnadcwlZHeQN548pb4zQGa8yGYEzGcxLxeIcGp6G94Vg9Eo7RxbKstqZmk63+qE2ZS4PH5UGK8u5vk9Lmy56tur33yQXv7QAII988c+R+++Dt9bV1F8WRgCAluc1BOjECIKUSwhHc5deRo2WsOLvtGZPfuPSNHf+NJvl/PwCbTe66fetSL5553WvHYscuDxg+0wkIGYubHp/bLcMiRspWBDdRiu2zszOypp2WeeoL71zx2hYdLgx9Z8w5hxqPTGkwm8bGWEJ3YlbyFXk4PMwFP3z1QY9/ddAdLM9Nb7W6sFvhztsHX1srVFKj/bMHy6HBVrb30ulXd6mIHR5YF6sfEzEip0SdeMcETEjLAaSC5nfBLzx2pjdjQUFam5dXXr94sYDA2VMvGPNDZMdvakTDuIRpQAd3hJBcSUWkSIEgXG5N88LVOKnD2EumXf7hAgmVJGr+S+ga+m8A342f3jx47sHFH8VdZvdoQ5MT0AKOVFJXUUnB7GBTtV2f7iYXWgdbl57k7/l02XXTNmjQMPjNMVccjh69u86uHxC3EoApABeHx+2GX/iq0/1pC9qmtZ11Tvezl/962E1Vzp/WIxAKwdBzFKGk3EGzrwUAJcUl6o9KhoDiEIUAbO+1ncoAYFsZtQRJ+Ek1DQODUMJ77rSLT97bVHFOfbT+nLCMdoxbBmAKkFeHT3Mj25X5be/sbi/MveqrGQwMp0wdW7i7aV9xLRp62lEbXHGpIJmuGHwej91gNekp/iA6ae2e2/CrNfcTkfxv8Qv/dwJQKUIRMVbGxPi3zrpqdeW6NxvtJm86T3XCiYgmNAmAlEtqTo/c7mat3XC4d06vuxde/eUCAuH0d84u3FG/5ze1on6AYRiALcG8GgLMh0xP+jdtU9t+MLn/TfOuHHRu7U/ysAwAK+xVqMoKSyWIVEiFWAmVyCvKrhnOyU0fXjR1VSgUol/0YhUoVByiEixj+EnVDQGQSvnHfXjuuP31FTfUGg1nRhFnImYDnOB3e5Hty5rbN6N7aObVX6xTSukDXh9RvL/xwH1NTkRjNnM4keZoNjy2x+mZ0blyS2xnfvvUtjN3DZ93KQ1qE2/5/ScA+EuDjWREIQe+MuLBbbHdT8TCETDBhObi3FECYFxIJnjA40e/7H5PrBg3/wlqS4nLpt0wcHX12scqzZqJiUQCsKTiAZ1SWCCaF8wrG5I/YOon57+z1lRW8rt+rERJAu7nNDArIaf3q0M+CVuRdofv2XmKCEnWrNn+6ef784ocHTqu/uqGgSsPf3fr8abKSyMq7hGWkOTVWJB57YJA6zd+P+Kh0JiTzm8sev/qU1bVrv79cVbbX0Rt4Sc/7PoE5bduU1UROZIND7SOvvy1G4oWTkrNz6/73x6c0P8uxaeIiKCUwuCXR762Obr9ZjvhCJ1zZsMhRgzKlo50KS3bl1UzIK3fjQsmz/haKcUH/P7U0P5wxb1hlfCohOMwD9fSKGC0Sct/+5weE19+6vTQvmZ/rjnR/1dA96cXQSml3G1e6Lqz1q5vX5hz9sBp132wAaXgLZmX/9FFA/DTggkOhltK7+75TdW39x6NHr+qyY4yZUuh+TSezdMqBuT0umfuNTO/kkq5+70x9IU99RW3eBIuJ9WdIg44B91cuJSUUsAjtW4pHddNHnDNOb8a9avj/5tBSP8bwdfjpYEf7kscvNKO2o5OGg96/NToRCBJOdzFtLZ6m1UXdjr3qucueGLfZdNuGLiictUbx83qwXbUEtAYT3H70DalYPrZnc58/OmJj22XUEAheKhnSP2j5rOwtJCXFZbJS6ZfM2bO/oWLI2aEOnjbf3X4we0XdA11c21HtgTKf/q/yH9UMzKwlkJVaolYQ6EQK9leQiiD0MBx1bSbhi2v/va3x8zq0+PRhAIp8nu86ODPf23Lnevu5sTss9698Kpqu+6lw/FjvsaGBopRzKXrLrTiWUaVXuPp4e/2w7KJ889Pb59e8d9K0/yHwAcCQEop3v3FgZ/Rk2mKHk212KPpih5JVdqDaRK/CTrup7NUr9eGvquUcnEwDHvj9FtSn2wTx2NpCg+kWK4nslXb53ttuHz61afr0H40sy3Bwz9yCUIqxFBayHE73ADQ741hr/PfZSh6KNUOPJ7n3Fp6d59/9hYXlhZyALjks6uuuHjalYU//duPVj8UYigEBwAP82D8e+fekPtUhxr22zSFB4MmfyxNFTzbde0N02/oCgAX/KFoZEZJ/lE85lPZz3eoynuhS1POs+2k65EMmx7yq26v9DtcurW07c991990E0oLOULQkuw6CIXghaWFvKU/5v+MBlRKERURU6VKdn6x30f1RsMVVjhhJzRLByMQmBJMKJ/uYQMz+z22+qZvQrZyXH1eGfL6vvjB6xMxQ4ATT3MHRY/sHo+vumHh74jI+qUa76/8Nk/BU912HzEqC7jUHOkSWqdg+8UnpfX5emf9br3BarDbZbRtFWaJ1Cyk1z/bv+TxQYMGOX+Vh2v2Kbu9PGBa3I6PPnDP9vY0hYDWUNgOhTLIP9GIJSUAIF+c92L7qbs+fOVA/OjZRsSw4YGe5cqoHd5qwDUzr/1qzrNfP9vh98ffm90UjrR36k0rSpE0KIaclJx4jbfe14EVbHml79PjzhpzVuVfjY7/SrW4CzoYYxBSwG75cwj/Mz/4f5UJLgTXyrgY8Nqpb69r2nRDwPbHuqa1r13XuLmd7mjSFjZS09NYv4zeU5ZfP/+ttxe/nfvUplfLDlhHTxVRy2Ru7m7ty907rtPp135wwesrVIv5/IXmRicdlrRSbpt7X9edjdu71Tc09E+YiVMPxI4MtSxHgRNBKpCHoDOtubIFsMlBq0AuTk4ZeN5XV02bScXFhD9/wT95uapYUbvf9fjuGKvqPyp72B1Lbpj7KoHAQGDgeG7uc+47J95p/hG0ozSUlDtucmHw70fdt6Vx+5NNVpQgJII+vxiQ2fvm8imL3/lkxYy8+5beO/NI/PBAL/xmZiDdoRRNHQ9XuoXh6O28BasqHth+BhElWvzbnwNdc3TuPWd60bBDNUdON41EH9u2PNKLhuFthyz4w0XvlxFR5F8Fwv+3AAyN0njJt87AV0c9sCm+9Xd2xLQhpZ6VmWnpto7j8SotxRNkI1oNu37OdV+8d8NHt3WYX714ztF4ZQ9lSMPld3s6+9vPen/c768d2nNo3S+umWsOBF5Y/kKrsr2zP9hTtW+YbTsBOyjIsm04URtEXBH95BMVpIKSxJmUzNFbe1rV39Dr8nN/Oym08h95Kbtrf8gf9u7Ze+rMOneGnlE7MKPvc1EyW9U2VWcHAsF253cdf/ujpz/6w081VXNLAaiE5KXTrjjjmyOrplUlanMU4Ph1tzYwrffDK29d9sQPW1dkTPz82tkNvGlYXmZe3f7wgXQRdRgEmTIV7i56u6+XjXrvsssi91jly8rxZ6DTr/jDtSdvjW4/17CMMxSjAicm/FV2tdv22MjjuUh3pcl6Gd47pvXwGz4ofOfbfwXX+P8MgKNCo7TyknLn7HcvLPqmeuVnsXjMYYxz5QjSdU22SWsTr7cbAqfmDbtu9uWfv3/vjAcHfbyr7ItKs6YtTGV5/R5Xd3+Xp3b86vsHDGH+Ues1g+qXgFAhROe9v/WUDQ1bnz8mqweLRkdwpgmANAXFkp/4Y7wAAknBJEv3plUW9p006a0Jr21o0VR/kUUsLeUYiMCyHWu7b67ZOupY7dHzD4WPniyFUhKSNL8OAQG3342e1P3BH+769knx6F+hepqJ+dD0UNf3jn5aesSo6qcijulP97lPzRv67JKr5t/32drPMu9a/eDiQ02H+iMG2w237ssLImEnkGoFMCR7wMWzJn9RysHgKOG67qspQzYf335eZVPlJCOR6J6X3wYD2gx4YcX2by+oClfnOS5HuL1uzhu51Wg3emVQ8VZabvSqnpef/My5j2//xbzo/wYAttycO2bd0/ujbaUrY5Goj4ExkwzGmAZpOU4wPagNyR08Zck1s96654sHepft+3rpoeiRLAjYAW9AH5Iz8O7lk+e+5ED8y2rjlFLs1HdOf2DbsV2PNsioixNXUCAl1R9PS5FUmqJUd0rFubljL/zw2nc2/Rz4QqEQKykuUe9vmt5u6qZ3pu2I7hkeS8ThGA7ISmKZiJSEtHVd4/2z+xZvuKX88b/HM7Zc3M2bN6dfsODymfsTh0dIxzH8voBnZM7QJ+Zf9/XDby95p11o9dOLG0R9537BfodNv7UpXUud/fSQkiWdU3MappQ/0ndX1e4Lq1B7VkIY7eOx5hYFSDvP10pK5ogOGR12tvK12rehfmNhbV0tbMOB5bKVy+1xEsLQu/u7LNn/6y1nWI/Y/yNT/J8HYHNViypV7jbPdl91zKrsF3S8tpOwtUBqEHVOg9A0rg0I9n1qze3LHrj/q1D7D/d+srgyUd0JCWmlBVNdY/JG3Tjjmk/eUSH1o8ltpnHUVV9O7tSa0sXT5z998JfczpZLQSDcOu3WITNrl7xzOHK8NzNIqaSL1nJcQumKt3PnzTh03/bzZUhpP3Xaf+Z81R2ld7RdXv3dffvih6+NRaIeyGTvCYGE0AXvnt512YE7No8xCi3+5/3Jf5UiKioTqkGlnfTZ8JlbGnaeKmoS8LVJwaDUvsXLb1hcct70iztJiQFfX/bpSgA198y5f/DCg+UX1Ubrz4mY4U46d6NNeqs926u3t08RKUZKTqpe6VR5PI06vJrr0P2n3vvIRf0v2n7Dl1N6HT1+6OKjetWEplgE3OGQgEzxBuiaXpcNePn85zb9T0wx+48DsKyQ8TIu+rw09Nkqp6Yft5jjuIUuPYoglOB+Tevgbj993R3fPjB3w9zs0oovZlVZtZ1gKTMYSHGd0QK+yUpHCZwWU0vFySLO9fvXX/XV7gVvMpBahmVMKUWhUIiFVIj9LTqm5QDV7cr9+8t//12eq9VSIiKllCRAKakElBLEQMpRaIw2jn9k5qNtUQLnb3yuAoBXil45tOW27267pd81E9J8aTEFqZSCFEwygJympqb8wzuOBlEG+aML8beOsKhMhFSIUTo1bpyy6pyega4rW6W1PtoR7V5rF+iw0ksePN7nkYYgczd1e77vk22e6Hrore0fr9wZ2Xt3ZaK6U8wI2+SnRCIazdN1XVcZFISNQ319vX53c6/rh8onE+2q7eqNN385eUjPjK4VR4srJg5M7V+UFkgz8rJaWx6uC8tr06rK789LprxL2H+FBmy5uRPfP//MZbVr5iUicYcUaVAKAEkpTdY22HbzJze8O+KUrFPiPV8cNGdXfN94GROGPy3gGZ4++LbFk2e+ppp9oT91tsBVoZLtnun1eY238YLxmaOGz7h8+up/5lIqpajzs32X7DMOjuKOZgvp6C6vGwISImGDaczUvS5332DPa76/ZdmHf83/+5PnLitDzes1vt5Thx6silWme71BuOFWYRkmHtBxatawwm+umfl5i4n9W++ssPTHyFUCkB64kVCGB4D33I8vnri3ct8ldWb98JgvmtHN32N/TU1V2qHEgSA0D4dOzKVxuKAjw0nZkRXM+MN5A4u+fmTE3cc/3fBV7otbXx7fVBc5q9apHdkl0KHW4mZ2rWr84eCF346ZOGfyxavqvn870hS2lUvpHXjBmn2/2TaciIB/sgRM+0+a3rLiMrV169LAaTOv+73GSHDJmJAOiJiSXCDTnxs7r934K0dkj4gMfX30C3udg+NlQhmugNvTJ9Dtt8smz/0T8CmlqKisKPkyiuBAgQxu9ks0RdTG8MZXlVIjUQdtUc3XgXnHVmcjqrwvnvvMmh9piJ9Pv0kAukV2OwgIwRw9nacmBuT2v78h3tjlID98Y5MKe0zHQGWi6iwO9qHYXv43D7/ntp4KZZAvX/5MXoxiQX9GGganDrjntJxTln59dNY1B+xjlx+srviNUuorKqa/y9G1UExe7sE98x/ss7xi5dhubwwY35BoHBWxo24zbEApG+nerGPMkI3HWVVHTyAIN3msFB5YlR9o9fkdJ02Zc8nJlxgvrvx9/idbyy6auvqtC5vMxj4JtwmKK7jcDNnp2TuPWzUNx5uOD+z81silex/cPjTv8c63N7lUX4pDNnmaTnpu+XPtAVT8s2b4PwfAMjAqIXFJ+m8erZMNnXKcDBgsAcEAKZTweD1av4ye97xy2Subz/ugsGhx5bd321HLZH7N083XqXT9rSsetQsd3lxwmVQFyVyuYCC4dQ9umXHHWfF4vCMlCMe9NQPbPdvzB6mUy7SNdLfH4x+U3e8CAEhWp5T8BWha/v7R+o9aR+14FnHwfHebLed1m3D1q+e9sJGB4Zl1L73+2drP79obO3BlRMQuvLv0kVbPFZVU/i0KZnuv7QQAlXakS4Y3Q3Vt1e3ipZfNLF2G2WCgjW988eZTMyPzzn56/dMBlKAJSpECUFRWxMrKygCCKEOZaKZLtOu+njJwZ+WeidXR2omvr3lnQITFmI97oSnuGOGoTUzXEdDgV948JYSTxTJm9s7u/YeF13+9FIB567x7+j31/ct3/WrZI2fHWKJjQhiwHQspeiCh15FuwGKa10vfVq0eYzdZsC3HrspsGHjbortPap2Z+wef43vqUPSwFQ2YnrkHy0cDOFCCZQz/xCCn/wwAQyGGohJ51bQbu3+5b8Ydus0TPbv2WL3y4NpR3JBM+UnroBXMXDZl/tSHZv+23dvb3v99NBYTYOQu0Ftt23znmuupgZgqVpKIFJQiEKmH5v+2YE3VmtPqIvUDm4zIqdO3zuiTMOLEXBy2kOpQ7GhnCAFXmg/9XPmTZ1z92dcoBS8pKhF/Cyjzdi/qzH16oDvv+sH28d/fSV0pjBA0uV2qXw+6YycHu+nhpY8/N2vH7Ht3JLb0A1BZ2KuQylD21zUgAH+Kv2Ziu9PPfPPC33/z4xiOohKaELLIPSIZATION4kg2kTcFGriO9tz9segqHUyb/qy+sFjmwXE+w7BXtgInwHkAQ/Z/ZArYRwpLCxk3w6tP44SyhhDXeb1vLoFmthXni2P84ibUFZWxuUX5UMxAOS1ydOOOD8zZuByYavXShgF3qt6pjTQFh5CABhjAB4QoohoAZVG46ijd/a8YfTssbNrofo7KG0FwPHFnD5g0cUvVen1fUEHxWw2SwPiet3zWN5jtSteXPt/Aua6ZlszjhxQ9+XIgoWFVIVJosRlmTo/NGzYMB8U5XOAin/VrP0ne8D2Uz1z2cwBb5wo3u7zeDE2CJDCJxw49eChEfFzu+xzKy2pjACLNTh1vz+EQjjIJcQmB0JayF/fVBWfLKS2BqSQQReoLOg8VfxBZrNEBZqg1SQwjkMiAqQiMCHT0Vg+atXgzhetXHz1/AO7qnfJhStmj1R4dfQB99FRPuqLVUEH4g2BlbfpNoMFKlEtn8wnqiF/UHUaHbsdsmNtXtdhnz4z6slSjBD7dmjNLctlPydbbd+TUlZWxh06dIj8eborZcnONw63+lpEu90Jk3JuGrhg3DN7fsrvXLp5aeJT+55/odxdcS1RaaQLSSkymY34qpSxg9+75bWdbcwW/dtsl02FJfro18fd9VXT7kVBXygsmAS5pznrhT33br3vT0UP575x6u2vY23RlZ1w2umdNXtHEMSIh/PyyWLSmvo/HxujXaf9IpT7XyQEt3VF+NTnupbWhBqyKKPMLlrY8ps+Trmn6M4nWkT37Q01jTTJGMfFJcXDwdZDoAY1QIQB4jiaG53dFPD5jSdCp42CIGCRE0AzUzAGDbpVt2xOiU345JZuN6+7Z8jttQVfPp225viGK6taqse1qi39nSYHTjIlhI83n8Ru3ccpos5hChBliAKLaqg1m8wl8aa4Nfm98r+c2f/O08p3hta2+1wbOfb3q/44wWGzfVU4pLD1pyYPAAAcYBjx1hXTN7fsWqj5dBUEJmaZ0z8fETNoQXmoylzRelrNtqbH4yg+JsOQtv6vVzy7/RxJEQAA6Le4n7Dnrj3akh0vZj1Q8uwRj8fDEI8xQxR4SSS95Jz7x7k3v1QIefjc7kS7QU55/55RyytWftHq9+jAIbGLMWXzsQcOXlZTU4OHF48tOe470d+iGDWzbBLCSNH9OIwNyBS6KeOaPouvX3AMXC4E/4aa5c+rtLeVY3osGPi3g8Hyu5GfhHkzLw+PGzLFIpobVlZ98Rn4NZLlyCrp3qnrvn21R+7weFq5Ol+dGG+LDzmsUf4j3mOJBlECg19qssmWDYPTBq568uJZG6LN0aHpJff3+PrY/msbgk1jg3yoE2fgIOgNguYNUok3qN1Suh5tCbp7+YN+MJhN38Rwzg2do1JXPnfl05szozLc+tmDjMAFXFvWen5fs01Gt6CgALq+1O+4DVtf3DFj4zyYnyFBwjEdyoB9VxLRTqL1eE7bH1z/bE6593gPT8jXp8pbd3WT0hKHKAbGGMIcAhlJQCQGRCOATRjSuaSyazIvH/v0tqerWQFj53ZD8ovyudyyXLanc+mYdbWbP2cYoIuQttKjeTIaWFOOk4s60PzAqV4a6GeoUe3Gd9fbd+V+VLN2c2O41QqM4kRTbP09PacNmTXmwZMD5w9bvCdcNo34iQ7AeGeUXUU6CrVQr22Ape/MHTO+fPH6X5Dv94sYYHsYvvq9G8atqd70acgb0JDIhM5y6qZjfyodnfpk18Mep7uzVTNsmZw19YOt7h0P7zq2I0Ez6GCUzCC28uWp9qTlF2UOXTF/7DNHPzu4zrJo68tjj/rLx2iI9WmgjcmqpoEe1gEw1ZGOeMAIRLMEJmTQ4kxxG4zIvGlgdI8NL1+/YDeHsHquOE5ebh4a8UNdiKJ8DsqKERSCPm/ny+kFJU8fl5l0sv6B4xkIIYohImZ9Lg+OMYYQIPi8/PPoZzYveP1Q89FRIV9IJiYKKmhAQxGu4pkKOQVGgTJgTEcyFjOsnTZ+c93eK1ESCn7n/ty2RKb/4ryHTynVs7sZc+7ZdscXi5RG1TLsk0untuq+mUOSh1z36riIINNG2IhLCkv0Z9e90HPevpdW1fkbEwEQcZij1MuSho764KZ3tl7x4oTfr2v5aoGmER0hxDMMIAqYKBzl0rm0L6oePny5+pjKQyGQX5p08C81wHaSaqm71DFy8VXlDf5GByaYyAaJuzZl7NS87Is/n7V9ziqqa31SrElQrTaFuRBs72JJW3HrwEmr7+g7qWXOuifSi8pX5zUH3df6dF//oOJDaUJKIDE64cS2yl25msA4bOFA1gUwq4bWGNG5JSkqednq25evAAC/TbSqXs0X+Qz5gM+hpV/QgxRBBIUpxpFvXXn/lqadT7AwRdmmLh/KJnNNs9podxJr46sTX3b1TugdPOMz2xRZJ7wzsevBmtJ5NaxxjKIolKM8AQb82VI5ajddCjzDWabOWw5PXnMFio72fjv0nkt5g0Kg49+76YGwqh5eO3nZSnbOKOTJkyftS44vleaMerS+PVzP/WJu94WH31pb4auKZyrTzAYjf2n8sJs+mVr8wXVv3DBia/3u1aqqQqviFgFhhDCmBFMUY45p+MOQe/o9NuRPNS5XREwd/k34+WQzF2D+CZ5mzu+54ojn+DhOxboOOme3WtWhMQNvWzn5oy9+/+EjvetbTuGrcq45fdvw/MCU5TP67zq1fUKYqqOzHOl0W/2udLcSAGCMYIGhIdEDW483nnQGhTCYJOuxaKvzi7623I/+OnLu3rioOPeDax/r8dmptTc21zeMR2bOdnnni29aMmHxFnahlXsGqBRKhQdfe+zBI+5jo8OgpHgC3rSQGo4M7EoIMRkgirNCBp9w6c6Z29Z/xxAVAgAmIwmGvTPyjn2nD89tUd12BJgBZWezHAKUihRlRWXsOXrr7lHIgTztdbofqwVSYHBmDpcBapcUbr/HQiHot701tc+q2g2fNimtSaAz1WazinnOgfesmLJs0UOfPz5gyeG3vsh2pOvEreHdDXudZlsUDahhKgsSNzop74qPJ72/Ov/fGHp/ci/4HyrukId1pkOOM/1tg8GACCOIYxz2+P3S+hMlxeNfufqD5Fib0WsKd//kWPH89Ge6lS+rWv7ZMXp6Wr3e0EnRNGJSTM3AETDIBs4iWbQ6X8PxVDF11vTc3/UI/bkhc//4LXN0TKNmrp6ZoIIKe+v2d63yVz1yWqnsXhGoSvmofM2669+88RpUCDrkQzt7+AdxCA4RCYQDCg3H1kJDp0A4AAghhDACplPNodvrrksZO3TnzG3rv0dgkblcLhxmCl53y6pXn+g/s5/DbKugjECE2cUYMKBtXBaEVOoWHLwH8oH7MeNrI58hKMo/m5EiYFAIen5RPgd5wKNC0G9cOmn8qpr1JU1KaxKoVLeYzeKlScP++OmUZYue/fLZLu8dXPZpS6g16kD1YQcxolBcVFKLL+hhgknke9u7P7p80vur81x5/L/b+P45D9jmURgwIfP5njuPhU72wmFOo0AEWZKJnTczh+TALbIbxyAHq/TXgrvJQ5CM+E6xacATDoLeYKPFbtmeaIr/bEjy4PVPXvZ4PQBYJq2YMmp39cGbG6ubLg6Zw4Z4c3TD9SnXXP6Xq5/6+ndLfjfmU8/Gd1tUj5P5NN1iNPP9E3o9suXODXNUUOFCTzVjDA1aNHzOvqZDD2qqThhCDASGcywZa4/9cd9Y3UV+0KsyxlD7xsyYv3Q+0qS1duFUTidM5yGy2FMHQrEdWejMi2d0K7zskW++N/xe4J1bBBEuWjzyvn2tpfM8AR8FBNguWcjAuL6T19yx4t1pi2emFrd+/GWr7snggpgQiXJmwazZRbO/Wq2N6mrKee3YffvuUB/XfrVe7y/mASPFTxdCCKlXJF4yKdYU20JNRMiyZ1SbjKZwXbARDtWWsfrGhpDGaI0m6chusPAxovOkkRpeTxDjb5g74bkex39/cPz6qZ8vfmr0rPLxb103Ke+ty/fvrNw//7D/yOigMWQY7OhXJoDAltYWrZu9du6AN6e9+cVV2WPHxvPOk0jmeZ8aVLc1fT07a0Gv4t1HNkQXTywmkAf8D3nD3KJcESHEUgwpJRhjyjDiLZJRAMa4mnD98Oe+ej4VCkH/9uLo8z56QQGCiUBmfvxAmq7paaAjQnjK22SLN0Z2lvMyzzNKcUAIo68qvhoLANC2B/gn3bUhH7jiicXk0KEdzqyXer23s/XreR6/XwUeYYdsb8mLHTJ+zR0r3n1s5WNdV3pWfZFiS7aITGCAGYcJgmAoiKrC9VFZxqySspk771aphqEACPyH4J8zwMJC6nK58IKbFxwYlzY6L1PuvFUF1eFXAyZBlnnZYeWsJptB8yt12Sz96bHdLh9R/+jJ7odn7rl90z1fFN3cc0K9BhrOc+Xxea48fuHIF16r89RvPNr4jS2X63rk+p5XfX0wWJZR0VAZ01DX5PiodNnyG968ZfSb4/+2a3rq5LxUa1IJbxHFsD+sHHYfu37Cp9N2TXz3tiu4Ety2zTzvOzs9h8oOUWCAasK1/cDGc5mWzkU3p15zSa4t+++SSTR+sP+TyT9mMIfaVLuOK+VxCqchJCEuwRpbOj59zIiGh0/07m/u+X/J5sQqFoW5cs+piQLwAN+xK+17I5MroiTLF3Nk4ru3XXHZqkk7jviO3xgKhBVsxGKSMb4sP/2qkZ/cWfT5tKXTB71x+IMNtaH6HKMmNJqMBi/IGJCONSpRvrMldc+2SWsnIISIy+WCX7PV9iuRHyOeQuYkuPSVK0cMXTjq/4YuvvTxvNfH3jG1+Pd9ZE7+hzpi/tmJr7O9zMipF9Kf7bE67S/dApcvuXqP+JSNSQV2mjWvZ8VtH07dHT8/Tb3kldFT2l4r9Zg/4EXjnHgGs2wUXDZmmZ3A+iy86OXdRzZEn8ePOz+B4gEABv9t5OJeLw1dYODltr4kB1OLpl00sWjSHYyxH2Yktxl3rxcvmmJZkMKyn+v7dml9qfnclxypPhI96NURf86Z1+fEw6tdOe3EhR8yvHPfa1HpyvheCy96xTI7kYHLzuAxmy7/JY5lvti76PPtn1sBAMa/ev2NUXM6ecFlYfgRC7E+Ga/2fHlgFS60avC0jWW80Lt0zZ41iRfwt//bjfBHhY7OSrr+ANum3bA6zclZ6/xLCpP+ZAuhJ4xs5NLLN9/22Z07zH+NY+kLcki/RUMLJSQCBgSXLrnyFucznRrxU1EMHrFo/NNOljQ38/ToN668kzHGn2eI5/z9hTtfT2mfNc8vyucgHy6c+FkUee2QV0bOGvBq3mNCe1s9YkCo/ecAACt2r4i+f8X90d9772aA4BzDY4wJI169Ynr8sxk13FMOBo9YVSi0M9vs1MDQRaP+yAEGCYkw8KW8pyyzExnMsjH8eBRBj9uZOMvJUp7ICMHjRpa5sM/BPYc3J37nIfyNInKCXcCDK48HVx7/U0/duUbY5S89PsRPW5nl2QTl4fWzVuUu7ucXZtmI45nkkPGZGNZz7sC32WlmAAC4r+ihjIznei43zIll4LIxeNTCjLNjWed53XZP+PvE687ztu0zGmevIehcStOPHqZzsKF+g/mMYX3rcDHGULu3/d7Pes7PGWP8+Dcm3tLpuW5fy3PiGDxmY/ColUlzYljKczkl+e9M7g0A8OiHT6ZlvtB7lTQ3hsGjVp17PIqiWXaGXVEMzbKpMNvG0p/pvmnD7kgU+E82PvSf6U0jax0kLEHqwpzXfF7/1CjeVlnlOR0bIGGJEwRAYaoTM+NTjEm7Rjovmv765Nd3c4Bh2KLRtx71lBc2E3e6FlQBMAKzwQixBueO7KjsBZ9PWvYJQihw1mufEfP5+SOI3yO4dF7G3FacdrlcqBAKcXv3AQFAY1OTdeKnU/JPtJy4tyHU1DuohAAIo9gk4Chsrc9ydJm9565NCwgQyHtz/K1ltQfntigt8RollKM8RpgBY4wRxohgFfg0c+oH5ffsuQMh5L+Q2mOHAX5/twVJINLezw8qOKAfdYVCAbCLdhIiKkc0DQilOvCMtwgGpY+91zMFuY+8cMkll7jX7i6yPbht/oOngpV3+WjAqQc1AA6BUZQhSrCdSDInLh2c3O+DxeNfLD1vZNIFfB7kRShTBYUXxov7rrbat/rNG2EjLoESOLf0ISER7lwxo9f2mj03Vntqb2ql3rRwWAFQCcMyh6y8JZxoiX99StbEwgfGPNDw0IcPpX9yeu1zlXrNNf6AHyyqSQEBgY/6JUEQiaZrnMFkhGxb5rxD03f8SWUq/NyyT4cBnvvlTgSMixG54u/XXL2tbs8rrcwXzTxUB0x5himAokN8dEJrvBSDGsINTWnWtNm77t7yhg463PPx/Skl1SX31wYapvhUv01XtAjL2iCBmRpIlGzbGmeO/aRvbK81L10973y61jlkhrbCO8R2i2UAAMVlxQzA1V4KgPxu+ZENT2UNqKRdmSriEem5D5oyhu9cPqPngYayUfXepgkexTPEj0JYD6sRlTezBGZkCEcLzvcvSxv+/OLrFpTSUib2XjvkkUql6g8exWePDDsDEhBPkoR4d5VWZ1aNmsHGbOHuUV2nb797/Rs66Jix88kOHQb4zyU4PBSCPuOj+7M+Ofn5a3V6/TAuzGnx1mhfoNUr9Ejq7j/gPWpr9jYYk01JAbts35NqSV647vbPilTQYOaKmakbjm2dXqs23+jngmlhRQEIEwABg8gLYGQSNYnmQ1bJusUp2Td3c6TvXZS/qEJCYkAD7SfHZQQAPAigMtUwtfjuzse8J/u0hD3DW0OtQwNKIDeIFaQpKoDOAEQOJEkCE5UbkmwJywYl9Hvh1WsXfiMADz1fvOiOZrXpPuBQbk2gHkiIEIwQR6gOFFHmsDg9aki1G4ym0suTL53y9s1Ldre18P51Q1IdBghns8uJxYQxxvdcNGhWRUvlw5QQ3gCyT9NVo58PcqKX17I6Z5WdDlT2ZioDuyHqy06G5AWbpq9bQYAAY0weuOSSG+p99Td7VN/wEFJkVVUBdArAIcCiAALwIGs8kUSpThLEciMyHEOIHbfI9lqHbHfbJEvgeF15fZTs0DmBwy3+FkhypkZTLWzzkKCtWXPH6kTLCOjhTEVXMsNqOEnlNU6lOlBVA6AMgMPACwIYmIFaDdYtCaa4d96+7uX3cmO6+ihj4uCFIyZXktq73X53X43TYFjy4J17y/f1C6hBjsMcc9ijWmoDDU5RliGFT1i8atiHD2YNzvL+mtNs/3sGeM5lHwOCK9+5ZuiWkztf4q1ibwsyBsNUCXDA21R3EOmEgN8YxjGiIxDy+K2xUbF7OQm/Pdp81dJ5kwobOODg9o/v7bSjZueEpqD7yiAJ9g9jLUohKhBNP6tHgxEgjIHDGHjEA8cwIAagKzrjEAcII0QZY4hHCDAAQRR0IEAZBcoIgNYWgTkMHOZAxAJITAyYBfOBKNn6WXdHr2XFt7x2hAKFCUtuTq5Ta2+o8dX+sVFrTgYJAWIQDoXDYraj874WzetsCDQmIw0js8mMJZBO9HR0u3/jtM8+IUDhP4FY8Ns3wHPvZYWgM8akHi8OeOh0sOaBgB40EVVjyE+Jw+kAPwlyUpj39k7oV9cnu6e24Zv1Sc0+DzFowirE4/e/efjgGoSQjgFgU+Nmy59XFA5r8bde6tP9/UJUzdY0JUFnGqg8BarTNr3ANtpc+xJrrk0t6YxwUkS7BgscCMADTzmQONEtCXK5ARl2xRlj1t908VUb78v9YzMDCjqj8vBXr5hQ7a+8Xkd0uJNaBS8XqDzuOdkN+QHbou3BIA0Y+zl7761019mrtNNdLIJdixVi//Zc3izXNX2ucUM+cFAE9L+1u/HfaIBtVeV8DoqLCQKAGR/em7Pq+EZXfbj2RgQCxBmim8KhsFnjSCAjPb2h6sTpRI/mC/uEYFwaSoGUuMTa4/UnQ9kJ2SUKp2xI5VO2LLtl6QkdVABAIPACXL80P+N0U11uK/i6UoVme1RfNKU0DihYEI9ljDmZEcYwRixEVDfPYZUDqDML5maRF08LvFiabEk6vPyWd4+ISAhTIICBg6kfz+i0t3bfqKZwyxVe4h0WBDUmHPLD9RlX7+2T2vOrJXtfH1bf2tg7gYvxhAXdUBOsEiWzmRN5CaJ1++pBSX0eL7r5nd0UGPzaI5QdBvgD3pAHDsa9e3Pe1zW7H2nxNI8OmxUwIVOrjDlFBNHkdvstcY6Yhj9cMmPGvsrSB1fu+bSfFG/CWlAD3a+oWBZOyqJhlwWbdycao/dOGHjD0T/0ntqAAYEOBAhQEIAHDBxwiAPEARBKATMEhBFgwIC0Xb944IECg/UHNkQ9vmtOVn2gfpCm034+1dtfRXp2WFQ5VVOBBXVAgAjjGYvnojlew26/KSSoIU2SgqLi50NmbMfg0JzbusfmPL1+ysrPNNDgv93r/ZYM8Gzh+lAhgmIgIogwYem1l+3xlc1sbWi5PKAG+OyknBPg16PNUSaob21s9AQ8Mc7oKPjmdJm5t31gvW4mUmnzQQfmjMABAgEJICIhzCO+1igb60HRT/ZN6nmyKej1NpHm2gTeztNmGrJ0djQoSiihtqHJZDGbYkNa2OImvhjGID2shBLCJJwkGWWjUTbAKc8piArbwRxno+6gm2lUAU0hGGkMMRlBpj39SJRqptsaduWCnQMDMUEsjt7SNSnzhY1TVn0Y1sORro3LBfAfXtv73zPA9qgcuYhTAGACCDDp3akDd7bsm9rsb56YFdPF7eN9pmw+s6laqQrLosGz/tCm4TzPKw57tLvGXR+PNEQZZgA84hiiEVkujkA/Y889nRLTar6oLbkqqPjBTI0wxDKwvCx0NLOJbwFdp5G8hUUWSFCdRHbDAQGTbAklGKKbTrlPJCQZU9wexWsJ64pkNppIq+oFqlDGMOVjzDHNIieZNV9IjXbGr+qT0ftvy8a9uTFMlPOqAPAbA4LfINp0Vlh7xrxq3+rYmlCLcf62+fMpov1asDvJ4/OBj3og2hRbmYBiK0tbDg1CjAfMYQw4soqEEJ0KmIf0+E5HK6orE8Uo0SSqmMRKcT5mxC2HTpRmGCUTIkZG1YAKCEU2f2KOQxgA6YggxBgiug4CLzKNIwipjICIwcyZmI8GeF4WwKTJYBKMBxNscUvvGnzbO9N7Ta/SI+EcQVE+/i0a3m/aAM9GZhcubAvNAAACCDD5s2lZhyu+uawx3HS5W3UPVIkWq3M6+MOBtmk2HJlRAcQoo8ABBiISHlEGki7quTHZDRV6dXyztxFjECBeiPU0KC1WiikARQwQAo7jGMcjpqgqcAyBzigGnmEQOOARBkESwaAKit0QtTfeFr96oLPXyiXXvrQ3qIfOlJvyu+Wj4t+w4f1PGGA7zlmIc0ZhWgQBjp0+7nh4x+N9jrdW5LWGfYO8IW/XkBJK1ngdqZwOjKOQyMWApEpQ7vkGQAOQrEbABh5CHg9LiEqpiQNn9b7WgwOBEyKlGR5H+DUcAh5xIGAeRCKAjKQWk2wut8nW3Z1sSZsvSx+18/7B00+EqXJex4cVMPLf0ELrMMB/xivCRgyFJef1akUQQGGqsWBNQfqBhqOZrao316N50oKaP9ZOHay2pbpL2KAliwZJ8wd8FlGSDAYmUTWg4DDWgpIgUYpZi5E3BgyiwY0YO243RFVaLcZD2YaM49fljD82uuvoRoWEz01dI4PzBS76n8xY6TDAX9AzTiyeiCO6fOeTB9ofDgYOABjwvABbKrZEZ5gy6Cv7X7HJmhwV5DRs4HmN+IknIz5DG9d7XBMAqEbewBSiAP3HKskZUcufq0nTYYC/aYuM0KcOdTuEisuKI8/mUJsV/TThHgT5gCEXUDuLpuhXUMXvMMD/kbtkQUEBgoJzftD27zYOYcSUO9CBDnSgAx3oQAc60IEOdKADHehABzrQgQ50oAMd6EAHOtCBDnSgAx3oQAc60IEOdKADHehAB/5H8P+7hrmgyi3gKAAAAABJRU5ErkJggg=='

function fmtSpread(n:number|null){
  if(n===null) return 'Line not posted'
  if(n===0) return 'PK'
  return n>0 ? `+${n}` : `${n}`
}

function fmtEastern(value:string|Date){
  return new Date(value).toLocaleString('en-US',{
    timeZone:'America/New_York',
    month:'short',
    day:'numeric',
    hour:'numeric',
    minute:'2-digit'
  })
}

function fmtEasternWithSeconds(value:string|Date){
  return new Date(value).toLocaleString('en-US',{
    timeZone:'America/New_York',
    month:'short',
    day:'numeric',
    hour:'numeric',
    minute:'2-digit',
    second:'2-digit'
  })
}

function bookmakerLabel(value:any){
  const normalized=String(value||'').toLowerCase()
  if(normalized==='betmgm') return 'BetMGM'
  return value || 'Not available yet'
}

function AllTimesEastern(){
  return (
    <div
      className="muted"
      style={{
        fontSize:'0.72rem',
        marginTop:-8,
        marginBottom:12
      }}
    >
      All Times Eastern
    </div>
  )
}

export default async function MyPick({
  searchParams
}:{
  searchParams:Promise<{
    saved?:string
    error?:string
  }>
}){
  const sp=await searchParams
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()

  if(!user) redirect('/login')

  const [
    {data:profile},
    {data:squad}
  ]=await Promise.all([
    supabase
      .from('users')
      .select('role')
      .eq('id',user.id)
      .maybeSingle(),

    supabase
      .from('squads')
      .select(`
        id,
        squad_name,
        nfl_team_id,
        logo_path,
        nfl_teams(
          name,
          abbreviation
        )
      `)
      .eq('user_id',user.id)
      .eq('season_year',2026)
      .maybeSingle()
  ])

  const commissioner=profile?.role==='commissioner'

  if(!squad){
    return (
      <main className="wrap">
        <Nav commissioner={commissioner}/>
        <h1 style={{textAlign:'center'}}>My Pick</h1>
        <div
          className="card"
          style={{textAlign:'center',maxWidth:720,margin:'0 auto'}}
        >
          Your squad has not been assigned yet.
        </div>
      </main>
    )
  }

  const [
    {data:leagueSquads},
    {data:allGames},
    {data:weekStatusRows}
  ]=await Promise.all([
    supabase
      .from('squads')
      .select(`
        id,
        squad_name,
        nfl_team_id,
        logo_path,
        nfl_teams(
          name,
          abbreviation
        )
      `)
      .eq('season_year',2026),

    supabase
      .from('games')
      .select(`
        id,
        nfl_week,
        kickoff_time,
        scheduled_kickoff_time,
        pick_lock_at,
        pick_opened_at,
        pick_open_bookmaker,
        pick_open_spread,
        spread,
        status,
        final_at,
        home_team_id,
        away_team_id,
        odds_bookmaker,
        odds_updated_at,
        closing_bookmaker,
        closing_received_at,
        closing_finalized_at,

        home:
          nfl_teams!games_home_team_id_fkey(
            name,
            abbreviation
          ),

        away:
          nfl_teams!games_away_team_id_fkey(
            name,
            abbreviation
          )
      `)
      .eq('season_year',2026)
      .or(`home_team_id.eq.${squad.nfl_team_id},away_team_id.eq.${squad.nfl_team_id}`)
      .order('nfl_week',{ascending:true})
      .order('kickoff_time',{ascending:true}),

    supabase.rpc('get_pick_week_open_statuses',{
      p_season:2026,
      p_squad_id:squad.id
    })
  ])

  const squadByNflTeam=new Map<number,any>()
  for(const s of leagueSquads||[]){
    squadByNflTeam.set(Number(s.nfl_team_id),s)
  }

  const squadGames=(allGames||[]) as any[]
  const weekOpenMap=new Map<number,boolean>()

  for(const row of weekStatusRows||[]){
    weekOpenMap.set(Number(row.nfl_week),row.is_open===true)
  }

  const weeks=[...new Set(squadGames.map((g:any)=>Number(g.nfl_week)))]
  const openWeeks=weeks
    .filter(week=>weekOpenMap.get(week)===true)
    .sort((a,b)=>b-a)

  let selectedWeek:number|null=null

  for(const week of openWeeks){
    const hasAvailableGame=squadGames.some(
      (g:any)=>
        Number(g.nfl_week)===week &&
        String(g.status||'').toLowerCase()!=='final'
    )

    if(hasAvailableGame){
      selectedWeek=week
      break
    }
  }

  const game:any=selectedWeek===null
    ? null
    : squadGames.find(
        (g:any)=>
          Number(g.nfl_week)===selectedWeek &&
          String(g.status||'').toLowerCase()!=='final'
      )

  if(!game){
    const nextGame=squadGames.find(
      (g:any)=>String(g.status||'').toLowerCase()!=='final'
    )

    if(!nextGame){
      return (
        <main className="wrap">
          <Nav commissioner={commissioner}/>
          <h1 style={{textAlign:'center'}}>My Pick</h1>
          <div
            className="card"
            style={{textAlign:'center',maxWidth:720,margin:'0 auto'}}
          >
            No remaining matchup found.
          </div>
        </main>
      )
    }

    const nextWeek=Number(nextGame.nfl_week)
    const nextKickoff=nextGame.scheduled_kickoff_time || nextGame.kickoff_time
    const previousGame=squadGames.find(
      (g:any)=>Number(g.nfl_week)===nextWeek-1
    )
    const previousGameFinal=
      previousGame &&
      String(previousGame.status||'').toLowerCase()==='final' &&
      Boolean(previousGame.final_at)

    let availabilityMessage:React.ReactNode

    if(previousGame && !previousGameFinal){
      availabilityMessage=(
        <>
          Selection opens as soon as your Week {nextWeek-1} game is final.
          {' '}Your next scheduled game is{' '}
        </>
      )
    }else if(previousGameFinal){
      availabilityMessage=(
        <>
          Your previous game is final. Waiting for the opening BetMGM line.
          {' '}Your next scheduled game is{' '}
        </>
      )
    }else{
      availabilityMessage=(
        <>
          Because your squad has a bye in Week {nextWeek-1}, selection opens
          7 days prior to your next scheduled game. Your next scheduled game is{' '}
        </>
      )
    }

    return (
      <main className="wrap">
        <Nav commissioner={commissioner}/>
        <h1 style={{textAlign:'center'}}>My Pick</h1>

        <section
          className="card"
          style={{textAlign:'center',maxWidth:720,margin:'0 auto'}}
        >
          <h2>Week {nextWeek}</h2>
          <AllTimesEastern/>

          <p style={{fontWeight:700,lineHeight:1.5}}>
            {availabilityMessage}
            {new Date(nextKickoff).toLocaleString('en-US',{
              timeZone:'America/New_York',
              weekday:'long',
              month:'long',
              day:'numeric',
              hour:'numeric',
              minute:'2-digit'
            })}.
          </p>
        </section>
      </main>
    )
  }

  const playoffWeek=Number(game.nfl_week)>=16 && Number(game.nfl_week)<=18
  const awaySquad=squadByNflTeam.get(Number(game.away_team_id))
  const homeSquad=squadByNflTeam.get(Number(game.home_team_id))

  const awayName=awaySquad?.squad_name || game.away?.name
  const homeName=homeSquad?.squad_name || game.home?.name
  const kickoffTime=game.scheduled_kickoff_time || game.kickoff_time

  const gameStatus=String(game.status||'').toLowerCase()
  const gameStarted=gameStatus==='live' || gameStatus==='final'
  const officialLineAvailable=Boolean(game.closing_finalized_at && game.closing_received_at)

  const oddsTimestamp=officialLineAvailable
    ? fmtEasternWithSeconds(game.closing_received_at)
    : game.odds_updated_at
      ? fmtEasternWithSeconds(game.odds_updated_at)
      : null

  const oddsSource=bookmakerLabel(
    officialLineAvailable
      ? game.closing_bookmaker
      : game.odds_bookmaker
  )

  const oddsLabel=officialLineAvailable
    ? 'Official line pulled'
    : 'Odds last updated'

  const {data:pick}=await supabase
    .from('picks')
    .select(`
      selection_team_id,
      result,
      ats_margin,
      is_locked,
      revealed,
      is_missed,
      game_total_prediction
    `)
    .eq('squad_id',squad.id)
    .eq('game_id',game.id)
    .maybeSingle()

  const savedSelectionTeamId=
    pick?.selection_team_id===null || pick?.selection_team_id===undefined
      ? null
      : Number(pick.selection_team_id)
  const hasSavedPick=savedSelectionTeamId!==null && pick?.is_missed!==true

  const weekOpen=weekOpenMap.get(Number(game.nfl_week))===true
  const deadline=game.pick_lock_at
    ? new Date(game.pick_lock_at)
    : new Date(new Date(kickoffTime).getTime()-1_000)
  const deadlinePassed=new Date()>=deadline
  const locked=deadlinePassed || gameStarted || pick?.is_locked===true

  const workingLineAvailable=game.spread!==null
  const homeSpread=workingLineAvailable ? Number(game.spread) : null
  const awaySpread=homeSpread===null ? null : -homeSpread
  const submissionDisabled=!weekOpen || locked

  const kickoffMs=new Date(kickoffTime).getTime()
  const sixHoursMs=6*60*60*1000
  const autoRefreshEnabled=gameStatus!=='final' && kickoffMs<=Date.now()+sixHoursMs && kickoffMs>=Date.now()-sixHoursMs

  let buttonText='Make a Decision'
  if(!weekOpen) buttonText='Week Not Open Yet'
  else if(locked) buttonText='Pick Locked'

  return (
    <main className="wrap">
      <LiveRefresh enabled={autoRefreshEnabled}/>
      <Nav commissioner={commissioner}/>
      <h1 style={{textAlign:'center'}}>My Pick</h1>

      <section
        className="card"
        style={{textAlign:'center',maxWidth:720,margin:'0 auto'}}
      >
        <h2>NFL Week {game.nfl_week}</h2>
        <AllTimesEastern/>

        <p>{fmtEastern(kickoffTime)}</p>

        <p>
          <b>Pick deadline:</b>{' '}
          {fmtEasternWithSeconds(deadline)}
        </p>

        <div
          className="muted"
          style={{
            margin:'6px 0 0',
            fontSize:'0.78rem',
            textAlign:'center',
            lineHeight:1.45
          }}
        >
          <div style={{whiteSpace:'nowrap'}}>
            {oddsLabel}:{' '}
            <b>{oddsTimestamp || 'Not available yet'}</b>
          </div>
          <div>
            Source: <b>{oddsSource}</b>
          </div>
        </div>

        {!weekOpen && (
          <p className="status">
            Week {game.nfl_week} picks are not open yet.
          </p>
        )}

        {gameStarted && (
          <p className="status">
            This game has started. Your pick is locked.
          </p>
        )}

        {!gameStarted && deadlinePassed && (
          <p className="status">
            The pick deadline has passed. Your pick is locked.
          </p>
        )}

        {sp.error==='week_closed' && (
          <p className="status">
            This week&apos;s picks are not open yet.
          </p>
        )}

        {sp.error==='locked' && (
          <p className="status">
            This pick is locked and can no longer be changed.
          </p>
        )}

        {sp.error==='game_total_required' && (
          <p className="status">
            A Game Total Prediction is required during the playoffs.
          </p>
        )}

        {sp.error==='bad_game_total' && (
          <p className="status">
            Please enter a valid Game Total Prediction.
          </p>
        )}

        {sp.error &&
         sp.error!=='week_closed' &&
         sp.error!=='locked' &&
         sp.error!=='game_total_required' &&
         sp.error!=='bad_game_total' && (
          <p className="status">
            Unable to save pick: {sp.error}
          </p>
        )}

        {pick?.is_missed && (
          <p className="status">
            No pick was submitted for this matchup.
          </p>
        )}

        <form
          action={submitPick}
          style={{display:'grid',gap:14,maxWidth:520,margin:'20px auto 0'}}
        >
          <input type="hidden" name="squad_id" value={squad.id}/>
          <input type="hidden" name="game_id" value={game.id}/>

          <label
            className={`pick pick-choice${hasSavedPick && savedSelectionTeamId===Number(game.away_team_id) ? ' pick-choice-saved' : ''}`}
            style={{
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              gap:8,
              textAlign:'center'
            }}
          >
            <input
              className="pick-choice-input"
              type="radio"
              name="selection_team_id"
              value={game.away_team_id}
              defaultChecked={savedSelectionTeamId===Number(game.away_team_id)}
              required
              disabled={!weekOpen || locked}
            />

            {hasSavedPick && savedSelectionTeamId===Number(game.away_team_id) && (
              <img
                src={PICKED_STAMP_SRC}
                alt="Picked"
                width={68}
                height={68}
                style={{
                  width:68,
                  height:68,
                  flex:'0 0 68px',
                  objectFit:'contain'
                }}
              />
            )}

            <SquadLogo
              logoPath={awaySquad?.logo_path}
              nflAbbreviation={game.away?.abbreviation}
              squadName={awayName}
              size={28}
            />

            <b><SquadNameLines squadName={awayName} nflName={game.away?.name}/></b>
            <span>{fmtSpread(awaySpread)}</span>
          </label>

          <label
            className={`pick pick-choice${hasSavedPick && savedSelectionTeamId===Number(game.home_team_id) ? ' pick-choice-saved' : ''}`}
            style={{
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              gap:8,
              textAlign:'center'
            }}
          >
            <input
              className="pick-choice-input"
              type="radio"
              name="selection_team_id"
              value={game.home_team_id}
              defaultChecked={savedSelectionTeamId===Number(game.home_team_id)}
              required
              disabled={!weekOpen || locked}
            />

            {hasSavedPick && savedSelectionTeamId===Number(game.home_team_id) && (
              <img
                src={PICKED_STAMP_SRC}
                alt="Picked"
                width={68}
                height={68}
                style={{
                  width:68,
                  height:68,
                  flex:'0 0 68px',
                  objectFit:'contain'
                }}
              />
            )}

            <SquadLogo
              logoPath={homeSquad?.logo_path}
              nflAbbreviation={game.home?.abbreviation}
              squadName={homeName}
              size={28}
            />

            <b><SquadNameLines squadName={homeName} nflName={game.home?.name}/></b>
            <span>{fmtSpread(homeSpread)}</span>
          </label>

          {playoffWeek && (
            <div
              style={{
                marginTop:4,
                padding:'14px 12px',
                border:'1px solid #ddd',
                borderRadius:10,
                textAlign:'center'
              }}
            >
              <label
                htmlFor="game_total_prediction"
                style={{display:'block',fontWeight:800,marginBottom:8}}
              >
                Game Total Prediction
              </label>

              <input
                id="game_total_prediction"
                name="game_total_prediction"
                type="number"
                min="0"
                step="any"
                required
                disabled={!weekOpen || locked}
                defaultValue={pick?.game_total_prediction ?? ''}
                inputMode="decimal"
                style={{
                  width:120,
                  maxWidth:'100%',
                  textAlign:'center',
                  fontSize:'1.05rem',
                  fontWeight:700,
                  padding:'9px 10px'
                }}
              />

              <p
                className="muted"
                style={{
                  fontSize:'0.78rem',
                  lineHeight:1.4,
                  margin:'8px auto 0',
                  maxWidth:400
                }}
              >
                Predict the total combined points scored in your NFL game.
                Closest prediction is the first playoff tiebreaker.
              </p>
            </div>
          )}

          <div
            className="muted"
            style={{
              fontSize:'0.78rem',
              lineHeight:1.45,
              margin:'2px auto 0',
              maxWidth:440,
              textAlign:'center'
            }}
          >
            <div>Lines are subject to change.</div>
            <div>Bet window closes one second before kickoff.</div>
            <div>Your official line is assigned at kickoff.</div>
          </div>

          <div style={{textAlign:'center',marginTop:6}}>
            <PickDeadlineCountdown
              kickoffTime={new Date(kickoffTime).toISOString()}
              lockTime={deadline.toISOString()}
            />

            <button
              className="submit"
              type="submit"
              disabled={submissionDisabled}
            >
              {buttonText}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
