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

export interface AfficheDef {
  nom: string
  emoji: string
  gradient: string
  prix: number
}

// Le bot utilise de vraies images de fond (src/images/affiches/) — cette
// appli n'embarque pas ces assets, donc chaque affiche est recréée en CSS
// avec les mêmes couleurs/thèmes plutôt qu'un fichier PNG.
export const AFFICHE_CATALOG: Record<string, AfficheDef> = {
  defaut: {
    nom: 'Défaut',
    emoji: '⚽',
    gradient: 'linear-gradient(180deg, #0d2a0d 0%, #112e11 40%, #0d2a0d 100%)',
    prix: 0,
  },
  rouge_bleu: {
    nom: 'Rouge & Bleu',
    emoji: '🔴',
    gradient: 'linear-gradient(135deg, #7a0d1f 0%, #3d0a12 35%, #041e42 70%, #020f21 100%)',
    prix: 200,
  },
  blanc_bleu: {
    nom: 'Blanc & Bleu',
    emoji: '🔵',
    gradient: 'linear-gradient(135deg, #3a5a8a 0%, #1c2f4a 40%, #0a1220 75%, #050a12 100%)',
    prix: 200,
  },
  jaune_vert: {
    nom: 'Jaune & Vert',
    emoji: '🟡',
    gradient: 'linear-gradient(135deg, #6b6116 0%, #3d3a10 35%, #123d1f 70%, #081f10 100%)',
    prix: 200,
  },
  noir_blanc_gris: {
    nom: 'Noir, Blanc & Gris',
    emoji: '⚫',
    gradient: 'linear-gradient(135deg, #3a3a3d 0%, #232326 40%, #121214 75%, #08080a 100%)',
    prix: 200,
  },
  rose_noir: {
    nom: 'Rose & Noir',
    emoji: '🌸',
    gradient: 'linear-gradient(135deg, #7a1450 0%, #3d0a28 35%, #1a0812 70%, #0a0508 100%)',
    prix: 200,
  },
  halloween: {
    nom: 'Halloween',
    emoji: '🎃',
    gradient: 'linear-gradient(135deg, #7a3d0d 0%, #4a2408 35%, #1f0f2e 70%, #0d0517 100%)',
    prix: 200,
  },
}
