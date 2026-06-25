import type { MascotArt } from '../types'
import { GENERIC } from './_generic'
import { ALG } from './ALG'
import { ARG } from './ARG'
import { AUS } from './AUS'
import { AUT } from './AUT'
import { BEL } from './BEL'
import { BIH } from './BIH'
import { BRA } from './BRA'
import { CAN } from './CAN'
import { CIV } from './CIV'
import { COD } from './COD'
import { COL } from './COL'
import { CPV } from './CPV'
import { CRO } from './CRO'
import { CUW } from './CUW'
import { CZE } from './CZE'
import { ECU } from './ECU'
import { EGY } from './EGY'
import { ENG } from './ENG'
import { ESP } from './ESP'
import { FRA } from './FRA'
import { GER } from './GER'
import { GHA } from './GHA'
import { HAI } from './HAI'
import { IRN } from './IRN'
import { IRQ } from './IRQ'
import { JOR } from './JOR'
import { JPN } from './JPN'
import { KOR } from './KOR'
import { KSA } from './KSA'
import { MAR } from './MAR'
import { MEX } from './MEX'
import { NED } from './NED'
import { NOR } from './NOR'
import { NZL } from './NZL'
import { PAN } from './PAN'
import { PAR } from './PAR'
import { POR } from './POR'
import { QAT } from './QAT'
import { RSA } from './RSA'
import { SCO } from './SCO'
import { SEN } from './SEN'
import { SUI } from './SUI'
import { SWE } from './SWE'
import { TUN } from './TUN'
import { TUR } from './TUR'
import { URU } from './URU'
import { USA } from './USA'
import { UZB } from './UZB'

/** Per-team hand-authored mascots. Any team not listed falls back to GENERIC. */
export const MASCOT_ART: Record<string, MascotArt> = {
  ALG,
  ARG,
  AUS,
  AUT,
  BEL,
  BIH,
  BRA,
  CAN,
  CIV,
  COD,
  COL,
  CPV,
  CRO,
  CUW,
  CZE,
  ECU,
  EGY,
  ENG,
  ESP,
  FRA,
  GER,
  GHA,
  HAI,
  IRN,
  IRQ,
  JOR,
  JPN,
  KOR,
  KSA,
  MAR,
  MEX,
  NED,
  NOR,
  NZL,
  PAN,
  PAR,
  POR,
  QAT,
  RSA,
  SCO,
  SEN,
  SUI,
  SWE,
  TUN,
  TUR,
  URU,
  USA,
  UZB,
}

export { GENERIC }
