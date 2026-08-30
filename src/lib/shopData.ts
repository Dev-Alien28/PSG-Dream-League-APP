// src/lib/shopData.ts
// Données statiques de la Boutique (palette de couleurs, boosts).
// Inspirées du système du bot Discord (TEAM_COLOR_PALETTE / SHOP_ITEMS dans
// src/config/settings.js), adaptées à ce qui existe réellement dans l'appli.

export interface TeamColorDef {
  nom: string
  hex: string
  emoji: string
  prix: number
}

export const TEAM_COLOR_PALETTE: Record<string, TeamColorDef> = {
  rouge:  { nom: 'Rouge',  hex: '#DA0037', emoji: '🔴', prix: 0 },
  bleu:   { nom: 'Bleu',   hex: '#57B9FF', emoji: '🔵', prix: 0 },
  rose:   { nom: 'Rose',   hex: '#FF4FA3', emoji: '🌸', prix: 100 },
  orange: { nom: 'Orange', hex: '#FF8C00', emoji: '🟠', prix: 100 },
  violet: { nom: 'Violet', hex: '#9B59B6', emoji: '🟣', prix: 100 },
  vert:   { nom: 'Vert',   hex: '#2ECC71', emoji: '🟢', prix: 100 },
  jaune:  { nom: 'Jaune',  hex: '#F1C40F', emoji: '🟡', prix: 100 },
  cyan:   { nom: 'Cyan',   hex: '#18D6C6', emoji: '🩵', prix: 100 },
}

export const BOOST_ITEMS = {
  boost_1h: {
    nom: 'Boost Coins x2 (1h)',
    emoji: '⚡',
    prix: 50,
    durationMs: 60 * 60 * 1000,
    description: 'Double tous tes gains de PSG Coins pendant 1 heure (matchs, tournoi, mini-jeu, chat).',
  },
  boost_24h: {
    nom: 'Boost Coins x2 (24h)',
    emoji: '🚀',
    prix: 200,
    durationMs: 24 * 60 * 60 * 1000,
    description: 'Double tous tes gains de PSG Coins pendant 24 heures (matchs, tournoi, mini-jeu, chat).',
  },
} as const

export const PACK_RESET_ITEM = {
  nom: 'Pack Gratuit Immédiat',
  emoji: '🎁',
  prix: 25,
  description: 'Réinitialise instantanément le cooldown de ton pack gratuit, sans attendre les 24h.',
}
