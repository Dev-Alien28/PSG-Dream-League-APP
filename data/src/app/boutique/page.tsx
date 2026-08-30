// src/app/boutique/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import {
  activateCoinBoost,
  isCoinBoostActive,
  unlockTeamColor,
  setSelectedTeamColor,
  unlockFormation,
  unlockAffiche,
  setSelectedAffiche,
  getUserCollection,
  addCardToCollection,
} from '@/lib/supabase'
import { spendCoins, hasEnoughCoins } from '@/lib/coinEngine'
import { BOOST_ITEMS, PACK_RESET_ITEM, TEAM_COLOR_PALETTE, AFFICHE_CATALOG } from '@/lib/shopData'
import { PREMIUM_FORMATIONS, FORMATION_DEFS } from '@/lib/formationData'
import { playCoinGain, playError, playSuccess } from '@/lib/soundEngine'
import { tryClaimMilestone } from '@/lib/milestones'
import CoinDisplay from '@/components/CoinDisplay'
import type { User } from '@/types/user'
import encounterCards from '../../../data/packs/pack_encounter.json'

interface EncounterQuestion {
  question: string
  answers: string[]
  correct: number
}
interface EncounterCard {
  id: string
  nom: string
  stats: Record<string, number>
  questions: EncounterQuestion[]
}

type Tab = 'boosts' | 'couleurs' | 'rencontre' | 'compos' | 'affiches'

export default function BoutiquePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [coins, setCoins] = useState(0)
  const [tab, setTab] = useState<Tab>('boosts')
  const [boostActive, setBoostActive] = useState(false)
  const [unlockedColors, setUnlockedColors] = useState<string[]>(['rouge', 'bleu'])
  const [unlockedFormations, setUnlockedFormations] = useState<string[]>([])
  const [unlockedAffiches, setUnlockedAffiches] = useState<string[]>(['defaut'])
  const [selectedAffiche, setSelectedAffiche_] = useState('defaut')
  const [selectedColor, setSelectedColor] = useState('rouge')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // ── Rencontre (trivia) ──
  const [ownedEncounterIds, setOwnedEncounterIds] = useState<string[]>([])
  const [currentEncounter, setCurrentEncounter] = useState<EncounterCard | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<EncounterQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null)
  const [encounterBusy, setEncounterBusy] = useState(false)

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) { router.replace('/login'); return }
      setUser(u)
      setCoins(u.coins)
      setUnlockedColors(u.unlocked_colors ?? ['rouge', 'bleu'])
      setUnlockedFormations(u.unlocked_formations ?? [])
      setUnlockedAffiches(u.unlocked_affiches ?? ['defaut'])
      setSelectedAffiche_(u.selected_affiche ?? 'defaut')
      setSelectedColor(u.selected_color ?? 'rouge')
      setBoostActive(await isCoinBoostActive(u.id))

      const collection = await getUserCollection(u.id)
      const ownedIds = Array.from(new Set(
        collection.filter((c) => (encounterCards as unknown as EncounterCard[]).some((e) => e.id === c.base_card_id))
          .map((c) => c.base_card_id)
      ))
      setOwnedEncounterIds(ownedIds)
      pickNewEncounter(ownedIds)
    })
  }, [router])

  function pickNewEncounter(ownedIds: string[]) {
    const remaining = (encounterCards as unknown as EncounterCard[]).filter((c) => !ownedIds.includes(c.id))
    if (remaining.length === 0) {
      setCurrentEncounter(null)
      setCurrentQuestion(null)
      return
    }
    const card = remaining[Math.floor(Math.random() * remaining.length)]
    const question = card.questions[Math.floor(Math.random() * card.questions.length)]
    setCurrentEncounter(card)
    setCurrentQuestion(question)
    setSelectedAnswer(null)
    setAnswerResult(null)
  }

  const handleAnswerEncounter = async (answerIdx: number) => {
    if (!user || !currentEncounter || !currentQuestion || encounterBusy) return
    setSelectedAnswer(answerIdx)
    const isCorrect = answerIdx === currentQuestion.correct
    setAnswerResult(isCorrect ? 'correct' : 'wrong')

    if (isCorrect) {
      setEncounterBusy(true)
      playSuccess()
      await addCardToCollection(user.id, currentEncounter.id, 'pack_encounter')
      const updatedOwned = [...ownedEncounterIds, currentEncounter.id]
      setOwnedEncounterIds(updatedOwned)

      if (updatedOwned.length === (encounterCards as unknown as EncounterCard[]).length) {
        const milestone = await tryClaimMilestone(user.id, 'all_encounters', user.claimed_milestones ?? [])
        if (milestone.unlocked) {
          flash(`🎁 Jalon débloqué : Toutes les rencontres ! Carte Cadeau reçue — ${milestone.cardName}`, true)
        }
      }

      setTimeout(() => {
        setEncounterBusy(false)
        pickNewEncounter(updatedOwned)
      }, 1800)
    } else {
      playError()
      setTimeout(() => {
        pickNewEncounter(ownedEncounterIds)
      }, 1800)
    }
  }

  const flash = (text: string, ok: boolean) => {
    ok ? playCoinGain() : playError()
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 2500)
  }

  const handleBuyBoost = async (key: keyof typeof BOOST_ITEMS) => {
    if (!user) return
    const item = BOOST_ITEMS[key]
    setBusyKey(key)
    const ok = await hasEnoughCoins(user.id, item.prix)
    if (!ok) {
      flash(`Il te faut ${item.prix} \u20B1 pour ce boost.`, false)
      setBusyKey(null)
      return
    }
    const spent = await spendCoins(user.id, item.prix)
    if (!spent) {
      flash(`Il te faut ${item.prix} \u20B1 pour ce boost.`, false)
      setBusyKey(null)
      return
    }
    const activated = await activateCoinBoost(user.id, item.durationMs)
    if (activated) {
      setCoins((prev) => prev - item.prix)
      setBoostActive(true)
      flash(`${item.emoji} Boost activé !`, true)
    } else {
      flash("Erreur lors de l'activation, coins remboursés.", false)
    }
    setBusyKey(null)
  }

  const handleBuyPackReset = async () => {
    if (!user) return
    setBusyKey('pack_reset')
    const ok = await hasEnoughCoins(user.id, PACK_RESET_ITEM.prix)
    if (!ok) {
      flash(`Il te faut ${PACK_RESET_ITEM.prix} \u20B1 pour cet article.`, false)
      setBusyKey(null)
      return
    }
    const spent = await spendCoins(user.id, PACK_RESET_ITEM.prix)
    if (!spent) {
      flash(`Il te faut ${PACK_RESET_ITEM.prix} \u20B1 pour cet article.`, false)
      setBusyKey(null)
      return
    }
    localStorage.removeItem('last_free_pack')
    setCoins((prev) => prev - PACK_RESET_ITEM.prix)
    flash('🎁 Pack gratuit disponible immédiatement !', true)
    setBusyKey(null)
  }

  const handleBuyColor = async (colorKey: string) => {
    if (!user) return
    const color = TEAM_COLOR_PALETTE[colorKey]
    setBusyKey(colorKey)
    if (color.prix > 0) {
      const ok = await hasEnoughCoins(user.id, color.prix)
      if (!ok) {
        flash(`Il te faut ${color.prix} \u20B1 pour cette couleur.`, false)
        setBusyKey(null)
        return
      }
      const spent = await spendCoins(user.id, color.prix)
      if (!spent) {
        flash(`Il te faut ${color.prix} \u20B1 pour cette couleur.`, false)
        setBusyKey(null)
        return
      }
    }
    const unlocked = await unlockTeamColor(user.id, colorKey, unlockedColors)
    if (!unlocked) {
      if (color.prix > 0) {
        const { incrementUserCoins } = await import('@/lib/supabase')
        await incrementUserCoins(user.id, color.prix)
      }
      flash("Erreur lors de l'achat, coins remboursés.", false)
      setBusyKey(null)
      return
    }
    const updatedUnlocked = Array.from(new Set([...unlockedColors, colorKey]))
    setUnlockedColors(updatedUnlocked)
    if (color.prix > 0) setCoins((prev) => prev - color.prix)
    await handleSelectColor(colorKey, updatedUnlocked)
    flash(`${color.emoji} Couleur ${color.nom} débloquée !`, true)
    setBusyKey(null)
  }

  const handleSelectColor = async (colorKey: string, unlockedList = unlockedColors) => {
    if (!user || !unlockedList.includes(colorKey)) return
    setSelectedColor(colorKey)
    await setSelectedTeamColor(user.id, colorKey)
  }

  const handleBuyFormation = async (formationKey: string) => {
    if (!user) return
    const def = FORMATION_DEFS[formationKey as keyof typeof FORMATION_DEFS]
    const prix = def.prix ?? 150
    setBusyKey(formationKey)

    const ok = await hasEnoughCoins(user.id, prix)
    if (!ok) {
      flash(`Il te faut ${prix} \u20B1 pour cette composition.`, false)
      setBusyKey(null)
      return
    }
    const spent = await spendCoins(user.id, prix)
    if (!spent) {
      flash(`Il te faut ${prix} \u20B1 pour cette composition.`, false)
      setBusyKey(null)
      return
    }
    const unlocked = await unlockFormation(user.id, formationKey, unlockedFormations)
    if (!unlocked) {
      const { incrementUserCoins } = await import('@/lib/supabase')
      await incrementUserCoins(user.id, prix)
      flash("Erreur lors de l'achat, coins remboursés.", false)
      setBusyKey(null)
      return
    }
    setUnlockedFormations((prev) => Array.from(new Set([...prev, formationKey])))
    setCoins((prev) => prev - prix)
    flash(`${def.emoji} Composition ${def.label} débloquée ! Sélectionne-la dans Collection > Équipe.`, true)
    setBusyKey(null)
  }

  const handleBuyAffiche = async (key: string) => {
    if (!user) return
    const def = AFFICHE_CATALOG[key]
    setBusyKey(key)

    if (def.prix > 0) {
      const ok = await hasEnoughCoins(user.id, def.prix)
      if (!ok) {
        flash(`Il te faut ${def.prix} \u20B1 pour cette affiche.`, false)
        setBusyKey(null)
        return
      }
      const spent = await spendCoins(user.id, def.prix)
      if (!spent) {
        flash(`Il te faut ${def.prix} \u20B1 pour cette affiche.`, false)
        setBusyKey(null)
        return
      }
    }
    const unlocked = await unlockAffiche(user.id, key, unlockedAffiches)
    if (!unlocked) {
      if (def.prix > 0) {
        const { incrementUserCoins } = await import('@/lib/supabase')
        await incrementUserCoins(user.id, def.prix)
      }
      flash("Erreur lors de l'achat, coins remboursés.", false)
      setBusyKey(null)
      return
    }
    const updatedUnlocked = Array.from(new Set([...unlockedAffiches, key]))
    setUnlockedAffiches(updatedUnlocked)
    if (def.prix > 0) setCoins((prev) => prev - def.prix)
    await handleSelectAffiche(key, updatedUnlocked)
    flash(`${def.emoji} Affiche ${def.nom} débloquée !`, true)
    setBusyKey(null)
  }

  const handleSelectAffiche = async (key: string, unlockedList = unlockedAffiches) => {
    if (!user || !unlockedList.includes(key)) return
    setSelectedAffiche_(key)
    await setSelectedAffiche(user.id, key)
  }

  if (!user) {
    return <div className="loader-center"><div className="loader" /></div>
  }

  return (
    <>
      <style>{`
        .shop-tabs { display: flex; gap: 8px; margin: 0 16px 16px; }
        .shop-tab {
          flex: 1;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
          background: rgba(255,255,255,0.03);
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-muted);
          cursor: pointer;
        }
        .shop-tab.active { border-color: rgba(196,160,80,0.4); color: #c4a050; background: rgba(196,160,80,0.08); }
        .shop-boost-banner {
          margin: 0 16px 16px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(74,222,128,0.1);
          border: 1px solid rgba(74,222,128,0.3);
          color: #4ade80;
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 13px;
          text-align: center;
        }
        .shop-item {
          margin: 0 16px 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .shop-item-icon { font-size: 30px; flex-shrink: 0; width: 40px; text-align: center; }
        .shop-item-name {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.02em;
        }
        .shop-item-desc {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 3px;
          line-height: 1.4;
        }
        .shop-buy-btn {
          flex-shrink: 0;
          padding: 9px 16px;
          border-radius: 10px;
          border: 1px solid rgba(196,160,80,0.4);
          background: rgba(196,160,80,0.12);
          color: #c4a050;
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }
        .shop-buy-btn:disabled { opacity: 0.5; cursor: default; }
        .shop-colors-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin: 0 16px 16px;
        }
        .shop-color-card {
          padding: 14px;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          background: rgba(255,255,255,0.03);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          position: relative;
        }
        .shop-color-card.selected { border-color: var(--dot); box-shadow: 0 0 0 1px var(--dot); }
        .shop-color-swatch {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--dot);
          box-shadow: 0 0 14px var(--dot);
        }
        .shop-color-name {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 13px;
        }
        .shop-color-price {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          color: #c4a050;
          font-weight: 700;
        }
        .shop-color-selected-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 14px;
        }
        .shop-toast {
          margin: 0 16px 16px;
          padding: 10px 14px;
          border-radius: 10px;
          text-align: center;
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 13px;
        }
        .shop-toast.ok { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
        .shop-toast.error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); color: #f87171; }
        .encounter-wrap { padding: 0 16px 16px; }
        .encounter-progress {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 12px;
        }
        .encounter-card { padding: 18px; }
        .encounter-card-name {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 800;
          font-size: 16px;
          color: #c4a050;
          margin-bottom: 12px;
          text-align: center;
        }
        .encounter-question {
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          text-align: center;
          margin-bottom: 16px;
          line-height: 1.4;
        }
        .encounter-answers { display: flex; flex-direction: column; gap: 8px; }
        .encounter-answer-btn {
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
          background: rgba(255,255,255,0.03);
          color: var(--text-secondary);
          font-family: 'Rajdhani', sans-serif;
          font-weight: 600;
          font-size: 14px;
          text-align: left;
          cursor: pointer;
        }
        .encounter-answer-btn:disabled { cursor: default; }
        .encounter-answer-btn.correct {
          border-color: rgba(74,222,128,0.5);
          background: rgba(74,222,128,0.12);
          color: #4ade80;
        }
        .encounter-answer-btn.wrong {
          border-color: rgba(248,113,113,0.5);
          background: rgba(248,113,113,0.12);
          color: #f87171;
        }
        .encounter-feedback {
          margin-top: 14px;
          text-align: center;
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 13px;
        }
        .encounter-feedback.ok { color: #4ade80; }
        .encounter-feedback.error { color: #f87171; }
      `}</style>

      <div className="page">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">Boutique</div>
            <div className="page-subtitle">Boosts, packs &amp; personnalisation</div>
          </div>
          <CoinDisplay amount={coins} size="sm" />
        </div>

        {boostActive && (
          <div className="shop-boost-banner">⚡ Boost x2 coins actif — profites-en pour jouer !</div>
        )}

        {msg && <div className={`shop-toast ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div>}

        <div className="shop-tabs">
          <button className={`shop-tab${tab === 'boosts' ? ' active' : ''}`} onClick={() => setTab('boosts')}>⚡ Boosts</button>
          <button className={`shop-tab${tab === 'couleurs' ? ' active' : ''}`} onClick={() => setTab('couleurs')}>🎨 Couleurs</button>
          <button className={`shop-tab${tab === 'rencontre' ? ' active' : ''}`} onClick={() => setTab('rencontre')}>🎤 Rencontre</button>
          <button className={`shop-tab${tab === 'compos' ? ' active' : ''}`} onClick={() => setTab('compos')}>🎯 Compos</button>
          <button className={`shop-tab${tab === 'affiches' ? ' active' : ''}`} onClick={() => setTab('affiches')}>🖼️ Affiches</button>
        </div>

        {tab === 'boosts' && (
          <>
            {(Object.entries(BOOST_ITEMS) as [keyof typeof BOOST_ITEMS, typeof BOOST_ITEMS[keyof typeof BOOST_ITEMS]][]).map(([key, item]) => (
              <div key={key} className="shop-item glass-card">
                <div className="shop-item-icon">{item.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div className="shop-item-name">{item.nom}</div>
                  <div className="shop-item-desc">{item.description}</div>
                </div>
                <button
                  className="shop-buy-btn"
                  disabled={busyKey === key}
                  onClick={() => handleBuyBoost(key)}
                >
                  {busyKey === key ? '…' : `${item.prix} \u20B1`}
                </button>
              </div>
            ))}

            <div className="shop-item glass-card">
              <div className="shop-item-icon">{PACK_RESET_ITEM.emoji}</div>
              <div style={{ flex: 1 }}>
                <div className="shop-item-name">{PACK_RESET_ITEM.nom}</div>
                <div className="shop-item-desc">{PACK_RESET_ITEM.description}</div>
              </div>
              <button
                className="shop-buy-btn"
                disabled={busyKey === 'pack_reset'}
                onClick={handleBuyPackReset}
              >
                {busyKey === 'pack_reset' ? '…' : `${PACK_RESET_ITEM.prix} \u20B1`}
              </button>
            </div>
          </>
        )}

        {tab === 'couleurs' && (
          <div className="shop-colors-grid">
            {Object.entries(TEAM_COLOR_PALETTE).map(([key, color]) => {
              const owned = unlockedColors.includes(key)
              const isSelected = selectedColor === key
              return (
                <div
                  key={key}
                  className={`shop-color-card${isSelected ? ' selected' : ''}`}
                  style={{ ['--dot' as string]: color.hex }}
                  onClick={() => (owned ? handleSelectColor(key) : handleBuyColor(key))}
                >
                  {isSelected && <span className="shop-color-selected-badge">✓</span>}
                  <div className="shop-color-swatch" />
                  <div className="shop-color-name">{color.emoji} {color.nom}</div>
                  <div className="shop-color-price">
                    {busyKey === key ? '…' : owned ? (isSelected ? 'Sélectionnée' : 'Choisir') : `${color.prix} \u20B1`}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'rencontre' && (
          <div className="encounter-wrap">
            <div className="encounter-progress">
              {ownedEncounterIds.length} / {(encounterCards as unknown as EncounterCard[]).length} rencontres complétées
            </div>

            {!currentEncounter || !currentQuestion ? (
              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <div className="empty-title">Toutes les rencontres complétées !</div>
                <div className="empty-desc">Tu as obtenu les 5 cartes Rencontre disponibles.</div>
              </div>
            ) : (
              <div className="encounter-card glass-card">
                <div className="encounter-card-name">🎤 {currentEncounter.nom}</div>
                <div className="encounter-question">{currentQuestion.question}</div>
                <div className="encounter-answers">
                  {currentQuestion.answers.map((answer, idx) => {
                    let variant = ''
                    if (answerResult) {
                      if (idx === currentQuestion.correct) variant = 'correct'
                      else if (idx === selectedAnswer) variant = 'wrong'
                    }
                    return (
                      <button
                        key={idx}
                        className={`encounter-answer-btn ${variant}`}
                        disabled={!!answerResult}
                        onClick={() => handleAnswerEncounter(idx)}
                      >
                        {answer}
                      </button>
                    )
                  })}
                </div>
                {answerResult === 'correct' && (
                  <div className="encounter-feedback ok">✅ Bonne réponse — carte obtenue !</div>
                )}
                {answerResult === 'wrong' && (
                  <div className="encounter-feedback error">❌ Pas la bonne réponse, réessaie avec une autre question…</div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'compos' && (
          <div className="compos-list">
            {PREMIUM_FORMATIONS.map((key) => {
              const def = FORMATION_DEFS[key]
              const owned = unlockedFormations.includes(key)
              return (
                <div key={key} className="shop-item glass-card">
                  <div className="shop-item-icon">{def.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div className="shop-item-name">{def.label} — {def.styleLabel}</div>
                    <div className="shop-item-desc">{def.description}</div>
                  </div>
                  <button
                    className="shop-buy-btn"
                    disabled={owned || busyKey === key}
                    onClick={() => handleBuyFormation(key)}
                  >
                    {owned ? 'Débloquée ✓' : busyKey === key ? '…' : `${def.prix} \u20B1`}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'affiches' && (
          <div className="shop-colors-grid">
            {Object.entries(AFFICHE_CATALOG).map(([key, def]) => {
              const owned = unlockedAffiches.includes(key)
              const isSelected = selectedAffiche === key
              return (
                <div
                  key={key}
                  className={`shop-color-card${isSelected ? ' selected' : ''}`}
                  style={{
                    ['--dot' as string]: '#c4a050',
                    background: def.gradient,
                  }}
                  onClick={() => (owned ? handleSelectAffiche(key) : handleBuyAffiche(key))}
                >
                  {isSelected && <span className="shop-color-selected-badge">✓</span>}
                  <div className="shop-color-name">{def.emoji} {def.nom}</div>
                  <div className="shop-color-price">
                    {busyKey === key ? '…' : owned ? (isSelected ? 'Sélectionnée' : 'Choisir') : `${def.prix} \u20B1`}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
