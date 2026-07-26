# Nationals competitive-family research

## Purpose

The selector can contain thousands of model-year rows, but Nationals evidence should be maintained
at the stable vehicle-family level. This ledger defines the production-car families researched for
the five completed SCCA Solo National Championships from 2021 through 2025. It does not replace
Appendix A placement and never assigns the user's class.

The seed dataset contains 349 official class-winner rows. A class win is a conservative, auditable
signal that a family has been nationally competitive. Absence from this winner set does not mean a
vehicle is ineligible or uncompetitive.

## Matching policy

1. Resolve the selected year, make, model family, and rulebook package.
2. Resolve that identity to a reviewed generation or chassis range.
3. Match only official winner records whose published vehicle year falls inside that range.
4. When the selected identity names a performance package, match only the same reviewed package.
5. Exclude records with no usable vehicle year, an ambiguous identity, or a different generation.
6. Return no inferred history for a selector family that has not been researched.

The model-year ranges and package terms are implemented in
`src/data/vehicle-generations.ts`. Current Appendix A is the primary source for SCCA-facing year and
chassis wording. Official manufacturer histories supplement generation names where useful.

## Reviewed production families

The ledger currently contains 40 researched family keys. Selector names such as Porsche
`911`/`Turbo` and Toyota `Supra`/`GR Supra` are canonicalized to one physical family rather than
duplicating their ranges.

- Acura: NSX
- Audi: TT
- BMW: 3 Series, M2, M3, Z3
- Chevrolet: Camaro, Corvette
- Eagle: Talon
- Ford: Focus, Mustang
- Honda: Civic/CRX, S2000
- Lotus: Elise/Exige, Evora
- Mazda: Mazda3, Mazda6/Mazdaspeed6, MX-5 Miata, RX-7, RX-8
- MINI: Cooper
- Mitsubishi: Lancer/Evolution
- Nissan: 240SX, 350Z, Z
- Pontiac: Solstice
- Porsche: 718, 911/Turbo, Boxster, Cayman
- Scion: FR-S
- Subaru: BRZ, WRX/STI
- Tesla: Model 3
- Toyota: 86, Celica, GR86, GR Supra/Supra, MR2
- Volkswagen: Golf

## Reviewed package boundaries

Package filtering is applied only where the annual report text and selector wording support a
repeatable distinction. Current groups cover:

- Audi TT RS and TTS
- BMW 3 Series 328/330 winner identities
- Camaro SS, Z/28, and ZL1
- Corvette Stingray, Grand Sport, and Z06
- Eagle Talon TSi AWD
- Ford Focus RS/ST
- Ford Mustang EcoBoost, GT, Shelby, Mach 1, Dark Horse, and SVO
- Honda Civic CRX, Si, Sport, and Type R
- Honda S2000 CR/non-CR
- Lotus Elise/Exige
- Lotus Evora S/GT
- Mazda Mazdaspeed6
- MINI Cooper S and John Cooper Works
- Mitsubishi Lancer Evolution
- Nissan 350Z NISMO
- Nissan Z Performance/NISMO
- Pontiac Solstice GXP
- Porsche 911 GT3/GT3 RS/Turbo, Boxster S/GTS/Spyder, and Cayman S/GTS/GT4/GT4 RS
- Subaru BRZ tS and WRX/STI
- Tesla Model 3 RWD and AWD/Performance
- Toyota Celica GT/GT-S, MR2 induction/body groups, and Supra four-/six-cylinder groups
- Volkswagen Golf GTI/R

A generic annual-results label is not silently promoted to a named package. Likewise, a selected
named package cannot inherit a result from another named package.

## Deliberate exclusions

Purpose-built karts, formula cars, specials, and university cars remain outside production-family
matching. Examples in the five-year winner corpus include Formula SAE cars, Van Diemen, Novakar,
Tonykart, Radical, Stalker, and one-off vehicles such as Doof and the Delta Flyer.

Pre-1990 production winners are represented by the selector's `Older` choice, which does not carry a
numeric model year. Until the exact year/chassis can be selected, cars such as the first-generation
Rabbit, Scirocco, Lotus Elan, Toyota Starlet, Porsche 914/6, and Nissan Roadster do not receive
generation-inferred history.

## Sources

- Current SCCA National Solo Rules and Appendix A:
  https://www.scca.com/downloads/78494/download
- Official SCCA Solo results archive:
  https://www.scca.com/pages/solo-archives
- Ford Mustang milestones:
  https://media.ford.com/content/dam/fordmedia/North%20America/US/2013/12/05/Mustang_Milestones.pdf
- Ford seventh-generation Mustang:
  https://media.ford.com/content/fordmedia/feu/de/de/news/2022/09/15/der-neue-ford-mustang-setzt-neue-pony-car-massstaebe-in-puncto-d.html
- Mazda MX-5 history:
  https://news.mazdausa.com/download/2016_Mazda_MX-5_Press_Kit.pdf
- Mazda NB history:
  https://newsroom.mazda.com/en/publicity/release/2016/201604/160425a.html
- Porsche 911 generation history:
  https://newsroom.porsche.com/en/press-kits/60-Years-Porsche-911/60-Jahre-911---Generationen.html

## Maintenance

After each completed Nationals, regenerate the five-event winner dataset, review every new vehicle
identity, update only source-supported generation/package definitions, and add a regression case.
Never broaden a family match merely to make the history panel non-empty.
