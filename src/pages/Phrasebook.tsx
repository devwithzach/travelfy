import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Search, Copy, Check, X } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import { cn } from '@/utils/cn'

type Dialect = 'tagalog' | 'bisaya' | 'ilocano' | 'kapampangan' | 'waray' | 'hiligaynon'
type Category = 'greetings' | 'emergency' | 'food' | 'transport' | 'shopping' | 'directions' | 'numbers' | 'common'

interface Phrase {
  english: string
  phrase: string
  pronunciation: string
  category: Category
}

const DIALECTS: { id: Dialect; label: string; region: string; emoji: string }[] = [
  { id: 'tagalog',     label: 'Tagalog',     region: 'Metro Manila, Luzon',   emoji: '🏙️' },
  { id: 'bisaya',      label: 'Bisaya',       region: 'Cebu, Bohol, Mindanao', emoji: '🌊' },
  { id: 'ilocano',     label: 'Ilocano',      region: 'Ilocos, N. Luzon',      emoji: '⛵' },
  { id: 'kapampangan', label: 'Kapampangan',  region: 'Pampanga, Clark',        emoji: '🌋' },
  { id: 'waray',       label: 'Waray',        region: 'Leyte, Samar',           emoji: '🌴' },
  { id: 'hiligaynon',  label: 'Hiligaynon',   region: 'Iloilo, Bacolod',        emoji: '🎶' },
]

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'greetings',  label: 'Greetings',   emoji: '👋' },
  { id: 'common',     label: 'Common',      emoji: '💬' },
  { id: 'emergency',  label: 'Emergency',   emoji: '🚨' },
  { id: 'food',       label: 'Food',        emoji: '🍚' },
  { id: 'transport',  label: 'Transport',   emoji: '🚌' },
  { id: 'directions', label: 'Directions',  emoji: '🗺️' },
  { id: 'shopping',   label: 'Shopping',    emoji: '🛒' },
  { id: 'numbers',    label: 'Numbers',     emoji: '🔢' },
]

const PHRASES: Record<Dialect, Phrase[]> = {
  tagalog: [
    // Greetings
    { english: 'Hello / Hi',           phrase: 'Kumusta',                     pronunciation: 'koo-MUS-tah',           category: 'greetings' },
    { english: 'Good morning',         phrase: 'Magandang umaga',             pronunciation: 'ma-GAN-dang oo-MA-ga',  category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Magandang hapon',             pronunciation: 'ma-GAN-dang HA-pon',    category: 'greetings' },
    { english: 'Good evening',         phrase: 'Magandang gabi',              pronunciation: 'ma-GAN-dang GA-bee',    category: 'greetings' },
    { english: 'Thank you',            phrase: 'Salamat',                     pronunciation: 'sa-LA-mat',             category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Walang anuman',               pronunciation: 'wa-LANG a-NOO-man',     category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Paalam',                      pronunciation: 'pa-A-lam',              category: 'greetings' },
    // Common
    { english: 'Yes',                  phrase: 'Oo',                          pronunciation: 'OH-oh',                 category: 'common' },
    { english: 'No',                   phrase: 'Hindi',                       pronunciation: 'HIN-dee',               category: 'common' },
    { english: 'Please',               phrase: 'Pakiusap',                    pronunciation: 'pa-kee-OO-sap',         category: 'common' },
    { english: 'Sorry / Excuse me',    phrase: 'Pasensya na / Excuse me',     pronunciation: 'pa-SEN-sha na',         category: 'common' },
    { english: 'I don\'t understand',  phrase: 'Hindi ko maintindihan',       pronunciation: 'HIN-dee ko ma-in-tin-DEE-han', category: 'common' },
    { english: 'Do you speak English?',phrase: 'Marunong ka bang mag-Ingles?',pronunciation: 'ma-ROO-nong ka bang mag-ING-gles', category: 'common' },
    { english: 'How much?',            phrase: 'Magkano?',                    pronunciation: 'mag-KA-no',             category: 'common' },
    { english: 'Where is...?',         phrase: 'Nasaan ang...?',              pronunciation: 'na-SA-an ang',          category: 'common' },
    // Emergency
    { english: 'Help!',                phrase: 'Saklolo! / Tulong!',          pronunciation: 'sak-LO-lo / TOO-long',  category: 'emergency' },
    { english: 'Call the police!',     phrase: 'Tawagan ang pulis!',          pronunciation: 'ta-WA-gan ang POO-lis', category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Kailangan ko ng doktor',      pronunciation: 'ka-ee-LA-ngan ko nang DOK-tor', category: 'emergency' },
    { english: 'Hospital',             phrase: 'Ospital',                     pronunciation: 'os-PEE-tal',            category: 'emergency' },
    { english: 'I\'m lost',            phrase: 'Nawawala ako',                pronunciation: 'na-wa-WA-la AH-ko',     category: 'emergency' },
    { english: 'Thief!',               phrase: 'Magnanakaw!',                 pronunciation: 'mag-na-NA-kaw',         category: 'emergency' },
    // Food
    { english: 'I\'m hungry',          phrase: 'Gutom na ako',                pronunciation: 'GOO-tom na AH-ko',      category: 'food' },
    { english: 'Water please',         phrase: 'Pakibigay ng tubig',          pronunciation: 'pa-kee-BEE-gay nang TOO-big', category: 'food' },
    { english: 'The bill please',      phrase: 'Pakibigay ng bill',           pronunciation: 'pa-kee-BEE-gay nang bil', category: 'food' },
    { english: 'Delicious!',           phrase: 'Masarap!',                    pronunciation: 'ma-sa-RAP',             category: 'food' },
    { english: 'No pork / no beef',    phrase: 'Wala baboy / wala baka',      pronunciation: 'WA-la BA-boy / WA-la BA-ka', category: 'food' },
    { english: 'Rice',                 phrase: 'Kanin / Bigas',               pronunciation: 'KA-nin / BEE-gas',      category: 'food' },
    // Transport
    { english: 'Where is the jeepney?',phrase: 'Nasaan ang jeepney?',         pronunciation: 'na-SA-an ang JEEP-nee', category: 'transport' },
    { english: 'Stop here please',     phrase: 'Para po dito',                pronunciation: 'PA-ra po DEE-to',       category: 'transport' },
    { english: 'How much to...?',      phrase: 'Magkano papunta sa...?',      pronunciation: 'mag-KA-no pa-PUN-ta sa', category: 'transport' },
    { english: 'Take me to...',        phrase: 'Dalhin mo ako sa...',         pronunciation: 'DAL-hin mo AH-ko sa',   category: 'transport' },
    { english: 'Airport',              phrase: 'Paliparan',                   pronunciation: 'pa-lee-PA-ran',         category: 'transport' },
    { english: 'Bus terminal',         phrase: 'Terminal ng bus',             pronunciation: 'ter-mi-NAL nang bus',   category: 'transport' },
    // Directions
    { english: 'Left',                 phrase: 'Kaliwa',                      pronunciation: 'ka-LEE-wa',             category: 'directions' },
    { english: 'Right',                phrase: 'Kanan',                       pronunciation: 'KA-nan',                category: 'directions' },
    { english: 'Straight ahead',       phrase: 'Diretso',                     pronunciation: 'dee-RET-so',            category: 'directions' },
    { english: 'Near / Far',           phrase: 'Malapit / Malayo',            pronunciation: 'ma-LA-pit / ma-LA-yo',  category: 'directions' },
    // Shopping
    { english: 'Too expensive',        phrase: 'Mahal na mahal',              pronunciation: 'ma-HAL na ma-HAL',      category: 'shopping' },
    { english: 'Can you lower the price?', phrase: 'Pwede pa bang bawasan?',  pronunciation: 'PWEH-deh pa bang ba-WA-san', category: 'shopping' },
    { english: 'I\'m just looking',    phrase: 'Tinitingnan ko lang',         pronunciation: 'tee-nee-TING-nan ko lang', category: 'shopping' },
    // Numbers
    { english: 'One',   phrase: 'Isa',    pronunciation: 'EE-sa',   category: 'numbers' },
    { english: 'Two',   phrase: 'Dalawa', pronunciation: 'da-LA-wa', category: 'numbers' },
    { english: 'Three', phrase: 'Tatlo',  pronunciation: 'TAT-lo',  category: 'numbers' },
    { english: 'Four',  phrase: 'Apat',   pronunciation: 'A-pat',   category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',   pronunciation: 'LEE-ma',  category: 'numbers' },
    { english: 'Ten',   phrase: 'Sampu',  pronunciation: 'SAM-poo', category: 'numbers' },
    { english: 'Hundred', phrase: 'Daan', pronunciation: 'da-AN',   category: 'numbers' },
  ],
  bisaya: [
    { english: 'Hello / Hi',           phrase: 'Kumusta',                     pronunciation: 'koo-MUS-tah',           category: 'greetings' },
    { english: 'Good morning',         phrase: 'Maayong buntag',              pronunciation: 'ma-AY-ong BOON-tag',    category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Maayong hapon',               pronunciation: 'ma-AY-ong HA-pon',      category: 'greetings' },
    { english: 'Good evening',         phrase: 'Maayong gabii',               pronunciation: 'ma-AY-ong ga-BEE',      category: 'greetings' },
    { english: 'Thank you',            phrase: 'Salamat',                     pronunciation: 'sa-LA-mat',             category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Walay sapayan',               pronunciation: 'wa-LAY sa-PA-yan',      category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Babay / Adto na ko',          pronunciation: 'BA-bye / AD-to na ko',  category: 'greetings' },
    { english: 'Yes',                  phrase: 'Oo',                          pronunciation: 'OH-oh',                 category: 'common' },
    { english: 'No',                   phrase: 'Dili',                        pronunciation: 'DEE-lee',               category: 'common' },
    { english: 'Please',               phrase: 'Palihug',                     pronunciation: 'pa-LEE-hug',            category: 'common' },
    { english: 'Sorry / Excuse me',    phrase: 'Pasaylo / Sorry',             pronunciation: 'pa-SAY-lo',             category: 'common' },
    { english: 'I don\'t understand',  phrase: 'Wala ko kasabot',             pronunciation: 'WA-la ko ka-SA-bot',    category: 'common' },
    { english: 'How much?',            phrase: 'Pila man?',                   pronunciation: 'PEE-la man',            category: 'common' },
    { english: 'Where is...?',         phrase: 'Asa ang...?',                 pronunciation: 'A-sa ang',              category: 'common' },
    { english: 'Help!',                phrase: 'Tabang! / Sabot!',            pronunciation: 'TA-bang / SA-bot',      category: 'emergency' },
    { english: 'Call the police!',     phrase: 'Tawaga ang pulis!',           pronunciation: 'ta-WA-ga ang POO-lis',  category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Nanginahanglan ko og doktor', pronunciation: 'nang-ee-na-HANG-lan ko og DOK-tor', category: 'emergency' },
    { english: 'Hospital',             phrase: 'Ospital',                     pronunciation: 'os-PEE-tal',            category: 'emergency' },
    { english: 'I\'m lost',            phrase: 'Nawala ko',                   pronunciation: 'na-WA-la ko',           category: 'emergency' },
    { english: 'I\'m hungry',          phrase: 'Gigutom na ko',               pronunciation: 'gee-GOO-tom na ko',     category: 'food' },
    { english: 'Water please',         phrase: 'Palihug og tubig',            pronunciation: 'pa-LEE-hug og TOO-big', category: 'food' },
    { english: 'The bill please',      phrase: 'Palihug og bill',             pronunciation: 'pa-LEE-hug og bil',     category: 'food' },
    { english: 'Delicious!',           phrase: 'Lami kaayo!',                 pronunciation: 'LA-mee ka-A-yo',        category: 'food' },
    { english: 'Rice',                 phrase: 'Kan-on / Bugas',              pronunciation: 'ka-NON / BOO-gas',      category: 'food' },
    { english: 'Stop here please',     phrase: 'Para diri palihug',           pronunciation: 'PA-ra DEE-ree pa-LEE-hug', category: 'transport' },
    { english: 'How much to...?',      phrase: 'Pila ang papunta sa...?',     pronunciation: 'PEE-la ang pa-PUN-ta sa', category: 'transport' },
    { english: 'Airport',              phrase: 'Paliparan',                   pronunciation: 'pa-lee-PA-ran',         category: 'transport' },
    { english: 'Left',                 phrase: 'Wala',                        pronunciation: 'WA-la',                 category: 'directions' },
    { english: 'Right',                phrase: 'Tuo',                         pronunciation: 'TOO-oh',                category: 'directions' },
    { english: 'Straight ahead',       phrase: 'Diretso',                     pronunciation: 'dee-RET-so',            category: 'directions' },
    { english: 'Near / Far',           phrase: 'Duol / Layo',                 pronunciation: 'DOO-ol / LA-yo',        category: 'directions' },
    { english: 'Too expensive',        phrase: 'Mahal kaayo',                 pronunciation: 'ma-HAL ka-A-yo',        category: 'shopping' },
    { english: 'Can you lower the price?', phrase: 'Pwede ba pakunhoran?',    pronunciation: 'PWEH-deh ba pa-koon-HO-ran', category: 'shopping' },
    { english: 'One',   phrase: 'Usa',   pronunciation: 'OO-sa',   category: 'numbers' },
    { english: 'Two',   phrase: 'Duha',  pronunciation: 'DOO-ha',  category: 'numbers' },
    { english: 'Three', phrase: 'Tulo',  pronunciation: 'TOO-lo',  category: 'numbers' },
    { english: 'Four',  phrase: 'Upat',  pronunciation: 'OO-pat',  category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',  pronunciation: 'LEE-ma',  category: 'numbers' },
    { english: 'Ten',   phrase: 'Napulo',pronunciation: 'na-POO-lo',category: 'numbers' },
  ],
  ilocano: [
    { english: 'Hello / Hi',           phrase: 'Naimbag nga aldaw',           pronunciation: 'na-eem-BAG nga AL-daw', category: 'greetings' },
    { english: 'Good morning',         phrase: 'Naimbag nga bigat',           pronunciation: 'na-eem-BAG nga BEE-gat', category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Naimbag nga hapon',           pronunciation: 'na-eem-BAG nga HA-pon', category: 'greetings' },
    { english: 'Good evening',         phrase: 'Naimbag nga rabii',           pronunciation: 'na-eem-BAG nga ra-BEE', category: 'greetings' },
    { english: 'Thank you',            phrase: 'Agyamanak',                   pronunciation: 'ag-ya-MA-nak',          category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Haan a bale',                 pronunciation: 'ha-AN a BA-leh',        category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Agpakadaanka',                pronunciation: 'ag-pa-ka-da-AN-ka',     category: 'greetings' },
    { english: 'Yes',                  phrase: 'Wen',                         pronunciation: 'wen',                   category: 'common' },
    { english: 'No',                   phrase: 'Haan',                        pronunciation: 'ha-AN',                 category: 'common' },
    { english: 'Please',               phrase: 'Pangngaasim',                 pronunciation: 'pang-nga-A-sim',        category: 'common' },
    { english: 'Sorry',                phrase: 'Dispensarem',                 pronunciation: 'dis-pen-SA-rem',        category: 'common' },
    { english: 'How much?',            phrase: 'Mano?',                       pronunciation: 'MA-no',                 category: 'common' },
    { english: 'Where is...?',         phrase: 'Sadino ti...?',               pronunciation: 'sa-DEE-no ti',          category: 'common' },
    { english: 'I don\'t understand',  phrase: 'Saan ko maawatan',            pronunciation: 'sa-AN ko ma-a-WA-tan',  category: 'common' },
    { english: 'Help!',                phrase: 'Tulong! / Turay!',            pronunciation: 'TOO-long / TOO-ray',    category: 'emergency' },
    { english: 'Call the police!',     phrase: 'Awaganyo ti pulis!',          pronunciation: 'a-WA-gan-yo ti POO-lis', category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Masapulak ti doktor',         pronunciation: 'ma-sa-POO-lak ti DOK-tor', category: 'emergency' },
    { english: 'I\'m lost',            phrase: 'Nawarawarak',                 pronunciation: 'na-wa-ra-WA-rak',       category: 'emergency' },
    { english: 'I\'m hungry',          phrase: 'Nabisin ak',                  pronunciation: 'na-BEE-sin ak',         category: 'food' },
    { english: 'Delicious!',           phrase: 'Naimas!',                     pronunciation: 'na-EE-mas',             category: 'food' },
    { english: 'Water please',         phrase: 'Pangngaasim, bigyannak ti danum', pronunciation: 'big-YAN-nak ti DA-num', category: 'food' },
    { english: 'Stop here please',     phrase: 'Para ditoy',                  pronunciation: 'PA-ra dee-TOY',         category: 'transport' },
    { english: 'How much to...?',      phrase: 'Mano ti papanan to...?',      pronunciation: 'MA-no ti pa-PA-nan to', category: 'transport' },
    { english: 'Left',                 phrase: 'Kannigid',                    pronunciation: 'kan-NEE-gid',           category: 'directions' },
    { english: 'Right',                phrase: 'Kannawan',                    pronunciation: 'kan-NA-wan',            category: 'directions' },
    { english: 'Straight ahead',       phrase: 'Diretso',                     pronunciation: 'dee-RET-so',            category: 'directions' },
    { english: 'Too expensive',        phrase: 'Nangina unay',                pronunciation: 'na-NGEE-na OO-nay',     category: 'shopping' },
    { english: 'One',   phrase: 'Maysa',  pronunciation: 'MAY-sa',  category: 'numbers' },
    { english: 'Two',   phrase: 'Dua',    pronunciation: 'DOO-a',   category: 'numbers' },
    { english: 'Three', phrase: 'Tallo',  pronunciation: 'TAL-lo',  category: 'numbers' },
    { english: 'Four',  phrase: 'Uppat',  pronunciation: 'OOP-pat', category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',   pronunciation: 'LEE-ma',  category: 'numbers' },
    { english: 'Ten',   phrase: 'Sangapulo', pronunciation: 'sa-nga-POO-lo', category: 'numbers' },
  ],
  kapampangan: [
    { english: 'Hello / Hi',           phrase: 'Komusta ka na?',              pronunciation: 'ko-MUS-ta ka na',       category: 'greetings' },
    { english: 'Good morning',         phrase: 'Mayap a abak',                pronunciation: 'MA-yap a A-bak',        category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Mayap a gatpanapun',          pronunciation: 'MA-yap a gat-pa-NA-pun', category: 'greetings' },
    { english: 'Good evening',         phrase: 'Mayap a bengi',               pronunciation: 'MA-yap a BEN-gee',      category: 'greetings' },
    { english: 'Thank you',            phrase: 'Salamat',                     pronunciation: 'sa-LA-mat',             category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Eya kung anuman',             pronunciation: 'EH-ya kung a-NOO-man', category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Ayo na',                      pronunciation: 'A-yo na',               category: 'greetings' },
    { english: 'Yes',                  phrase: 'Wa / Oo',                     pronunciation: 'wa / OH-oh',            category: 'common' },
    { english: 'No',                   phrase: 'Ali / Hindi',                 pronunciation: 'A-lee / HIN-dee',       category: 'common' },
    { english: 'Please',               phrase: 'Ngarud',                      pronunciation: 'nga-RUD',               category: 'common' },
    { english: 'Sorry',                phrase: 'Pasensya na',                 pronunciation: 'pa-SEN-sha na',         category: 'common' },
    { english: 'How much?',            phrase: 'Magkanu?',                    pronunciation: 'mag-KA-nu',             category: 'common' },
    { english: 'Where is...?',         phrase: 'Nokarin ing...?',             pronunciation: 'no-KA-rin ing',         category: 'common' },
    { english: 'Help!',                phrase: 'Saklolo! / Abigan me!',       pronunciation: 'sak-LO-lo / a-BEE-gan me', category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Kailangan ku ng doktor',      pronunciation: 'ka-ee-LA-ngan ku nang DOK-tor', category: 'emergency' },
    { english: 'I\'m hungry',          phrase: 'Gutom na ku',                 pronunciation: 'GOO-tom na ku',         category: 'food' },
    { english: 'Delicious!',           phrase: 'Masarap!',                    pronunciation: 'ma-sa-RAP',             category: 'food' },
    { english: 'Water please',         phrase: 'Pakibgie ing danum',          pronunciation: 'pa-kee-BGEE ing DA-num', category: 'food' },
    { english: 'Stop here please',     phrase: 'Para deti',                   pronunciation: 'PA-ra DEH-tee',         category: 'transport' },
    { english: 'How much to...?',      phrase: 'Magkanu papunta king...?',    pronunciation: 'mag-KA-nu pa-PUN-ta king', category: 'transport' },
    { english: 'Left',                 phrase: 'Abay / Kaliwa',               pronunciation: 'A-bye / ka-LEE-wa',     category: 'directions' },
    { english: 'Right',                phrase: 'Wanan / Kanan',               pronunciation: 'WA-nan / KA-nan',       category: 'directions' },
    { english: 'Too expensive',        phrase: 'Matas ya ing presyo',         pronunciation: 'MA-tas ya ing PRES-yo', category: 'shopping' },
    { english: 'One',   phrase: 'Metung', pronunciation: 'MEH-tung', category: 'numbers' },
    { english: 'Two',   phrase: 'Adua',   pronunciation: 'a-DOO-a',  category: 'numbers' },
    { english: 'Three', phrase: 'Atlu',   pronunciation: 'AT-lu',    category: 'numbers' },
    { english: 'Four',  phrase: 'Apat',   pronunciation: 'A-pat',    category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',   pronunciation: 'LEE-ma',   category: 'numbers' },
    { english: 'Ten',   phrase: 'Apulu',  pronunciation: 'a-POO-lu', category: 'numbers' },
  ],
  waray: [
    { english: 'Hello / Hi',           phrase: 'Kumusta ka?',                 pronunciation: 'koo-MUS-ta ka',         category: 'greetings' },
    { english: 'Good morning',         phrase: 'Maupay nga aga',              pronunciation: 'ma-OO-pay nga A-ga',    category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Maupay nga kulop',            pronunciation: 'ma-OO-pay nga KOO-lop', category: 'greetings' },
    { english: 'Good evening',         phrase: 'Maupay nga gab-i',            pronunciation: 'ma-OO-pay nga ga-BEE',  category: 'greetings' },
    { english: 'Thank you',            phrase: 'Salamat',                     pronunciation: 'sa-LA-mat',             category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Waray sapayan',               pronunciation: 'wa-RAY sa-PA-yan',      category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Adto na ako',                 pronunciation: 'AD-to na A-ko',         category: 'greetings' },
    { english: 'Yes',                  phrase: 'Oo',                          pronunciation: 'OH-oh',                 category: 'common' },
    { english: 'No',                   phrase: 'Diri',                        pronunciation: 'DEE-ree',               category: 'common' },
    { english: 'Please',               phrase: 'Palihog',                     pronunciation: 'pa-LEE-hog',            category: 'common' },
    { english: 'Sorry',                phrase: 'Pasensya',                    pronunciation: 'pa-SEN-sha',            category: 'common' },
    { english: 'How much?',            phrase: 'Pira?',                       pronunciation: 'PEE-ra',                category: 'common' },
    { english: 'Where is...?',         phrase: 'Hain an...?',                 pronunciation: 'ha-IN an',              category: 'common' },
    { english: 'Help!',                phrase: 'Tabang!',                     pronunciation: 'TA-bang',               category: 'emergency' },
    { english: 'Call the police!',     phrase: 'Tawaga an pulis!',            pronunciation: 'ta-WA-ga an POO-lis',   category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Kinahanglan ko hin doktor',   pronunciation: 'kee-na-HANG-lan ko hin DOK-tor', category: 'emergency' },
    { english: 'I\'m lost',            phrase: 'Nawara ako',                  pronunciation: 'na-WA-ra A-ko',         category: 'emergency' },
    { english: 'I\'m hungry',          phrase: 'Gutom na ako',                pronunciation: 'GOO-tom na A-ko',       category: 'food' },
    { english: 'Delicious!',           phrase: 'Maupay!',                     pronunciation: 'ma-OO-pay',             category: 'food' },
    { english: 'Stop here please',     phrase: 'Para hini palihog',           pronunciation: 'PA-ra HEE-nee pa-LEE-hog', category: 'transport' },
    { english: 'Left',                 phrase: 'Wala',                        pronunciation: 'WA-la',                 category: 'directions' },
    { english: 'Right',                phrase: 'Tu-o',                        pronunciation: 'TOO-oh',                category: 'directions' },
    { english: 'Too expensive',        phrase: 'Mahal kaupay',                pronunciation: 'ma-HAL ka-OO-pay',      category: 'shopping' },
    { english: 'One',   phrase: 'Usa',   pronunciation: 'OO-sa',   category: 'numbers' },
    { english: 'Two',   phrase: 'Duha',  pronunciation: 'DOO-ha',  category: 'numbers' },
    { english: 'Three', phrase: 'Tulo',  pronunciation: 'TOO-lo',  category: 'numbers' },
    { english: 'Four',  phrase: 'Upat',  pronunciation: 'OO-pat',  category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',  pronunciation: 'LEE-ma',  category: 'numbers' },
    { english: 'Ten',   phrase: 'Napulo',pronunciation: 'na-POO-lo',category: 'numbers' },
  ],
  hiligaynon: [
    { english: 'Hello / Hi',           phrase: 'Kamusta ka?',                 pronunciation: 'ka-MUS-ta ka',          category: 'greetings' },
    { english: 'Good morning',         phrase: 'Maayong aga',                 pronunciation: 'ma-AY-ong A-ga',        category: 'greetings' },
    { english: 'Good afternoon',       phrase: 'Maayong hapon',               pronunciation: 'ma-AY-ong HA-pon',      category: 'greetings' },
    { english: 'Good evening',         phrase: 'Maayong gab-i',               pronunciation: 'ma-AY-ong ga-BEE',      category: 'greetings' },
    { english: 'Thank you',            phrase: 'Salamat gid',                 pronunciation: 'sa-LA-mat gid',         category: 'greetings' },
    { english: 'You\'re welcome',      phrase: 'Wala sing sapayan',           pronunciation: 'WA-la sing sa-PA-yan',  category: 'greetings' },
    { english: 'Goodbye',              phrase: 'Asta sa liwan',               pronunciation: 'AS-ta sa LEE-wan',      category: 'greetings' },
    { english: 'Yes',                  phrase: 'Huo',                         pronunciation: 'HOO-oh',                category: 'common' },
    { english: 'No',                   phrase: 'Indi',                        pronunciation: 'IN-dee',                category: 'common' },
    { english: 'Please',               phrase: 'Palihog',                     pronunciation: 'pa-LEE-hog',            category: 'common' },
    { english: 'Sorry',                phrase: 'Pasensya',                    pronunciation: 'pa-SEN-sha',            category: 'common' },
    { english: 'How much?',            phrase: 'Pila?',                       pronunciation: 'PEE-la',                category: 'common' },
    { english: 'Where is...?',         phrase: 'Diin ang...?',                pronunciation: 'dee-IN ang',            category: 'common' },
    { english: 'Help!',                phrase: 'Bulig! / Tabang!',            pronunciation: 'BOO-lig / TA-bang',     category: 'emergency' },
    { english: 'Call the police!',     phrase: 'Tawga ang pulis!',            pronunciation: 'TAW-ga ang POO-lis',    category: 'emergency' },
    { english: 'I need a doctor',      phrase: 'Kinahanglan ko sang doktor',  pronunciation: 'kee-na-HANG-lan ko sang DOK-tor', category: 'emergency' },
    { english: 'I\'m lost',            phrase: 'Nawala ako',                  pronunciation: 'na-WA-la A-ko',         category: 'emergency' },
    { english: 'I\'m hungry',          phrase: 'Gutom na ako',                pronunciation: 'GOO-tom na A-ko',       category: 'food' },
    { english: 'Delicious!',           phrase: 'Malamlam!',                   pronunciation: 'ma-LAM-lam',            category: 'food' },
    { english: 'Stop here please',     phrase: 'Para diri palihog',           pronunciation: 'PA-ra DEE-ree pa-LEE-hog', category: 'transport' },
    { english: 'How much to...?',      phrase: 'Pila papunta sa...?',         pronunciation: 'PEE-la pa-PUN-ta sa',   category: 'transport' },
    { english: 'Left',                 phrase: 'Wala',                        pronunciation: 'WA-la',                 category: 'directions' },
    { english: 'Right',                phrase: 'Tu-o',                        pronunciation: 'TOO-oh',                category: 'directions' },
    { english: 'Straight ahead',       phrase: 'Diretso',                     pronunciation: 'dee-RET-so',            category: 'directions' },
    { english: 'Too expensive',        phrase: 'Mahal gid',                   pronunciation: 'ma-HAL gid',            category: 'shopping' },
    { english: 'Can you lower the price?', phrase: 'Pwede pa bawasan?',       pronunciation: 'PWEH-deh pa ba-WA-san', category: 'shopping' },
    { english: 'One',   phrase: 'Isa',    pronunciation: 'EE-sa',    category: 'numbers' },
    { english: 'Two',   phrase: 'Duha',   pronunciation: 'DOO-ha',   category: 'numbers' },
    { english: 'Three', phrase: 'Tatlo',  pronunciation: 'TAT-lo',   category: 'numbers' },
    { english: 'Four',  phrase: 'Apat',   pronunciation: 'A-pat',    category: 'numbers' },
    { english: 'Five',  phrase: 'Lima',   pronunciation: 'LEE-ma',   category: 'numbers' },
    { english: 'Ten',   phrase: 'Napulo', pronunciation: 'na-POO-lo',category: 'numbers' },
  ],
}

export default function Phrasebook() {
  const [dialect, setDialect] = useState<Dialect>('tagalog')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const phrases = useMemo(() => {
    let list = PHRASES[dialect]
    if (category !== 'all') list = list.filter(p => p.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.english.toLowerCase().includes(q) ||
        p.phrase.toLowerCase().includes(q)
      )
    }
    return list
  }, [dialect, category, search])

  const grouped = useMemo(() => {
    if (category !== 'all' || search.trim()) return null
    return CATEGORIES.reduce((acc, cat) => {
      const items = phrases.filter(p => p.category === cat.id)
      if (items.length) acc[cat.id] = items
      return acc
    }, {} as Record<string, Phrase[]>)
  }, [phrases, category, search])

  const copyPhrase = (phrase: string, key: string) => {
    navigator.clipboard.writeText(phrase)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const currentDialect = DIALECTS.find(d => d.id === dialect)!

  return (
    <div>
      <PageHeader
        title="Phrasebook"
        subtitle="PH dialects"
        icon={BookOpen}
        iconColor="text-violet-600"
      />

      {/* Dialect selector */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {DIALECTS.map(d => (
            <button
              key={d.id}
              onClick={() => { setDialect(d.id); setCategory('all'); setSearch('') }}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border text-center shrink-0 transition-all active:scale-95',
                dialect === d.id
                  ? 'bg-violet-500 border-violet-500 text-white shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:border-violet-300'
              )}
            >
              <span className="text-base">{d.emoji}</span>
              <span className="text-[11px] font-semibold leading-tight">{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Region info */}
      <div className="px-4 mb-3">
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2">
          <p className="text-xs text-violet-700 dark:text-violet-400 font-medium">
            📍 Spoken in: {currentDialect.region}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search phrases..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      {!search && (
        <div className="px-4 mb-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setCategory('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all',
                category === 'all' ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all whitespace-nowrap',
                  category === cat.id ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Phrases */}
      <div className="px-4 pb-8 space-y-4">
        {phrases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-sm text-muted-foreground">No phrases found</p>
          </div>
        ) : grouped ? (
          Object.entries(grouped).map(([catId, items]) => {
            const cat = CATEGORIES.find(c => c.id === catId)!
            return (
              <div key={catId}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</span>
                </div>
                <div className="space-y-2">
                  {items.map((p, i) => (
                    <PhraseCard key={i} phrase={p} copied={copied} onCopy={copyPhrase} />
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <AnimatePresence>
            {phrases.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <PhraseCard phrase={p} copied={copied} onCopy={copyPhrase} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

function PhraseCard({ phrase, copied, onCopy }: { phrase: Phrase; copied: string | null; onCopy: (p: string, k: string) => void }) {
  const key = phrase.phrase
  const isCopied = copied === key
  return (
    <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{phrase.english}</p>
        <p className="text-sm font-bold text-foreground">{phrase.phrase}</p>
        <p className="text-[11px] text-violet-500 dark:text-violet-400 font-medium mt-0.5 italic">{phrase.pronunciation}</p>
      </div>
      <button
        onClick={() => onCopy(phrase.phrase, key)}
        className={cn(
          'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90',
          isCopied ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted hover:bg-muted/80'
        )}
      >
        {isCopied
          ? <Check className="h-3.5 w-3.5 text-emerald-500" />
          : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </button>
    </div>
  )
}
