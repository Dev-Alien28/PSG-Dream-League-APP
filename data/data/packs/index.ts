// data/packs/index.ts
import freePack from './free_pack.json'
import packEvent from './pack_event.json'
import psgStart from './psg_start.json'
import packLegend from './pack_legend.json'
import packEncounter from './pack_encounter.json'
import packGive from './pack_give.json'

export const allCards = [
  ...freePack,
  ...packEvent,
  ...psgStart,
  ...packLegend,
  ...packEncounter,
  ...packGive,
]