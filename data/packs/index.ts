// data/packs/index.ts
import freePack from './free_pack.json'
import packEvent from './pack_event.json'
import psgStart from './psg_start.json'

export const allCards = [
  ...freePack,
  ...packEvent,
  ...psgStart,
]